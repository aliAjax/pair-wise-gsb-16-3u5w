// 存储层：只负责把 AppData 读写到 localStorage、做结构校验与重置。
// 页面与规则层不直接接触 localStorage。
import type { AppData } from "../types";
import { buildSeed } from "../data/seed";

const STORAGE_KEY = "rehab-workbench:v1";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/** 最基本的结构校验；损坏数据一律回退种子，避免页面带着脏数据跑规则 */
export function isValidAppData(v: unknown): v is AppData {
  if (!isRecord(v) || !isRecord(v.meta)) return false;
  for (const key of ["patients", "audiograms", "plans", "logs", "contacts"] as const) {
    if (!Array.isArray(v[key])) return false;
  }
  const patients = v.patients as unknown[];
  return patients.every((p) => isRecord(p) && typeof p.id === "string" && typeof p.name === "string");
}

export function loadData(now: Date = new Date()): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isValidAppData(parsed)) return parsed;
    }
  } catch {
    // localStorage 不可用或内容损坏时回退种子
  }
  return buildSeed(now);
}

export function saveData(data: AppData): { ok: boolean; error?: string } {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function resetData(now: Date = new Date()): AppData {
  const seed = buildSeed(now);
  saveData(seed);
  return seed;
}
