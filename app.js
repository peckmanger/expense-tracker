// app.js — boot, events, actions, exports.
import * as db from './db.js';
import * as fx from './fx.js';
import {
  S, defaults, load, saveSettings, upsert, remove, uid, today, curMonth, addMonthsKey, addDays, daysInMonth, monthName,
  fmtDate, parseAmount, round2, money, dispCur, fmtE, toDisp, curToEur, eurToCur, eurOf, cat, catsOf, accounts,
  monthStats, byCategory, topN, hasBudget, totalBudgetEUR, catBudgetEUR, advance, monthlyEquivalentEUR, freqLabel, pad,
} from './store.js';
import {
  renderTab, renderPage, tabBar, vTxList, sTx, sBudget, sRecurring, sGoal, sGoalAdd, sAccount, sCategory, sFilter,
  sWelcome, sFileReady, I,
} from './views.js';
import { buildReportPDF } from './report.js';

const $ = id => document.getElementById(id);
const main = $('main'), tabbar = $('tabbar'), fab = $('fab'), sheetWrap = $('sheetWrap'), sheet = $('sheet'), toastEl = $('toast');
let sheetKind = null, budgetMode = null, pendingFile = null, lastDay = today(), toastTimer = null, promptActive = false;

// ---------------------------------------------------------------- render
function render() {
  const page = S.stack[S.stack.length - 1];
  main.innerHTML = page ? renderPage(page) : renderTab(S.tab);
  tabbar.innerHTML = tabBar();
  fab.hidden = page ? true : S.tab === 'more';
  if (!page && S.tab === 'more' && navigator.storage && navigator.storage.persisted) {
    navigator.storage.persisted().then(p => { const el = $('persistInfo'); if (el) el.textContent = p ? 'Storage is marked persistent — iOS won\'t clear it automatically.' : 'Tip: keep using the Home Screen icon so iOS keeps your data. Make a backup now and then.'; });
  }
}
const top0 = () => window.scrollTo(0, 0);

// ---------------------------------------------------------------- sheets & toasts
function openSheet(html, kind = null) {
  sheetKind = kind;
  sheet.innerHTML = html;
  sheetWrap.hidden = false;
  sheet.scrollTop = 0;
  document.body.style.overflow = 'hidden';
  fitSheet();
}
function closeSheet() {
  sheetWrap.hidden = true; sheet.innerHTML = ''; sheetKind = null; S.draft = null;
  document.body.style.overflow = '';
  sheetWrap.style.top = ''; sheetWrap.style.height = '';
}
// Keep the sheet inside the part of the screen the keyboard doesn't cover,
// so the amount you are typing stays visible at the top.
function fitSheet() {
  const vv = window.visualViewport;
  if (!vv || sheetWrap.hidden) return;
  sheetWrap.style.top = vv.offsetTop + 'px';
  sheetWrap.style.height = vv.height + 'px';
}
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', fitSheet);
  window.visualViewport.addEventListener('scroll', fitSheet);
}
// Focus a field without iOS scrolling the half-animated sheet to the bottom.
function focusTop(input) {
  if (!input) return;
  try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); }
  const reset = () => { sheet.scrollTop = 0; window.scrollTo(0, 0); fitSheet(); };
  requestAnimationFrame(reset);
  setTimeout(reset, 320);
  setTimeout(reset, 650);
}
const field = name => sheet.elements[name];
const val = name => (field(name) ? field(name).value : '');

function toast(title, { sub = '', actions = [], persist = false } = {}) {
  clearTimeout(toastTimer);
  toastEl.innerHTML = `<span class="grow">${title}${sub ? `<small>${sub}</small>` : ''}</span>${actions.map(([l, a, alt]) => `<button class="tbtn${alt ? ' alt' : ''}" data-a="${a}">${l}</button>`).join('')}<button class="tx" data-a="toastClose" aria-label="Close">${I.x}</button>`;
  toastEl.hidden = false;
  if (!persist) toastTimer = setTimeout(hideToast, 2600);
}
function hideToast() { toastEl.hidden = true; toastEl.innerHTML = ''; }

