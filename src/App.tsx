import { useEffect, useMemo, useState } from "react";
import "./styles.css";
import type {
  AppData,
  Audiogram,
  ContactNote,
  Patient,
  PromptMethod,
  TrainingLog,
} from "./types";
import { loadData, resetData, saveData } from "./storage/store";
import {
  currentWeekKey,
  todayKey,
  weekKeyOfDate,
  weekLabel,
} from "./rules/dates";
import { newId } from "./rules/ids";
import {
  canCreatePlan,
  createPlan,
  latestAudiogram,
  revisePlan,
} from "./rules/plans";
import { buildFollowupList } from "./rules/followup";
import { weekProgress } from "./rules/progress";
import { Workbench } from "./components/Workbench";
import { FollowupView } from "./components/FollowupView";
import { PatientsView } from "./components/PatientsView";
import { AudiogramModal } from "./components/AudiogramModal";
import type { PlanDraft } from "./rules/plans";

type View = "workbench" | "followup" | "patients";

export default function App() {
  const [data, setData] = useState<AppData>(() => loadData());
  const [view, setView] = useState<View>("workbench");
  const [selectedId, setSelectedId] = useState<string>(() => data.patients[0]?.id ?? "");
  const [audiEditId, setAudiEditId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const result = saveData(data);
    if (!result.ok) setToast(`数据保存失败：${result.error}`);
  }, [data]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(t);
  }, [toast]);

  const weekKey = currentWeekKey();
  const stats = useMemo(() => {
    const followup = buildFollowupList(data);
    const planned = new Set(
      data.plans.filter((p) => p.weekKey === weekKey).map((p) => p.patientId),
    );
    let done = 0;
    for (const p of data.patients) done += weekProgress(data, p.id, weekKey).done;
    const pendingLogs = data.logs.filter((l) => l.weekKey === weekKey).length;
    return { followup: followup.length, planned: planned.size, done, pendingLogs };
  }, [data, weekKey]);

  const selectedPatient = data.patients.find((p) => p.id === selectedId) ?? data.patients[0];

  // ---------- 患者 ----------
  const addPatient = (p: Omit<Patient, "id" | "joinedAt">) => {
    const patient: Patient = { ...p, id: newId("p"), joinedAt: todayKey() };
    setData((d) => ({ ...d, patients: [...d.patients, patient] }));
    setSelectedId(patient.id);
    setView("workbench");
    setToast("已建档，请录入并核对听力曲线");
  };

  const updatePromptPreference = (patientId: string, method: PromptMethod, detail: string) => {
    setData((d) => ({
      ...d,
      patients: d.patients.map((p) =>
        p.id === patientId ? { ...p, promptMethod: method, promptDetail: detail } : p,
      ),
    }));
    setToast("家属提示偏好已保存");
  };

  // ---------- 听力曲线 ----------
  const checkAudiogram = (audiogramId: string) => {
    const target = data.audiograms.find((a) => a.id === audiogramId);
    setData((d) => ({
      ...d,
      audiograms: d.audiograms.map((a) =>
        a.id === audiogramId
          ? { ...a, checkedBy: d.meta.specialist, checkedAt: new Date().toISOString() }
          : a,
      ),
    }));
    setToast(`${data.meta.specialist} 已核对听力曲线（${target?.testDate ?? ""}），可以生成计划`);
  };

  const saveAudiogram = (
    patientId: string,
    next: { testDate: string; left: number[]; right: number[] },
  ) => {
    setData((d) => {
      const existing = latestAudiogram(d, patientId);
      if (existing) {
        const untouched =
          existing.testDate === next.testDate &&
          existing.left.every((v, i) => v === next.left[i]) &&
          existing.right.every((v, i) => v === next.right[i]);
        // 内容一旦变更，核对作废，必须重新核对
        const cleared = untouched
          ? {}
          : { checkedBy: null, checkedAt: null };
        return {
          ...d,
          audiograms: d.audiograms.map((a) =>
            a.id === existing.id ? { ...a, ...next, ...cleared } : a,
          ),
        };
      }
      const audiogram: Audiogram = {
        id: newId("a"),
        patientId,
        ...next,
        checkedBy: null,
        checkedAt: null,
      };
      return { ...d, audiograms: [...d.audiograms, audiogram] };
    });
    setAudiEditId(null);
    setToast("听力曲线已保存，核对后即可生成计划");
  };

  // ---------- 计划 ----------
  const handleCreatePlan = (patientId: string, draft: PlanDraft) => {
    setData((d) => {
      const plan = createPlan(d, patientId, draft, d.meta.specialist, new Date());
      return { ...d, plans: [...d.plans, plan] };
    });
    setToast("新一周计划已生成（同一患者本周仅此一份）");
  };

  const handleRevisePlan = (
    patientId: string,
    targetWeek: string,
    patch: Pick<PlanDraft, "targetMinutes" | "promptMethod" | "items">,
    reason: string,
  ) => {
    setData((d) => {
      const plan = d.plans.find((p) => p.patientId === patientId && p.weekKey === targetWeek);
      if (!plan) throw new Error("未找到计划");
      const next = revisePlan(plan, patch, reason, d.meta.specialist, new Date());
      return { ...d, plans: d.plans.map((p) => (p.id === plan.id ? next : p)) };
    });
    setToast("已复制为新版本并记录调整原因");
  };

  // ---------- 训练记录 ----------
  const addLog: (
    patientId: string,
    l: { date: string; ear: TrainingLog["ear"]; kind: TrainingLog["kind"]; minutes: number; difficulty: string; note: string },
  ) => void = (patientId, l) => {
    const log: TrainingLog = {
      id: newId("log"),
      patientId,
      weekKey: weekKeyOfDate(l.date),
      ...l,
      createdAt: new Date().toISOString(),
    };
    setData((d) => ({ ...d, logs: [...d.logs, log] }));
  };

  // ---------- 复诊联系 ----------
  const addContact = (
    patientId: string,
    note: Pick<ContactNote, "channel" | "content" | "author">,
  ) => {
    const record: ContactNote = {
      id: newId("c"),
      patientId,
      date: todayKey(),
      ...note,
      createdAt: new Date().toISOString(),
    };
    setData((d) => ({ ...d, contacts: [...d.contacts, record] }));
    setToast("联系记录已保存");
  };

  const reset = () => {
    if (window.confirm("确定清空本地数据并恢复演示数据？所有计划、训练与联系记录都会重置。")) {
      const seed = resetData();
      setData(seed);
      setSelectedId(seed.patients[0]?.id ?? "");
      setToast("已恢复演示数据");
    }
  };

  const editingPatient = data.patients.find((p) => p.id === audiEditId) ?? null;
  const editingAudi = editingPatient ? latestAudiogram(data, editingPatient.id) : null;

  const navItems: { key: View; label: string; badge?: number }[] = [
    { key: "workbench", label: "康复作业台" },
    { key: "followup", label: "复诊名单", badge: stats.followup },
    { key: "patients", label: "患者档案" },
  ];

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="logo">耳</span>
          <div>
            <h1>社区听力康复作业台</h1>
            <p>按左右耳安排听辨与方向训练 · 听力师 · 家属 · 复诊助理协同</p>
          </div>
        </div>
        <div className="header-meta">
          <span>{weekLabel(weekKey)}</span>
          <span>听力师：{data.meta.specialist}</span>
          <button onClick={reset} title="清空本地数据并恢复演示数据">重置演示数据</button>
        </div>
      </header>

      <section className="stats-row">
        <div className="stat"><span>在册老人</span><strong>{data.patients.length}</strong></div>
        <div className="stat"><span>本周已排计划</span><strong>{stats.planned}<i> / {data.patients.length}</i></strong></div>
        <div className="stat"><span>本周已训练</span><strong>{stats.done}<i> 分钟 · {stats.pendingLogs} 次登记</i></strong></div>
        <div className={`stat ${stats.followup > 0 ? "stat-alert" : ""}`}>
          <span>复诊名单（≥4 天未记录）</span>
          <strong>{stats.followup}<i> 人</i></strong>
        </div>
      </section>

      <nav className="tabs">
        {navItems.map((n) => (
          <button
            key={n.key}
            className={`tab ${view === n.key ? "active" : ""}`}
            onClick={() => setView(n.key)}
          >
            {n.label}
            {n.badge ? <i className="tab-badge">{n.badge}</i> : null}
          </button>
        ))}
      </nav>

      <main className="content">
        {view === "workbench" && selectedPatient && (
          <Workbench
            data={data}
            selectedId={selectedPatient.id}
            onSelectPatient={setSelectedId}
            handlers={{
              checkAudiogram,
              openAudiogramEditor: setAudiEditId,
              createPlan: handleCreatePlan,
              revisePlan: handleRevisePlan,
              addLog,
              updatePromptPreference,
            }}
          />
        )}
        {view === "followup" && (
          <FollowupView
            data={data}
            onJump={(id) => {
              setSelectedId(id);
              setView("workbench");
            }}
            onAddContact={addContact}
          />
        )}
        {view === "patients" && (
          <PatientsView
            data={data}
            onAddPatient={addPatient}
            onEditAudiogram={setAudiEditId}
            onCheckAudiogram={checkAudiogram}
            onOpenWorkbench={(id) => {
              setSelectedId(id);
              setView("workbench");
            }}
          />
        )}
      </main>

      {editingPatient && (
        <AudiogramModal
          patientName={editingPatient.name}
          original={editingAudi}
          onClose={() => setAudiEditId(null)}
          onSave={(next) => saveAudiogram(editingPatient.id, next)}
        />
      )}

      {toast && <div className="toast">{toast}</div>}

      <footer className="app-footer">
        数据保存在本机浏览器（localStorage）：领域类型与字典（src/types、src/data）、业务规则（src/rules）、存储（src/storage）、页面（src/components）相互分开。
      </footer>
    </div>
  );
}
