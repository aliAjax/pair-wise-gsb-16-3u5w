import { useMemo, useState } from "react";
import type {
  AppData,
  Ear,
  Patient,
  TrainingKind,
  TrainingLog,
} from "../types";
import {
  EAR_LABEL,
  KIND_LABEL,
  PROMPT_LABEL,
  PROMPT_METHODS,
  QUICK_DIFFICULTY,
} from "../data/catalog";
import { currentWeekKey, daysBetween, todayKey, weekLabel } from "../rules/dates";
import {
  canCreatePlan,
  currentVersion,
  itemsByEar,
  type PlanDraft,
} from "../rules/plans";
import { isOverdue, lastLogOf } from "../rules/followup";
import { pct, weekProgress } from "../rules/progress";
import { AudiogramChart } from "./AudiogramChart";
import { PlanModal } from "./PlanModal";
import { Card, EmptyHint, FormError, ProgressBar } from "./ui";

interface PlanPatch {
  targetMinutes: PlanDraft["targetMinutes"];
  promptMethod: PlanDraft["promptMethod"];
  items: PlanDraft["items"];
}

interface Handlers {
  checkAudiogram: (audiogramId: string) => void;
  openAudiogramEditor: (patientId: string) => void;
  createPlan: (patientId: string, draft: PlanDraft) => void;
  revisePlan: (patientId: string, weekKey: string, patch: PlanPatch, reason: string) => void;
  addLog: (
    patientId: string,
    log: { date: string; ear: Ear; kind: TrainingKind; minutes: number; difficulty: string; note: string },
  ) => void;
  updatePromptPreference: (patientId: string, method: Patient["promptMethod"], detail: string) => void;
}

function PatientRail({
  data,
  selectedId,
  onSelect,
}: {
  data: AppData;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const weekKey = currentWeekKey();
  return (
    <aside className="rail">
      <h2>在册老人</h2>
      {data.patients.map((p) => {
        const hasPlan = data.plans.some((x) => x.patientId === p.id && x.weekKey === weekKey);
        const overdue = isOverdue(data, p.id);
        const last = lastLogOf(data, p.id);
        const gap = last ? daysBetween(last.date, todayKey()) : null;
        return (
          <button
            key={p.id}
            className={`rail-item ${p.id === selectedId ? "active" : ""}`}
            onClick={() => onSelect(p.id)}
          >
            <span className="rail-name">
              {p.name}
              <em>{p.age} 岁</em>
            </span>
            <span className="rail-flags">
              <i className={`dot ${hasPlan ? "dot-ok" : "dot-warn"}`} title={hasPlan ? "本周计划已生成" : "本周计划待生成"} />
              {overdue && <i className="dot dot-danger" title="满 4 天未记录，已进复诊名单" />}
            </span>
            <span className="rail-sub">
              {hasPlan ? "本周计划已排" : "本周待排计划"} · {gap === null ? "尚无记录" : `${gap} 天前训练`}
            </span>
          </button>
        );
      })}
    </aside>
  );
}

function LogForm({ patient, onAdd }: { patient: Patient; onAdd: Handlers["addLog"] }) {
  const [date, setDate] = useState(todayKey());
  const [ear, setEar] = useState<Ear>("L");
  const [kind, setKind] = useState<TrainingKind>("discrim");
  const [minutes, setMinutes] = useState("15");
  const [difficulty, setDifficulty] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const submit = () => {
    setError("");
    const m = Number(minutes);
    if (!Number.isFinite(m) || m <= 0) {
      setError("训练分钟数必须大于 0");
      return;
    }
    if (!date) {
      setError("请选择训练日期");
      return;
    }
    onAdd(patient.id, { date, ear, kind, minutes: m, difficulty: difficulty.trim(), note: note.trim() });
    setDifficulty("");
    setNote("");
    setMinutes("15");
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="log-form">
      <div className="form-grid four">
        <label>
          <span>训练日期</span>
          <input type="date" value={date} max={todayKey()} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>
          <span>耳朵</span>
          <select value={ear} onChange={(e) => setEar(e.target.value as Ear)}>
            <option value="L">{EAR_LABEL.L}</option>
            <option value="R">{EAR_LABEL.R}</option>
          </select>
        </label>
        <label>
          <span>训练类型</span>
          <select value={kind} onChange={(e) => setKind(e.target.value as TrainingKind)}>
            <option value="discrim">{KIND_LABEL.discrim}</option>
            <option value="direction">{KIND_LABEL.direction}</option>
          </select>
        </label>
        <label>
          <span>训练分钟</span>
          <input type="number" min={1} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </label>
      </div>
      <label>
        <span>困难项（老人/家属说不清时可点选常见项）</span>
        <input value={difficulty} onChange={(e) => setDifficulty(e.target.value)} placeholder="例如：嘈杂环境听不清、方向辨别偏侧" />
      </label>
      <div className="chips small">
        {QUICK_DIFFICULTY.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => setDifficulty((d) => (d.includes(q) ? d : d ? `${d}；${q}` : q))}
          >
            {q}
          </button>
        ))}
      </div>
      <label>
        <span>备注</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="其他想告诉听力师的情况" />
      </label>
      <FormError>{error}</FormError>
      <div className="row-actions">
        <button className="primary-action" onClick={submit}>
          登记训练
        </button>
        {saved && <span className="saved-hint">已保存 ✓</span>}
      </div>
    </div>
  );
}