// ---------------------------------------------------------------- currency conversion
async function convert(t) {
  try {
    const { rate, date } = await fx.rateOn(t.currency, t.date);
    t.rate = rate; t.rateDate = date; t.eur = round2(t.amount / rate); t.ratePending = false;
  } catch (e) {
    t.eur = null; t.ratePending = true;
  }
  return t;
}
async function resolvePending() {
  const pend = S.tx.filter(t => t.ratePending || typeof t.eur !== 'number');
  let fixed = 0;
  for (const t of pend) { await convert(t); if (!t.ratePending) { await upsert('tx', t); fixed++; } }
  return fixed;
}
function updateConvHint() {
  const el = $('convHint'); if (!el) return;
  const amt = parseAmount(val('amount')), cur = val('currency');
  if (!amt || cur === 'EUR') { el.textContent = cur === 'EUR' ? '' : ' '; return; }
  const eur = curToEur(amt, cur);
  const parts = [`≈ ${money(eur, 'EUR')}`];
  if (dispCur() !== 'EUR' && dispCur() !== cur) parts.push(fmtE(eur));
  el.textContent = parts.join(' · ') + (val('date') && val('date') < today() ? ' · exact rate for that day is used on save' : '');
}

// ---------------------------------------------------------------- recurring
async function processRecurring() {
  const t = today();
  let added = 0;
  for (const r of S.recur) {
    if (!r.active) continue;
    let guard = 0, changed = false;
    while (r.nextDate <= t && guard++ < 400) {
      const tx = { id: uid(), type: r.type, amount: r.amount, currency: r.currency, categoryId: r.categoryId, accountId: r.accountId, date: r.nextDate, note: r.name, recurringId: r.id, createdAt: Date.now() };
      await convert(tx);
      await upsert('tx', tx);
      r.nextDate = advance(r.nextDate, r.frequency, r.anchorDay);
      added++; changed = true;
    }
    if (changed) await upsert('recur', r);
  }
  return added;
}

