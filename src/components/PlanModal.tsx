import { useMemo, useState } from "react";
import type { Ear, PlanItem, PromptMethod, TrainingKind } from "../types";
import {
  EAR_LABEL,
  KIND_DEFAULT_CONTENT,
  KIND_LABEL,
  PROMPT_LABEL,
} from "../data/catalog";
import {
  canCreatePlan,
  currentVersion,
  PlanRuleError,
  type PlanDraft,
} from "../rules/plans";
import type { AppData, Patient, WeeklyPlan } from "../types";
import { FormError, Modal, PromptSelect } from "./ui";

interface ItemRow {
  ear: Ear;
  kind: TrainingKind;
  minutes: string;
  content: string;
}

function toRows(items: PlanItem[]): ItemRow[] {
  return items.map((i) => ({ ear: i.ear, kind: i.kind, minutes: String(i.minutes), content: i.content }));
}

export function PlanModal({
  data,
  patient,
  weekKey,
  weekLabel,
  mode,
  existing,
  onClose,
  onSubmitCreate,
  onSubmitRevise,
}: {
  data: AppData;
  patient: Patient;
  weekKey: string;
  weekLabel: string;
  mode: "create" | "revise";
  existing: WeeklyPlan | null;
  onClose: () => void;
  onSubmitCreate: (draft: PlanDraft) => void;
  onSubmitRevise: (
    patch: Pick<PlanDraft, "targetMinutes" | "promptMethod" | "items">,
    reason: string,
  ) => void;
}) {
  const check = useMemo(() => canCreatePlan(data, patient.id), [data, patient.id]);
  const base = existing ? currentVersion(existing) : null;

  const [target, setTarget] = useState(base ? String(base.targetMinutes) : "50");
  const [promptMethod, setPromptMethod] = useState<PromptMethod>(
    base ? base.promptMethod : patient.promptMethod,
  );
  const [rows, setRows] = useState<ItemRow[]>(() => {
    if (base) return toRows(base.items);
    // 无历史计划时默认带出覆盖左右耳两种训练的空模板
    return [
      { ear: "L", kind: "discrim", minutes: "15", content: KIND_DEFAULT_CONTENT.discrim },
      { ear: "R", kind: "discrim", minutes: "15", content: "日常短句听辨复述" },
      { ear: "L", kind: "direction", minutes: "10", content: KIND_DEFAULT_CONTENT.direction },
      { ear: "R", kind: "direction", minutes: "10", content: "闭目辨别右侧声源" },
    ];
  });
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const updateRow = (idx: number, patch: Partial<ItemRow>) =>
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const addRow = () =>
    setRows((rs) => [
      ...rs,
      { ear: "L", kind: "discrim", minutes: "10", content: KIND_DEFAULT_CONTENT.discrim },
    ]);

  const removeRow = (idx: number) => setRows((rs) => rs.filter((_, i) => i !== idx));

  const submit = () => {
    setError("");
    if (mode === "create" && !check.ok) {
      setError(check.reason);
      return;
    }
    try {
      const items: PlanItem[] = rows.map((r) => ({
        ear: r.ear,
        kind: r.kind,
        minutes: Number(r.minutes),
        content: r.content.trim(),
      }));
      const draft: PlanDraft = {
        weekKey,
        targetMinutes: Number(target),
        promptMethod,
        items,
      };
      if (mode === "create") onSubmitCreate(draft);
      else onSubmitRevise({ targetMinutes: draft.targetMinutes, promptMethod, items }, reason);
    } catch (err) {
      setError(err instanceof PlanRuleError ? err.message : "提交失败，请检查填写内容");
    }
  };

  return (
    <Modal
      wide
      onClose={onClose}
      title={
        mode === "create"
          ? `生成新一周计划 · ${patient.name}`
          : `调整计划（复制为新版本）· ${patient.name}`
      }
    >
      <div className="plan-modal">
        <div className="info-line">
          <span className="tag">周次</span>
          {weekLabel}
        </div>
        {mode === "create" && check.audiogram && (
          <div className={`info-line ${check.ok ? "" : "blocked"}`}>
            <span className="tag">听力曲线</span>
            {check.audiogram.testDate} 曲线
            {check.ok
              ? `：已经 ${check.audiogram.checkedBy} 核对（${check.audiogram.checkedAt?.slice(0, 10)}）`
              : "：尚未经听力师核对，请先回到工作台点“核对曲线”"}
          </div>
        )}
        {base && (
          <div className="info-line">
            <span className="tag">当前版本</span>
            v{base.version}（{base.author}，{base.createdAt.slice(0, 10)}）
            {base.reason ? ` · 上次原因：${base.reason}` : ""}
          </div>
        )}

        <div className="form-grid two">
          <label>
            <span>本周目标（分钟）</span>
            <input
              type="number"
              min={1}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </label>
          <label>
            <span>家属提示方式（本周）</span>
            <PromptSelect value={promptMethod} onChange={setPromptMethod} />
          </label>
        </div>

        <div className="item-table-wrap">
          <table className="item-table">
            <thead>
              <tr>
                <th style={{ width: 80 }}>耳朵</th>
                <th style={{ width: 120 }}>训练类型</th>
                <th style={{ width: 90 }}>分钟</th>
                <th>内容</th>
                <th style={{ width: 48 }} />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={idx}>
                  <td>
                    <select value={r.ear} onChange={(e) => updateRow(idx, { ear: e.target.value as Ear })}>
                      <option value="L">{EAR_LABEL.L}</option>
                      <option value="R">{EAR_LABEL.R}</option>
                    </select>
                  </td>
                  <td>
                    <select
                      value={r.kind}
                      onChange={(e) => {
                        const kind = e.target.value as TrainingKind;
                        updateRow(idx, {
                          kind,
                          content: r.content ? r.content : KIND_DEFAULT_CONTENT[kind],
                        });
                      }}
                    >
                      <option value="discrim">{KIND_LABEL.discrim}</option>
                      <option value="direction">{KIND_LABEL.direction}</option>
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      min={1}
                      value={r.minutes}
                      onChange={(e) => updateRow(idx, { minutes: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      value={r.content}
                      placeholder="训练内容"
                      onChange={(e) => updateRow(idx, { content: e.target.value })}
                    />
                  </td>
                  <td>
                    <button className="icon-btn" onClick={() => removeRow(idx)} disabled={rows.length <= 1}>
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="link-btn" onClick={addRow}>
          ＋ 增加一条训练安排
        </button>

        {mode === "revise" && (
          <label className="reason-field">
            <span>调整原因（必填，随新版本保留）</span>
            <textarea
              rows={3}
              value={reason}
              placeholder="例如：家属反馈训练后疲劳，减少右耳听辨分钟"
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
        )}

        <p className="muted small">
          同一患者同一周只保留一份计划{mode === "create" ? "" : "；本次调整会复制 v" + (base?.version ?? 0) + " 形成新版本，历史版本不覆盖"}，
          本周提示方式为 {PROMPT_LABEL[promptMethod]}。
        </p>

        <FormError>{error}</FormError>

        <footer className="modal-actions">
          <button onClick={onClose}>取消</button>
          <button className="primary-action" onClick={submit} disabled={mode === "create" && !check.ok}>
            {mode === "create" ? "生成本周计划" : "复制为新版本"}
          </button>
        </footer>
      </div>
    </Modal>
  );
}
