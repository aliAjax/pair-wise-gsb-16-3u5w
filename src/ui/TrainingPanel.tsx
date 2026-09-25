import { useState } from "react";
import type { Patient, TrainingLog } from "../types";
import { DIFFICULTY_PRESETS } from "../data/seed";
import {
  kindLabel,
  logEarLabel,
  todayStr,
} from "../data/rules";
import type { NewTrainingDraft } from "../state/store";
import { actions, useAppState } from "../state/store";
import { Field, Panel } from "./controls";

const ears = ["left", "right", "both"] as const;
const kinds = ["discrimination", "localization"] as const;

export function TrainingPanel({ patient }: { patient: Patient }) {
  const { logs } = useAppState();
  const [draft, setDraft] = useState<NewTrainingDraft>({
    patientId: patient.id,
    date: todayStr(),
    ear: "both",
    kind: "discrimination",
    minutes: 20,
    difficulties: [],
    note: "",
  });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const patch = <K extends keyof NewTrainingDraft>(key: K, value: NewTrainingDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const toggleDifficulty = (item: string) =>
    setDraft((d) => ({
      ...d,
      difficulties: d.difficulties.includes(item)
        ? d.difficulties.filter((x) => x !== item)
        : [...d.difficulties, item],
    }));

  const submit = () => {
    const r = actions.addLog({ ...draft, patientId: patient.id });
    setMsg({ ok: r.ok, text: r.message });
    if (r.ok) {
      setDraft((d) => ({ ...d, minutes: 20, difficulties: [], note: "" }));
    }
  };

  const patientLogs = logs
    .filter((l) => l.patientId === patient.id)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 12);

  return (
    <Panel title="训练登记" tag="患者 / 家属登记：分钟数与困难项">
      <div className="log-form">
        <Field label="训练日期">
          <input
            type="date"
            value={draft.date}
            onChange={(e) => patch("date", e.target.value)}
          />
        </Field>
        <Field label="训练耳">
          <div className="seg">
            {ears.map((e) => (
              <button
                key={e}
                type="button"
                className={draft.ear === e ? "seg-on" : ""}
                onClick={() => patch("ear", e)}
              >
                {logEarLabel[e]}
              </button>
            ))}
          </div>
        </Field>
        <Field label="训练类型">
          <div className="seg">
            {kinds.map((k) => (
              <button
                key={k}
                type="button"
                className={draft.kind === k ? "seg-on" : ""}
                onClick={() => patch("kind", k)}
              >
                {kindLabel[k]}
              </button>
            ))}
          </div>
        </Field>
        <Field label="实际分钟">
          <input
            type="number"
            min={1}
            value={draft.minutes}
            onChange={(e) => patch("minutes", Number(e.target.value))}
          />
        </Field>
      </div>

      <Field label="困难项（可多选）">
        <div className="chips">
          {DIFFICULTY_PRESETS.map((d) => (
            <button
              type="button"
              key={d}
              className={draft.difficulties.includes(d) ? "chip-on" : ""}
              onClick={() => toggleDifficulty(d)}
            >
              {d}
            </button>
          ))}
        </div>
      </Field>

      <Field label="补充说明（说不清时家属可代写）">
        <input
          value={draft.note}
          placeholder="如：今天状态不错，18 题对 15 题"
          onChange={(e) => patch("note", e.target.value)}
        />
      </Field>

      <div className="btn-row">
        <button className="primary-action" onClick={submit}>
          保存登记
        </button>
        {msg ? (
          <span className={msg.ok ? "msg-ok" : "msg-err"}>{msg.text}</span>
        ) : null}
      </div>

      <h3 className="block-title">近期登记</h3>
      <div className="log-list">
        {patientLogs.length === 0 ? (
          <p className="muted">暂无训练记录，超过 4 天未登记将进入复诊名单。</p>
        ) : (
          patientLogs.map((l: TrainingLog) => (
            <article key={l.id} className="log-card">
              <div className="log-date">
                <strong>{l.date.slice(5)}</strong>
                <span>{l.year} 年第 {l.week} 周</span>
              </div>
              <div className="log-body">
                <p>
                  <span className="log-tag">{logEarLabel[l.ear]}</span>
                  <span className="log-tag">{kindLabel[l.kind]}</span>
                  <strong>{l.minutes} 分钟</strong>
                </p>
                {l.difficulties.length > 0 ? (
                  <p className="log-diff">困难：{l.difficulties.join("、")}</p>
                ) : null}
                {l.note ? <p className="muted">{l.note}</p> : null}
              </div>
            </article>
          ))
        )}
      </div>
    </Panel>
  );
}
