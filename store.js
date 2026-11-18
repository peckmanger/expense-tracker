// store.js — app state, defaults, formatting and calculations.
import * as db from './db.js';
import * as fx from './fx.js';

export const S = {
  tx: [], cats: [], accts: [], recur: [], goals: [], settings: null,
  tab: 'home', stack: [], draft: null,
  ui: {
    txType: 'all', search: '', filter: { month: '', cat: '', acct: '' }, txLimit: 120,
    budgetMonth: null, homeRange: '1M', insRange: '6M',
    calMode: 'month', calCursor: null, calSel: null,
    goalsTab: 'active', catsType: 'expense', reportMonth: null, curSearch: '',
  },
};

export const CURRENCIES = [
  ['GBP', 'British pound'], ['EUR', 'Euro'], ['USD', 'US dollar'], ['CHF', 'Swiss franc'],
  ['JPY', 'Japanese yen'], ['CAD', 'Canadian dollar'], ['AUD', 'Australian dollar'], ['NZD', 'New Zealand dollar'],
  ['SEK', 'Swedish krona'], ['NOK', 'Norwegian krone'], ['DKK', 'Danish krone'], ['ISK', 'Icelandic króna'],
  ['PLN', 'Polish złoty'], ['CZK', 'Czech koruna'], ['HUF', 'Hungarian forint'], ['RON', 'Romanian leu'],
  ['RSD', 'Serbian dinar'], ['TRY', 'Turkish lira'], ['UAH', 'Ukrainian hryvnia'], ['GEL', 'Georgian lari'],
  ['CNY', 'Chinese yuan'], ['HKD', 'Hong Kong dollar'], ['TWD', 'New Taiwan dollar'], ['KRW', 'South Korean won'],
  ['SGD', 'Singapore dollar'], ['MYR', 'Malaysian ringgit'], ['THB', 'Thai baht'], ['IDR', 'Indonesian rupiah'],
  ['PHP', 'Philippine peso'], ['VND', 'Vietnamese đồng'], ['INR', 'Indian rupee'], ['PKR', 'Pakistani rupee'],
  ['LKR', 'Sri Lankan rupee'], ['BDT', 'Bangladeshi taka'], ['NPR', 'Nepalese rupee'], ['AED', 'UAE dirham'],
  ['SAR', 'Saudi riyal'], ['QAR', 'Qatari riyal'], ['KWD', 'Kuwaiti dinar'], ['BHD', 'Bahraini dinar'],
  ['OMR', 'Omani rial'], ['JOD', 'Jordanian dinar'], ['ILS', 'Israeli shekel'], ['EGP', 'Egyptian pound'],
  ['MAD', 'Moroccan dirham'], ['TND', 'Tunisian dinar'], ['ZAR', 'South African rand'], ['NGN', 'Nigerian naira'],
  ['KES', 'Kenyan shilling'], ['GHS', 'Ghanaian cedi'], ['TZS', 'Tanzanian shilling'], ['MXN', 'Mexican peso'],
  ['BRL', 'Brazilian real'], ['ARS', 'Argentine peso'], ['CLP', 'Chilean peso'], ['COP', 'Colombian peso'],
  ['PEN', 'Peruvian sol'], ['UYU', 'Uruguayan peso'], ['CRC', 'Costa Rican colón'], ['DOP', 'Dominican peso'],
];
export const curName = code => (CURRENCIES.find(c => c[0] === code) || [code, code])[1];

export const PALETTE = ['#007aff', '#34c759', '#ff9500', '#af52de', '#ff2d55', '#5ac8fa', '#ffcc00', '#5856d6', '#30b0c7', '#a2845e', '#ff3b30', '#8e8e93'];

export function defaults() {
  const id = uid;
  const cats = [
    ['Housing', '🏠', '#007aff'], ['Groceries', '🛒', '#34c759'], ['Eating out', '🍽️', '#ff9500'],
    ['Transport', '🚆', '#5ac8fa'], ['Shopping', '🛍️', '#af52de'], ['Bills & utilities', '💡', '#ffcc00'],
    ['Subscriptions', '📺', '#5856d6'], ['Health', '💊', '#ff2d55'], ['Entertainment', '🎬', '#30b0c7'],
    ['Travel', '✈️', '#a2845e'], ['Personal care', '💇', '#ff6482'], ['Gifts', '🎁', '#ff3b30'],
    ['Education', '📚', '#64d2ff'], ['Other', '📦', '#8e8e93'],
  ].map(([name, icon, color], i) => ({ id: id(), name, icon, color, type: 'expense', order: i }));
  const accts = [['Current account', '🏦'], ['Credit card', '💳'], ['Cash', '💵'], ['Savings', '🐷']]
    .map(([name, icon], i) => ({ id: id(), name, icon, openingEUR: 0, order: i }));
  const settings = {
    defaultCurrency: 'GBP', currencies: ['GBP', 'EUR', 'USD'], theme: 'auto',
    budget: { mode: 'total', total: 0, perCategory: {}, currency: 'GBP' },
    lastCsvPromptMonth: null, defaultAccount: accts[0].id, createdAt: Date.now(), joeMode: false,
  };
  return { cats, accts, settings };
}

