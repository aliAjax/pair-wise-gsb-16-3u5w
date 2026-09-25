import { useMemo, useState } from "react";
import { CONTACT_CHANNELS } from "../data/seed";
import { recallList, todayStr } from "../data/rules";
import { actions, useAppState } from "../state/store";
import { Field, Panel } from "./controls";

export function RecallPanel({ onSelectPatient }: { onSelectPatient: (id: string) => void }) {
  const state = useAppState();
  const today = todayStr();
  const entries = useMemo(() => recallList(state, today), [state, today]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [channel, setChannel] = useState(CONTACT_CHANNELS[0]);
  const [result, setResult] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const saveContact = (patientId: string) => {
    const r = actions.addContact(patientId, channel, result);
    setMsg(r.message);
    if (r.ok) setResult("");
  };

  return (
    <Panel
      title="复诊联系名单"
      tag={`规则：连续 4 天及以上没有训练登记（截至 ${today}）`}
    >
      {msg ? <p className="form-msg msg-ok">{msg}</p> : null}
      {entries.length === 0 ? (
        <p className="muted">目前所有人本周都有训练登记，没有需要复诊联系的患者。</p>
      ) : (
        <div className="recall-list">
          {entries.map((e) => (
            <article key={e.patient.id} className="recall-card">
              <div className="recall-main">
                <div>
                  <h3>
                    {e.patient.name}
                    <span className="recall-id">{e.patient.id}</span>
                    <span className="badge badge-danger">{e.missedDays} 天未登记</span>
                  </h3>
                  <p>{e.reason}</p>
                  <p className="muted">
                    家属：{e.patient.familyName} {e.patient.familyPhone}　｜　提示偏好：
                    {e.patient.cuePreference}
                  </p>
                  {e.latestContact ? (
                    <p className="last-contact">
                      上次联系：{e.latestContact.at}（{e.latestContact.channel}）
                      {e.latestContact.result}
                    </p>
                  ) : (
                    <p className="last-contact muted">尚无联系记录</p>
                  )}
                </div>
                <div className="recall-actions">
                  <button onClick={() => onSelectPatient(e.patient.id)}>查看作业台</button>
                  <button
                    className="primary-action"
                    onClick={() => setOpenId(openId === e.patient.id ? null : e.patient.id)}
                  >
                    {openId === e.patient.id ? "收起" : "登记联系"}
                  </button>
                </div>
              </div>
              {openId === e.patient.id ? (
                <div className="contact-form">
                  <Field label="联系方式">
                    <select value={channel} onChange={(ev) => setChannel(ev.target.value)}>
                      {CONTACT_CHANNELS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="联系结果 / 复诊安排">
                    <input
                      value={result}
                      placeholder="如：约周五上午到店，家属会督促补练"
                      onChange={(ev) => setResult(ev.target.value)}
                    />
                  </Field>
                  <button
                    className="primary-action"
                    onClick={() => saveContact(e.patient.id)}
                  >
                    保存联系记录
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </Panel>
  );
}
