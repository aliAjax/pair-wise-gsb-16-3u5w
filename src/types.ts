// 领域模型：康复作业台中出现的全部业务对象
// 只描述数据形状，不包含任何规则计算、存储或页面逻辑

export type Ear = "left" | "right";
export type LogEar = Ear | "both";
export type TaskKind = "discrimination" | "localization"; // 听辨 | 方向

/** 听力曲线测点：频率(Hz) 对应左/右耳气导听阈(dB HL)，未测为 null */
export interface AudiogramPoint {
  freq: number;
  left: number | null;
  right: number | null;
}

/** 单耳单项训练（听辨或方向）的内容与本周目标分钟 */
export interface EarTask {
  task: string;
  targetMinutes: number;
}

/** 一只耳朵本周的两项作业 */
export interface EarSchedule {
  discrimination: EarTask; // 听辨训练
  localization: EarTask; // 方向（声源定位）训练
}

/** 一周计划的可调整内容部分 */
export interface PlanContent {
  left: EarSchedule;
  right: EarSchedule;
  cueMethod: string; // 家属提示方式
  note: string;
}

/** 计划版本：每次调整都先整体复制一份旧内容并写明原因 */
export interface PlanVersion {
  version: number;
  createdAt: string;
  createdBy: string;
  reason: string;
  copiedFrom: number | null; // v1 为 null，之后复制自上一版
  content: PlanContent;
}

/** 患者某一周的康复计划（同一患者同一年同一周只允许一份） */
export interface WeeklyPlan {
  id: string;
  patientId: string;
  year: number;
  week: number;
  audiogramCheckedAt: string; // 听力师核对听力曲线的时间
  createdAt: string;
  current: PlanContent;
  versions: PlanVersion[];
}

/** 患者每天登记的训练记录 */
export interface TrainingLog {
  id: string;
  patientId: string;
  date: string; // YYYY-MM-DD
  year: number;
  week: number;
  ear: LogEar;
  kind: TaskKind;
  minutes: number;
  difficulties: string[]; // 困难项
  note: string;
  createdAt: string;
}

/** 家属 / 社区随访联系记录 */
export interface ContactRecord {
  id: string;
  patientId: string;
  at: string;
  channel: string; // 电话 / 微信 / 上门 / 家属转告
  result: string;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  phone: string;
  familyName: string;
  familyPhone: string;
  cuePreference: string; // 家属提示方式偏好（跨周保留）
  hearingNote: string;
  audiogram: AudiogramPoint[];
  enrolledAt: string;
}

export interface AppState {
  patients: Patient[];
  plans: WeeklyPlan[];
  logs: TrainingLog[];
  contacts: ContactRecord[];
}
