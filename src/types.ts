// 领域模型：只描述康复作业台里有哪些数据，不含任何业务判断与存储逻辑。

export type Ear = "L" | "R";
export type TrainingKind = "discrim" | "direction";
export type PromptMethod = "verbal" | "gesture" | "card" | "demo" | "note";

/** 登记在案的社区老人 */
export interface Patient {
  id: string;
  name: string;
  age: number;
  phone: string;
  familyName: string;
  familyPhone: string;
  /** 家属提示方式偏好（长期保留） */
  promptMethod: PromptMethod;
  /** 提示偏好补充说明，如“先拍肩再开口” */
  promptDetail: string;
  joinedAt: string; // ISO 日期
  note: string;
}

/** 听力曲线（纯音气导，dB HL，六个频率） */
export interface Audiogram {
  id: string;
  patientId: string;
  testDate: string;
  /** 与 FREQS 六个频率一一对应的听阈值 */
  left: number[];
  right: number[];
  /** 听力师核对信息：未核对则为空，生成周计划前必须已核对 */
  checkedBy: string | null;
  checkedAt: string | null;
}

/** 一条训练安排：某只耳朵的某类训练 */
export interface PlanItem {
  ear: Ear;
  kind: TrainingKind;
  minutes: number;
  content: string;
}

/** 计划版本：调整时整体复制一份并记录原因 */
export interface PlanVersion {
  version: number;
  createdAt: string; // ISO 时间戳
  author: string;
  /** v1 为初次制定；其后必填调整原因 */
  reason: string | null;
  targetMinutes: number;
  promptMethod: PromptMethod;
  audiogramId: string;
  items: PlanItem[];
}

/** 周计划：同一患者同一周只有一份，版本历史全部保留 */
export interface WeeklyPlan {
  id: string;
  patientId: string;
  weekKey: string; // ISO 周，如 2026-W39
  versions: PlanVersion[];
}

/** 患者（或家属代填）登记的一次训练记录 */
export interface TrainingLog {
  id: string;
  patientId: string;
  weekKey: string;
  date: string; // ISO 日期
  ear: Ear;
  kind: TrainingKind;
  minutes: number;
  /** 困难项 */
  difficulty: string;
  note: string;
  createdAt: string;
}

/** 复诊/联系名单中的一次跟进记录 */
export interface ContactNote {
  id: string;
  patientId: string;
  date: string;
  channel: string;
  content: string;
  author: string;
  createdAt: string;
}

export interface AppData {
  meta: { specialist: string };
  patients: Patient[];
  audiograms: Audiogram[];
  plans: WeeklyPlan[];
  logs: TrainingLog[];
  contacts: ContactNote[];
}