// ---------------------------------------------------------------- files
function download(file) {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url; a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
async function offerFile(blob, name) {
  const file = new File([blob], name, { type: blob.type });
  pendingFile = file;
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: name }); return; }
    catch (e) { if (e && e.name === 'AbortError') return; openSheet(sFileReady(name), 'file'); return; }
  }
  download(file);
}
const csvCell = v => { const s = String(v ?? ''); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
async function exportCsv(mk) {
  if (S.tx.some(t => t.date.startsWith(mk) && (t.ratePending || typeof t.eur !== 'number'))) await resolvePending();
  const rows = S.tx.filter(t => t.date.startsWith(mk)).sort((a, b) => a.date.localeCompare(b.date) || (a.createdAt || 0) - (b.createdAt || 0));
  const head = ['Date', 'Type', 'Category', 'Account', 'Description', 'Amount (EUR)'];
  const lines = [head.join(',')];
  for (const t of rows) {
    const e = eurOf(t);
    lines.push([t.date, t.type === 'income' ? 'Income' : 'Expense', cat(t.categoryId).name, (S.accts.find(a => a.id === t.accountId) || {}).name || '', t.note || '', (t.type === 'income' ? e : -e).toFixed(2)].map(csvCell).join(','));
  }
  const spent = rows.filter(t => t.type === 'expense').reduce((a, t) => a + eurOf(t), 0);
  const blob = new Blob(['﻿' + lines.join('\r\n') + '\r\n'], { type: 'text/csv' });
  await offerFile(blob, `expenses-${mk}-EUR.csv`);
  return { count: rows.length, spent };
}
async function exportPdf(mk) {
  toast('Creating report…');
  try {
    const blob = await buildReportPDF(reportData(mk));
    hideToast();
    await offerFile(blob, `expense-report-${mk}.pdf`);
  } catch (e) {
    console.error(e); toast('Could not create the PDF', { sub: String(e.message || e) });
  }
}
function reportData(mk) {
  const m = monthStats(mk), pk = addMonthsKey(mk, -1), p = monthStats(pk);
  const B = totalBudgetEUR(), hasB = hasBudget(), left = B - m.spent, dim = daysInMonth(mk);
  const isCur = mk === curMonth(), daysUsed = isCur ? +today().slice(8) : dim;
  const chg = p.spent > 0 ? (m.spent - p.spent) / p.spent : null;
  const green = '#248a3d', red = '#d70015';
  const cats = byCategory(mk + '-01', mk + '-31');
  const daily = Array.from({ length: dim }, () => 0);
  for (const t of S.tx) if (t.type === 'expense' && t.date.startsWith(mk)) daily[+t.date.slice(8) - 1] += eurOf(t);
  const busiest = daily.reduce((bi, v, i) => (v > daily[bi] ? i : bi), 0);
  const zero = daily.slice(0, daysUsed).filter(v => v === 0).length;
  const months = Array.from({ length: 6 }, (_, i) => addMonthsKey(mk, i - 5)).map(k => { const v = monthStats(k).spent; return { label: monthName(k, 'short', false), value: v, valueStr: v ? fmtE(v, { compact: true }) : '' }; });
  const top = S.tx.filter(t => t.type === 'expense' && t.date.startsWith(mk)).sort((a, b) => eurOf(b) - eurOf(a)).slice(0, 10)
    .map(t => ({ date: fmtDate(t.date, { day: 'numeric', month: 'short' }), title: t.note || cat(t.categoryId).name, cat: `${cat(t.categoryId).icon} ${cat(t.categoryId).name}`, value: fmtE(eurOf(t)) + (t.currency !== dispCur() ? ` (${money(t.amount, t.currency)})` : '') }));
  const rec = S.recur.filter(r => r.active && r.type === 'expense').sort((a, b) => monthlyEquivalentEUR(b) - monthlyEquivalentEUR(a));
  const recMonthly = rec.reduce((a, r) => a + monthlyEquivalentEUR(r), 0);
  return {
    month: monthName(mk), currency: dispCur(), generated: fmtDate(today(), { day: 'numeric', month: 'long', year: 'numeric' }),
    headline: hasB ? (left >= 0 ? `Under budget by ${fmtE(left)}` : `Over budget by ${fmtE(-left)}`) : (chg != null ? `${chg <= 0 ? 'Down' : 'Up'} ${Math.abs(Math.round(chg * 100))}% vs ${monthName(pk, 'long', false)}` : ''),
    headlineGood: hasB ? left >= 0 : (chg == null || chg <= 0),
    kpis: [
      { label: isCur ? 'Spent so far' : 'Total spent', value: fmtE(m.spent), sub: `${m.count} expense${m.count === 1 ? '' : 's'}` },
      hasB ? { label: 'Monthly budget', value: fmtE(B, { whole: true }), sub: left >= 0 ? `${fmtE(left)} left` : `${fmtE(-left)} over`, subColor: left >= 0 ? green : red }
        : { label: 'Average per day', value: fmtE(m.spent / daysUsed), sub: `${daysUsed} days` },
      { label: `vs ${monthName(pk, 'long', false)}`, value: chg == null ? '–' : `${chg <= 0 ? '↓' : '↑'} ${Math.abs(Math.round(chg * 100))}%`, color: chg == null ? undefined : chg <= 0 ? green : red, sub: `${monthName(pk, 'short', false)}: ${fmtE(p.spent, { whole: true })}` },
      { label: 'Income', value: fmtE(m.income, { whole: true }), sub: `Net ${m.net < 0 ? '−' : '+'}${fmtE(Math.abs(m.net), { whole: true })}`, subColor: m.net < 0 ? red : green },
    ],
    cats: cats.map(x => ({ name: x.cat.name, icon: x.cat.icon, color: x.cat.color, value: x.value, valueStr: fmtE(x.value), budget: catBudgetEUR(x.cat.id), budgetStr: fmtE(catBudgetEUR(x.cat.id), { whole: true }) })),
    catsDonut: topN(cats, 6).map(x => ({ value: x.value, color: x.cat.color })),
    hasCatBudgets: hasB && S.settings.budget.mode === 'category',
    spentShort: fmtE(m.spent, { compact: true }),
    daily, dailyBudget: hasB ? B / dim : null,
    dailyNote: m.spent ? `Busiest day: ${fmtDate(`${mk}-${pad(busiest + 1)}`, { weekday: 'short', day: 'numeric', month: 'short' })} (${fmtE(daily[busiest])}). ${zero} day${zero === 1 ? '' : 's'} with no spending.${hasB ? ` Dashed line = even daily share of your budget (${fmtE(B / dim)}).` : ''}` : 'No spending recorded this month.',
    months, budget: hasB ? B : 0, fmtShort: v => fmtE(v, { compact: true }),
    top,
    recurring: rec.map(r => ({ name: r.name, freq: freqLabel(r.frequency) + (r.isSub ? ' · subscription' : ''), amount: money(r.amount, r.currency) })),
    recurringTotal: rec.length ? `≈ ${fmtE(recMonthly)} per month · ${fmtE(recMonthly * 12, { whole: true })} per year` : '',
  };
}

// ---------------------------------------------------------------- monthly CSV prompt
function maybeMonthlyPrompt() {
  const cm = curMonth(), lm = addMonthsKey(cm, -1);
  if (!S.settings.onboarded || S.settings.lastCsvPromptMonth === cm) return;
  if (!S.tx.some(t => t.date.startsWith(lm))) { S.settings.lastCsvPromptMonth = cm; saveSettings(); return; }
  promptActive = true;
  toast(`📄 ${monthName(lm, 'long', false)} is complete`, { sub: 'Download last month\'s report (CSV, EUR)?', actions: [['PDF', 'toastPdf', true], ['CSV', 'toastCsv']], persist: true });
}
function markPrompted() {
  if (!promptActive) return;
  promptActive = false; S.settings.lastCsvPromptMonth = curMonth(); saveSettings();
}

// ---------------------------------------------------------------- theme
function applyTheme() {
  const t = S.settings ? S.settings.theme : 'auto';
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem('theme', t); } catch (e) { /* ignore */ }
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => {
    const light = (m.media || '').includes('light');
    m.content = t === 'dark' ? '#000000' : t === 'light' ? '#ffffff' : light ? '#ffffff' : '#000000';
  });
}

