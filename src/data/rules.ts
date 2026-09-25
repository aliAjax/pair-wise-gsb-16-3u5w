// 规则层：全部为纯函数，不接触 DOM / localStorage / React
import type {
  AppState,
  ContactRecord,
  Ear,
  LogEar,
  Patient,
  PlanContent,
  PlanVersion,
  TaskKind,
  TrainingLog,
  WeeklyPlan,
} from "../types";

/* ---------------- 日期与周次（ISO-8601 周） ---------------- */

function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** 返回 ISO-8601 周年与周号（周一为一周起点） */
export function isoWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // 本周四
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  const week =
    1 +
    Math.round(
      (d.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000)
    );
  return { year: d.getUTCFullYear(), week };
}

export function isoWeekOf(dateStr: string): { year: number; week: number } {
  return isoWeek(parseDate(dateStr));
}

export function todayStr(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

export function addDays(dateStr: string, days: number): string {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + days);
  return todayStr(d);
}

/** 两个 YYYY-MM-DD 之间相差的整天数（b - a） */
export function daysBetween(a: string, b: string): number {
  const ms = parseDate(b).getTime() - parseDate(a).getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

/* ---------------- 计划：唯一性 ---------------- */

export function findPlan(
  state: Pick<AppState, "plans">,
  patientId: string,
  year: number,
  week: number
): WeeklyPlan | undefined {
  return state.plans.find(
    (p) => p.patientId === patientId && p.year === year && p.week === week
  );
}

export function latestPlanOf(state: Pick<AppState, "plans">, patientId: string) {
  return state.plans
    .filter((p) => p.patientId === patientId)
    .sort((a, b) =>
      a.year === b.year ? b.week - a.week : b.year - a.year
    )[0];
}

export type NewPlanInput = {
  patientId: string;
  year: number;
  week: number;
  content: PlanContent;
  audiogramCheckedAt: string;
  createdBy: string;
  createdAt: string;
};

export type RuleResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

let seq = 0;
export function makeId(prefix: string): string {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${seq}`;
}

/** 听力师核对听力曲线后生成新一周计划；同一患者同一周只留一份 */
export function createPlan(
  state: Pick<AppState, "plans">,
  input: NewPlanInput
): RuleResult<WeeklyPlan> {
  if (findPlan(state, input.patientId, input.year, input.week)) {
    return {
      ok: false,
      error: `该患者 ${input.year} 年第 ${input.week} 周的计划已存在，调整请使用“复制新版”`,
    };
  }
  const validation = validateContent(input.content);
  if (!validation.ok) return validation;
  const plan: WeeklyPlan = {
    id: makeId("plan"),
    patientId: input.patientId,
    year: input.year,
    week: input.week,
    audiogramCheckedAt: input.audiogramCheckedAt,
    createdAt: input.createdAt,
    current: cloneContent(input.content),
    versions: [
      {
        version: 1,
        createdAt: input.createdAt,
        createdBy: input.createdBy,
        reason: "核对听力曲线后生成本周新计划",
        copiedFrom: null,
        content: cloneContent(input.content),
      },
    ],
  };
  return { ok: true, value: plan };
}

/** 调整计划：先把当前版本整体复制一份，新版本必须写明原因 */
export function adjustPlan(
  plan: WeeklyPlan,
  args: {
    content: PlanContent;
    reason: string;
    createdBy: string;
    createdAt: string;
  }
): RuleResult<WeeklyPlan> {
  const reason = args.reason.trim();
  if (!reason) {
    return { ok: false, error: "调整计划必须填写调整原因" };
  }
  const validation = validateContent(args.content);
  if (!validation.ok) return validation;
  const lastVersion = plan.versions[plan.versions.length - 1];
  const saved = cloneContent(args.content);
  const next: PlanVersion = {
    version: lastVersion.version + 1,
    createdAt: args.createdAt,
    createdBy: args.createdBy,
    reason,
    copiedFrom: lastVersion.version,
    content: saved,
  };
  return {
    ok: true,
    value: {
      ...plan,
      current: saved,
      versions: [...plan.versions, next],
    },
  };
}

export function cloneContent(c: PlanContent): PlanContent {
  return JSON.parse(JSON.stringify(c)) as PlanContent;
}

function validateContent(c: PlanContent): RuleResult<true> {
  for (const ear of ["left", "right"] as Ear[]) {
    for (const kind of ["discrimination", "localization"] as TaskKind[]) {
      const task = c[ear][kind];
      if (!task.task.trim()) {
        return { ok: false, error: `请填写${ear === "left" ? "左" : "右"}耳${kind === "discrimination" ? "听辨" : "方向"}训练内容` };
      }
      if (task.targetMinutes <= 0) {
        return { ok: false, error: "目标分钟须大于 0" };
      }
    }
  }
  if (!c.cueMethod.trim()) {
    return { ok: false, error: "请填写家属提示方式" };
  }
  return { ok: true, value: true };
}

/* ---------------- 训练记录 ---------------- */

export function addTrainingLog(
  args: Omit<TrainingLog, "id" | "year" | "week">
): TrainingLog {
  const { year, week } = isoWeekOf(args.date);
  return { ...args, id: makeId("log"), year, week };
}

export function planWeeklyTarget(plan: WeeklyPlan | undefined): number {
  if (!plan) return 0;
  let total = 0;
  for (const ear of ["left", "right"] as Ear[]) {
    total +=
      plan.current[ear].discrimination.targetMinutes +
      plan.current[ear].localization.targetMinutes;
  }
  return total;
}

export function logsForWeek(
  logs: TrainingLog[],
  patientId: string,
  year: number,
  week: number
): TrainingLog[] {
  return logs.filter(
    (l) => l.patientId === patientId && l.year === year && l.week === week
  );
}

/** 双耳同时练时分钟数两侧各记一份，避免双耳训练被漏算 */
function effectiveEarMinutes(log: TrainingLog): Record<Ear, number> {
  if (log.ear === "both") {
    return { left: log.minutes, right: log.minutes };
  }
  return {
    left: log.ear === "left" ? log.minutes : 0,
    right: log.ear === "right" ? log.minutes : 0,
  };
}

export interface WeekProgress {
  done: number;
  target: number;
  percent: number;
  byEar: Record<Ear, { discrimination: number; localization: number }>;
  difficulties: string[];
}

export function weekProgress(
  logs: TrainingLog[],
  plan: WeeklyPlan | undefined
): WeekProgress {
  const byEar: WeekProgress["byEar"] = {
    left: { discrimination: 0, localization: 0 },
    right: { discrimination: 0, localization: 0 },
  };
  const difficulties: string[] = [];
  if (plan) {
    for (const log of logsForWeek(logs, plan.patientId, plan.year, plan.week)) {
      const mins = effectiveEarMinutes(log);
      for (const ear of ["left", "right"] as Ear[]) {
        byEar[ear][log.kind] += mins[ear];
      }
      difficulties.push(...log.difficulties);
    }
  }
  const done =
    byEar.left.discrimination +
    byEar.left.localization +
    byEar.right.discrimination +
    byEar.right.localization;
  const target = planWeeklyTarget(plan);
  return {
    done,
    target,
    percent: target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0,
    byEar,
    difficulties: [...new Set(difficulties)],
  };
}

/* ---------------- 复诊名单：四天未记录 ---------------- */

export interface RecallEntry {
  patient: Patient;
  lastLogDate: string | null;
  missedDays: number; // 距今天数（无记录则从建档日算起）
  reason: string;
  latestPlan?: WeeklyPlan;
  latestContact?: ContactRecord;
}

/** 超过 4 天（含第 4 天）没有任何训练登记的在档患者进入复诊名单 */
export function recallList(
  state: AppState,
  today: string = todayStr()
): RecallEntry[] {
  const entries: RecallEntry[] = [];
  for (const patient of state.patients) {
    const patientLogs = state.logs
      .filter((l) => l.patientId === patient.id)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
    const last = patientLogs[0];
    const since = last ? last.date : patient.enrolledAt;
    const missedDays = daysBetween(since, today);
    if (missedDays >= 4) {
      const latestContact = state.contacts
        .filter((c) => c.patientId === patient.id)
        .sort((a, b) => (a.at < b.at ? 1 : -1))[0];
      entries.push({
        patient,
        lastLogDate: last ? last.date : null,
        missedDays,
        reason: last
          ? `已 ${missedDays} 天未登记训练（最后：${last.date}）`
          : "建档后从未登记训练",
        latestPlan: latestPlanOf(state, patient.id),
        latestContact,
      });
    }
  }
  return entries.sort((a, b) => b.missedDays - a.missedDays);
}

/* ---------------- 听力曲线 ---------------- */

/** 单耳 PTA（气导平均听阈，500/1000/2000/4000 Hz），测点不足返回 null */
export function earPTA(
  points: { freq: number; left: number | null; right: number | null }[],
  ear: Ear
): number | null {
  const freqs = [500, 1000, 2000, 4000];
  const vals = freqs
    .map((f) => points.find((p) => p.freq === f)?.[ear])
    .filter((v): v is number => typeof v === "number");
  if (vals.length < 3) return null;
  return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
}

/* ---------------- 枚举标签 ---------------- */

export const earLabel: Record<Ear, string> = { left: "左耳", right: "右耳" };
export const logEarLabel: Record<LogEar, string> = {
  left: "左耳",
  right: "右耳",
  both: "双耳",
};
export const kindLabel: Record<TaskKind, string> = {
  discrimination: "听辨",
  localization: "方向",
};
