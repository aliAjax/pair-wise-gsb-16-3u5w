import { useMemo, useState } from "react";
import type { Patient, PlanContent, TrainingLog, WeeklyPlan } from "../types";
import { CUE_METHODS, STAFF_NAME, emptyContent } from "../data/seed";
import {
  cloneContent,
  isoWeek,
  kindLabel,
  todayStr,
  weekProgress,
} from "../data/rules";
import { actions, useAppState } from "../state/store";
import { AudiogramChart } from "./AudiogramChart";
import { EarTag, Field, Panel, ProgressBar } from "./controls";

const ears = ["left", "right"] as const;
const kinds = ["discrimination", "localization"] as const;

function ContentEditor({
  value,
  onChange,
}: {
  value: PlanContent;
  onChange: (v: PlanContent) => void;
}) {
  const patchEar = (ear: (typeof ears)[number], kind: (typeof kinds)[number], patch: Partial<PlanContent["left"]["discrimination"]>) => {
    onChange({
      ...value,
      [ear]: {
        ...value[ear],
        [kind]: { ...value[ear][kind], ...patch },
      },
    });
  };
  return (
    <div className="editor-grid">
      {ears.map((ear) => (
        <div key={ear} className={`ear-box ear-box-${ear}`}>
          <div className="ear-box-head">
            <EarTag ear={ear} />
          </div>
          {kinds.map((kind) => (
            <div key={kind} className="task-row">
              <label className="field task-name">
                <span>{kindLabel[kind]}训练内容</span>
                <input
                  value={value[ear][kind].task}
                  placeholder={`如：${kind === "discrimination" ? "双音节词听辨" : "听声指方向"}`}
                  onChange={(e) => patchEar(ear, kind, { task: e.target.value })}
                />
              </label>
              <label className="field task-min">
                <span>目标分钟/周</span>
                <input
                  type="number"
                  min={1}
                  value={value[ear][kind].targetMinutes}
                  onChange={(e) =>
                    patchEar(ear, kind, { targetMinutes: Number(e.target.value) })
                  }
                />
              </label>
            </div>
          ))}
        </div>
      ))}
      <Field label="家属提示方式">
        <select
          value={value.cueMethod}
          onChange={(e) => onChange({ ...value, cueMethod: e.target.value })}
        >
          <option value="">请选择提示方式</option>
          {CUE_METHODS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </Field>
      <Field label="给家属的说明">
        <input
          value={value.note}
          placeholder="环境要求、升级条件等"
          onChange={(e) => onChange({ ...value, note: e.target.value })}
        />
      </Field>
    </div>
  );
}

function VersionTimeline({ plan }: { plan: WeeklyPlan }) {
  return (
    <div className="timeline">
      {plan.versions.map((v) => (
        <article key={v.version} className="version-card">
          <header>
            <strong>v{v.version}</strong>
            <span>
              {v.copiedFrom ? `复制自 v${v.copiedFrom}` : "本周初版"} ·{" "}
              {v.createdAt} · {v.createdBy}
            </span>
          </header>
          <p className="version-reason">原因：{v.reason}</p>
          <ul className="version-tasks">
            {ears.map((ear) =>
              kinds.map((kind) => (
                <li key={ear + kind}>
                  <EarTag ear={ear} />
                  {kindLabel[kind]}：{v.content[ear][kind].task}（
                  {v.content[ear][kind].targetMinutes} 分钟）
                </li>
              ))
            )}
          </ul>
          <p className="version-cue">家属提示：{v.content.cueMethod}</p>
        </article>
      ))}
    </div>
  );
}

export function PlanPanel({
  patient,
  allLogs,
}: {
  patient: Patient;
  allLogs: TrainingLog[];
}) {
  const now = useMemo(() => isoWeek(new Date()), []);
  const [yearWeek, setYearWeek] = useState({ year: now.year, week: now.week });
  const [editing, setEditing] = useState(false);
  const [adjustMode, setAdjustMode] = useState(false);
  const [draft, setDraft] = useState<PlanContent>(() => emptyContent());
  const [reason, setReason] = useState("");
  const [staff, setStaff] = useState(STAFF_NAME);
  const [checked, setChecked] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgKind, setMsgKind] = useState<"ok" | "err">("ok");

  const patientPlans = usePatientPlans(patient.id);
  const current = patientPlans.find(
    (p) => p.year === yearWeek.year && p.week === yearWeek.week
  );
  const progress = weekProgress(allLogs, current);

  const flash = (ok: boolean, message: string) => {
    setMsgKind(ok ? "ok" : "err");
    setMsg(message);
  };

  const startCreate = () => {
    const d = emptyContent();
    d.cueMethod = patient.cuePreference;
    setDraft(d);
    setAdjustMode(false);
    setEditing(true);
    setChecked(false);
    setReason("");
  };

  const startAdjust = (plan: WeeklyPlan) => {
    setDraft(cloneContent(plan.current));
    setAdjustMode(true);
    setEditing(true);
    setChecked(true);
    setReason("");
  };

  const submit = () => {
    if (!adjustMode && !checked) {
      flash(false, "请先确认已核对该患者的听力曲线");
      return;
    }
    const target = patientPlans.find((p) => p.year === yearWeek.year && p.week === yearWeek.week);
    if (adjustMode && target) {
      const r = actions.adjustPlan(target.id, draft, reason, staff);
      flash(r.ok, r.message);
      if (r.ok) setEditing(false);
    } else {
      const r = actions.createPlan(patient.id, yearWeek.year, yearWeek.week, draft, staff);
      flash(r.ok, r.message);
      if (r.ok) setEditing(false);
    }
  };

  const weekOptions = useMemo(() => {
    const opts = new Set<string>([`${now.year}-${now.week}`]);
    patientPlans.forEach((p) => opts.add(`${p.year}-${p.week}`));
    return [...opts]
      .map((s) => {
        const [y, w] = s.split("-").map(Number);
        return { year: y, week: w, label: `${y} 年第 ${w} 周` };
      })
      .sort((a, b) => (a.year === b.year ? b.week - a.week : b.year - a.year));
  }, [patientPlans, now]);

  const isCurrentWeek = yearWeek.year === now.year && yearWeek.week === now.week;

  return (
    <Panel
      title="每周康复计划"
      tag="听力师 · 核对听力曲线后生成"
      action={
        <select
          value={`${yearWeek.year}-${yearWeek.week}`}
          onChange={(e) => {
            const [y, w] = e.target.value.split("-").map(Number);
            setYearWeek({ year: y, week: w });
            setEditing(false);
          }}
        >
          {weekOptions.map((o) => (
            <option key={o.label} value={`${o.year}-${o.week}`}>
              {o.label}
              {o.year === now.year && o.week === now.week ? "（本周）" : ""}
            </option>
          ))}
        </select>
      }
    >
      <div className="plan-audiogram">
        <div>
          <p className="ag-title">听力曲线（气导）</p>
          <AudiogramChart points={patient.audiogram} />
        </div>
        <div className="plan-side">
          <p className="hearing-note">{patient.hearingNote || "尚未录入听力说明"}</p>
          <dl className="plan-meta">
            <dt>家属提示偏好</dt>
            <dd>{patient.cuePreference || "未设置"}</dd>
            {current ? (
              <>
                <dt>曲线核对时间</dt>
                <dd>{current.audiogramCheckedAt}</dd>
                <dt>当前版本</dt>
                <dd>v{current.versions.length}</dd>
                <dt>周目标 / 已完成</dt>
                <dd>
                  {progress.done} / {progress.target} 分钟（{progress.percent}%）
                </dd>
              </>
            ) : null}
          </dl>
          {current ? (
            <button className="primary-action" onClick={() => startAdjust(current)}>
              调整计划（复制新版并写原因）
            </button>
          ) : isCurrentWeek ? (
            <button className="primary-action" onClick={startCreate}>
              生成本周计划（v1）
            </button>
          ) : (
            <p className="muted">该周没有计划</p>
          )}
        </div>
      </div>

      {current && !editing ? (
        <>
          <ProgressBar percent={progress.percent} />
          <div className="schedule-grid">
            {ears.map((ear) => (
              <div key={ear} className={`ear-box ear-box-${ear}`}>
                <div className="ear-box-head"><EarTag ear={ear} /></div>
                {kinds.map((kind) => {
                  const t = current.current[ear][kind];
                  const done = progress.byEar[ear][kind];
                  return (
                    <div key={kind} className="task-line">
                      <span className="task-kind">{kindLabel[kind]}</span>
                      <strong>{t.task}</strong>
                      <span className={done >= t.targetMinutes ? "mins mins-done" : "mins"}>
                        {done}/{t.targetMinutes} 分钟
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <p className="plan-note">家属说明：{current.current.note}　｜　提示方式：{current.current.cueMethod}</p>
          <h3 className="block-title">版本留档（每次调整均整体复制旧版）</h3>
          <VersionTimeline plan={current} />
        </>
      ) : null}

      {editing ? (
        <div className="editor-wrap">
          <h3 className="block-title">
            {adjustMode
              ? `调整 ${yearWeek.year} 年第 ${yearWeek.week} 周计划`
              : `生成 ${yearWeek.year} 年第 ${yearWeek.week} 周计划`}
          </h3>
          {!adjustMode ? (
            <label className="check-line">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
              />
              我已核对 {patient.name} 的听力曲线（{todayStr()}）
            </label>
          ) : (
            <Field label="调整原因（必填，将随复制版本留档）">
              <input
                value={reason}
                placeholder="如：家属反馈右耳内容偏难，降低难度"
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>
          )}
          <ContentEditor value={draft} onChange={setDraft} />
          <div className="editor-foot">
            <Field label="听力师">
              <input value={staff} onChange={(e) => setStaff(e.target.value)} />
            </Field>
            <div className="btn-row">
              <button onClick={() => setEditing(false)}>取消</button>
              <button className="primary-action" onClick={submit}>
                {adjustMode ? "复制为新版本" : "生成计划"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {msg ? <p className={`form-msg ${msgKind === "ok" ? "msg-ok" : "msg-err"}`}>{msg}</p> : null}
    </Panel>
  );
}

function usePatientPlans(patientId: string): WeeklyPlan[] {
  const s = useAppState();
  return s.plans
    .filter((p) => p.patientId === patientId)
    .sort((a, b) => (a.year === b.year ? b.week - a.week : b.year - a.year));
}
