// views.js — every screen and sheet, rendered as HTML strings from state.
import {
  S, CURRENCIES, curName, PALETTE, esc, pad, today, parseD, curMonth, addMonthsKey, addDays, daysInMonth,
  monthName, fmtDate, dayLabel, daysBetween, startOfWeek, money, dispCur, fmtE, toDisp, eurToCur, curToEur, eurOf, rate,
  cat, acct, catsOf, accounts, sumRange, monthStats, byCategory, topN, accountBalanceEUR, hasBudget,
  totalBudgetEUR, catBudgetEUR, monthlyEquivalentEUR, occurrences, freqLabel, ymd, fmtT, fmtAxis, joe, spentByAccount,
} from './store.js';
import { lineChart, barChart, donut } from './charts.js';
import * as fx from './fx.js';

// ---------- icons ----------
const sv = (p, fill = false) => `<svg viewBox="0 0 24 24" class="i${fill ? ' f' : ''}" aria-hidden="true">${p}</svg>`;
export const I = {
  home: sv('<path d="M3.5 10.2 12 3.5l8.5 6.7V19.5a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z"/>'),
  list: sv('<path d="M8 6.5h12M8 12h12M8 17.5h12"/><circle cx="4" cy="6.5" r=".9"/><circle cx="4" cy="12" r=".9"/><circle cx="4" cy="17.5" r=".9"/>'),
  budget: sv('<path d="M11 4a8 8 0 1 0 9 9h-9z"/><path d="M14 3.2A8 8 0 0 1 20.8 10H14z"/>'),
  insights: sv('<path d="M5 20v-7M10 20V5M15 20v-9M20 20V8"/>'),
  more: sv('<circle cx="12" cy="12" r="9"/><circle cx="8" cy="12" r=".6"/><circle cx="12" cy="12" r=".6"/><circle cx="16" cy="12" r=".6"/>'),
  plus: sv('<path d="M12 5v14M5 12h14"/>'),
  gear: sv('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  filter: sv('<path d="M4 5h16l-6 7.5V19l-4-2v-4.5z"/>'),
  calendar: sv('<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
  chevL: sv('<path d="M15 5l-7 7 7 7"/>'),
  chevR: sv('<path d="M9 5l7 7-7 7"/>'),
  search: sv('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>'),
  x: sv('<path d="M6 6l12 12M18 6 6 18"/>'),
  check: sv('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  repeat: sv('<path d="M17 2.5 20.5 6 17 9.5"/><path d="M3.5 11.5V10a4 4 0 0 1 4-4h13"/><path d="M7 21.5 3.5 18 7 14.5"/><path d="M20.5 12.5V14a4 4 0 0 1-4 4h-13"/>'),
  target: sv('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8"/>'),
  wallet: sv('<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3"/><rect x="4" y="8" width="16.5" height="11.5" rx="2.5"/><circle cx="16.5" cy="13.8" r="1"/>'),
  tag: sv('<path d="M3.5 12.3V4.5a1 1 0 0 1 1-1h7.8l8.2 8.2a1.5 1.5 0 0 1 0 2.1l-6.7 6.7a1.5 1.5 0 0 1-2.1 0z"/><circle cx="8" cy="8" r="1.3"/>'),
  globe: sv('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.5 3.5 5.5 3.5 8.5s-1 6-3.5 8.5c-2.5-2.5-3.5-5.5-3.5-8.5s1-6 3.5-8.5z"/>'),
  moon: sv('<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>'),
  doc: sv('<path d="M14 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-10z"/><path d="M14 3.5v5h5M9 13h6M9 16.5h6"/>'),
  down: sv('<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>'),
  up: sv('<path d="M12 15.5V4.5M7 9l5-5 5 5M5 20h14"/>'),
  trash: sv('<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>'),
  info: sv('<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.6v.1"/>'),
  card: sv('<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18M7 15h3"/>'),
  eyeOff: sv('<path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c5 0 8.5 4.5 9.5 7a13 13 0 0 1-2.9 4.1M6.5 6.6C4.4 8 3 10.2 2.5 12c1 2.5 4.5 7 9.5 7a9.6 9.6 0 0 0 4.6-1.2"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>'),
  piggy: sv('<path d="M5 11a7 6 0 0 1 12.5-3.5L20 7v4l1 .5V14l-2 .5a7 6 0 0 1-2.5 3V20h-3v-1.5a8 8 0 0 1-3 0V20h-3v-2.6A6 6 0 0 1 5 11z"/><circle cx="15.5" cy="10.5" r=".7"/>'),
};

// ---------- small building blocks ----------
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);
const tint = c => `--c:${c}`;
const icon = (c, cls = '') => `<span class="ic ${cls}" style="${tint(c.color)}">${esc(c.icon)}</span>`;

function header(title, { right = '', back = false, eyebrow = '' } = {}) {
  return `<header class="nav">
    ${back ? `<button class="back" data-a="back">${I.chevL}<span>Back</span></button>` : ''}
    <div class="nav-row"><div class="nav-title">${eyebrow ? `<div class="eyebrow">${eyebrow}</div>` : ''}<h1>${title}</h1></div>
    <div class="nav-actions">${right}</div></div></header>`;
}
const iconBtn = (ic, a, attrs = '', badge = false) => `<button class="icon-btn${badge ? ' badge' : ''}" data-a="${a}" ${attrs}>${ic}</button>`;
const seg = (opts, cur, action, cls = '') => `<div class="seg ${cls}">${opts.map(([v, l]) => `<button data-a="${action}" data-v="${v}" class="${v === cur ? 'on' : ''}">${l}</button>`).join('')}</div>`;
const bar = (p, color) => `<div class="bar"><span style="width:${Math.min(100, Math.max(0, p))}%;background:${color}"></span></div>`;
const empty = (emoji, title, text, btn = '') => `<div class="empty"><div class="empty-e">${emoji}</div><div class="empty-t">${title}</div><div class="empty-s">${text}</div>${btn}</div>`;
const changeBadge = (chg, invert = true, cls = '') => {
  if (chg == null || !isFinite(chg)) return '';
  const good = invert ? chg <= 0 : chg >= 0;
  return `<span class="chg ${good ? 'good' : 'bad'} ${cls}">${chg <= 0 ? '↓' : '↑'} ${Math.abs(Math.round(chg * 100))}%</span>`;
};
const compact = v => fmtAxis(v);        // chart axes (plain text)
const compactT = v => fmtT(v, { compact: true }); // compact totals in HTML

export function txRow(t) {
  const c = cat(t.categoryId), a = acct(t.accountId);
  const title = t.note || c.name;
  const sub = [t.note ? c.name : null, a && a.name].filter(Boolean).join(' • ');
  const orig = t.currency !== dispCur() ? money(t.amount, t.currency) : '';
  return `<button class="row" data-a="editTx" data-id="${t.id}">${icon(c)}
    <span class="grow"><span class="t1">${esc(title)}</span><span class="t2">${esc(sub)}${t.recurringId ? ' • ↻' : ''}</span></span>
    <span class="amt"><span>${fmtE(eurOf(t))}</span>${orig ? `<small>${orig}${t.ratePending ? ' · rate pending' : ''}</small>` : ''}</span></button>`;
}

function dailyTotals(mk) {
  const d = {};
  for (const t of S.tx) if (t.type === 'expense' && t.date.startsWith(mk)) { const k = +t.date.slice(8); d[k] = (d[k] || 0) + eurOf(t); }
  return d;
}
function cumulative(mk, upto) {
  const daily = dailyTotals(mk), dim = daysInMonth(mk), out = [];
  let acc = 0;
  for (let i = 1; i <= dim; i++) { acc += daily[i] || 0; out.push(i <= upto ? acc : null); }
  return out;
}
function legend(items, total) {
  return `<div class="legend">${items.map(x => `<div class="lg"><i style="background:${x.cat.color}"></i><span class="grow">${esc(x.cat.name)}</span><b>${pct(x.value, total)}%</b></div>`).join('')}</div>`;
}

// ---------- tab bar ----------
export function tabBar() {
  const tabs = [['home', 'Home', I.home], ['tx', 'Expenses', I.list], ['budgets', 'Budgets', I.budget], ['insights', 'Insights', I.insights], ['more', 'More', I.more]];
  return tabs.map(([id, l, ic]) => `<button data-a="tab" data-v="${id}" class="${S.tab === id ? 'on' : ''}">${ic}<span>${l}</span></button>`).join('');
}

// =====================================================================
// HOME
// =====================================================================
export function vHome() {
  const mk = curMonth(), pk = addMonthsKey(mk, -1), m = monthStats(mk), p = monthStats(pk);
  const t = today(), dayN = +t.slice(8), dim = daysInMonth(mk);
  const pSame = sumRange(pk + '-01', pk + '-' + pad(Math.min(dayN, daysInMonth(pk))));
  const chg = pSame > 0 ? (m.spent - pSame) / pSame : null;
  const B = totalBudgetEUR(), hasB = hasBudget(), left = B - m.spent;
  const range = S.ui.homeRange;
  let chart;
  const heroLabel = '#9fb3c8';
  if (range === '1M') {
    const series = [];
    if (hasB) series.push({ values: Array.from({ length: dim }, (_, i) => (B * (i + 1)) / dim), color: 'rgba(255,255,255,.45)', width: 1.5, dash: '4 5' });
    const last = cumulative(pk, 31).slice(0, dim);
    while (last.length < dim) last.push(null);
    series.push({ values: last, color: 'rgba(255,255,255,.28)', width: 1.5 });
    series.push({ values: cumulative(mk, dayN), color: '#4cd98a', fill: true, dot: true, width: 3 });
    chart = lineChart({ series, n: dim, h: 150, grid: false, labelColor: heroLabel, xLabels: [[0, '1 ' + monthName(mk, 'short', false)], [Math.floor(dim / 2) - 1, String(Math.floor(dim / 2))], [dim - 1, String(dim)]] });
  } else {
    const N = { '3M': 3, '6M': 6, '1Y': 12 }[range];
    const months = Array.from({ length: N }, (_, i) => addMonthsKey(mk, i - N + 1));
    const series = [];
    if (hasB) series.push({ values: months.map(() => B), color: 'rgba(255,255,255,.45)', width: 1.5, dash: '4 5' });
    series.push({ values: months.map(k => monthStats(k).spent), color: '#4cd98a', fill: true, dot: true, width: 3, dots: N <= 6 });
    chart = lineChart({ series, n: N, h: 150, grid: false, labelColor: heroLabel, xLabels: months.map((k, i) => [i, monthName(k, 'short', false)]).filter((_, i) => N <= 6 || i % 3 === 0 || i === N - 1) });
  }
  const daysLeft = dim - dayN + 1;
  const cats = topN(byCategory(mk + '-01', mk + '-31'), 5);

  // upcoming recurring (next 14 days)
  const horizon = addDays(t, 14);
  const upcoming = S.recur.flatMap(r => occurrences(r, t, horizon).map(d => ({ r, d }))).sort((a, b) => a.d.localeCompare(b.d)).slice(0, 5);
  const byAcct = spentByAccount(mk + '-01', mk + '-31');
  const goals = S.goals.filter(g => g.saved < g.target).slice(0, 2);
  const recent = S.tx.slice(0, 5);

  return `
  ${header('My Finances', { eyebrow: new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }), right: iconBtn(I.gear, 'tab', 'data-v="more" aria-label="Settings"') })}
  <section class="hero">
    <div class="hero-top"><span>Spent in ${monthName(mk, 'long', false)}</span>${chg != null ? `<span class="hero-chg ${chg <= 0 ? 'good' : 'bad'}">${chg <= 0 ? '↓' : '↑'} ${Math.abs(Math.round(chg * 100))}% vs last month</span>` : ''}</div>
    <div class="hero-amt">${fmtT(m.spent)}</div>
    <div class="hero-sub">${hasB ? (left >= 0 ? `<b class="g">${fmtT(left)}</b> left of ${fmtT(B, { whole: true })} budget` : `<b class="r">${fmtT(-left)}</b> over your ${fmtT(B, { whole: true })} budget`) : `<button class="link-light" data-a="editBudget">Set a monthly budget →</button>`}</div>
    <div class="hero-chart">${chart}</div>
    ${seg([['1M', '1M'], ['3M', '3M'], ['6M', '6M'], ['1Y', '1Y']], range, 'homeRange', 'seg-dark')}
  </section>

  <div class="tiles">
    <div class="tile t-blue"><div class="tile-ic">${I.card}</div><div class="tile-l">Expenses</div><div class="tile-v">${fmtT(m.spent, { whole: m.spent >= 1000 })}</div><div class="tile-s">${m.count} payment${m.count === 1 ? '' : 's'} ${chg != null ? changeBadge(chg) : ''}</div></div>
    ${hasB
      ? `<div class="tile ${left >= 0 ? 't-green' : 't-red'}"><div class="tile-ic">${I.wallet}</div><div class="tile-l">Per day left</div><div class="tile-v">${fmtT(Math.max(0, left) / daysLeft)}</div><div class="tile-s">for ${daysLeft} day${daysLeft === 1 ? '' : 's'}</div></div>`
      : `<div class="tile t-green"><div class="tile-ic">${I.wallet}</div><div class="tile-l">Average / day</div><div class="tile-v">${fmtT(m.spent / dayN)}</div><div class="tile-s">this month</div></div>`}
  </div>


  <section class="card">
    <div class="card-h"><h3>Spending by category</h3>${iconBtn(I.chevR, 'tab', 'data-v="insights" aria-label="Insights"')}</div>
    ${cats.length ? `<div class="donut-row">${donut({ items: cats.map(x => ({ value: x.value, color: x.cat.color })), size: 140, thick: 22 })}${legend(cats, m.spent)}</div>`
      : empty('🧾', 'No spending yet', 'Tap + to add your first expense.')}
  </section>

  ${upcoming.length ? `<section class="card"><div class="card-h"><h3>Coming up</h3><button class="txt-btn" data-a="push" data-v="subs">All</button></div>
    ${upcoming.map(({ r, d }) => { const c = cat(r.categoryId); const n = daysBetween(t, d);
      return `<button class="row" data-a="editRecurring" data-id="${r.id}">${icon(c)}<span class="grow"><span class="t1">${esc(r.name)}</span><span class="t2">${n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : 'In ' + n + ' days'} · ${fmtDate(d, { day: 'numeric', month: 'short' })}</span></span><span class="amt"><span>${money(r.amount, r.currency)}</span></span></button>`; }).join('')}
  </section>` : ''}

  <section class="card">
    <div class="card-h"><h3>Paid with</h3><button class="txt-btn" data-a="push" data-v="accounts">Manage</button></div>
    ${accounts().map(a => `<div class="mini-row"><span>${esc(a.icon)} ${esc(a.name)}</span><span>${fmtT(byAcct[a.id] || 0)}</span></div>`).join('')}
  </section>

  ${goals.length ? `<section class="card"><div class="card-h"><h3>Savings goals</h3><button class="txt-btn" data-a="push" data-v="goals">All</button></div>
    ${goals.map(g => { const p = pct(g.saved, g.target); return `<button class="goal-mini" data-a="push" data-v="goals"><span class="ic" style="${tint(g.color || '#007aff')}">${esc(g.icon)}</span><span class="grow"><span class="row-sb"><b>${esc(g.name)}</b><span class="muted small">${money(g.saved, g.currency, { whole: true })} / ${money(g.target, g.currency, { whole: true })}</span></span>${bar(p, 'var(--blue)')}</span></button>`; }).join('')}
  </section>` : ''}

  <section class="card">
    <div class="card-h"><h3>Recent</h3><button class="txt-btn" data-a="tab" data-v="tx">See all</button></div>
    ${recent.length ? recent.map(txRow).join('') : `<div class="muted small pad">Nothing here yet.</div>`}
  </section>`;
}

// =====================================================================
// TRANSACTIONS
// =====================================================================
function filteredTx() {
  const u = S.ui;
  let list = S.tx.filter(t => t.type === 'expense');
  if (u.filter.month) list = list.filter(t => t.date.startsWith(u.filter.month));
  if (u.filter.cat) list = list.filter(t => t.categoryId === u.filter.cat);
  if (u.filter.acct) list = list.filter(t => t.accountId === u.filter.acct);
  if (u.search.trim()) {
    const q = u.search.trim().toLowerCase();
    list = list.filter(t => (t.note || '').toLowerCase().includes(q) || cat(t.categoryId).name.toLowerCase().includes(q)
      || ((acct(t.accountId) || {}).name || '').toLowerCase().includes(q) || String(t.amount).includes(q) || t.currency.toLowerCase() === q);
  }
  return list;
}
export function vTxList() {
  const list = filteredTx();
  if (!list.length) return S.tx.some(t => t.type === 'expense') ? empty('🔍', 'No matches', 'Try a different search or filter.') : empty('🧾', 'No transactions yet', 'Tap the + button to add your first expense.');
  const out = [];
  const spent = list.reduce((a, t) => a + eurOf(t), 0);
  out.push(`<div class="list-sum muted small">${list.length} expense${list.length === 1 ? '' : 's'} · ${fmtT(spent)}</div>`);
  let shown = 0, curDate = null, group = [];
  const flush = () => {
    if (!group.length) return;
    const sum = group.reduce((a, t) => a + eurOf(t), 0);
    out.push(`<section class="card day"><div class="day-h"><b>${dayLabel(curDate)}</b><span>${fmtT(sum)}</span></div>${group.map(txRow).join('')}</section>`);
    group = [];
  };
  for (const t of list) {
    if (shown >= S.ui.txLimit) break;
    if (t.date !== curDate) { flush(); curDate = t.date; }
    group.push(t); shown++;
  }
  flush();
  if (list.length > shown) out.push(`<button class="btn-secondary" data-a="moreTx">Show more (${list.length - shown} left)</button>`);
  return out.join('');
}
export function vTx() {
  const f = S.ui.filter;
  const active = [f.month && monthName(f.month, 'short'), f.cat && cat(f.cat).name, f.acct && (acct(f.acct) || {}).name].filter(Boolean);
  return `${header('Expenses', { right: iconBtn(I.filter, 'openFilter', 'aria-label="Filter"', active.length > 0) })}
  <div class="search">${I.search}<input id="txSearch" type="search" placeholder="Search expenses…" value="${esc(S.ui.search)}" autocomplete="off"></div>
  ${active.length ? `<div class="chips">${active.map(a => `<span class="fchip">${esc(a)}</span>`).join('')}<button class="txt-btn" data-a="clearFilter">Clear</button></div>` : ''}
  <div id="txList">${vTxList()}</div>`;
}

// =====================================================================
// BUDGETS
// =====================================================================
export function vBudgets() {
  const mk = S.ui.budgetMonth || curMonth(), isCur = mk === curMonth();
  const m = monthStats(mk), B = totalBudgetEUR(), hasB = hasBudget(), mode = S.settings.budget.mode;
  const dim = daysInMonth(mk), dayN = isCur ? +today().slice(8) : dim;
  const left = B - m.spent, used = B > 0 ? m.spent / B : 0;
  const barColor = used > 1 ? 'var(--red)' : used > 0.85 ? 'var(--orange)' : 'var(--green)';
  const monthNav = `<div class="month-nav"><button class="icon-btn" data-a="budgetMonth" data-v="-1">${I.chevL}</button><b>${monthName(mk)}</b><button class="icon-btn" data-a="budgetMonth" data-v="1" ${isCur ? 'disabled' : ''}>${I.chevR}</button></div>`;

  let top;
  if (!hasB) {
    top = `<section class="card">${empty('🎯', 'No budget yet', 'Set one total monthly budget, or a limit for each category.', `<button class="btn-primary" data-a="editBudget">Set budget</button>`)}</section>`;
  } else {
    top = `<section class="card budget-card">
      <div class="row-sb"><span class="muted">Monthly budget${mode === 'category' ? ' · by category' : ''}</span><button class="txt-btn" data-a="editBudget">Edit</button></div>
      <div class="row-sb baseline"><span class="big">${fmtT(B, { whole: true })}</span><span class="${left >= 0 ? 'g' : 'r'} strong">${fmtT(Math.abs(left))} ${left >= 0 ? 'left' : 'over'}</span></div>
      ${bar(used * 100, barColor)}
      <div class="row-sb muted small"><span>Spent ${fmtT(m.spent)}</span><span>${Math.round(used * 100)}%${isCur ? ` · day ${dayN} of ${dim}` : ''}</span></div>
    </section>`;
  }

  // categories
  const spentBy = m.byCat;
  let rows = catsOf('expense').map(c => ({ c, spent: spentBy[c.id] || 0, limit: catBudgetEUR(c.id) }));
  if (spentBy['']) rows.push({ c: cat(''), spent: spentBy[''], limit: 0 });
  rows = rows.filter(r => r.spent > 0 || r.limit > 0).sort((a, b) => (b.limit ? b.spent / b.limit : 0) - (a.limit ? a.spent / a.limit : 0) || b.spent - a.spent);
  const catHtml = rows.length ? rows.map(({ c, spent, limit }) => {
    const p = limit ? spent / limit : (m.spent ? spent / m.spent : 0);
    const color = limit && spent > limit ? 'var(--red)' : c.color;
    return `<div class="bud-row">${icon(c)}<div class="grow"><div class="row-sb"><b>${esc(c.name)}</b><b class="${limit && spent > limit ? 'r' : ''}">${limit ? Math.round(p * 100) + '%' : pct(spent, m.spent) + '% of spend'}</b></div>
      <div class="muted small">${fmtT(spent)}${limit ? ' / ' + fmtT(limit, { whole: true }) : ''}</div>${bar(p * 100, color)}</div></div>`;
  }).join('') : `<div class="muted small pad">No spending in ${monthName(mk, 'long', false)}.</div>`;

  // status
  let status = '';
  if (hasB && isCur && m.spent > 0) {
    const pace = used / (dayN / dim);
    const projected = (m.spent / dayN) * dim;
    const pk = addMonthsKey(mk, -1);
    const pSame = sumRange(pk + '-01', pk + '-' + pad(Math.min(dayN, daysInMonth(pk))));
    const vs = pSame > 0 ? (m.spent - pSame) / pSame : null;
    const vsText = vs == null ? '' : ` You're spending ${Math.abs(Math.round(vs * 100))}% ${vs <= 0 ? 'less' : 'more'} than at this point last month.`;
    if (left < 0) status = `<section class="status bad"><div class="st-e">⚠️</div><div><b>Over budget</b><p>You've gone ${fmtT(-left)} over.${vsText}</p></div></section>`;
    else if (pace <= 1.02) status = `<section class="status good"><div class="st-e">✅</div><div><b>On track!</b><p>You can spend ${fmtT(left / (dim - dayN + 1))} a day for the rest of the month.${vsText}</p></div></section>`;
    else status = `<section class="status warn"><div class="st-e">💡</div><div><b>Watch out</b><p>At this pace you'll spend about ${fmtT(projected, { whole: true })} this month.${vsText}</p></div></section>`;
  } else if (hasB && !isCur && m.spent > 0) {
    status = left >= 0
      ? `<section class="status good"><div class="st-e">🎉</div><div><b>Finished under budget</b><p>You stayed ${fmtT(left)} under your budget in ${monthName(mk, 'long', false)}.</p></div></section>`
      : `<section class="status bad"><div class="st-e">📉</div><div><b>Over budget</b><p>${monthName(mk, 'long', false)} ended ${fmtT(-left)} over budget.</p></div></section>`;
  }

  return `${header('Budgets', { right: iconBtn(I.calendar, 'push', 'data-v="calendar" aria-label="Calendar"') })}
  ${monthNav}
  ${top}
  <h2 class="sec">By category</h2>
  <section class="card">${catHtml}</section>
  ${status}`;
}

// =====================================================================
// INSIGHTS
// =====================================================================
function rangeBuckets(range) {
  const t = today();
  if (range === '1M') {
    const from = addDays(t, -29);
    return { kind: 'day', buckets: Array.from({ length: 30 }, (_, i) => { const d = addDays(from, i); return { from: d, to: d, label: String(+d.slice(8)) }; }), from, to: t, prevFrom: addDays(from, -30), prevTo: addDays(from, -1) };
  }
  if (range === '3M') {
    const start = addDays(startOfWeek(t), -7 * 12);
    const b = Array.from({ length: 13 }, (_, i) => { const f = addDays(start, i * 7); return { from: f, to: addDays(f, 6), label: fmtDate(f, { day: 'numeric', month: 'short' }) }; });
    return { kind: 'week', buckets: b, from: start, to: t, prevFrom: addDays(start, -91), prevTo: addDays(start, -1) };
  }
  const N = range === '6M' ? 6 : 12, mk = curMonth();
  const b = Array.from({ length: N }, (_, i) => { const k = addMonthsKey(mk, i - N + 1); return { from: k + '-01', to: k + '-31', label: monthName(k, 'short', false), mk: k }; });
  const pf = addMonthsKey(mk, -2 * N + 1) + '-01', pt = addMonthsKey(mk, -N) + '-31';
  return { kind: 'month', buckets: b, from: b[0].from, to: t, prevFrom: pf, prevTo: pt };
}
export function vInsights() {
  const range = S.ui.insRange, R = rangeBuckets(range);
  const vals = R.buckets.map(b => sumRange(b.from, b.to));
  const total = sumRange(R.from, R.to), prev = sumRange(R.prevFrom, R.prevTo);
  const chg = prev > 0 ? (total - prev) / prev : null;
  const yf = v => compact(v);
  const trendLabels = R.buckets.map((b, i) => [i, b.label]).filter((_, i, a) => {
    const n = a.length; if (n <= 6) return true; const step = R.kind === 'day' ? 7 : R.kind === 'week' ? 4 : 3; return i % step === 0 || i === n - 1;
  });
  const trend = lineChart({ series: [{ values: vals, color: 'var(--blue)', fill: true, dot: true, dots: R.buckets.length <= 13 }], n: vals.length, yFmt: yf, xLabels: trendLabels });

  // month vs last month (to date) and full
  const mk = curMonth(), pk = addMonthsKey(mk, -1), dayN = +today().slice(8);
  const thisMTD = monthStats(mk).spent, lastSame = sumRange(pk + '-01', pk + '-' + pad(Math.min(dayN, daysInMonth(pk)))), lastFull = monthStats(pk).spent;
  const mChg = lastSame > 0 ? (thisMTD - lastSame) / lastSame : null;
  // year vs last year
  const y = +mk.slice(0, 4), md = today().slice(5);
  const ytd = sumRange(`${y}-01-01`, today()), lytd = sumRange(`${y - 1}-01-01`, `${y - 1}-${md}`);
  const yChg = lytd > 0 ? (ytd - lytd) / lytd : null;
  const yBars = barChart({
    labels: Array.from({ length: 12 }, (_, i) => monthName(`${y}-${pad(i + 1)}`, 'narrow', false)),
    groups: Array.from({ length: 12 }, (_, i) => [{ value: monthStats(`${y - 1}-${pad(i + 1)}`).spent, color: 'var(--bar2)' }, { value: monthStats(`${y}-${pad(i + 1)}`).spent, color: 'var(--blue)' }]),
    yFmt: yf, h: 160,
  });
  // budget vs actual (6 months)
  const B = totalBudgetEUR(), hasB = hasBudget();
  const m6 = Array.from({ length: 6 }, (_, i) => addMonthsKey(mk, i - 5));
  const bva = barChart({ labels: m6.map(k => monthName(k, 'short', false)), groups: m6.map(k => { const s = monthStats(k).spent; return [{ value: s, color: hasB && s > B ? 'var(--red)' : 'var(--green)' }]; }), ref: hasB ? B : null, yFmt: yf, h: 150 });
  const catRows = hasB && S.settings.budget.mode === 'category'
    ? catsOf('expense').filter(c => catBudgetEUR(c.id) > 0).map(c => { const s = monthStats(mk).byCat[c.id] || 0, l = catBudgetEUR(c.id); return `<div class="mini-row"><span>${esc(c.icon)} ${esc(c.name)}</span><span class="${s > l ? 'r' : 'muted'}">${fmtT(s, { whole: true })} / ${fmtT(l, { whole: true })}</span></div>`; }).join('')
    : '';
  // category over time (stacked)
  const catTotals = byCategory(m6[0] + '-01', mk + '-31');
  const top = catTotals.slice(0, 5).map(x => x.cat);
  const stacked = barChart({
    labels: m6.map(k => monthName(k, 'short', false)), stacked: true, yFmt: yf, h: 170,
    groups: m6.map(k => { const bc = monthStats(k).byCat; const segs = top.map(c => ({ value: bc[c.id] || 0, color: c.color })); const other = Object.entries(bc).filter(([id]) => !top.some(c => c.id === id)).reduce((a, [, v]) => a + v, 0); segs.push({ value: other, color: '#8e8e93' }); return segs; }),
  });
  // top categories in range
  const cats = byCategory(R.from, R.to);
  const prevCats = Object.fromEntries(byCategory(R.prevFrom, R.prevTo).map(x => [x.cat.id, x.value]));
  const t5 = topN(cats, 5);
  // insight
  let insight = '';
  if (prev > 0 && total > 0) {
    const d = prev - total;
    insight = d >= 0
      ? `<section class="status good"><div class="st-e">⭐️</div><div><b>Great work!</b><p>You spent ${fmtT(d)} less than in the previous ${R.kind === 'day' ? '30 days' : R.kind === 'week' ? '3 months' : range === '6M' ? '6 months' : '12 months'}.</p></div></section>`
      : `<section class="status warn"><div class="st-e">💡</div><div><b>Spending is up</b><p>${fmtT(-d)} more than the previous period${cats[0] ? ` — ${esc(cats[0].cat.name)} is your biggest category` : ''}.</p></div></section>`;
  }

  return `${header('Insights', { right: iconBtn(I.doc, 'push', 'data-v="reports" aria-label="Reports"') })}
  ${seg([['1M', '1M'], ['3M', '3M'], ['6M', '6M'], ['1Y', '1Y']], range, 'insRange', 'seg-wide seg-blue')}
  <section class="card">
    <div class="muted">Spending trend</div>
    <div class="row-base"><span class="big">${fmtT(total, { whole: total >= 1000 })}</span>${changeBadge(chg)}<span class="muted small">vs previous period</span></div>
    ${total ? trend : empty('📈', 'No data for this period', 'Add a few expenses and trends appear here.')}
  </section>

  <h2 class="sec">Comparisons</h2>
  <section class="card">
    <div class="card-h"><h3>This month vs last month</h3>${changeBadge(mChg)}</div>
    <div class="cmp">
      <div><span class="muted small">${monthName(mk, 'long', false)} so far</span><b>${fmtT(thisMTD)}</b>${bar(pct(thisMTD, Math.max(thisMTD, lastSame, lastFull)), 'var(--blue)')}</div>
      <div><span class="muted small">${monthName(pk, 'long', false)}, same ${dayN} days</span><b>${fmtT(lastSame)}</b>${bar(pct(lastSame, Math.max(thisMTD, lastSame, lastFull)), 'var(--bar2)')}</div>
      <div><span class="muted small">${monthName(pk, 'long', false)}, full month</span><b>${fmtT(lastFull)}</b>${bar(pct(lastFull, Math.max(thisMTD, lastSame, lastFull)), 'var(--bar2)')}</div>
    </div>
  </section>
  <section class="card">
    <div class="card-h"><h3>This year vs last year</h3>${changeBadge(yChg)}</div>
    <div class="ov two"><div><span class="muted small">${y} to date</span><b>${fmtT(ytd, { whole: true })}</b></div><div><span class="muted small">${y - 1}, same period</span><b>${fmtT(lytd, { whole: true })}</b></div></div>
    ${yBars}
    <div class="keys"><span><i style="background:var(--bar2)"></i>${y - 1}</span><span><i style="background:var(--blue)"></i>${y}</span></div>
  </section>
  <section class="card">
    <div class="card-h"><h3>Actual vs budget</h3>${hasB ? `<span class="muted small">budget ${fmtT(B, { whole: true })}</span>` : `<button class="txt-btn" data-a="editBudget">Set budget</button>`}</div>
    ${bva}
    ${catRows ? `<div class="mt8"><div class="muted small mb4">${monthName(mk, 'long', false)} by category</div>${catRows}</div>` : ''}
  </section>
  <section class="card">
    <div class="card-h"><h3>Categories over time</h3><span class="muted small">6 months</span></div>
    ${catTotals.length ? stacked + `<div class="keys">${top.map(c => `<span><i style="background:${c.color}"></i>${esc(c.name)}</span>`).join('')}${catTotals.length > 5 ? '<span><i style="background:#8e8e93"></i>Other</span>' : ''}</div>` : '<div class="muted small pad">No data yet.</div>'}
  </section>

  <h2 class="sec">Top categories</h2>
  <section class="card">
    ${cats.length ? `<div class="donut-row">${donut({ items: t5.map(x => ({ value: x.value, color: x.cat.color })), size: 140, thick: 22 })}${legend(t5, total)}</div>
    <div class="mt8">${cats.slice(0, 8).map(x => { const p = prevCats[x.cat.id] || 0; const c = p > 0 ? (x.value - p) / p : null; return `<div class="mini-row"><span>${esc(x.cat.icon)} ${esc(x.cat.name)}</span><span>${changeBadge(c, true, 'sm')} ${fmtT(x.value)}</span></div>`; }).join('')}</div>`
      : '<div class="muted small pad">No spending in this period.</div>'}
  </section>
  ${insight}
  <button class="btn-secondary" data-a="push" data-v="reports">${I.doc} Monthly report (PDF / CSV)</button>`;
}

// =====================================================================
// MORE
// =====================================================================
const moreRow = (ic, title, sub, action, val = '', extra = '') => `<button class="mrow" data-a="${action}" ${extra}><span class="mic">${ic}</span><span class="grow"><span class="t1">${title}</span>${sub ? `<span class="t2">${sub}</span>` : ''}</span>${val ? `<span class="muted small">${val}</span>` : ''}${I.chevR}</button>`;
export function vMore() {
  const st = S.settings;
  const fi = fx.info();
  const standalone = window.navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
  return `${header('More')}
  ${!standalone ? `<section class="status warn"><div class="st-e">📲</div><div><b>Add to Home Screen</b><p>In Safari tap Share → Add to Home Screen and always open it from that icon. Data saved in a Safari tab is kept separately from the Home Screen app.</p></div></section>` : ''}
  <h2 class="sec">Plan</h2>
  <section class="card list">
    ${moreRow(I.calendar, 'Calendar', 'See exactly when money goes out', 'push', '', 'data-v="calendar"')}
    ${moreRow(I.repeat, 'Subscriptions & recurring', 'Rent, Netflix, gym, phone…', 'push', String(S.recur.filter(r => r.active).length), 'data-v="subs"')}
    ${moreRow(I.target, 'Savings goals', 'Track what you are saving for', 'push', String(S.goals.length || ''), 'data-v="goals"')}
  </section>
  <h2 class="sec">Manage</h2>
  <section class="card list">
    ${moreRow(I.budget, 'Budgets', 'Monthly limits', 'editBudget', hasBudget() ? fmtT(totalBudgetEUR(), { whole: true }) : 'Not set')}
    ${moreRow(I.wallet, 'Accounts', 'Cash, current account, savings…', 'push', String(S.accts.length), 'data-v="accounts"')}
    ${moreRow(I.tag, 'Categories', 'Edit, add and recolour', 'push', String(catsOf('expense').length), 'data-v="categories"')}
  </section>
  <h2 class="sec">Preferences</h2>
  <section class="card list">
    ${moreRow(I.globe, 'Currencies', 'Default and available currencies', 'push', st.defaultCurrency, 'data-v="currencies"')}
    <div class="mrow static"><span class="mic">${I.moon}</span><span class="grow"><span class="t1">Appearance</span></span>${seg([['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']], st.theme, 'theme', 'seg-sm')}</div>
    <label class="mrow static"><span class="mic">${I.eyeOff}</span><span class="grow"><span class="t1">Joe Mode</span><span class="t2">Blur all totals so you can spend guilt-free. Everything is still tracked and exported.</span></span><input type="checkbox" class="switch" data-change="joeMode" ${st.joeMode ? 'checked' : ''}></label>
  </section>
  <h2 class="sec">Reports & data</h2>
  <section class="card list">
    ${moreRow(I.doc, 'Monthly reports', 'PDF summary or CSV export (EUR)', 'push', '', 'data-v="reports"')}
    ${moreRow(I.up, 'Import CSV exports', 'Bring back entries from monthly CSVs — adds missing categories', 'importCsv')}
    ${moreRow(I.down, 'Back up all data', 'Save a .json file to Files / iCloud Drive', 'backup')}
    ${moreRow(I.up, 'Restore from backup', 'Replaces everything on this device', 'restore')}
  </section>
  <section class="card about muted small">
    <p>${S.tx.filter(t => t.type === 'expense').length} expenses stored on this iPhone only. Nothing is uploaded — someone else opening the same link sees an empty app.</p>
    <p>Exchange rates: ${esc(fi.source || 'not loaded yet')}${fi.date ? `, ${fmtDate(fi.date)}` : ''}. Every entry is converted to EUR with the rate for its date.</p>
    <p id="persistInfo"></p>
    <button class="txt-btn r" data-a="eraseAll">Erase all data</button>
  </section>`;
}

// =====================================================================
// PUSHED PAGES
// =====================================================================
function catGroups(txs) {
  const g = {};
  for (const t of txs) {
    if (t.type !== 'expense') continue;
    const k = t.type + ':' + t.categoryId;
    (g[k] = g[k] || { type: t.type, c: cat(t.categoryId), items: [] }).items.push(t);
  }
  return Object.values(g).sort((a, b) => b.items.reduce((s, t) => s + eurOf(t), 0) - a.items.reduce((s, t) => s + eurOf(t), 0)).map(({ type, c, items }) => {
    const sum = items.reduce((s, t) => s + eurOf(t), 0);
    const notes = [...new Set(items.map(t => t.note).filter(Boolean))].slice(0, 3).join(', ');
    const accs = [...new Set(items.map(t => (acct(t.accountId) || {}).name).filter(Boolean))];
    const one = items.length === 1;
    return `<button class="row" ${one ? `data-a="editTx" data-id="${items[0].id}"` : `data-a="calGroup" data-cat="${c.id}" data-m="${items[0].date.slice(0, 7)}"`}>${icon(c)}<span class="grow"><span class="t1">${esc(c.name)}${one ? '' : ` <span class="cnt">${items.length}</span>`}</span><span class="t2">${esc(notes || (one ? '' : 'Several entries'))}</span></span><span class="amt"><span>${one ? fmtE(sum) : fmtT(sum)}</span><small>${esc(accs.length === 1 ? accs[0] : accs.length + ' accounts')}</small></span></button>`;
  }).join('');
}
function scheduledRows(dateFrom, dateTo) {
  const items = S.recur.flatMap(r => occurrences(r, dateFrom, dateTo).map(d => ({ r, d })));
  return items.map(({ r, d }) => `<button class="row sched" data-a="editRecurring" data-id="${r.id}">${icon(cat(r.categoryId))}<span class="grow"><span class="t1">${esc(r.name)}</span><span class="t2">Scheduled · ${fmtDate(d, { day: 'numeric', month: 'short' })}</span></span><span class="amt"><span>${money(r.amount, r.currency)}</span></span></button>`).join('');
}
// Apple-Calendar-style day cell: number + one small dot.
// grey dot = spent that day, red dot = spent more than the daily share of the monthly budget,
// hollow dot = a recurring payment is scheduled. Today = blue number, selected = blue ring.
function dailyBudgetEUR(ds) { return hasBudget() ? totalBudgetEUR() / daysInMonth(ds.slice(0, 7)) : 0; }
function dayCell(ds, spent, { t, sel, sched, action }) {
  const lim = dailyBudgetEUR(ds);
  const dot = spent > 0 ? (lim && spent > lim ? 'over' : 'spent') : (sched ? 'sched' : '');
  const cls = ['cday', ds === t && 'today', ds === sel && 'sel', ds > t && 'fut'].filter(Boolean).join(' ');
  return `<button class="${cls}" data-a="${action}" data-v="${ds}"><span class="num">${+ds.slice(8)}</span><i class="dot ${dot}"></i></button>`;
}
function calLegend(ds) {
  const lim = dailyBudgetEUR(ds);
  return `<div class="cal-legend"><span><i class="dot spent"></i>Spent</span>${lim ? `<span><i class="dot over"></i>Over ${fmtT(lim)}/day</span>` : ''}<span><i class="dot sched"></i>Scheduled</span></div>`;
}
const WEEKDAYS = `<div class="cal-grid wd">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(x => `<span>${x}</span>`).join('')}</div>`;

export function vCalendar() {
  const mode = S.ui.calMode, t = today();
  let body = '', title = '', total = 0;
  const exp = (f, to) => S.tx.filter(x => x.type === 'expense' && x.date >= f && x.date <= to);
  if (mode === 'month') {
    const mk = S.ui.calMonth || curMonth();
    const dim = daysInMonth(mk), first = (parseD(mk + '-01').getDay() + 6) % 7;
    const daily = dailyTotals(mk);
    const sched = new Set(S.recur.flatMap(r => occurrences(r, addDays(t, 1) > mk + '-01' ? addDays(t, 1) : mk + '-01', mk + '-31')));
    total = Object.values(daily).reduce((a, v) => a + v, 0);
    const sel = S.ui.calSel && S.ui.calSel.startsWith(mk) ? S.ui.calSel : (t.startsWith(mk) ? t : mk + '-01');
    let cells = '';
    for (let i = 0; i < first; i++) cells += '<span class="blank"></span>';
    for (let d = 1; d <= dim; d++) {
      const ds = `${mk}-${pad(d)}`;
      cells += dayCell(ds, daily[d] || 0, { t, sel, sched: sched.has(ds), action: 'calSel' });
    }
    const dayTx = exp(sel, sel), daySum = dayTx.reduce((a, x) => a + eurOf(x), 0);
    title = monthName(mk);
    body = `${calLegend(mk + '-01')}${WEEKDAYS}
      <div class="cal-grid days">${cells}</div>
      <div class="cal-h">${parseD(sel).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric' })} · ${fmtT(daySum)}</div>
      <section class="card">${catGroups(dayTx) || ''}${scheduledRows(sel > t ? sel : addDays(t, 1), sel)}${!dayTx.length && sel <= t ? '<div class="muted small pad">No spending on this day.</div>' : ''}</section>`;
  } else if (mode === 'week') {
    const ws = S.ui.calWeek || startOfWeek(t), we = addDays(ws, 6);
    const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
    const per = days.map(d => S.tx.filter(x => x.type === 'expense' && x.date === d).reduce((a, x) => a + eurOf(x), 0));
    const sched = new Set(S.recur.flatMap(r => occurrences(r, addDays(t, 1), we)));
    total = per.reduce((a, v) => a + v, 0);
    title = `${fmtDate(ws, { day: 'numeric', month: 'short' })} – ${fmtDate(we, { day: 'numeric', month: 'short' })}`;
    body = `${calLegend(ws)}${WEEKDAYS}
      <div class="cal-grid days">${days.map((d, i) => dayCell(d, per[i], { t, sel: null, sched: sched.has(d), action: 'calJump' })).join('')}</div>
      ${[...days].reverse().map((d, i) => { const txs = exp(d, d); const sc = d > t ? scheduledRows(d, d) : ''; if (!txs.length && !sc) return ''; const s = per[6 - i];
        return `<div class="cal-h">${parseD(d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric' })} · ${fmtT(s)}</div><section class="card">${catGroups(txs)}${sc}</section>`; }).join('') || '<div class="muted small pad center">No spending this week.</div>'}`;
  } else {
    const y = S.ui.calYear || +t.slice(0, 4);
    const months = Array.from({ length: 12 }, (_, i) => `${y}-${pad(i + 1)}`);
    const per = months.map(k => monthStats(k).spent), B = hasBudget() ? totalBudgetEUR() : 0;
    total = per.reduce((a, v) => a + v, 0);
    const selM = S.ui.calSelMonth && S.ui.calSelMonth.startsWith(String(y)) ? S.ui.calSelMonth : (t.startsWith(String(y)) ? t.slice(0, 7) : `${y}-01`);
    title = String(y);
    body = `<div class="cal-legend"><span><i class="dot spent"></i>Spent</span>${B ? `<span><i class="dot over"></i>Over budget</span>` : ''}</div><div class="year-grid">${months.map((k, i) => `<button class="ymon${k === t.slice(0, 7) ? ' today' : ''}${k === selM ? ' sel' : ''}${k > t.slice(0, 7) ? ' fut' : ''}" data-a="calSelMonth" data-v="${k}"><b>${monthName(k, 'short', false)}</b><small>${per[i] ? compactT(per[i]) : '–'}</small><i class="dot ${per[i] > 0 ? (B && per[i] > B ? 'over' : 'spent') : ''}"></i></button>`).join('')}</div>
      
      <div class="cal-h">${monthName(selM)} · ${fmtT(per[+selM.slice(5) - 1])}</div>
      <section class="card">${catGroups(exp(selM + '-01', selM + '-31')) || '<div class="muted small pad">No spending this month.</div>'}</section>`;
  }
  return `${header('Calendar', { back: true })}
    <div class="month-nav"><button class="icon-btn" data-a="calNav" data-v="-1">${I.chevL}</button><div class="center"><b>${title}</b><div class="muted small">Total ${fmtT(total)}</div></div><button class="icon-btn" data-a="calNav" data-v="1">${I.chevR}</button></div>
    ${body}
    <div style="height:64px"></div>
    <div class="float-seg">${seg([['week', 'Weekly'], ['month', 'Monthly'], ['year', 'Yearly']], mode, 'calMode')}</div>`;
}

export function vSubs() {
  const act = S.recur.filter(r => r.active && r.type === 'expense');
  const monthly = act.reduce((a, r) => a + monthlyEquivalentEUR(r), 0);
  const subsMonthly = act.filter(r => r.isSub).reduce((a, r) => a + monthlyEquivalentEUR(r), 0);
  const row = r => {
    const c = cat(r.categoryId);
    return `<button class="row${r.active ? '' : ' paused'}" data-a="editRecurring" data-id="${r.id}">${icon(c)}<span class="grow"><span class="t1">${esc(r.name)}</span><span class="t2">${freqLabel(r.frequency)} · ${r.active ? 'next ' + fmtDate(r.nextDate, { day: 'numeric', month: 'short' }) : 'paused'}</span></span>
      <span class="amt"><span>${money(r.amount, r.currency)}</span>${r.frequency !== 'monthly' ? `<small>≈ ${fmtE(monthlyEquivalentEUR(r))}/mo</small>` : ''}</span></button>`;
  };
  const sort = l => l.sort((a, b) => (b.active - a.active) || a.nextDate.localeCompare(b.nextDate));
  const subs = sort(S.recur.filter(r => r.isSub && r.type === 'expense'));
  const bills = sort(S.recur.filter(r => !r.isSub && r.type === 'expense'));
  return `${header('Recurring', { back: true, right: iconBtn(I.plus, 'newRecurring', 'aria-label="Add"') })}
  <section class="card">
    <div class="ov"><div><span class="muted small">Per month</span><b>${fmtT(monthly)}</b></div><div><span class="muted small">Per year</span><b>${fmtT(monthly * 12, { whole: true })}</b></div><div><span class="muted small">Subscriptions</span><b>${fmtT(subsMonthly)}</b></div></div>
  </section>
  ${!S.recur.some(r => r.type === 'expense') ? `<section class="card">${empty('🔁', 'Nothing recurring yet', 'Add rent, Netflix, Spotify, your phone bill or gym. They are added to your transactions automatically when due.', `<button class="btn-primary" data-a="newRecurring">Add recurring payment</button>`)}</section>` : ''}
  ${subs.length ? `<h2 class="sec">Subscriptions</h2><section class="card">${subs.map(row).join('')}</section>` : ''}
  ${bills.length ? `<h2 class="sec">Bills & regular payments</h2><section class="card">${bills.map(row).join('')}</section>` : ''}`;
}

function goalStatus(g) {
  if (g.saved >= g.target) return { label: '🏆 achieved', cls: 'good' };
  if (!g.targetDate) return { label: '', cls: '' };
  const start = ymd(new Date(g.createdAt || Date.now()));
  const total = Math.max(1, daysBetween(start, g.targetDate)), elapsed = Math.max(0, daysBetween(start, today()));
  if (today() > g.targetDate) return { label: '⏰ overdue', cls: 'bad' };
  const expected = Math.min(1, elapsed / total);
  return g.saved / g.target >= expected - 0.02 ? { label: '👍 on track', cls: 'good' } : { label: '🐢 behind', cls: 'warn' };
}
export function vGoals() {
  const tab = S.ui.goalsTab;
  const active = S.goals.filter(g => g.saved < g.target), done = S.goals.filter(g => g.saved >= g.target);
  const list = (tab === 'active' ? active : done).sort((a, b) => (a.targetDate || '9').localeCompare(b.targetDate || '9'));
  const card = g => {
    const p = pct(g.saved, g.target), st = goalStatus(g);
    const months = g.targetDate ? Math.max(0, Math.round(daysBetween(today(), g.targetDate) / 30.4)) : null;
    const need = months ? (g.target - g.saved) / months : null;
    return `<section class="card goal">
      <div class="row-sb"><div class="goal-h"><span class="ic big" style="${tint(g.color || '#007aff')}">${esc(g.icon)}</span><div><b>${esc(g.name)}</b>${g.targetDate ? `<div class="muted small">Target: ${fmtDate(g.targetDate, { day: 'numeric', month: 'long', year: 'numeric' })}</div>` : ''}</div></div>${iconBtn(I.more, 'editGoal', `data-id="${g.id}" aria-label="Edit"`)}</div>
      <div class="row-sb baseline mt12"><span class="big">${money(g.saved, g.currency)}</span><span class="muted">goal: <b class="txt">${money(g.target, g.currency, { whole: true })}</b></span></div>
      <div class="gbar"><span style="width:${Math.min(100, p)}%"></span></div>
      <div class="row-sb muted small"><span>${p}% saved</span>${months != null && g.saved < g.target ? `<span><b class="txt">${months}</b> month${months === 1 ? '' : 's'} to go</span>` : ''}</div>
      <div class="row-sb mt12"><span class="muted small">${g.saved < g.target ? `Left to save: <b class="txt">${money(g.target - g.saved, g.currency, { whole: true })}</b>${need ? ` · ${money(need, g.currency, { whole: true })}/mo` : ''}` : 'Goal reached 🎉'}</span>${st.label ? `<span class="badge-pill ${st.cls}">${st.label}</span>` : ''}</div>
      ${g.saved < g.target ? `<button class="btn-tonal mt12" data-a="addToGoal" data-id="${g.id}">${I.plus} Add money</button>` : ''}
    </section>`;
  };
  return `${header('Savings goals', { back: true, right: iconBtn(I.plus, 'newGoal', 'aria-label="Add goal"') })}
  <div class="tabs2"><button data-a="goalsTab" data-v="active" class="${tab === 'active' ? 'on' : ''}">Active <b>${active.length}</b></button><button data-a="goalsTab" data-v="done" class="${tab === 'done' ? 'on' : ''}">Achieved <b>${done.length}</b></button></div>
  ${list.length ? list.map(card).join('') : `<section class="card">${tab === 'active' ? empty('🎯', 'No active goals', 'Saving for a car, a holiday or an emergency fund? Add a goal to track it.', `<button class="btn-primary" data-a="newGoal">New goal</button>`) : empty('🏆', 'Nothing achieved yet', 'Completed goals show up here.')}</section>`}`;
}

export function vAccounts() {
  const mk = curMonth(), spent = spentByAccount(mk + '-01', mk + '-31');
  return `${header('Accounts', { back: true, right: iconBtn(I.plus, 'newAccount', 'aria-label="Add account"') })}
  <p class="hint">How you paid. Amounts are what went out in ${monthName(mk, 'long', false)}.</p>
  <section class="card">${accounts().map(a => { const n = S.tx.filter(t => t.type === 'expense' && t.accountId === a.id).length;
    return `<button class="row" data-a="editAccount" data-id="${a.id}"><span class="ic" style="--c:#007aff">${esc(a.icon)}</span><span class="grow"><span class="t1">${esc(a.name)}${S.settings.defaultAccount === a.id ? ' <span class="cnt">default</span>' : ''}</span><span class="t2">${n} expense${n === 1 ? '' : 's'} in total</span></span><span class="amt"><span>${fmtT(spent[a.id] || 0)}</span><small>this month</small></span></button>`; }).join('')}</section>`;
}

export function vCategories() {
  const type = 'expense';
  return `${header('Categories', { back: true, right: iconBtn(I.plus, 'newCategory', 'aria-label="Add category"') })}
  <section class="card">${catsOf(type).map(c => { const n = S.tx.filter(t => t.categoryId === c.id).length;
    return `<button class="row" data-a="editCategory" data-id="${c.id}">${icon(c)}<span class="grow"><span class="t1">${esc(c.name)}</span><span class="t2">${n} expense${n === 1 ? '' : 's'}${catBudgetEUR(c.id) ? ' · limit ' + fmtT(catBudgetEUR(c.id), { whole: true }) : ''}</span></span>${I.chevR}</button>`; }).join('')}</section>`;
}

export function vCurrencies() {
  const st = S.settings, q = S.ui.curSearch.trim().toLowerCase();
  const list = CURRENCIES.filter(([c, n]) => !q || c.toLowerCase().includes(q) || n.toLowerCase().includes(q));
  return `${header('Currencies', { back: true })}
  <section class="card list">
    <label class="field"><span>Default currency</span><select data-change="defaultCurrency">${st.currencies.map(c => `<option value="${c}" ${c === st.defaultCurrency ? 'selected' : ''}>${c} · ${esc(curName(c))}</option>`).join('')}</select></label>
  </section>
  <p class="hint">Everything is shown in your default currency. Behind the scenes each entry is also stored in EUR using the exchange rate of its date, and CSV exports are in EUR.</p>
  <h2 class="sec">Available when adding</h2>
  <div class="search">${I.search}<input id="curSearch" type="search" placeholder="Search currencies…" value="${esc(S.ui.curSearch)}"></div>
  <section class="card" id="curList">${list.map(([c, n]) => { const on = st.currencies.includes(c); const r = rate(c);
    return `<button class="row" data-a="toggleCur" data-v="${c}"><span class="ic cur">${c}</span><span class="grow"><span class="t1">${esc(n)}</span><span class="t2">${r ? `1 EUR = ${r.toLocaleString('en-GB', { maximumFractionDigits: 4 })} ${c}` : 'rate loads when online'}</span></span>${on ? `<span class="chk">${I.check}</span>` : '<span class="chk off"></span>'}</button>`; }).join('')}</section>`;
}

export function vReports() {
  const months = [...new Set(S.tx.filter(t => t.type === 'expense').map(t => t.date.slice(0, 7)))].sort().reverse();
  const cm = curMonth();
  if (!months.includes(cm)) months.unshift(cm);
  const mk = S.ui.reportMonth && months.includes(S.ui.reportMonth) ? S.ui.reportMonth : (months.includes(addMonthsKey(cm, -1)) ? addMonthsKey(cm, -1) : months[0]);
  const m = monthStats(mk), days = mk === cm ? +today().slice(8) : daysInMonth(mk);
  return `${header('Reports', { back: true })}
  <section class="card list"><label class="field"><span>Month</span><select data-change="reportMonth">${months.map(k => `<option value="${k}" ${k === mk ? 'selected' : ''}>${monthName(k)}</option>`).join('')}</select></label></section>
  <section class="card">
    <div class="ov"><div><span class="muted small">Spent</span><b>${fmtT(m.spent, { whole: true })}</b></div><div><span class="muted small">Per day</span><b>${fmtT(m.spent / days)}</b></div><div><span class="muted small">Expenses</span><b>${m.count}</b></div></div>
  </section>
  <button class="btn-primary" data-a="makePdf" data-v="${mk}">${I.doc} Create PDF report</button>
  <button class="btn-secondary" data-a="makeCsv" data-v="${mk}">${I.down} Monthly summary CSV</button>
  <p class="hint">The PDF covers spending, budget, categories and daily pattern, then lists the biggest expenses and every expense by date. The monthly summary CSV has one column per category and a single row with ${monthName(mk)}'s totals in EUR.</p>
  <h2 class="sec">All expenses</h2>
  <button class="btn-secondary" data-a="makeAllCsv">${I.down} All expenses CSV</button>
  <p class="hint">Every expense ever recorded, one per row (date, amount in EUR, category, description, account, original amount and currency). This is the best file to keep as a backup — importing it under More → Import CSV exports brings everything back exactly. Monthly summary CSVs can be imported too, as one entry per category per month.</p>`;
}

export function renderPage(p) {
  return ({ calendar: vCalendar, subs: vSubs, goals: vGoals, accounts: vAccounts, categories: vCategories, currencies: vCurrencies, reports: vReports }[p] || vHome)();
}
export function renderTab(t) {
  return ({ home: vHome, tx: vTx, budgets: vBudgets, insights: vInsights, more: vMore }[t] || vHome)();
}

// =====================================================================
// SHEETS
// =====================================================================
const sheetHead = (title, right = '') => `<div class="sheet-head"><button class="txt-btn" data-a="closeSheet">Cancel</button><h2>${title}</h2><span class="sh-r">${right}</span></div>`;
const curOptions = (sel) => {
  const list = [...new Set([...S.settings.currencies, sel])];
  return list.map(c => `<option value="${c}" ${c === sel ? 'selected' : ''}>${c}</option>`).join('');
};
const acctOptions = sel => accounts().map(a => `<option value="${a.id}" ${a.id === sel ? 'selected' : ''}>${esc(a.icon)} ${esc(a.name)}</option>`).join('');
const catChips = (type, sel, action = 'pickCat') => `<div class="cat-grid">${catsOf(type).map(c => `<button type="button" class="chip${c.id === sel ? ' on' : ''}" data-a="${action}" data-id="${c.id}" style="${tint(c.color)}"><span>${esc(c.icon)}</span><small>${esc(c.name)}</small></button>`).join('')}</div>`;
const amtVal = v => (v || v === 0) && v !== '' ? String(v) : '';

export function sTx(d) {
  return `${sheetHead(d.id ? 'Edit expense' : 'Add expense')}
  <div class="amount-wrap"><select name="currency" class="cur-pick" data-change="convHint">${curOptions(d.currency)}</select><input name="amount" class="amount-in" inputmode="decimal" placeholder="0.00" autocomplete="off" value="${esc(amtVal(d.amount))}"></div>
  <div class="conv-hint" id="convHint"></div>
  <input type="hidden" name="categoryId" value="${d.categoryId || ''}">
  ${catChips('expense', d.categoryId)}
  <div class="card list form">
    <label class="field"><span>Date</span><input type="date" name="date" value="${d.date}" data-change="convHint"></label>
    <label class="field"><span>Account</span><select name="accountId">${acctOptions(d.accountId)}</select></label>
    <label class="field"><span>Note</span><input name="note" placeholder="e.g. Tesco, Netflix" value="${esc(d.note || '')}" autocomplete="off"></label>
    ${!d.id ? `<label class="field"><span>Repeat</span><select name="repeat" data-change="repeat"><option value="never">Never</option><option value="weekly">Every week</option><option value="monthly">Every month</option><option value="yearly">Every year</option></select></label>
    <label class="field sub-row" hidden><span>It's a subscription</span><input type="checkbox" name="isSub" class="switch"></label>` : ''}
  </div>
  ${d.id && d.rate && d.currency !== 'EUR' ? `<p class="hint">Stored as €${(d.eur || 0).toFixed(2)} · 1 EUR = ${d.rate} ${d.currency} (${d.rateDate || d.date})</p>` : ''}
  <button class="btn-primary" data-a="saveTx">${d.id ? 'Save changes' : 'Add expense'}</button>
  ${d.id ? `<button class="btn-danger" data-a="deleteTx">Delete expense</button>` : ''}`;
}

export function sBudget() {
  const b = S.settings.budget, dc = dispCur();
  const conv = v => { const n = +v || 0; if (!n) return ''; return Math.round(eurToCur(curToEur(n, b.currency), dc) * 100) / 100; };
  return `${sheetHead('Monthly budget')}
  ${seg([['total', 'One total budget'], ['category', 'Per category']], b.mode, 'budgetMode', 'seg-wide')}
  <div id="budTotal" ${b.mode === 'total' ? '' : 'hidden'}>
    <p class="hint">One limit for all your spending each month.</p>
    <div class="amount-wrap"><span class="cur-static">${dc}</span><input name="total" class="amount-in" inputmode="decimal" placeholder="0" value="${conv(b.total)}"></div>
  </div>
  <div id="budCats" ${b.mode === 'category' ? '' : 'hidden'}>
    <p class="hint">Set a limit for the categories you care about. Your monthly budget is the sum. Leave others empty.</p>
    <div class="card list form">${catsOf('expense').map(c => `<label class="field"><span>${esc(c.icon)} ${esc(c.name)}</span><input class="num" inputmode="decimal" data-cat="${c.id}" placeholder="—" value="${conv(b.perCategory[c.id])}"><em>${dc}</em></label>`).join('')}</div>
  </div>
  <button class="btn-primary" data-a="saveBudget">Save budget</button>
  ${hasBudget() ? `<button class="btn-danger" data-a="clearBudget">Remove budget</button>` : ''}`;
}

export function sRecurring(d) {
  return `${sheetHead(d.id ? 'Edit recurring' : 'New recurring')}
  <div class="card list form"><label class="field"><span>Name</span><input name="name" placeholder="e.g. Netflix, Rent" value="${esc(d.name || '')}"></label></div>
  <div class="amount-wrap"><select name="currency" class="cur-pick">${curOptions(d.currency)}</select><input name="amount" class="amount-in" inputmode="decimal" placeholder="0.00" value="${esc(amtVal(d.amount))}"></div>
  <input type="hidden" name="categoryId" value="${d.categoryId || ''}">
  ${catChips('expense', d.categoryId)}
  <div class="card list form">
    <label class="field"><span>Repeats</span><select name="frequency">${['weekly', 'monthly', 'yearly'].map(f => `<option value="${f}" ${f === d.frequency ? 'selected' : ''}>${freqLabel(f)}</option>`).join('')}</select></label>
    <label class="field"><span>${d.id ? 'Next payment' : 'First payment'}</span><input type="date" name="nextDate" value="${d.nextDate}"></label>
    <label class="field"><span>Account</span><select name="accountId">${acctOptions(d.accountId)}</select></label>
    <label class="field"><span>Subscription</span><input type="checkbox" name="isSub" class="switch" ${d.isSub ? 'checked' : ''}></label>
    ${d.id ? `<label class="field"><span>Active</span><input type="checkbox" name="active" class="switch" ${d.active ? 'checked' : ''}></label>` : ''}
  </div>
  <p class="hint">When a payment is due it's added to your transactions automatically the next time you open the app (past dates are filled in too).</p>
  <button class="btn-primary" data-a="saveRecurring">${d.id ? 'Save' : 'Add'}</button>
  ${d.id ? `<button class="btn-danger" data-a="deleteRecurring">Delete (keeps past transactions)</button>` : ''}`;
}

const EMOJI_GOALS = ['🚗', '🏝️', '🏠', '💍', '🎓', '💻', '📱', '🛟', '✈️', '🎸', '👶', '🐶', '🏄', '🎁'];
export function sGoal(d) {
  return `${sheetHead(d.id ? 'Edit goal' : 'New goal')}
  <div class="emoji-row">${EMOJI_GOALS.map(e => `<button type="button" class="emo${e === d.icon ? ' on' : ''}" data-a="pickEmoji" data-v="${e}">${e}</button>`).join('')}</div>
  <input type="hidden" name="icon" value="${esc(d.icon)}">
  <div class="card list form">
    <label class="field"><span>Name</span><input name="name" placeholder="e.g. Car maintenance" value="${esc(d.name || '')}"></label>
    <label class="field"><span>Goal amount</span><input name="target" class="num" inputmode="decimal" placeholder="1500" value="${esc(amtVal(d.target))}"><select name="currency" class="mini-sel">${curOptions(d.currency)}</select></label>
    <label class="field"><span>Saved so far</span><input name="saved" class="num" inputmode="decimal" placeholder="0" value="${esc(amtVal(d.saved))}"></label>
    <label class="field"><span>Target date</span><input type="date" name="targetDate" value="${d.targetDate || ''}"></label>
  </div>
  <div class="swatches">${PALETTE.map(c => `<button type="button" class="sw${c === d.color ? ' on' : ''}" style="background:${c}" data-a="pickColor" data-v="${c}"></button>`).join('')}</div>
  <input type="hidden" name="color" value="${d.color}">
  <button class="btn-primary" data-a="saveGoal">${d.id ? 'Save' : 'Create goal'}</button>
  ${d.id ? `<button class="btn-danger" data-a="deleteGoal">Delete goal</button>` : ''}`;
}
export function sGoalAdd(g) {
  return `${sheetHead('Add to ' + esc(g.name))}
  <div class="amount-wrap"><span class="cur-static">${g.currency}</span><input name="amount" class="amount-in" inputmode="decimal" placeholder="0.00"></div>
  <p class="hint center">Saved so far: ${money(g.saved, g.currency)} of ${money(g.target, g.currency)}. Use a negative number to take money out.</p>
  <button class="btn-primary" data-a="saveGoalAdd" data-id="${g.id}">Add money</button>`;
}

export function sAccount(d) {
  return `${sheetHead(d.id ? 'Edit account' : 'New account')}
  <div class="card list form">
    <label class="field"><span>Name</span><input name="name" placeholder="e.g. Monzo" value="${esc(d.name || '')}"></label>
    <label class="field"><span>Emoji</span><input name="icon" class="num" maxlength="4" value="${esc(d.icon || '🏦')}"></label>
    <label class="field"><span>Default for new entries</span><input type="checkbox" name="isDefault" class="switch" ${d.id && S.settings.defaultAccount === d.id ? 'checked' : ''}></label>
  </div>
  <button class="btn-primary" data-a="saveAccount">${d.id ? 'Save' : 'Add account'}</button>
  ${d.id ? `<button class="btn-danger" data-a="deleteAccount">Delete account</button>` : ''}`;
}

export function sCategory(d) {
  return `${sheetHead(d.id ? 'Edit category' : 'New category')}
  <div class="cat-preview"><span class="ic big" style="${tint(d.color)}" id="catPrev">${esc(d.icon || '🏷️')}</span></div>
  <div class="card list form">
    <label class="field"><span>Name</span><input name="name" value="${esc(d.name || '')}" placeholder="e.g. Coffee"></label>
    <label class="field"><span>Emoji</span><input name="icon" class="num" maxlength="4" value="${esc(d.icon || '🏷️')}"></label>
  </div>
  <div class="swatches">${PALETTE.map(c => `<button type="button" class="sw${c === d.color ? ' on' : ''}" style="background:${c}" data-a="pickColor" data-v="${c}"></button>`).join('')}</div>
  <input type="hidden" name="color" value="${d.color}">
  <button class="btn-primary" data-a="saveCategory">${d.id ? 'Save' : 'Add category'}</button>
  ${d.id ? `<button class="btn-danger" data-a="deleteCategory">Delete category</button>` : ''}`;
}

export function sFilter() {
  const f = S.ui.filter;
  const months = [...new Set(S.tx.filter(t => t.type === 'expense').map(t => t.date.slice(0, 7)))].sort().reverse();
  return `${sheetHead('Filter')}
  <div class="card list form">
    <label class="field"><span>Month</span><select name="month"><option value="">All time</option>${months.map(k => `<option value="${k}" ${k === f.month ? 'selected' : ''}>${monthName(k)}</option>`).join('')}</select></label>
    <label class="field"><span>Category</span><select name="cat"><option value="">All categories</option>${catsOf('expense').map(c => `<option value="${c.id}" ${c.id === f.cat ? 'selected' : ''}>${esc(c.icon)} ${esc(c.name)}</option>`).join('')}</select></label>
    <label class="field"><span>Account</span><select name="acct"><option value="">All accounts</option>${acctOptions(f.acct)}</select></label>
  </div>
  <button class="btn-primary" data-a="applyFilter">Apply</button>
  <button class="btn-secondary" data-a="clearFilter">Reset filters</button>`;
}

export function sWelcome() {
  const standalone = window.navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
  return `<div class="welcome">
    <div class="w-logo">💸</div>
    <h2>Welcome</h2>
    <p class="muted">Your expenses stay on this iPhone. Nothing is uploaded, so anyone else who opens this link sees an empty app.</p>
    <div class="card list form">
      <label class="field"><span>Main currency</span><select name="cur">${CURRENCIES.map(([c, n]) => `<option value="${c}" ${c === 'GBP' ? 'selected' : ''}>${c} · ${esc(n)}</option>`).join('')}</select></label>
      <label class="field"><span>Monthly budget</span><input name="budget" class="num" inputmode="decimal" placeholder="optional"></label>
    </div>
    ${!standalone ? `<p class="hint">📲 For the best experience: Safari → Share → <b>Add to Home Screen</b>, then open it from the icon. Data saved in a Safari tab is kept separately from the Home Screen app.</p>` : ''}
    <button class="btn-primary" data-a="finishWelcome">Get started</button>
    <button class="btn-secondary" data-a="importCsv">${I.up} Restore from CSV exports</button>
    <p class="hint center">Had to start over? Pick your monthly CSV files — expenses and any missing categories come back.</p>
  </div>`;
}

export function sFileReady(name) {
  return `${sheetHead('File ready')}
  <div class="empty"><div class="empty-e">📄</div><div class="empty-t">${esc(name)}</div><div class="empty-s">Tap below, then choose “Save to Files” (or share it).</div></div>
  <button class="btn-primary" data-a="shareFile">Save / share file</button>`;
}