// ---------------------------------------------------------------- drafts
function newTxDraft() {
  const st = S.settings;
  return { type: 'expense', amount: '', currency: st.defaultCurrency, categoryId: '', accountId: st.defaultAccount || (accounts()[0] || {}).id, date: today(), note: '' };
}
function captureDraft() {
  const d = S.draft; if (!d) return;
  for (const k of ['amount', 'currency', 'date', 'accountId', 'note', 'categoryId', 'name', 'frequency', 'nextDate', 'repeat']) if (field(k)) d[k] = field(k).value;
  if (field('isSub')) d.isSub = field('isSub').checked;
  if (field('active')) d.active = field('active').checked;
}
function rerenderDraftSheet() {
  const scroll = sheet.scrollTop;
  sheet.innerHTML = sheetKind === 'recurring' ? sRecurring(S.draft) : sTx(S.draft);
  if (S.draft.repeat && field('repeat')) { field('repeat').value = S.draft.repeat; toggleSubRow(); }
  if (S.draft.isSub && field('isSub')) field('isSub').checked = true;
  sheet.scrollTop = scroll;
  updateConvHint();
}
function toggleSubRow() {
  const row = sheet.querySelector('.sub-row');
  if (row) row.hidden = val('repeat') === 'never' || val('repeat') === '';
}