// ---------- persistence ----------
export async function load() {
  const [tx, cats, accts, recur, goals, settings] = await Promise.all([
    db.getAll('transactions'), db.getAll('categories'), db.getAll('accounts'),
    db.getAll('recurring'), db.getAll('goals'), db.kvGet('settings'),
  ]);
  Object.assign(S, { tx, cats, accts, recur, goals, settings: settings || null });
  sortTx();
}
export const saveSettings = () => db.kvSet('settings', S.settings);
export function sortTx() {
  S.tx.sort((a, b) => (b.date.localeCompare(a.date)) || ((b.createdAt || 0) - (a.createdAt || 0)));
}
const STORE_OF = { tx: 'transactions', cats: 'categories', accts: 'accounts', recur: 'recurring', goals: 'goals' };
export async function upsert(kind, obj) {
  const list = S[kind];
  const i = list.findIndex(x => x.id === obj.id);
  if (i >= 0) list[i] = obj; else list.push(obj);
  if (kind === 'tx') sortTx();
  await db.put(STORE_OF[kind], obj);
  return obj;
}
export async function remove(kind, id) {
  S[kind] = S[kind].filter(x => x.id !== id);
  await db.del(STORE_OF[kind], id);
}

// ---------- utils ----------
export function uid() {
  return (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
}
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const pad = n => String(n).padStart(2, '0');
export const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => ymd(new Date());
export const parseD = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d || 1); };
export const curMonth = () => today().slice(0, 7);
export const addMonthsKey = (mk, n) => { const d = parseD(mk + '-01'); d.setMonth(d.getMonth() + n); return ymd(d).slice(0, 7); };
export const addDays = (s, n) => { const d = parseD(s); d.setDate(d.getDate() + n); return ymd(d); };
export const daysInMonth = mk => { const [y, m] = mk.split('-').map(Number); return new Date(y, m, 0).getDate(); };
export const monthName = (mk, month = 'long', year = true) =>
  parseD(mk + '-01').toLocaleDateString('en-GB', year ? { month, year: 'numeric' } : { month });
