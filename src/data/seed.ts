// 数据层：固定选项、演示数据（不包含规则计算，也不接触页面）
import type { AppState, AudiogramPoint, Patient, PlanContent } from "../types";
import { isoWeekOf, makeId } from "./rules";

export const CUE_METHODS = ["口型提示", "手势提示", "短句复述", "拍肩提醒", "书面关键词"];
export const CONTACT_CHANNELS = ["电话", "微信", "上门", "家属转告"];
export const DIFFICULTY_PRESETS = ["嘈杂环境听不清", "方向判断偏", "短句跟不上", "小声词语混淆", "疲劳走神"];
export const AUDIO_FREQS = [250, 500, 1000, 2000, 4000, 8000];
export const STAFF_NAME = "听力师·周岚";

export function emptyContent(): PlanContent {
  return {
    left: {
      discrimination: { task: "", targetMinutes: 20 },
      localization: { task: "", targetMinutes: 10 },
    },
    right: {
      discrimination: { task: "", targetMinutes: 20 },
      localization: { task: "", targetMinutes: 10 },
    },
    cueMethod: "",
    note: "",
  };
}

function pt(freq: number, left: number | null, right: number | null): AudiogramPoint {
  return { freq, left, right };
}

function buildPlans(
  patient: Patient,
  weeksBack: number,
  makeContent: (w: number) => PlanContent,
  adjustment?: { reason: string; content: PlanContent }
) {
  // 用日期偏移落在指定 ISO 周：向回退 weeksBack*7 天
  const d = new Date();
  d.setDate(d.getDate() - weeksBack * 7);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const dateStr = `${y}-${m}-${day}`;
  const { year, week } = isoWeekOf(dateStr);
  const content = makeContent(week);
  const plan: AppState["plans"][number] = {
    id: makeId("plan"),
    patientId: patient.id,
    year,
    week,
    audiogramCheckedAt: `${dateStr} 09:20`,
    createdAt: `${dateStr} 09:30`,
    current: content,
    versions: [
      {
        version: 1,
        createdAt: `${dateStr} 09:30`,
        createdBy: STAFF_NAME,
        reason: "核对听力曲线后生成本周新计划",
        copiedFrom: null,
        content,
      },
    ],
  };
  if (adjustment) {
    plan.current = adjustment.content;
    plan.versions.push({
      version: 2,
      createdAt: `${dateStr} 15:10`,
      createdBy: STAFF_NAME,
      reason: adjustment.reason,
      copiedFrom: 1,
      content: adjustment.content,
    });
  }
  return plan;
}