// ---------------------------------------------------------------- actions
const A = {
  tab(el) { S.tab = el.dataset.v; S.stack = []; render(); top0(); },
  push(el) { S.stack.push(el.dataset.v); render(); top0(); },
  back() { S.stack.pop(); render(); top0(); },
  homeRange(el) { S.ui.homeRange = el.dataset.v; render(); },
  insRange(el) { S.ui.insRange = el.dataset.v; render(); },
  txType(el) { S.ui.txType = el.dataset.v; S.ui.txLimit = 120; render(); },
  moreTx() { S.ui.txLimit += 150; $('txList').innerHTML = vTxList(); },
  goalsTab(el) { S.ui.goalsTab = el.dataset.v; render(); },
  catsType(el) { S.ui.catsType = el.dataset.v; render(); },

  // filter
  openFilter() { openSheet(sFilter(), 'filter'); },
  applyFilter() { S.ui.filter = { month: val('month'), cat: val('cat'), acct: val('acct') }; S.ui.txLimit = 120; closeSheet(); render(); },
  clearFilter() { S.ui.filter = { month: '', cat: '', acct: '' }; S.ui.search = ''; if (sheetKind) closeSheet(); render(); },

  // budgets
  budgetMonth(el) {
    const cur = S.ui.budgetMonth || curMonth();
    const next = addMonthsKey(cur, +el.dataset.v);
    if (next > curMonth()) return;
    S.ui.budgetMonth = next; render();
  },
  editBudget() { budgetMode = S.settings.budget.mode; openSheet(sBudget(), 'budget'); },
  budgetMode(el) {
    budgetMode = el.dataset.v;
    sheet.querySelectorAll('.seg button').forEach(b => b.classList.toggle('on', b.dataset.v === budgetMode));
    $('budTotal').hidden = budgetMode !== 'total'; $('budCats').hidden = budgetMode !== 'category';
  },
  async saveBudget() {
    const per = {};
    sheet.querySelectorAll('[data-cat]').forEach(i => { const n = parseAmount(i.value); if (n > 0) per[i.dataset.cat] = round2(n); });
    const total = round2(parseAmount(val('total')));
    if (budgetMode === 'total' && !(total > 0)) return toast('Enter a monthly amount');
    if (budgetMode === 'category' && !Object.keys(per).length) return toast('Set at least one category limit');
    S.settings.budget = { mode: budgetMode, total, perCategory: per, currency: dispCur() };
    await saveSettings(); closeSheet(); render(); toast('Budget saved');
  },
  async clearBudget() {
    if (!confirm('Remove your budget?')) return;
    S.settings.budget = { mode: 'total', total: 0, perCategory: {}, currency: dispCur() };
    await saveSettings(); closeSheet(); render();
  },

  // transactions
  addTx() {
    S.draft = newTxDraft();
    openSheet(sTx(S.draft), 'tx');
    focusTop(field('amount'));
  },
  editTx(el) {
    const t = S.tx.find(x => x.id === el.dataset.id); if (!t) return;
    S.draft = { ...t };
    openSheet(sTx(S.draft), 'tx');
    updateConvHint();
  },
  draftType(el) {
    captureDraft();
    if (S.draft.type !== el.dataset.v) { S.draft.type = el.dataset.v; S.draft.categoryId = ''; }
    rerenderDraftSheet();
  },
  pickCat(el) {
    field('categoryId').value = el.dataset.id;
    sheet.querySelectorAll('.cat-grid .chip').forEach(c => c.classList.toggle('on', c === el));
  },
  async saveTx() {
    captureDraft();
    const d = S.draft;
    const amount = round2(Math.abs(parseAmount(d.amount)));
    if (!(amount > 0)) { toast('Enter an amount'); field('amount').focus(); return; }
    if (!d.categoryId) return toast('Pick a category');
    if (!d.date) return toast('Pick a date');
    const old = d.id ? S.tx.find(x => x.id === d.id) : null;
    const t = {
      id: d.id || uid(), type: d.type, amount, currency: d.currency, categoryId: d.categoryId, accountId: d.accountId,
      date: d.date, note: (d.note || '').trim(), createdAt: d.createdAt || Date.now(),
      recurringId: d.recurringId || null, eur: old ? old.eur : null, rate: old ? old.rate : null, rateDate: old ? old.rateDate : null,
    };
    const btn = sheet.querySelector('[data-a="saveTx"]'); if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    if (!old || old.amount !== t.amount || old.currency !== t.currency || old.date !== t.date || typeof old.eur !== 'number') await convert(t);
    if (!d.id && d.repeat && d.repeat !== 'never') {
      const anchorDay = +t.date.slice(8);
      const r = { id: uid(), name: t.note || cat(t.categoryId).name, type: t.type, amount, currency: t.currency, categoryId: t.categoryId, accountId: t.accountId, frequency: d.repeat, anchorDay, nextDate: advance(t.date, d.repeat, anchorDay), isSub: !!d.isSub, active: true, createdAt: Date.now() };
      await upsert('recur', r);
      t.recurringId = r.id;
    }
    await upsert('tx', t);
    if (t.accountId) { S.settings.lastAccount = t.accountId; }
    closeSheet();
    const added = d.repeat && d.repeat !== 'never' ? await processRecurring() : 0;
    render();
    toast(`${old ? 'Saved' : t.type === 'income' ? 'Income added' : 'Expense added'}${t.ratePending ? ' · rate will update when online' : ''}${added ? ` · ${added} repeat${added === 1 ? '' : 's'} filled in` : ''}`);
  },
  async deleteTx() {
    if (!confirm('Delete this transaction?')) return;
    await remove('tx', S.draft.id); closeSheet(); render(); toast('Deleted');
  },

  // recurring
  newRecurring() {
    const st = S.settings;
    S.draft = { type: 'expense', name: '', amount: '', currency: st.defaultCurrency, categoryId: '', accountId: st.defaultAccount, frequency: 'monthly', nextDate: today(), isSub: true, active: true };
    openSheet(sRecurring(S.draft), 'recurring');
  },
  editRecurring(el) {
    const r = S.recur.find(x => x.id === el.dataset.id); if (!r) return;
    S.draft = { ...r }; openSheet(sRecurring(S.draft), 'recurring');
  },
  async saveRecurring() {
    captureDraft();
    const d = S.draft, amount = round2(Math.abs(parseAmount(d.amount)));
    if (!d.name.trim()) return toast('Give it a name');
    if (!(amount > 0)) return toast('Enter an amount');
    if (!d.categoryId) return toast('Pick a category');
    if (!d.nextDate) return toast('Pick a date');
    const r = { ...d, id: d.id || uid(), name: d.name.trim(), amount, anchorDay: +d.nextDate.slice(8), active: d.id ? !!d.active : true, createdAt: d.createdAt || Date.now() };
    delete r.repeat;
    await upsert('recur', r);
    closeSheet();
    const added = await processRecurring();
    render();
    toast(d.id ? 'Saved' : 'Recurring payment added', added ? { sub: `${added} payment${added === 1 ? '' : 's'} up to today added to transactions` } : {});
  },
  async deleteRecurring() {
    if (!confirm('Delete this recurring payment? Past transactions stay.')) return;
    await remove('recur', S.draft.id); closeSheet(); render();
  },

  // goals
  newGoal() {
    S.draft = { name: '', icon: '🚗', color: '#007aff', target: '', saved: '', currency: dispCur(), targetDate: '' };
    openSheet(sGoal(S.draft), 'goal');
  },
  editGoal(el) {
    const g = S.goals.find(x => x.id === el.dataset.id); if (!g) return;
    S.draft = { ...g }; openSheet(sGoal(S.draft), 'goal');
  },
  pickEmoji(el) {
    field('icon').value = el.dataset.v;
    sheet.querySelectorAll('.emo').forEach(b => b.classList.toggle('on', b === el));
  },
  pickColor(el) {
    field('color').value = el.dataset.v;
    sheet.querySelectorAll('.sw').forEach(b => b.classList.toggle('on', b === el));
    const p = $('catPrev'); if (p) p.style.setProperty('--c', el.dataset.v);
  },
  async saveGoal() {
    const target = round2(parseAmount(val('target')));
    if (!val('name').trim()) return toast('Give your goal a name');
    if (!(target > 0)) return toast('Enter a goal amount');
    const d = S.draft;
    const g = { ...d, id: d.id || uid(), name: val('name').trim(), icon: val('icon'), color: val('color'), target, saved: Math.max(0, round2(parseAmount(val('saved')))), currency: val('currency'), targetDate: val('targetDate'), createdAt: d.createdAt || Date.now(), history: d.history || [] };
    await upsert('goals', g); closeSheet(); render(); toast(d.id ? 'Goal saved' : 'Goal created');
  },
  async deleteGoal() {
    if (!confirm('Delete this goal?')) return;
    await remove('goals', S.draft.id); closeSheet(); render();
  },
  addToGoal(el) {
    const g = S.goals.find(x => x.id === el.dataset.id); if (!g) return;
    openSheet(sGoalAdd(g), 'goalAdd'); focusTop(field('amount'));
  },
  async saveGoalAdd(el) {
    const g = S.goals.find(x => x.id === el.dataset.id); if (!g) return;
    const n = round2(parseAmount(val('amount')));
    if (!n) return toast('Enter an amount');
    g.saved = Math.max(0, round2(g.saved + n));
    g.history = [...(g.history || []), { date: today(), amount: n }];
    await upsert('goals', g); closeSheet(); render();
    toast(g.saved >= g.target ? '🎉 Goal reached!' : `${money(n, g.currency)} added`);
  },

  // accounts
  newAccount() { S.draft = { name: '', icon: '🏦', opening: '' }; openSheet(sAccount(S.draft), 'account'); },
  editAccount(el) {
    const a = S.accts.find(x => x.id === el.dataset.id); if (!a) return;
    S.draft = { ...a, opening: a.openingEUR ? round2(eurToCur(a.openingEUR, dispCur())) : '' };
    openSheet(sAccount(S.draft), 'account');
  },
  async saveAccount() {
    if (!val('name').trim()) return toast('Give the account a name');
    const d = S.draft;
    const a = { id: d.id || uid(), name: val('name').trim(), icon: val('icon') || '🏦', openingEUR: round2(curToEur(parseAmount(val('opening')), dispCur())), order: d.order ?? S.accts.length };
    await upsert('accts', a);
    if (field('isDefault').checked) { S.settings.defaultAccount = a.id; await saveSettings(); }
    closeSheet(); render();
  },
  async deleteAccount() {
    const d = S.draft;
    if (S.accts.length <= 1) return toast('You need at least one account');
    const other = accounts().find(a => a.id !== d.id);
    const used = S.tx.filter(t => t.accountId === d.id);
    if (!confirm(used.length ? `Delete "${d.name}"? Its ${used.length} transactions move to "${other.name}".` : `Delete "${d.name}"?`)) return;
    for (const t of used) { t.accountId = other.id; await upsert('tx', t); }
    for (const r of S.recur.filter(r => r.accountId === d.id)) { r.accountId = other.id; await upsert('recur', r); }
    if (S.settings.defaultAccount === d.id) { S.settings.defaultAccount = other.id; await saveSettings(); }
    await remove('accts', d.id); closeSheet(); render();
  },

  // categories
  newCategory() { S.draft = { name: '', icon: '🏷️', color: '#007aff', type: S.ui.catsType }; openSheet(sCategory(S.draft), 'category'); },
  editCategory(el) {
    const c = S.cats.find(x => x.id === el.dataset.id); if (!c) return;
    S.draft = { ...c }; openSheet(sCategory(S.draft), 'category');
  },
  async saveCategory() {
    if (!val('name').trim()) return toast('Give the category a name');
    const d = S.draft;
    const c = { ...d, id: d.id || uid(), name: val('name').trim(), icon: val('icon') || '🏷️', color: val('color'), order: d.order ?? catsOf(d.type).length };
    await upsert('cats', c); closeSheet(); render();
  },
  async deleteCategory() {
    const d = S.draft;
    const others = catsOf(d.type).filter(c => c.id !== d.id);
    if (!others.length) return toast('You need at least one category');
    const target = others.find(c => /other/i.test(c.name)) || others[others.length - 1];
    const used = S.tx.filter(t => t.categoryId === d.id);
    if (!confirm(used.length ? `Delete "${d.name}"? Its ${used.length} transactions move to "${target.name}".` : `Delete "${d.name}"?`)) return;
    for (const t of used) { t.categoryId = target.id; await upsert('tx', t); }
    for (const r of S.recur.filter(r => r.categoryId === d.id)) { r.categoryId = target.id; await upsert('recur', r); }
    if (S.settings.budget.perCategory[d.id]) { delete S.settings.budget.perCategory[d.id]; await saveSettings(); }
    await remove('cats', d.id); closeSheet(); render();
  },

  // currencies & theme
  async toggleCur(el) {
    const c = el.dataset.v, st = S.settings;
    if (st.currencies.includes(c)) {
      if (c === st.defaultCurrency) return toast('That is your default currency');
      st.currencies = st.currencies.filter(x => x !== c);
    } else {
      st.currencies.push(c);
      if (!fx.rates()[c]) fx.refresh([c]).then(render).catch(() => {});
    }
    await saveSettings(); render();
  },
  theme(el) { S.settings.theme = el.dataset.v; applyTheme(); saveSettings(); render(); },

  // calendar
  calMode(el) { S.ui.calMode = el.dataset.v; render(); },
  calNav(el) {
    const n = +el.dataset.v, u = S.ui;
    if (u.calMode === 'month') u.calMonth = addMonthsKey(u.calMonth || curMonth(), n);
    else if (u.calMode === 'week') { const t = today(); const d = new Date(); const w = (d.getDay() + 6) % 7; u.calWeek = addDays(u.calWeek || addDays(t, -w), 7 * n); }
    else u.calYear = (u.calYear || +today().slice(0, 4)) + n;
    render();
  },
  calSel(el) { S.ui.calSel = el.dataset.v; render(); },
  calJump(el) { S.ui.calMode = 'month'; S.ui.calMonth = el.dataset.v.slice(0, 7); S.ui.calSel = el.dataset.v; render(); },
  calSelMonth(el) { S.ui.calSelMonth = el.dataset.v; render(); },
  calGroup(el) {
    S.tab = 'tx'; S.stack = []; S.ui.search = ''; S.ui.txType = 'all';
    S.ui.filter = { month: el.dataset.m, cat: el.dataset.cat, acct: '' };
    render(); top0();
  },

  // data
  async backup() {
    const data = { app: 'expense-tracker', version: 1, exportedAt: new Date().toISOString(), transactions: S.tx, categories: S.cats, accounts: S.accts, recurring: S.recur, goals: S.goals, settings: S.settings };
    await offerFile(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }), `expenses-backup-${today()}.json`);
  },
  restore() { $('restoreInput').value = ''; $('restoreInput').click(); },
  async eraseAll() {
    if (!confirm('Erase ALL data on this device? This cannot be undone.')) return;
    if (!confirm('Really erase everything? Consider making a backup first.')) return;
    await db.clearAll();
    try { localStorage.removeItem('theme'); } catch (e) { /* ignore */ }
    location.reload();
  },
  makeCsv(el) { exportCsv(el.dataset.v); },
  makePdf(el) { exportPdf(el.dataset.v); },
  async shareFile() {
    if (!pendingFile) return closeSheet();
    try { await navigator.share({ files: [pendingFile], title: pendingFile.name }); } catch (e) { if (!e || e.name !== 'AbortError') download(pendingFile); }
    closeSheet();
  },

  // toasts
  toastClose() { markPrompted(); hideToast(); },
  toastCsv() { const lm = addMonthsKey(curMonth(), -1); markPrompted(); hideToast(); exportCsv(lm); },
  toastPdf() { const lm = addMonthsKey(curMonth(), -1); markPrompted(); hideToast(); exportPdf(lm); },

  // welcome
  async finishWelcome() {
    const cur = val('cur') || 'GBP', b = round2(parseAmount(val('budget')));
    const st = S.settings;
    st.defaultCurrency = cur;
    st.currencies = [...new Set([cur, 'EUR', 'GBP', 'USD'])];
    st.budget = { mode: 'total', total: b > 0 ? b : 0, perCategory: {}, currency: cur };
    st.onboarded = true;
    st.lastCsvPromptMonth = curMonth();
    await saveSettings();
    closeSheet();
    if (!fx.rates()[cur]) { try { await fx.refresh([cur]); } catch (e) { /* offline */ } }
    render();
  },

  closeSheet() { if (sheetKind === 'welcome') return; closeSheet(); },
};

