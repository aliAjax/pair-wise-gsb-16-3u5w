import { useState } from "react";
import type { AppData, ContactNote } from "../types";
import { CONTACT_CHANNELS, PROMPT_LABEL } from "../data/catalog";
import {
  buildFollowupList,
  NO_LOG_DAYS,
} from "../rules/followup";
import { currentWeekKey, todayKey } from "../rules/dates";
import { currentVersion, findPlan } from "../rules/plans";
import { Card, EmptyHint, FormError } from "./ui";

function ContactForm({
  patientId,
  defaultAuthor,
  onAddContact,
}: {
  patientId: string;
  defaultAuthor: string;
  onAddContact: (
    patientId: string,
    note: Pick<ContactNote, "channel" | "content" | "author">,
  ) => void;
}) {
  const [channel, setChannel] = useState(CONTACT_CHANNELS[0]);
  const [content, setContent] = useState("");
  const [author, setAuthor] = useState(defaultAuthor);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const submit = () => {
    setError("");
    if (!content.trim()) {
      setError("请先写明本次联系内容，再登记");
      return;
    }
    onAddContact(patientId, { channel, content: content.trim(), author: author.trim() || "复诊助理" });
    setContent("");
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="contact-form">
      <div className="form-grid three">
        <label>
          <span>联系方式</span>
          <select value={channel} onChange={(e) => setChannel(e.target.value)}>
            {CONTACT_CHANNELS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          <span>跟进人</span>
          <input value={author} onChange={(e) => setAuthor(e.target.value)} />
        </label>
      </div>
      <label>
        <span>本次联系内容 / 家属配合情况</span>
        <textarea
          rows={2}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="例如：已电话提醒，家属答应每天晚饭后陪练 15 分钟"
        />
      </label>
      <FormError>{error}</FormError>
      <div className="row-actions">
        <button className="primary-action" onClick={submit}>
          保存联系记录
        </button>
        {saved && <span className="saved-hint">已保存 ✓</span>}
      </div>
    </div>
  );
}

export function FollowupView({
  data,
  onJump,
  onAddContact,
}: {
  data: AppData;
  onJump: (patientId: string) => void;
  onAddContact: (
    patientId: string,
    note: Pick<ContactNote, "channel" | "content" | "author">,
  ) => void;
}) {
  const entries = buildFollowupList(data);
  const weekKey = currentWeekKey();
  const [openId, setOpenId] = useState<string | null>(entries[0]?.patient.id ?? null);

  return (
    <div className="followup-view">
      <div className="view-head">
        <h2>复诊 / 联系名单</h2>
        <p className="muted">
          规则：距离最近一次训练登记满 {NO_LOG_DAYS} 天（含）自动进入；从未登记也算。登记新训练后自动移出。
          今天 {todayKey()}，名单共 <b className="danger-text">{entries.length}</b> 人。
        </p>
      </div>

      {entries.length === 0 ? (
        <Card title="名单为空">
          <EmptyHint>所有老人近 {NO_LOG_DAYS} 天都有训练登记，暂无复诊对象。</EmptyHint>
        </Card>
      ) : (
        <div className="followup-list">
          {entries.map(({ patient, lastLog, daysSince }) => {
            const plan = findPlan(data, patient.id, weekKey);
            const contacts = data.contacts
              .filter((c) => c.patientId === patient.id)
              .sort((a, b) => (a.date < b.date ? 1 : -1));
            const open = openId === patient.id;
            return (
              <Card
                key={patient.id}
                title={
                  <span>
                    {patient.name}
                    <em className="title-sub">
                      {patient.age} 岁 · 家属 {patient.familyName} {patient.familyPhone}
                    </em>
                  </span>
                }
                extra={
                  <span className={`gap-tag ${daysSince >= 6 ? "gap-danger" : "gap-warn"}`}>
                    {lastLog ? `${daysSince} 天未记录` : "从未记录"}
                  </span>
                }
              >
                <div className="followup-row">
                  <dl className="mini-info">
                    <div>
                      <dt>最近训练</dt>
                      <dd>
                        {lastLog
                          ? `${lastLog.date}（${lastLog.ear === "L" ? "左耳" : "右耳"} · ${
                              lastLog.kind === "discrim" ? "听辨" : "方向"
                            } ${lastLog.minutes} 分钟）`
                          : "—"}
                        {lastLog?.difficulty && <em className="diff">困难：{lastLog.difficulty}</em>}
                      </dd>
                    </div>
                    <div>
                      <dt>本周计划</dt>
                      <dd>
                        {plan
                          ? `v${currentVersion(plan).version}，目标 ${currentVersion(plan).targetMinutes} 分钟，${
                              PROMPT_LABEL[currentVersion(plan).promptMethod]
                            }`
                          : "尚未生成（请回工作台核对曲线后排计划）"}
                      </dd>
                    </div>
                    <div>
                      <dt>提示偏好</dt>
                      <dd>{PROMPT_LABEL[patient.promptMethod]} · {patient.promptDetail}</dd>
                    </div>
                  </dl>
                  <button onClick={() => onJump(patient.id)}>查看康复作业台</button>
                </div>

                <button className="link-btn" onClick={() => setOpenId(open ? null : patient.id)}>
                  {open ? "收起" : "展开"}联系登记（已有 {contacts.length} 条）
                </button>
                {open && (
                  <div className="contact-box">
                    {contacts.length === 0 && <EmptyHint>还没有联系记录。</EmptyHint>}
                    <ul className="contact-list">
                      {contacts.map((c: ContactNote) => (
                        <li key={c.id}>
                          <span className="log-date">{c.date}</span>
                          <span className="tag">{c.channel}</span>
                          <span>{c.content}</span>
                          <em className="muted small">— {c.author}</em>
                        </li>
                      ))}
                    </ul>
                    <ContactForm
                      patientId={patient.id}
                      defaultAuthor="复诊助理小周"
                      onAddContact={onAddContact}
                    />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
