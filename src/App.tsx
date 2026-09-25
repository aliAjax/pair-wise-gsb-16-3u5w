import { useMemo, useState } from "react";
import "./styles.css";
import type { Patient } from "./types";
import { actions, useAppState } from "./state/store";
import { daysBetween, latestPlanOf, recallList, todayStr } from "./data/rules";
import { Overview } from "./ui/Overview";
import { PlanPanel } from "./ui/PlanPanel";
import { TrainingPanel } from "./ui/TrainingPanel";
import { RecallPanel } from "./ui/RecallPanel";
import { PatientPanel } from "./ui/PatientPanel";

type Tab = "desk" | "recall" | "profile";

const tabs: { key: Tab; label: string }[] = [
  { key: "desk", label: "康复作业台" },
  { key: "recall", label: "复诊联系名单" },
  { key: "profile", label: "档案 / 建档" },
];

function App() {
  const state = useAppState();
  const [tab, setTab] = useState<Tab>("desk");
  const [patientId, setPatientId] = useState<string>(state.patients[0]?.id ?? "");

  const patient = state.patients.find((p) => p.id === patientId) ?? state.patients[0];
  const today = todayStr();
  const recallIds = useMemo(
    () => new Set(recallList(state, today).map((e) => e.patient.id)),
    [state, today]
  );

  const patientLogs = useMemo(
    () => state.logs.filter((l) => l.patientId === patient?.id),
    [state.logs, patient?.id]
  );

  const selectPatient = (id: string) => {
    setPatientId(id);
    setTab("desk");
  };

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">hxwl-01 · 社区听力康复</p>
          <h1>老人听力康复作业台</h1>
          <p className="subtitle">
            按左右耳安排听辨与方向训练，登记周次目标分钟、家属提示方式与每天训练情况；
            听力师核对听力曲线后生成新一周计划，调整先复制版本并写明原因，四天未记录自动进入复诊名单。
          </p>
        </div>
        <div className="stack-card">
          <span>数据 / 规则 / 存储 / 页面 四层分离</span>
          <strong>
            types + data（数据） · rules（规则） · storage（localStorage 持久化） · ui（页面）
          </strong>
          <button className="reset-btn" onClick={() => { if (confirm("恢复为演示数据？当前录入将被清空。")) actions.resetDemo(); }}>
            重置演示数据
          </button>
        </div>
      </section>

      <Overview state={state} onGoRecall={() => setTab("recall")} />

      <nav className="tabbar">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={tab === t.key ? "tab tab-on" : "tab"}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {t.key === "recall" && recallIds.size > 0 ? (
              <span className="tab-badge">{recallIds.size}</span>
            ) : null}
          </button>
        ))}
      </nav>

      {tab === "recall" ? (
        <RecallPanel onSelectPatient={selectPatient} />
      ) : (
        <section className="workspace">
          <aside className="panel narrow">
            <h2>在档老人（{state.patients.length}）</h2>
            <div className="patient-list">
              {state.patients.map((p: Patient) => {
                const last = state.logs
                  .filter((l) => l.patientId === p.id)
                  .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
                const missed = daysBetween(last ? last.date : p.enrolledAt, today);
                const hasWeekPlan = (() => {
                  const lp = latestPlanOf(state, p.id);
                  return lp;
                })();
                return (
                  <button
                    key={p.id}
                    className={
                      "patient-item" +
                      (patient?.id === p.id ? " patient-on" : "") +
                      (recallIds.has(p.id) ? " patient-danger" : "")
                    }
                    onClick={() => setPatientId(p.id)}
                  >
                    <div>
                      <strong>{p.name}</strong>
                      <span>{p.id} · {p.age} 岁</span>
                    </div>
                    <div className="patient-meta">
                      <span className={recallIds.has(p.id) ? "dot dot-danger" : "dot dot-ok"} />
                      <span>
                        {last ? `${missed} 天前练过` : "从未登记"}
                      </span>
                      {hasWeekPlan ? <em>第 {hasWeekPlan.week} 周计划</em> : <em className="muted">无计划</em>}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="panel-stack">
            {patient ? (
              tab === "desk" ? (
                <>
                  <PlanPanel key={patient.id} patient={patient} allLogs={patientLogs} />
                  <TrainingPanel key={patient.id} patient={patient} />
                </>
              ) : (
                <PatientPanel
                  key={patient.id}
                  patient={patient}
                  onCreated={(id) => setPatientId(id)}
                />
              )
            ) : (
              <div className="panel">
                <p>还没有患者，请先到「档案 / 建档」登记一位老人。</p>
              </div>
            )}
          </section>
        </section>
      )}

      <footer className="foot-note">
        数据保存在本机浏览器 localStorage（hxwl-rehab-state-v1），关闭重开后计划、训练、联系名单与提示偏好均保留。
      </footer>
    </main>
  );
}

export default App;
