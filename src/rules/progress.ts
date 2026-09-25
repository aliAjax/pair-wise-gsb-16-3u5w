// 训练进度汇总：按周、按耳统计目标与已登记分钟。
import type { AppData, TrainingLog } from "../types";
import { currentVersion } from "./plans";
import type { WeeklyPlan } from "../types";

export interface WeekProgress {
  plan: WeeklyPlan | null;
  target: number;
  done: number;
  byEar: { L: { target: number; done: number }; R: { target: number; done: number } };
  logs: TrainingLog[];
}

export function weekLogs(data: AppData, patientId: string, weekKey: string): TrainingLog[] {
  return data.logs
    .filter((l) => l.patientId === patientId && l.weekKey === weekKey)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.createdAt < b.createdAt ? -1 : 1));
}

export function weekProgress(data: AppData, patientId: string, weekKey: string): WeekProgress {
  const plan = data.plans.find((p) => p.patientId === patientId && p.weekKey === weekKey) ?? null;
  const logs = weekLogs(data, patientId, weekKey);
  const empty = () => ({ target: 0, done: 0 });
  const byEar = { L: empty(), R: empty() };
  if (plan) {
    const cur = currentVersion(plan);
    for (const item of cur.items) byEar[item.ear].target += item.minutes;
  }
  for (const log of logs) byEar[log.ear].done += log.minutes;
  return {
    plan,
    target: plan ? currentVersion(plan).targetMinutes : 0,
    done: logs.reduce((s, l) => s + l.minutes, 0),
    byEar,
    logs,
  };
}

export function pct(done: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((done / target) * 100));
}