export function buildSeed(today: string): AppState {
  const patients: Patient[] = [
    {
      id: "P-024",
      name: "王桂珍",
      age: 76,
      phone: "138-0000-0241",
      familyName: "儿子 王磊",
      familyPhone: "139-1111-0242",
      cuePreference: "口型提示",
      hearingNote: "双耳高频下降，助听后言语识别率 76%",
      enrolledAt: "2026-08-10",
      audiogram: [
        pt(250, 35, 40), pt(500, 40, 45), pt(1000, 45, 50),
        pt(2000, 55, 60), pt(4000, 70, 72), pt(8000, 80, 82),
      ],
    },
    {
      id: "P-118",
      name: "陈国栋",
      age: 81,
      phone: "137-0000-1183",
      familyName: "女儿 陈敏",
      familyPhone: "136-2222-1184",
      cuePreference: "短句复述",
      hearingNote: "右耳语频下降明显，左耳轻度",
      enrolledAt: "2026-07-22",
      audiogram: [
        pt(250, 25, 45), pt(500, 30, 55), pt(1000, 32, 60),
        pt(2000, 40, 68), pt(4000, 45, 75), pt(8000, 55, 85),
      ],
    },
    {
      id: "P-077",
      name: "赵秀兰",
      age: 73,
      phone: "135-0000-0775",
      familyName: "老伴 李师傅",
      familyPhone: "133-3333-0776",
      cuePreference: "手势提示",
      hearingNote: "双耳对称中度下降，方向感弱",
      enrolledAt: "2026-09-01",
      audiogram: [
        pt(250, 30, 32), pt(500, 42, 44), pt(1000, 50, 48),
        pt(2000, 58, 60), pt(4000, 66, 68), pt(8000, 78, 76),
      ],
    },
  ];

  // 本周计划：王桂珍（含一次复制调整）、赵秀兰
  const wangPlan = buildPlans(
    patients[0],
    0,
    () => ({
      left: {
        discrimination: { task: "双音节词听辨（米饭/汽车）", targetMinutes: 25 },
        localization: { task: "前后方位铃声指认", targetMinutes: 15 },
      },
      right: {
        discrimination: { task: "数字串 4 位复述", targetMinutes: 20 },
        localization: { task: "左右侧男声点名", targetMinutes: 15 },
      },
      cueMethod: "口型提示",
      note: "家属先确认戴机再开始，环境噪声关闭电视",
    }),
    {
      reason: "家属反馈右耳数字串偏难，复制 v1 后改为 3 位数字并增加目标分钟",
      content: {
        left: {
          discrimination: { task: "双音节词听辨（米饭/汽车）", targetMinutes: 25 },
          localization: { task: "前后方位铃声指认", targetMinutes: 15 },
        },
        right: {
          discrimination: { task: "数字串 3 位复述", targetMinutes: 25 },
          localization: { task: "左右侧男声点名", targetMinutes: 15 },
        },
        cueMethod: "口型提示",
        note: "家属先确认戴机再开始，环境噪声关闭电视；答对 80% 再升回 4 位",
      },
    }
  );

  const zhaoPlan = buildPlans(patients[2], 0, () => ({
    left: {
      discrimination: { task: "韵母最小对立（a/an）", targetMinutes: 20 },
      localization: { task: "闭眼听声指左右", targetMinutes: 20 },
    },
    right: {
      discrimination: { task: "日常短句判断对错", targetMinutes: 20 },
      localization: { task: "双耳水平方位 5 点", targetMinutes: 20 },
    },
    cueMethod: "手势提示",
    note: "方向训练由老伴在客厅 2 米外发声",
  }));

  // 陈国栋本周没有新计划（听力师尚未核对曲线），上周有一份
  const chenPlan = buildPlans(patients[1], 1, () => ({
    left: {
      discrimination: { task: "轻声词语辨认", targetMinutes: 15 },
      localization: { task: "左侧声源指认", targetMinutes: 10 },
    },
    right: {
      discrimination: { task: "关键词组听辨", targetMinutes: 30 },
      localization: { task: "右侧方位短句", targetMinutes: 15 },
    },
    cueMethod: "短句复述",
    note: "右耳重点，女儿陪同每天一次",
  }));

  const plans = [wangPlan, zhaoPlan, chenPlan];

  // 训练登记：王桂珍昨天还练（不进复诊）；陈国栋 6 天前（进复诊）；
  // 赵秀兰从未登记（进复诊）
  const logs = [
    logRow(patients[0].id, addDays(today, -1), "both", "discrimination", 20, ["小声词语混淆"], "双音节词 18/25"),
    logRow(patients[0].id, addDays(today, -3), "right", "localization", 12, [], "左右点名基本正确"),
    logRow(patients[0].id, addDays(today, -5), "left", "discrimination", 22, ["嘈杂环境听不清"], "电视关掉后好很多"),
    logRow(patients[1].id, addDays(today, -6), "right", "discrimination", 24, ["短句跟不上"], "女儿说老人下午状态差"),
    logRow(patients[1].id, addDays(today, -8), "both", "localization", 10, ["方向判断偏"], ""),
  ];

  const contacts = [
    {
      id: makeId("contact"),
      patientId: patients[1].id,
      at: `${addDays(today, -3)} 10:05`,
      channel: "电话",
      result: "家属称这周忙，约本周五上午到店复查",
    },
  ];

  return { patients, plans, logs, contacts };
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}

function logRow(
  patientId: string,
  date: string,
  ear: "left" | "right" | "both",
  kind: "discrimination" | "localization",
  minutes: number,
  difficulties: string[],
  note: string
) {
  const { year, week } = isoWeekOf(date);
  return {
    id: makeId("log"),
    patientId,
    date,
    year,
    week,
    ear,
    kind,
    minutes,
    difficulties,
    note,
    createdAt: `${date} 16:00`,
  };
}
