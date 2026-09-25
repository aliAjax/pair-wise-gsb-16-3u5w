// 规则层冒烟测试（不经过浏览器与存储）：验证周计算、计划唯一性、版本调整、4 天复诊规则。
import assert from "node:assert";
import { buildSeed } from "../src/data/seed";
import { currentWeekKey, weekKeyOfDate, daysBetween, weekDayKey } from "../src/rules/dates";
import { createPlan, revisePlan, findPlan, PlanRuleError, currentVersion, canCreatePlan } from "../src/rules/plans";
import { buildFollowupList, isOverdue } from "../src/rules/followup";
import { weekProgress } from "../src/rules/progress";
import type { AppData } from "../src/types";

const now = new Date(2026, 8, 25, 12, 0, 0); // 2026-09-25 周五
const today = "2026-09-25";
const thisWeek = currentWeekKey(now);
assert.equal(thisWeek, "2026-W39", `本周应为 2026-W39，实际 ${thisWeek}`);
assert.equal(weekKeyOfDate("2026-09-21"), "2026-W39");
assert.equal(weekKeyOfDate("2026-09-20"), "2026-W38");
assert.equal(weekDayKey(thisWeek, 0), "2026-09-21", "本周周一");
assert.equal(weekDayKey(thisWeek, 6), "2026-09-27", "本周周日");
assert.equal(daysBetween("2026-09-20", today), 5);

let data: AppData = buildSeed(now);

// 种子：赵德山 5 天、刘桂兰 6 天未记录 => 复诊名单恰好两人，按天数降序
const list = buildFollowupList(data, today);
assert.deepEqual(
  list.map((e) => [e.patient.name, e.daysSince]),
  [
    ["刘桂兰", 6],
    ["赵德山", 5],
  ],
);
assert.equal(isOverdue(data, "p_lixiuying", today), false);
assert.equal(isOverdue(data, "p_zhaodeshan", today), true);

// 李秀英本周已有计划：同周再建必须被拒（同一患者同一周只一份）
const draft = {
  weekKey: thisWeek,
  targetMinutes: 40,
  promptMethod: "verbal" as const,
  items: [{ ear: "L" as const, kind: "discrim" as const, minutes: 20, content: "x" }],
};
assert.throws(() => createPlan(data, "p_lixiuying", draft, "林听力师", now), PlanRuleError);
assert.throws(
  () => createPlan(data, "p_lixiuying", { ...draft }, "林听力师", now),
  /同一患者同一周/,
);

// 赵德山曲线已核对、本周无计划 => 可以生成
assert.equal(canCreatePlan(data, "p_zhaodeshan").ok, true);
const newPlan = createPlan(
  data,
  "p_zhaodeshan",
  {
    ...draft,
    items: [
      { ear: "L", kind: "discrim", minutes: 20, content: "词语听辨" },
      { ear: "R", kind: "direction", minutes: 15, content: "左右方向" },
    ],
  },
  "林听力师",
  now,
);
assert.equal(newPlan.versions.length, 1);
assert.equal(currentVersion(newPlan).version, 1);
data = { ...data, plans: [...data.plans, newPlan] };
assert.ok(findPlan(data, "p_zhaodeshan", thisWeek));

// 调整必须写原因，且复制为新版本（历史保留）
assert.throws(
  () => revisePlan(newPlan, { targetMinutes: 50, promptMethod: "gesture", items: newPlan.versions[0].items }, "  ", "林听力师", now),
  /调整原因/,
);
const revised = revisePlan(
  newPlan,
  {
    targetMinutes: 50,
    promptMethod: "gesture",
    items: [
      { ear: "L", kind: "discrim", minutes: 30, content: "词语听辨加强" },
      { ear: "R", kind: "direction", minutes: 20, content: "左右方向" },
    ],
  },
  "老人疲劳，增加分次练习",
  "林听力师",
  now,
);
assert.equal(revised.versions.length, 2);
assert.equal(currentVersion(revised).version, 2);
assert.equal(currentVersion(revised).reason, "老人疲劳，增加分次练习");
assert.equal(revised.versions[0].version, 1);
assert.equal(revised.versions[0].targetMinutes, 40, "v1 历史目标保留");
assert.equal(currentVersion(revised).targetMinutes, 50);

// 分钟合计超过周目标 => 拒绝
assert.throws(
  () =>
    revisePlan(
      newPlan,
      { targetMinutes: 10, promptMethod: "gesture", items: revised.versions[1].items },
      "测试超额",
      "林听力师",
      now,
    ),
  /超过周目标/,
);

// 未核对曲线不能生成：把周福生的曲线核对清空
data = {
  ...data,
  audiograms: data.audiograms.map((a) =>
    a.id === "a_zhou_1" ? { ...a, checkedBy: null, checkedAt: null } : a,
  ),
};
assert.equal(canCreatePlan(data, "p_zhoufusheng").ok, false);
assert.throws(
  () =>
    createPlan(
      data,
      "p_zhoufusheng",
      {
        weekKey: "2026-W40",
        targetMinutes: 30,
        promptMethod: "demo",
        items: [{ ear: "L", kind: "discrim", minutes: 20, content: "x" }],
      },
      "林听力师",
      now,
    ),
  /尚未经听力师核对/,
);

// 进度汇总：周福生本周 15+15+18+20=68 分钟
const zp = weekProgress(data, "p_zhoufusheng", thisWeek);
assert.equal(zp.done, 68);
assert.equal(zp.target, 50);
assert.equal(zp.byEar.R.done, 53);
assert.equal(zp.byEar.L.done, 15);

// 补一条赵德山今日训练 => 未满 4 天，移出复诊名单
data = {
  ...data,
  logs: [
    ...data.logs,
    {
      id: "log_new",
      patientId: "p_zhaodeshan",
      weekKey: thisWeek,
      date: today,
      ear: "L",
      kind: "discrim",
      minutes: 10,
      difficulty: "",
      note: "",
      createdAt: now.toISOString(),
    },
  ],
};
const list2 = buildFollowupList(data, today).map((e) => e.patient.name);
assert.ok(!list2.includes("赵德山"), "补登记后应移出名单");
assert.ok(list2.includes("刘桂兰"));

// 新患者无任何记录 => 直接进入名单
data = {
  ...data,
  patients: [
    ...data.patients,
    {
      id: "p_new",
      name: "新来老人",
      age: 80,
      phone: "",
      familyName: "家属",
      familyPhone: "",
      promptMethod: "note",
      promptDetail: "",
      joinedAt: today,
      note: "",
    },
  ],
};
assert.equal(isOverdue(data, "p_new", today), true, "从未记录也应进入复诊名单");

console.log("规则冒烟测试全部通过 ✓");