function PlanPanel({
  data,
  patient,
  onEditAudiogram,
  onCheck,
  onNewPlan,
  onRevise,
}: {
  data: AppData;
  patient: Patient;
  onEditAudiogram: () => void;
  onCheck: () => void;
  onNewPlan: () => void;
  onRevise: () => void;
}) {
  const weekKey = currentWeekKey();
  const progress = weekProgress(data, patient.id, weekKey);
  const check = canCreatePlan(data, patient.id);
  const plan = progress.plan;
  const cur = plan ? currentVersion(plan) : null;
  const grouped = plan ? itemsByEar(plan) : { L: [], R: [] };
  const [showHistory, setShowHistory] = useState(false);

  return (
    <Card
      title={`本周计划 · ${weekLabel(weekKey)}`}
      extra={
        plan ? (
          <button onClick={onRevise}>调整版本</button>
        ) : (
          <button className="primary-action" onClick={onNewPlan} disabled={!check.ok}>
            生成本周计划
          </button>
        )
      }
    >
      <div className="plan-meta">
        <div className="chart-block">
          <div className="chart-actions">
            <button onClick={onEditAudiogram}>
              {check.audiogram ? "修改曲线" : "录入曲线"}
            </button>
            {check.audiogram && !check.audiogram.checkedBy && (
              <button className="primary-action" onClick={onCheck}>
                听力师核对曲线
              </button>
            )}
            {check.audiogram?.checkedBy && (
              <span className="checked-tag">
                ✓ {check.audiogram.checkedBy} 已核对（{check.audiogram.checkedAt?.slice(0, 10)}）
              </span>
            )}
          </div>
          <AudiogramChart audiogram={check.audiogram} highlight={!check.ok} />
          {!check.ok && <p className="warn-text">{check.reason}，核对后才能生成新一周计划。</p>}
        </div>
      </div>

      {plan && cur ? (
        <div className="plan-detail">
          <div className="plan-summary">
            <div>
              <span className="tag">版本</span>v{cur.version} · {cur.author} · {cur.createdAt.slice(0, 10)}
              {cur.reason && <em className="reason-chip">本次调整原因：{cur.reason}</em>}
            </div>
            <div>
              <span className="tag">周目标</span>
              {progress.done} / {progress.target} 分钟
              <ProgressBar value={progress.done} max={progress.target} />
            </div>
            <div>
              <span className="tag">家属提示</span>
              {PROMPT_LABEL[cur.promptMethod]}
            </div>
          </div>

          <div className="ear-grid">
            {(["L", "R"] as Ear[]).map((ear) => {
              const earItems = grouped[ear];
              const t = progress.byEar[ear].target;
              const d = progress.byEar[ear].done;
              return (
                <div key={ear} className={`ear-card ${ear === "L" ? "ear-l" : "ear-r"}`}>
                  <h4>
                    {EAR_LABEL[ear]}
                    <span>
                      {d} / {t} 分钟
                    </span>
                  </h4>
                  <ProgressBar value={d} max={t} tone={d >= t && t > 0 ? "good" : "primary"} />
                  {earItems.length === 0 ? (
                    <p className="muted small">本周未安排训练</p>
                  ) : (
                    <ul className="item-list">
                      {earItems.map((it) => (
                        <li key={it.kind}>
                          <b>{KIND_LABEL[it.kind]}</b>
                          <span>{it.content}</span>
                          <i>{it.minutes} 分钟</i>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>

          {plan.versions.length > 1 && (
            <div className="history">
              <button className="link-btn" onClick={() => setShowHistory((v) => !v)}>
                {showHistory ? "收起" : "查看"}历史版本（{plan.versions.length} 版，调整原因均保留）
              </button>
              {showHistory && (
                <ol className="version-list">
                  {[...plan.versions].reverse().map((v) => (
                    <li key={v.version}>
                      <b>v{v.version}</b> · {v.createdAt.slice(0, 10)} · {v.author} · 目标 {v.targetMinutes} 分钟 ·
                      提示 {PROMPT_LABEL[v.promptMethod]}
                      {v.reason ? <p>调整原因：{v.reason}</p> : <p className="muted">初次制定</p>}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </div>
      ) : (
        <EmptyHint>本周还没有计划。听力师核对听力曲线后点击右上角“生成本周计划”；同一患者同一周只保留一份。</EmptyHint>
      )}
    </Card>
  );
}

function PromptCard({
  patient,
  onSave,
}: {
  patient: Patient;
  onSave: Handlers["updatePromptPreference"];
}) {
  const [method, setMethod] = useState(patient.promptMethod);
  const [detail, setDetail] = useState(patient.promptDetail);
  const dirty = method !== patient.promptMethod || detail !== patient.promptDetail;
  return (
    <Card title="家属配合与提示偏好">
      <p className="muted small">老人说不清时，由听力师与家属商定一种固定提示方式，长期保留，每周计划会默认带出。</p>
      <label>
        <span>提示方式</span>
        <select value={method} onChange={(e) => setMethod(e.target.value as Patient["promptMethod"])}>
          {PROMPT_METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}（{m.hint}）
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>家属提示要点</span>
        <textarea rows={2} value={detail} onChange={(e) => setDetail(e.target.value)} />
      </label>
      <div className="row-actions">
        <button className="primary-action" disabled={!dirty} onClick={() => onSave(patient.id, method, detail.trim())}>
          保存提示偏好
        </button>
      </div>
    </Card>
  );
}

export function Workbench({
  data,
  selectedId,
  onSelectPatient,
  handlers,
}: {
  data: AppData;
  selectedId: string;
  onSelectPatient: (id: string) => void;
  handlers: Handlers;
}) {
  const weekKey = currentWeekKey();
  const patient = data.patients.find((p) => p.id === selectedId) ?? data.patients[0];
  const [planModal, setPlanModal] = useState<null | "create" | "revise">(null);

  const progress = useMemo(() => weekProgress(data, patient.id, weekKey), [data, patient.id, weekKey]);
  const plan = progress.plan;

  if (!patient) return <EmptyHint>请先在“患者档案”中登记老人。</EmptyHint>;

  return (
    <div className="workbench">
      <PatientRail data={data} selectedId={patient.id} onSelect={onSelectPatient} />

      <div className="work-detail">
        <div className="patient-head">
          <div>
            <h2>
              {patient.name} <em>{patient.age} 岁</em>
            </h2>
            <p>
              老人电话 {patient.phone} ｜ 家属 {patient.familyName} {patient.familyPhone}
            </p>
            <p className="muted small">{patient.note}</p>
          </div>
          <div className="head-stats">
            <div>
              <span>本周完成</span>
              <strong>
                {progress.done}
                <i> / {progress.target || "—"} 分钟</i>
              </strong>
              <ProgressBar value={progress.done} max={progress.target} tone={pct(progress.done, progress.target) >= 100 ? "good" : "primary"} />
            </div>
            <div>
              <span>本周已登记</span>
              <strong>{progress.logs.length}<i> 次</i></strong>
            </div>
          </div>
        </div>

        <PlanPanel
          data={data}
          patient={patient}
          onEditAudiogram={() => handlers.openAudiogramEditor(patient.id)}
          onCheck={() => {
            const a = canCreatePlan(data, patient.id).audiogram;
            if (a) handlers.checkAudiogram(a.id);
          }}
          onNewPlan={() => setPlanModal("create")}
          onRevise={() => setPlanModal("revise")}
        />

        <div className="two-col">
          <Card title="登记训练（分钟与困难项）">
            <LogForm patient={patient} onAdd={handlers.addLog} />
            <div className="log-history">
              <h4>本周训练记录</h4>
              {progress.logs.length === 0 ? (
                <EmptyHint>本周还没有训练记录；满 4 天未记录会自动进入复诊名单。</EmptyHint>
              ) : (
                <ul className="log-list">
                  {[...progress.logs].reverse().map((l: TrainingLog) => (
                    <li key={l.id}>
                      <span className="log-date">{l.date}</span>
                      <span className={`ear-badge ${l.ear === "L" ? "b-l" : "b-r"}`}>{EAR_LABEL[l.ear]}</span>
                      <span>{KIND_LABEL[l.kind]} · {l.minutes} 分钟</span>
                      {l.difficulty && <em className="diff">困难：{l.difficulty}</em>}
                      {l.note && <em className="muted small">{l.note}</em>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          <PromptCard patient={patient} onSave={handlers.updatePromptPreference} />
        </div>

        {planModal && (
          <PlanModal
            data={data}
            patient={patient}
            weekKey={weekKey}
            weekLabel={weekLabel(weekKey)}
            mode={planModal}
            existing={planModal === "revise" ? plan : null}
            onClose={() => setPlanModal(null)}
            onSubmitCreate={(draft) => {
              handlers.createPlan(patient.id, draft);
              setPlanModal(null);
            }}
            onSubmitRevise={(patch, reason) => {
              handlers.revisePlan(patient.id, weekKey, patch, reason);
              setPlanModal(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
