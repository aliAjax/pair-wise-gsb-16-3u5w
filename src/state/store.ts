// 应用状态：连接数据/规则/存储的薄粘合层，页面只通过 actions 改数据
import { useSyncExternalStore } from "react";
import type {
  AppState,
  ContactRecord,
  Patient,
  PlanContent,
  TrainingLog,
} from "../types";
import { buildSeed } from "../data/seed";
import {
  addTrainingLog,
  adjustPlan,
  createPlan,
  findPlan,
  isoWeekOf,
  makeId,
  todayStr,
} from "../data/rules";
import { storage } from "./storage";

export interface ActionResult {
  ok: boolean;
  message: string;
  id?: string;
}

function initState(): AppState {
  return storage.load() ?? buildSeed(todayStr());
}

let state: AppState = initState();
const listeners = new Set<() => void>();

function commit(next: AppState) {
  state = next;
  storage.save(state);
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, () => state);
}

export interface NewTrainingDraft {
  patientId: string;
  date: string;
  ear: TrainingLog["ear"];
  kind: TrainingLog["kind"];
  minutes: number;
  difficulties: string[];
  note: string;
}

export interface NewPatientDraft {
  name: string;
  age: number;
  phone: string;
  familyName: string;
  familyPhone: string;
  cuePreference: string;
  hearingNote: string;
}

export const actions = {
  createPlan(
    patientId: string,
    year: number,
    week: number,
    content: PlanContent,
    createdBy: string
  ): ActionResult {
    const result = createPlan(state, {
      patientId,
      year,
      week,
      content,
      audiogramCheckedAt: `${todayStr()} ${new Date().toTimeString().slice(0, 5)}`,
      createdBy: createdBy.trim() || "听力师",
      createdAt: `${todayStr()} ${new Date().toTimeString().slice(0, 5)}`,
    });
    if (!result.ok) return { ok: false, message: result.error };
    commit({ ...state, plans: [...state.plans, result.value] });
    return {
      ok: true,
      message: `已生成 ${year} 年第 ${week} 周计划（v1，听力曲线已核对）`,
    };
  },

  adjustPlan(
    planId: string,
    content: PlanContent,
    reason: string,
    createdBy: string
  ): ActionResult {
    const plan = state.plans.find((p) => p.id === planId);
    if (!plan) return { ok: false, message: "未找到计划" };
    const now = `${todayStr()} ${new Date().toTimeString().slice(0, 5)}`;
    const result = adjustPlan(plan, {
      content,
      reason,
      createdBy: createdBy.trim() || "听力师",
      createdAt: now,
    });
    if (!result.ok) return { ok: false, message: result.error };
    commit({
      ...state,
      plans: state.plans.map((p) => (p.id === planId ? result.value : p)),
    });
    return {
      ok: true,
      message: `已复制生成 v${result.value.versions.length}，原因已留档`,
    };
  },

  addLog(draft: NewTrainingDraft): ActionResult {
    if (!draft.patientId) return { ok: false, message: "请选择患者" };
    if (!draft.date) return { ok: false, message: "请选择训练日期" };
    if (draft.minutes <= 0) return { ok: false, message: "训练分钟须大于 0" };
    if (findPlan(state, draft.patientId, isoWeekOf(draft.date).year, isoWeekOf(draft.date).week) === undefined) {
      return { ok: false, message: "该周还没有听力师生成的计划，无法登记" };
    }
    const log = addTrainingLog({
      patientId: draft.patientId,
      date: draft.date,
      ear: draft.ear,
      kind: draft.kind,
      minutes: draft.minutes,
      difficulties: draft.difficulties,
      note: draft.note,
      createdAt: new Date().toISOString(),
    });
    commit({ ...state, logs: [...state.logs, log] });
    return { ok: true, message: "训练已登记" };
  },

  addPatient(draft: NewPatientDraft): ActionResult {
    if (!draft.name.trim()) return { ok: false, message: "请填写姓名" };
    const seqNum = state.patients.length + 24;
    const patient: Patient = {
      id: `P-${String(seqNum).padStart(3, "0")}`,
      name: draft.name.trim(),
      age: draft.age,
      phone: draft.phone,
      familyName: draft.familyName,
      familyPhone: draft.familyPhone,
      cuePreference: draft.cuePreference,
      hearingNote: draft.hearingNote,
      audiogram: [250, 500, 1000, 2000, 4000, 8000].map((freq) => ({
        freq,
        left: null,
        right: null,
      })),
      enrolledAt: todayStr(),
    };
    commit({ ...state, patients: [...state.patients, patient] });
    return { ok: true, message: `已建档 ${patient.id}（听力曲线待测录）`, id: patient.id };
  },

  updateAudiogram(patientId: string, points: Patient["audiogram"], hearingNote: string): ActionResult {
    commit({
      ...state,
      patients: state.patients.map((p) =>
        p.id === patientId ? { ...p, audiogram: points, hearingNote: hearingNote || p.hearingNote } : p
      ),
    });
    return { ok: true, message: "听力曲线已保存，可据此生成新一周计划" };
  },

  updateCuePreference(patientId: string, cuePreference: string): ActionResult {
    commit({
      ...state,
      patients: state.patients.map((p) =>
        p.id === patientId ? { ...p, cuePreference } : p
      ),
    });
    return { ok: true, message: "家属提示偏好已保存" };
  },

  addContact(patientId: string, channel: string, result: string): ActionResult {
    if (!channel.trim() || !result.trim()) {
      return { ok: false, message: "请填写联系方式与结果" };
    }
    const contact: ContactRecord = {
      id: makeId("contact"),
      patientId,
      at: `${todayStr()} ${new Date().toTimeString().slice(0, 5)}`,
      channel: channel.trim(),
      result: result.trim(),
    };
    commit({ ...state, contacts: [...state.contacts, contact] });
    return { ok: true, message: "联系结果已记录" };
  },

  resetDemo(): void {
    storage.clear();
    state = buildSeed(todayStr());
    storage.save(state);
    listeners.forEach((fn) => fn());
  },
};