// ---------------------------------------------------------------- events
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]');
  if (!el || el.disabled) return;
  const fn = A[el.dataset.a];
  if (!fn) return;
  e.preventDefault();
  Promise.resolve(fn(el, e)).catch(err => { console.error(err); toast('Something went wrong', { sub: String(err.message || err) }); });
});

document.addEventListener('input', e => {
  const el = e.target;
  if (el.id === 'txSearch') { S.ui.search = el.value; S.ui.txLimit = 120; $('txList').innerHTML = vTxList(); }
  else if (el.id === 'curSearch') {
    S.ui.curSearch = el.value; const pos = el.selectionStart; render();
    const n = $('curSearch'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (err) { /* ignore */ } }
  }
  else if (el.name === 'amount' && sheet.contains(el)) updateConvHint();
  else if (el.name === 'icon' && sheetKind === 'category') { const p = $('catPrev'); if (p) p.textContent = el.value || '🏷️'; }
});

document.addEventListener('change', async e => {
  const el = e.target, k = el.dataset.change;
  if (!k) return;
  if (k === 'convHint') updateConvHint();
  else if (k === 'repeat') toggleSubRow();
  else if (k === 'defaultCurrency') {
    S.settings.defaultCurrency = el.value;
    if (!S.settings.currencies.includes(el.value)) S.settings.currencies.push(el.value);
    await saveSettings();
    if (!fx.rates()[el.value]) { try { await fx.refresh([el.value]); } catch (err) { /* offline */ } }
    render(); toast(`Showing amounts in ${el.value}`);
  } else if (k === 'reportMonth') { S.ui.reportMonth = el.value; render(); }
});

