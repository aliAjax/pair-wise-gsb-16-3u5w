import { useState } from "react";
import type { AudiogramPoint, Patient } from "../types";
import { AUDIO_FREQS, CUE_METHODS } from "../data/seed";
import { earPTA } from "../data/rules";
import type { NewPatientDraft } from "../state/store";
import { actions } from "../state/store";
import { Field, Panel } from "./controls";

export function PatientPanel({
  patient,
  onCreated,
}: {
  patient: Patient;
  onCreated: (id: string) => void;
}) {
  const [cue, setCue] = useState(patient.cuePreference);
  const [cueMsg, setCueMsg] = useState<string | null>(null);
  const [hearingNote, setHearingNote] = useState(patient.hearingNote);

  const [form, setForm] = useState<NewPatientDraft>({
    name: "",
    age: 70,
    phone: "",
    familyName: "",
    familyPhone: "",
    cuePreference: CUE_METHODS[0],
    hearingNote: "",
  });
  const [createMsg, setCreateMsg] = useState<string | null>(null);

  const patch = <K extends keyof NewPatientDraft>(k: K, v: NewPatientDraft[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const create = () => {
    const r = actions.addPatient(form);
    setCreateMsg(r.message);
    if (r.ok && r.id) {
      onCreated(r.id);
      setForm({
        name: "",
        age: 70,
        phone: "",
        familyName: "",
        familyPhone: "",
        cuePreference: CUE_METHODS[0],
        hearingNote: "",
      });
    }
  };

  const saveCue = () => {
    const r = actions.updateCuePreference(patient.id, cue);
    setCueMsg(r.message);
  };

  const updatePoint = (freq: number, ear: "left" | "right", raw: string) => {
    const num = raw === "" ? null : Math.max(-10, Math.min(120, Number(raw)));
    const points: AudiogramPoint[] = patient.audiogram.map((p) =>
      p.freq === freq ? { ...p, [ear]: Number.isNaN(num as number) ? null : num } : p
    );
    actions.updateAudiogram(patient.id, points, hearingNote);
  };

  return (
    <div className="patient-panels">
      <Panel title="档案与家属提示偏好" tag={`${patient.id} · ${patient.name} · ${patient.age} 岁`}>
        <dl className="info-grid">
          <dt>本人电话</dt>
          <dd>{patient.phone || "—"}</dd>
          <dt>家属</dt>
          <dd>
            {patient.familyName || "—"} {patient.familyPhone}
          </dd>
          <dt>建档日期</dt>
          <dd>{patient.enrolledAt}</dd>
          <dt>听力备注</dt>
          <dd>{patient.hearingNote || "—"}</dd>
          <dt>左耳 PTA</dt>
          <dd>{earPTA(patient.audiogram, "left") ?? "测点不足"} dB HL</dd>
          <dt>右耳 PTA</dt>
          <dd>{earPTA(patient.audiogram, "right") ?? "测点不足"} dB HL</dd>
        </dl>
        <div className="cue-row">
          <Field label="家属提示方式偏好（跨周保留，生成计划时自动带入）">
            <select value={cue} onChange={(e) => setCue(e.target.value)}>
              {CUE_METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </Field>
          <button className="primary-action" onClick={saveCue}>
            保存偏好
          </button>
        </div>
        {cueMsg ? <p className="form-msg msg-ok">{cueMsg}</p> : null}

        <h3 className="block-title">听力曲线测录（dB HL，留空表示未测）</h3>
        <div className="ag-table-wrap">
          <table className="ag-table">
            <thead>
              <tr>
                <th>耳 / 频率</th>
                {AUDIO_FREQS.map((f) => (
                  <th key={f}>{f >= 1000 ? `${f / 1000}k` : f} Hz</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(["left", "right"] as const).map((ear) => (
                <tr key={ear}>
                  <th>{ear === "left" ? "左耳" : "右耳"}</th>
                  {AUDIO_FREQS.map((freq) => {
                    const point = patient.audiogram.find((p) => p.freq === freq);
                    return (
                      <td key={freq}>
                        <input
                          type="number"
                          defaultValue={point?.[ear] ?? ""}
                          onBlur={(e) => updatePoint(freq, ear, e.target.value)}
                          placeholder="—"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="cue-row">
          <Field label="听力说明">
            <input
              value={hearingNote}
              onChange={(e) => setHearingNote(e.target.value)}
              onBlur={() => actions.updateAudiogram(patient.id, patient.audiogram, hearingNote)}
            />
          </Field>
        </div>
      </Panel>

      <Panel title="新患者建档" tag="社区登记">
        <div className="field-grid">
          <Field label="姓名">
            <input value={form.name} onChange={(e) => patch("name", e.target.value)} />
          </Field>
          <Field label="年龄">
            <input
              type="number"
              value={form.age}
              onChange={(e) => patch("age", Number(e.target.value))}
            />
          </Field>
          <Field label="本人电话">
            <input value={form.phone} onChange={(e) => patch("phone", e.target.value)} />
          </Field>
          <Field label="家属称呼">
            <input
              value={form.familyName}
              placeholder="如：儿子 王磊"
              onChange={(e) => patch("familyName", e.target.value)}
            />
          </Field>
          <Field label="家属电话">
            <input
              value={form.familyPhone}
              onChange={(e) => patch("familyPhone", e.target.value)}
            />
          </Field>
          <Field label="家属提示偏好">
            <select
              value={form.cuePreference}
              onChange={(e) => patch("cuePreference", e.target.value)}
            >
              {CUE_METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="听力初诊备注">
          <input
            value={form.hearingNote}
            placeholder="如：双耳高频下降，助听后听清改善"
            onChange={(e) => patch("hearingNote", e.target.value)}
          />
        </Field>
        <div className="btn-row">
          <button className="primary-action" onClick={create}>
            建档并打开作业台
          </button>
          {createMsg ? <span className="msg-ok">{createMsg}</span> : null}
        </div>
      </Panel>
    </div>
  );
}
