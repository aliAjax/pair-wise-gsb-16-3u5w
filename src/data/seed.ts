// 种子数据：仅负责提供初始内容。所有日期相对“今天”生成，
// 让本周计划、上周计划、满 4 天未记录的复诊名单开箱即可演示。
import type { AppData, Patient, TrainingLog, WeeklyPlan } from "../types";
import { toDateKey, weekKeyOfDate } from "../rules/dates";

function dayKey(now: Date, offset: number): string {
  return toDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset));
}

function iso(now: Date, offsetDays: number, hour: number): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays, hour, 0, 0);
  return d.toISOString();
}

export function buildSeed(now: Date = new Date()): AppData {
  const thisWeek = weekKeyOfDate(now);
  const lastWeek = weekKeyOfDate(dayKey(now, -7));

  const patients: Patient[] = [
    {
      id: "p_lixiuying",
      name: "李秀英",
      age: 72,
      phone: "138-0001-0001",
      familyName: "王建国（儿子）",
      familyPhone: "139-0002-0001",
      promptMethod: "verbal",
      promptDetail: "放慢语速，先叫名字再开口",
      joinedAt: dayKey(now, -70),
      note: "双耳对称性高频下降，家属配合度高",
    },
    {
      id: "p_zhaodeshan",
      name: "赵德山",
      age: 78,
      phone: "138-0001-0002",
      familyName: "赵桂芳（女儿）",
      familyPhone: "139-0002-0002",
      promptMethod: "gesture",
      promptDetail: "老人耳背，提示时配合指耳、指方向手势",
      joinedAt: dayKey(now, -95),
      note: "左耳较差，双耳佩戴助听器",
    },
    {
      id: "p_liuguilan",
      name: "刘桂兰",
      age: 75,
      phone: "138-0001-0003",
      familyName: "陈志明（儿子）",
      familyPhone: "139-0002-0003",
      promptMethod: "card",
      promptDetail: "用大字图片卡提示，老人不识字，靠图辨认",
      joinedAt: dayKey(now, -40),
      note: "右耳语频下降明显，训练后易疲劳",
    },
    {
      id: "p_zhoufusheng",
      name: "周福生",
      age: 69,
      phone: "138-0001-0004",
      familyName: "周丽华（女儿）",
      familyPhone: "139-0002-0004",
      promptMethod: "demo",
      promptDetail: "家属先示范一遍再请老人模仿",
      joinedAt: dayKey(now, -21),
      note: "轻度听损，训练积极，方向辨别进步快",
    },
  ];

  const audiograms = [
    {
      id: "a_liu_1",
      patientId: "p_lixiuying",
      testDate: dayKey(now, -7),
      left: [25, 30, 35, 50, 60, 65],
      right: [25, 28, 32, 48, 58, 62],
      checkedBy: "林听力师",
      checkedAt: iso(now, -7, 10),
    },
    {
      id: "a_zhao_1",
      patientId: "p_zhaodeshan",
      testDate: dayKey(now, -14),
      left: [40, 45, 55, 68, 78, 85],
      right: [35, 38, 45, 58, 70, 76],
      checkedBy: "林听力师",
      checkedAt: iso(now, -13, 9),
    },
    {
      id: "a_liu_guilan_1",
      patientId: "p_liuguilan",
      testDate: dayKey(now, -10),
      left: [30, 32, 40, 50, 55, 60],
      right: [35, 42, 55, 65, 70, 72],
      checkedBy: "林听力师",
      checkedAt: iso(now, -9, 14),
    },
    {
      id: "a_zhou_1",
      patientId: "p_zhoufusheng",
      testDate: dayKey(now, -5),
      left: [20, 22, 25, 32, 40, 45],
      right: [18, 20, 24, 30, 38, 42],
      checkedBy: "林听力师",
      checkedAt: iso(now, -5, 11),
    },
  ];

  const plans: WeeklyPlan[] = [
    // 李秀英：上周计划经历一次调整（保留两版），本周已生成
    {
      id: "plan_p_lixiuying_last",
      patientId: "p_lixiuying",
      weekKey: lastWeek,
      versions: [
        {
          version: 1,
          createdAt: iso(now, -14, 9),
          author: "林听力师",
          reason: null,
          targetMinutes: 45,
          promptMethod: "verbal",
          audiogramId: "a_liu_1",
          items: [
            { ear: "L", kind: "discrim", minutes: 20, content: "双音节词听辨后复述" },
            { ear: "R", kind: "direction", minutes: 15, content: "闭目辨别左右摇铃声" },
            { ear: "L", kind: "direction", minutes: 10, content: "辨别前后方向脚步声" },
          ],
        },
        {
          version: 2,
          createdAt: iso(now, -11, 16),
          author: "林听力师",
          reason: "家属反馈右耳方向提示过多导致疲劳，改为右耳听辨巩固，并把周目标提到 50 分钟",
          targetMinutes: 50,
          promptMethod: "verbal",
          audiogramId: "a_liu_1",
          items: [
            { ear: "L", kind: "discrim", minutes: 20, content: "双音节词听辨后复述" },
            { ear: "R", kind: "discrim", minutes: 15, content: "日常短句听辨（买东西、打招呼）" },
            { ear: "L", kind: "direction", minutes: 15, content: "闭目辨别左右摇铃声" },
          ],
        },
      ],
    },
    {
      id: "plan_p_lixiuying_this",
      patientId: "p_lixiuying",
      weekKey: thisWeek,
      versions: [
        {
          version: 1,
          createdAt: iso(now, -2, 9),
          author: "林听力师",
          reason: null,
          targetMinutes: 60,
          promptMethod: "verbal",
          audiogramId: "a_liu_1",
          items: [
            { ear: "L", kind: "discrim", minutes: 25, content: "短句与数字串听辨复述" },
            { ear: "R", kind: "discrim", minutes: 20, content: "噪声环境短句听辨" },
            { ear: "L", kind: "direction", minutes: 15, content: "闭目辨别左右前后声源" },
          ],
        },
      ],
    },
    // 赵德山：只有上周计划，本周待生成；已 5 天未记录
    {
      id: "plan_p_zhaodeshan_last",
      patientId: "p_zhaodeshan",
      weekKey: lastWeek,
      versions: [
        {
          version: 1,
          createdAt: iso(now, -14, 10),
          author: "林听力师",
          reason: null,
          targetMinutes: 40,
          promptMethod: "gesture",
          audiogramId: "a_zhao_1",
          items: [
            { ear: "L", kind: "discrim", minutes: 20, content: "家属口型配合手势做词语听辨" },
            { ear: "R", kind: "direction", minutes: 20, content: "手势指认左右声源" },
          ],
        },
      ],
    },
    // 刘桂兰：上周计划调整过一次，本周待生成；已 6 天未记录
    {
      id: "plan_p_liuguilan_last",
      patientId: "p_liuguilan",
      weekKey: lastWeek,
      versions: [
        {
          version: 1,
          createdAt: iso(now, -14, 11),
          author: "林听力师",
          reason: null,
          targetMinutes: 35,
          promptMethod: "card",
          audiogramId: "a_liu_guilan_1",
          items: [
            { ear: "L", kind: "discrim", minutes: 20, content: "图片卡指认：水果、日用品" },
            { ear: "R", kind: "discrim", minutes: 15, content: "图片卡指认：家人称呼" },
          ],
        },
        {
          version: 2,
          createdAt: iso(now, -10, 15),
          author: "林听力师",
          reason: "复查曲线后右耳听损偏重，加入右耳方向辨别并把目标提高到 45 分钟",
          targetMinutes: 45,
          promptMethod: "card",
          audiogramId: "a_liu_guilan_1",
          items: [
            { ear: "L", kind: "discrim", minutes: 15, content: "图片卡指认：水果、日用品" },
            { ear: "R", kind: "discrim", minutes: 15, content: "图片卡指认：家人称呼" },
            { ear: "L", kind: "direction", minutes: 15, content: "图片卡配合辨别左侧铃声" },
          ],
        },
      ],
    },
    // 周福生：本周已生成计划，坚持每天记录
    {
      id: "plan_p_zhoufusheng_this",
      patientId: "p_zhoufusheng",
      weekKey: thisWeek,
      versions: [
        {
          version: 1,
          createdAt: iso(now, -1, 10),
          author: "林听力师",
          reason: null,
          targetMinutes: 50,
          promptMethod: "demo",
          audiogramId: "a_zhou_1",
          items: [
            { ear: "L", kind: "discrim", minutes: 15, content: "电话常用语听辨" },
            { ear: "R", kind: "discrim", minutes: 15, content: "新闻短句听辨复述" },
            { ear: "R", kind: "direction", minutes: 20, content: "示范后辨别四方位声源" },
          ],
        },
      ],
    },
  ];

  const log = (
    id: string,
    patientId: string,
    offset: number,
    ear: TrainingLog["ear"],
    kind: TrainingLog["kind"],
    minutes: number,
    difficulty: string,
    hour = 19,
  ): TrainingLog => {
    const date = dayKey(now, offset);
    return {
      id,
      patientId,
      weekKey: weekKeyOfDate(date),
      date,
      ear,
      kind,
      minutes,
      difficulty,
      note: "",
      createdAt: iso(now, offset, hour),
    };
  };

  const logs: TrainingLog[] = [
    // 李秀英：上周 + 本周两次
    log("log_li_1", "p_lixiuying", -10, "L", "discrim", 20, ""),
    log("log_li_2", "p_lixiuying", -9, "R", "discrim", 15, "右耳短句需要重复两次"),
    log("log_li_3", "p_lixiuying", -8, "L", "direction", 15, "后方方向偶尔判反"),
    log("log_li_4", "p_lixiuying", -2, "L", "discrim", 22, "数字串第 5 位以后容易漏"),
    log("log_li_5", "p_lixiuying", -1, "L", "direction", 15, ""),
    // 赵德山：最近一次 5 天前
    log("log_zhao_1", "p_zhaodeshan", -9, "L", "discrim", 20, "听得到听不清"),
    log("log_zhao_2", "p_zhaodeshan", -8, "R", "direction", 18, "方向辨别偏左侧"),
    log("log_zhao_3", "p_zhaodeshan", -5, "L", "discrim", 15, "嘈杂环境听不清，家属说情绪低落不想练"),
    // 刘桂兰：最近一次 6 天前
    log("log_lg_1", "p_liuguilan", -9, "L", "discrim", 15, ""),
    log("log_lg_2", "p_liuguilan", -8, "R", "discrim", 12, "需要重复多次"),
    log("log_lg_3", "p_liuguilan", -6, "L", "direction", 10, "训练后疲劳明显，提前结束"),
    // 周福生：本周每天都在练
    log("log_zhou_1", "p_zhoufusheng", -2, "R", "discrim", 15, ""),
    log("log_zhou_2", "p_zhoufusheng", -2, "L", "discrim", 15, "电话用语基本正确"),
    log("log_zhou_3", "p_zhoufusheng", -1, "R", "direction", 18, ""),
    log("log_zhou_4", "p_zhoufusheng", 0, "R", "direction", 20, "四方位全部正确", 9),
  ];

  const contacts = [
    {
      id: "c_zhao_1",
      patientId: "p_zhaodeshan",
      date: dayKey(now, -3),
      channel: "电话",
      content: "女儿反映老人嫌麻烦不肯练，已约本周五上午上门，改用手势分步提示。",
      author: "复诊助理小周",
      createdAt: iso(now, -3, 10),
    },
    {
      id: "c_liu_guilan_1",
      patientId: "p_liuguilan",
      date: dayKey(now, -2),
      channel: "上门",
      content: "上门指导图片卡用法，家属表示会每天晚饭后陪练 15 分钟。",
      author: "复诊助理小周",
      createdAt: iso(now, -2, 15),
    },
  ];

  return {
    meta: { specialist: "林听力师" },
    patients,
    audiograms,
    plans,
    logs,
    contacts,
  };
}