export const fmtDate = (s, opts = { day: 'numeric', month: 'short', year: 'numeric' }) => parseD(s).toLocaleDateString('en-GB', opts);
export function dayLabel(s) {
  const t = today();
  if (s === t) return 'Today';
  if (s === addDays(t, -1)) return 'Yesterday';
  if (s === addDays(t, 1)) return 'Tomorrow';
  const sameYear = s.slice(0, 4) === t.slice(0, 4);
  return parseD(s).toLocaleDateString('en-GB', sameYear ? { weekday: 'short', day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' });
}
export const daysBetween = (a, b) => Math.round((parseD(b) - parseD(a)) / 864e5);
export const startOfWeek = s => { const d = parseD(s); const w = (d.getDay() + 6) % 7; d.setDate(d.getDate() - w); return ymd(d); };
export const round2 = n => Math.round(n * 100) / 100;
export function parseAmount(v) {
  if (typeof v === 'number') return v;
  let s = String(v || '').trim().replace(/\s/g, '');
  if (/,\d{1,2}$/.test(s) && !/\.\d/.test(s)) s = s.replace(/\./g, '').replace(',', '.'); // 12,50 → 12.50
  s = s.replace(/,/g, '');
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
}

// ---------- money ----------
const nf = {};
export function money(amount, cur, opts = {}) {
  const key = cur + JSON.stringify(opts);
  if (!nf[key]) {
    const o = { style: 'currency', currency: cur, currencyDisplay: 'narrowSymbol' };
    if (opts.compact) Object.assign(o, { notation: 'compact', maximumFractionDigits: 1 });
    else if (opts.whole) Object.assign(o, { maximumFractionDigits: 0, minimumFractionDigits: 0 });
    try { nf[key] = new Intl.NumberFormat('en-GB', o); } catch (e) { nf[key] = { format: n => `${cur} ${n.toFixed(2)}` }; }
  }
  return nf[key].format(amount);
}
export const dispCur = () => (S.settings ? S.settings.defaultCurrency : 'EUR');
export const rate = cur => (cur === 'EUR' ? 1 : fx.rates()[cur]);
export function toDisp(eur) { const r = rate(dispCur()); return r ? eur * r : eur; }
export function fmtE(eur, opts) {
  const r = rate(dispCur());
  return r ? money(eur * r, dispCur(), opts) : money(eur, 'EUR', opts);
}
// ---------- Joe Mode ----------
// When on, every *total* is replaced by a blurred placeholder. The real number is never put
// in the page, so the blur can't give away how big it is. Single entries stay visible.
export const joe = () => !!(S.settings && S.settings.joeMode);
export function fmtT(eur, opts = {}) {
  if (!joe()) return fmtE(eur, opts);
  const fake = money(opts.compact || opts.whole ? 888 : 888.88, dispCur(), opts.compact ? { whole: true } : opts);
  return `<span class="joe" aria-label="hidden">${fake}</span>`;
}
// Plain-text version for chart axis labels (SVG can't hold the blurred span).
export const fmtAxis = eur => (joe() ? '•••' : fmtE(eur, { compact: true }));

export function curToEur(amount, cur) {
  if (cur === 'EUR') return amount;
  const r = rate(cur);
  return r ? amount / r : amount;
}
export function eurToCur(eur, cur) { const r = rate(cur); return r ? eur * r : eur; }
export function eurOf(t) {
  if (typeof t.eur === 'number') return t.eur;
  return curToEur(t.amount, t.currency);
}

// ---------- lookups ----------
const UNKNOWN_CAT = { id: '', name: 'Uncategorised', icon: '❔', color: '#8e8e93', type: 'expense' };
export const cat = id => S.cats.find(c => c.id === id) || UNKNOWN_CAT;
export const acct = id => S.accts.find(a => a.id === id) || null;
export const catsOf = type => S.cats.filter(c => c.type === type).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
export const accounts = () => [...S.accts].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

// ---------- aggregates ----------
export function sumRange(from, to, type = 'expense', pred) {
  let s = 0;
  for (const t of S.tx) {
    if (t.type !== type || t.date < from || t.date > to) continue;
    if (pred && !pred(t)) continue;
    s += eurOf(t);
  }
  return s;
}
export function monthStats(mk) {
  let spent = 0, income = 0, count = 0;
  const byCat = {};
  for (const t of S.tx) {
    if (!t.date.startsWith(mk)) continue;
    const e = eurOf(t);
    if (t.type === 'expense') { spent += e; count++; byCat[t.categoryId] = (byCat[t.categoryId] || 0) + e; }
    else income += e;
  }
  return { spent, income, net: income - spent, byCat, count };
}
export function byCategory(from, to) {
  const m = {};
  for (const t of S.tx) {
    if (t.type !== 'expense' || t.date < from || t.date > to) continue;
    m[t.categoryId] = (m[t.categoryId] || 0) + eurOf(t);
  }
  return Object.entries(m).map(([id, v]) => ({ cat: cat(id), value: v })).sort((a, b) => b.value - a.value);
}
export function topN(list, n = 5) {
  if (list.length <= n) return list;
  const head = list.slice(0, n - 1);
  const rest = list.slice(n - 1).reduce((a, x) => a + x.value, 0);
  return [...head, { cat: { id: '_other', name: 'Other', icon: '•', color: '#8e8e93' }, value: rest }];
}
export function spentByAccount(from, to) {
  const m = {};
  for (const t of S.tx) {
    if (t.type !== 'expense' || t.date < from || t.date > to) continue;
    m[t.accountId] = (m[t.accountId] || 0) + eurOf(t);
  }
  return m;
}
export function accountBalanceEUR(a) {
  let b = a.openingEUR || 0;
  for (const t of S.tx) if (t.accountId === a.id) b += t.type === 'income' ? eurOf(t) : -eurOf(t);
  return b;
}

// ---------- budgets ----------
export function hasBudget() {
  const b = S.settings.budget;
  return b.mode === 'total' ? +b.total > 0 : Object.values(b.perCategory).some(v => +v > 0);
}
export function totalBudgetEUR() {
  const b = S.settings.budget;
  if (b.mode === 'total') return curToEur(+b.total || 0, b.currency);
  return curToEur(Object.values(b.perCategory).reduce((a, v) => a + (+v || 0), 0), b.currency);
}
export function catBudgetEUR(id) {
  const b = S.settings.budget;
  if (b.mode !== 'category') return 0;
  const v = +b.perCategory[id] || 0;
  return v ? curToEur(v, b.currency) : 0;
}

// ---------- recurring ----------
export function advance(dateStr, freq, anchorDay) {
  const d = parseD(dateStr);
  if (freq === 'weekly') { d.setDate(d.getDate() + 7); return ymd(d); }
  if (freq === 'yearly') {
    const y = d.getFullYear() + 1, m = d.getMonth();
    const dim = new Date(y, m + 1, 0).getDate();
    return ymd(new Date(y, m, Math.min(anchorDay || d.getDate(), dim)));
  }
  // monthly
  const y = d.getFullYear(), m = d.getMonth() + 1;
  const dim = new Date(y, m + 1, 0).getDate();
  return ymd(new Date(y, m, Math.min(anchorDay || d.getDate(), dim)));
}
export function monthlyEquivalentEUR(r) {
  const e = curToEur(r.amount, r.currency);
  return r.frequency === 'weekly' ? e * 52 / 12 : r.frequency === 'yearly' ? e / 12 : e;
}
export function occurrences(r, from, to) {
  // future occurrences of rule r between from..to (inclusive), starting at r.nextDate
  const out = [];
  if (!r.active) return out;
  let d = r.nextDate, guard = 0;
  while (d <= to && guard++ < 500) {
    if (d >= from) out.push(d);
    d = advance(d, r.frequency, r.anchorDay);
  }
  return out;
}
export const freqLabel = f => ({ weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' }[f] || f);
