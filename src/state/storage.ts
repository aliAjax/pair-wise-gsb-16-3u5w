// 存储层：只负责 AppState 的持久化读写，不关心业务规则与页面
import type { AppState } from "../types";

const STORAGE_KEY = "hxwl-rehab-state-v1";

export const storage = {
  load(): AppState | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as AppState;
      if (!parsed.patients || !parsed.plans || !parsed.logs || !parsed.contacts) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  },
  save(state: AppState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // 存储不可用时仅保留内存状态
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  },
};
