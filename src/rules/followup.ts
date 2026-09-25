// 复诊名单规则：距最近一次训练记录满 4 天（含）即进入复诊名单。
import type { AppData, Patient, TrainingLog } from "../types";
import { daysBetween, todayKey } from "./dates";

export interface FollowupEntry {
  patient: Patient;
  lastLog: TrainingLog | null;
  daysSince: number;
}

export const NO_LOG_DAYS = 4;

/** 最近一次训练记录 */
export function lastLogOf(data: AppData, patientId: string): TrainingLog | null {
  return (
    data.logs
      .filter((l) => l.patientId === patientId)
      .sort((a, b) => (a.date < b.date ? 1 : -1))[0] ?? null
  );
}

/** 是否满 4 天未记录：无任何记录也计入 */
export function isOverdue(data: AppData, patientId: string, today = todayKey()): boolean {
  const last = lastLogOf(data, patientId);
  if (!last) return true;
  return daysBetween(last.date, today) >= NO_LOG_DAYS;
}

/** 复诊名单（按未记录天数从多到少排序） */
export function buildFollowupList(data: AppData, today = todayKey()): FollowupEntry[] {
  return data.patients
    .map((patient) => {
      const lastLog = lastLogOf(data, patient.id);
      const daysSince = lastLog ? daysBetween(lastLog.date, today) : Number.POSITIVE_INFINITY;
      return { patient, lastLog, daysSince };
    })
    .filter((e) => e.daysSince >= NO_LOG_DAYS)
    .sort((a, b) => b.daysSince - a.daysSince);
}
