// 日期与 ISO 周规则（周一为一周开始）。所有周比较都以周键字符串 YYYY-Www 为准。

/** Date -> 本地 YYYY-MM-DD */
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 当天日期键，可注入日期以便测试 */
export function todayKey(now: Date = new Date()): string {
  return toDateKey(now);
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** ISO-8601 周编号，周键格式 YYYY-Www */
export function weekKeyOfDate(input: Date | string): string {
  const d = typeof input === "string" ? parseDateKey(input) : new Date(input);
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** 当前 ISO 周键 */
export function currentWeekKey(now: Date = new Date()): string {
  return weekKeyOfDate(now);
}

/** 本周周一 */
export function mondayOf(weekKey: string): Date {
  const [year, w] = weekKey.split("-W").map(Number);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const isoMonday = new Date(jan4);
  isoMonday.setUTCDate(jan4.getUTCDate() - (jan4Day - 1));
  isoMonday.setUTCDate(isoMonday.getUTCDate() + (w - 1) * 7);
  return isoMonday;
}

/** 某周第 n 天（周一开始，n=0..6）的本地日期键 */
export function weekDayKey(weekKey: string, offset: number): string {
  const d = mondayOf(weekKey);
  d.setUTCDate(d.getUTCDate() + offset);
  return toDateKey(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function weekLabel(weekKey: string): string {
  return `${weekKey.split("-W")[0]} 年第 ${Number(weekKey.split("-W")[1])} 周（${weekDayKey(weekKey, 0)} ~ ${weekDayKey(weekKey, 6)}）`;
}

/** 日期 a 相对 b 经过了多少个整天（b - a）；未来日期为负 */
export function daysBetween(fromKey: string, toKey: string): number {
  const a = startOfDay(parseDateKey(fromKey)).getTime();
  const b = startOfDay(parseDateKey(toKey)).getTime();
  return Math.round((b - a) / 86400000);
}

export function formatDateTime(iso: string): string {
  return iso.replace("T", " ").slice(0, 16);
}