$('restoreInput').addEventListener('change', async e => {
  const f = e.target.files && e.target.files[0]; if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    if (data.app !== 'expense-tracker' || !Array.isArray(data.transactions)) throw new Error('This is not a backup from this app.');
    if (!confirm(`Restore backup from ${(data.exportedAt || '').slice(0, 10)} with ${data.transactions.length} transactions? Everything currently on this device is replaced.`)) return;
    await db.clearAll();
    await db.bulkPut('transactions', data.transactions);
    await db.bulkPut('categories', data.categories || []);
    await db.bulkPut('accounts', data.accounts || []);
    await db.bulkPut('recurring', data.recurring || []);
    await db.bulkPut('goals', data.goals || []);
    await db.kvSet('settings', { ...data.settings, onboarded: true, lastCsvPromptMonth: curMonth() });
    await load(); applyTheme(); render(); toast('Backup restored');
  } catch (err) { toast('Restore failed', { sub: String(err.message || err) }); }
});

document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState !== 'visible' || !S.settings) return;
  if (today() !== lastDay) {
    lastDay = today();
    await fx.init(S.settings.currencies);
    const n = await processRecurring();
    if (!sheetKind) render();
    maybeMonthlyPrompt();
    if (n) toast(`${n} recurring payment${n === 1 ? '' : 's'} added`);
  }
});
window.addEventListener('online', async () => { if (await resolvePending()) render(); });

// ---------------------------------------------------------------- boot
async function boot() {
  await load();
  let first = false;
  if (!S.settings) {
    const d = defaults();
    await db.bulkPut('categories', d.cats); await db.bulkPut('accounts', d.accts);
    S.cats = d.cats; S.accts = d.accts; S.settings = d.settings;
    await saveSettings();
    first = true;
  }
  if (!S.settings.onboarded) first = true;
  applyTheme();
  render();
  try { await fx.init(S.settings.currencies); } catch (e) { /* offline */ }
  const added = await processRecurring();
  render();
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  if (first) openSheet(sWelcome(), 'welcome');
  else {
    maybeMonthlyPrompt();
    if (added && !promptActive) toast(`${added} recurring payment${added === 1 ? '' : 's'} added`);
  }
  if (await resolvePending()) render();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}

boot().catch(err => {
  console.error(err);
  main.innerHTML = `<div class="empty"><div class="empty-e">⚠️</div><div class="empty-t">Couldn't start</div><div class="empty-s">${String(err.message || err)}</div></div>`;
});
