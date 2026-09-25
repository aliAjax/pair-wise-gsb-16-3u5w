import { useState } from "react";
import type { AppData, Patient, PromptMethod } from "../types";
import { PROMPT_LABEL, PROMPT_METHODS } from "../data/catalog";
import { latestAudiogram } from "../rules/plans";
import { isOverdue } from "../rules/followup";
import { todayKey } from "../rules/dates";
import { AudiogramChart } from "./AudiogramChart";
import { Card, FormError, Modal, PromptSelect } from "./ui";

export function NewPatientModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (p: Omit<Patient, "id" | "joinedAt">) => void;
}) {
  const [name, setName] = useState("");
  const [age, setAge] = useState("70");
  const [phone, setPhone] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [familyPhone, setFamilyPhone] = useState("");
  const [promptMethod, setPromptMethod] = useState<PromptMethod>("verbal");
  const [promptDetail, setPromptDetail] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    if (!name.trim()) {
      setError("请填写老人姓名");
      return;
    }
    const ageNum = Number(age);
    if (!Number.isFinite(ageNum) || ageNum < 40 || ageNum > 120) {
      setError("年龄请填写 40 ~ 120 的数字");
      return;
    }
    if (!familyName.trim()) {
      setError("请填写家属称呼（如：王建国（儿子））");
      return;
    }
    onCreate({
      name: name.trim(),
      age: ageNum,
      phone: phone.trim(),
      familyName: familyName.trim(),
      familyPhone: familyPhone.trim(),
      promptMethod,
      promptDetail: promptDetail.trim(),
      note: note.trim(),
    });
  };

  return (
    <Modal onClose={onClose} title="登记新老人">
      <div className="form-grid two">
        <label>
          <span>姓名 *</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="老人姓名" />
        </label>
        <label>
          <span>年龄 *</span>
          <input type="number" value={age} onChange={(e) => setAge(e.target.value)} />
        </label>
        <label>
          <span>老人电话</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <label>
          <span>家属称呼 *</span>
          <input
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            placeholder="王建国（儿子）"
          />
        </label>
        <label>
          <span>家属电话</span>
          <input value={familyPhone} onChange={(e) => setFamilyPhone(e.target.value)} />
        </label>
        <label>
          <span>家属提示方式偏好</span>
          <PromptSelect value={promptMethod} onChange={setPromptMethod} />
        </label>
      </div>
      <label>
        <span>提示要点</span>
        <textarea rows={2} value={promptDetail} onChange={(e) => setPromptDetail(e.target.value)} />
      </label>
      <label>
        <span>备注（听力史、助听器等）</span>
        <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <p className="muted small">登记日期自动记为 {todayKey()}；建档后请录入听力曲线并由听力师核对。</p>
      <FormError>{error}</FormError>
      <footer className="modal-actions">
        <button onClick={onClose}>取消</button>
        <button className="primary-action" onClick={submit}>
          建档
        </button>
      </footer>
    </Modal>
  );
}

export function PatientsView({
  data,
  onAddPatient,
  onEditAudiogram,
  onCheckAudiogram,
  onOpenWorkbench,
}: {
  data: AppData;
  onAddPatient: (p: Omit<Patient, "id" | "joinedAt">) => void;
  onEditAudiogram: (patientId: string) => void;
  onCheckAudiogram: (audiogramId: string) => void;
  onOpenWorkbench: (patientId: string) => void;
}) {
  const [showModal, setShowModal] = useState(false);
  return (
    <div className="patients-view">
      <div className="view-head between">
        <div>
          <h2>患者档案</h2>
          <p className="muted">共 {data.patients.length} 位在册老人；听力曲线核对后才能生成康复周计划。</p>
        </div>
        <button className="primary-action" onClick={() => setShowModal(true)}>
          登记新老人
        </button>
      </div>

      <div className="patient-grid">
        {data.patients.map((p) => {
          const a = latestAudiogram(data, p.id);
          const overdue = isOverdue(data, p.id);
          return (
            <Card
              key={p.id}
              title={
                <span>
                  {p.name}
                  <em className="title-sub">{p.age} 岁 · 建档 {p.joinedAt}</em>
                  {overdue && <i className="gap-tag gap-warn">复诊名单</i>}
                </span>
              }
              extra={<button onClick={() => onOpenWorkbench(p.id)}>作业台</button>}
            >
              <ul className="kv-list">
                <li><span>老人电话</span>{p.phone || "—"}</li>
                <li><span>家属</span>{p.familyName} {p.familyPhone}</li>
                <li><span>提示偏好</span>{PROMPT_LABEL[p.promptMethod]}</li>
                <li><span>提示要点</span>{p.promptDetail || "—"}</li>
                <li><span>备注</span>{p.note || "—"}</li>
              </ul>
              <div className="audi-mini">
                <AudiogramChart audiogram={a} />
                <div className="chart-actions">
                  <button onClick={() => onEditAudiogram(p.id)}>{a ? "修改曲线" : "录入曲线"}</button>
                  {a && !a.checkedBy && (
                    <button className="primary-action" onClick={() => onCheckAudiogram(a.id)}>
                      听力师核对
                    </button>
                  )}
                  {a?.checkedBy && (
                    <span className="checked-tag">✓ {a.checkedBy} 已核对</span>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {showModal && (
        <NewPatientModal
          onClose={() => setShowModal(false)}
          onCreate={(p) => {
            onAddPatient(p);
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}
