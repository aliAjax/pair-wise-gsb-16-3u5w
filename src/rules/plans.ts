// 周计划规则：
// 1) 听力师核对听力曲线后才能生成新一周计划；
// 2) 同一患者同一周只留一份计划（多版本通过调整进入）；
// 3) 调整先复制当前版本，版本号递增并写明原因。
import type {
  AppData,
  Audiogram,
  Ear,
  PlanItem,
  PlanVersion,
  PromptMethod,
  WeeklyPlan,
} from "../types";

export interface PlanDraft {
  weekKey: string;
  targetMinutes: number;
  promptMethod: PromptMethod;
  items: PlanItem[];
}

export class PlanRuleError extends Error {}

/** 取患者最新一条听力曲线 */
export function latestAudiogram(data: AppData, patientId: string): Audiogram | null {
  return (
    data.audiograms
      .filter((a) => a.patientId === patientId)
      .sort((a, b) => (a.testDate < b.testDate ? 1 : -1))[0] ?? null
  );
}

/** 生成计划所依据的听力曲线是否已经听力师核对 */
export function canCreatePlan(data: AppData, patientId: string): {
  ok: boolean;
  reason: string;
  audiogram: Audiogram | null;
} {
  const audiogram = latestAudiogram(data, patientId);
  if (!audiogram) return { ok: false, reason: "尚无听力曲线，请先录入并核对", audiogram: null };
  if (!audiogram.checkedBy) {
    return {
      ok: false,
      reason: `听力曲线（${audiogram.testDate}）尚未经听力师核对`,
      audiogram,
    };
  }
  return { ok: true, reason: "", audiogram };
}

/** 同一患者同一周的唯一计划 */
export function findPlan(
  data: AppData,
  patientId: string,
  weekKey: string,
): WeeklyPlan | undefined {
  return data.plans.find((p) => p.patientId === patientId && p.weekKey === weekKey);
}

export function currentVersion(plan: WeeklyPlan): PlanVersion {
  return plan.versions.reduce((a, b) => (a.version > b.version ? a : b));
}

function validateDraft(draft: PlanDraft): void {
  if (!Number.isFinite(draft.targetMinutes) || draft.targetMinutes <= 0) {
    throw new PlanRuleError("每周目标分钟数必须大于 0");
  }
  if (draft.items.length === 0) throw new PlanRuleError("至少安排一条听辨或方向训练");
  const seen = new Set<string>();
  for (const item of draft.items) {
    if (!Number.isFinite(item.minutes) || item.minutes <= 0) {
      throw new PlanRuleError("每条训练的分钟数必须大于 0");
    }
    if (!item.content.trim()) throw new PlanRuleError("请填写训练内容");
    const key = `${item.ear}:${item.kind}`;
    if (seen.has(key)) throw new PlanRuleError("同一只耳朵的同一类训练只能安排一条，请合并分钟");
    seen.add(key);
  }
  const itemTotal = draft.items.reduce((s, i) => s + i.minutes, 0);
  if (itemTotal > draft.targetMinutes) {
    throw new PlanRuleError(`各条分钟合计 ${itemTotal} 分钟，超过周目标 ${draft.targetMinutes} 分钟`);
  }
}

/** 生成新一周计划；已存在则必须走“调整” */
export function createPlan(
  data: AppData,
  patientId: string,
  draft: PlanDraft,
  author: string,
  now: Date,
): WeeklyPlan {
  const check = canCreatePlan(data, patientId);
  if (!check.ok || !check.audiogram) throw new PlanRuleError(check.reason);
  if (findPlan(data, patientId, draft.weekKey)) {
    throw new PlanRuleError("同一患者同一周只保留一份计划，需要修改请使用“调整版本”");
  }
  validateDraft(draft);
  const version: PlanVersion = {
    version: 1,
    createdAt: now.toISOString(),
    author,
    reason: null,
    targetMinutes: draft.targetMinutes,
    promptMethod: draft.promptMethod,
    audiogramId: check.audiogram.id,
    items: draft.items.map((i) => ({ ...i })),
  };
  return { id: `plan_${patientId}_${draft.weekKey}`, patientId, weekKey: draft.weekKey, versions: [version] };
}

/** 调整计划：复制当前版本形成新版本，必须写原因 */
export function revisePlan(
  plan: WeeklyPlan,
  patch: Pick<PlanDraft, "targetMinutes" | "promptMethod" | "items">,
  reason: string,
  author: string,
  now: Date,
): WeeklyPlan {
  const trimmed = reason.trim();
  if (!trimmed) throw new PlanRuleError("调整计划必须填写调整原因");
  const base = currentVersion(plan);
  const merged: PlanDraft = {
    weekKey: plan.weekKey,
    targetMinutes: patch.targetMinutes,
    promptMethod: patch.promptMethod,
    items: patch.items,
  };
  validateDraft(merged);
  const next: PlanVersion = {
    ...base,
    version: base.version + 1,
    createdAt: now.toISOString(),
    author,
    reason: trimmed,
    targetMinutes: patch.targetMinutes,
    promptMethod: patch.promptMethod,
    items: patch.items.map((i) => ({ ...i })),
  };
  return { ...plan, versions: [...plan.versions, next] };
}

/** 供新建计划默认带出：上一周版本（若无则空模板，覆盖左右耳两种训练） */
export function defaultItemsFrom(data: AppData, patientId: string, weekKey: string): PlanItem[] {
  const prev = data.plans
    .filter((p) => p.patientId === patientId && p.weekKey < weekKey)
    .sort((a, b) => (a.weekKey < b.weekKey ? 1 : -1))[0];
  if (prev) return currentVersion(prev).items.map((i) => ({ ...i }));
  return [];
}

export function itemsByEar(plan: WeeklyPlan): Record<Ear, PlanItem[]> {
  const cur = currentVersion(plan);
  return {
    L: cur.items.filter((i) => i.ear === "L"),
    R: cur.items.filter((i) => i.ear === "R"),
  };
}
