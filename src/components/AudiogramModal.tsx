import { useState } from "react";
import type { Audiogram } from "../types";
import { FREQS } from "../data/catalog";
import { FormError, Modal } from "./ui";
import { todayKey } from "../rules/dates";

/** 录入或修改听力曲线。阈值/日期一旦变更，核对状态作废，需要听力师重新核对。 */
export function AudiogramModal({
  patientName,
  original,
  onClose,
  onSave,
}: {
  patientName: string;
  original: Audiogram | null;
  onClose: () => void;
  onSave: (next: { testDate: string; left: number[]; right: number[] }) => void;
}) {
  const [testDate, setTestDate] = useState(original?.testDate ?? todayKey());
  const [left, setLeft] = useState<number[]>(original ? [...original.left] : [25, 30, 35, 50, 60, 65]);
  const [right, setRight] = useState<number[]>(original ? [...original.right] : [25, 30, 35, 48, 58, 62]);
  const [error, setError] = useState("");

  const setVal = (side: "left" | "right", idx: number, raw: string) => {
    const v = Number(raw);
    const setter = side === "left" ? setLeft : setRight;
    setter((arr) => arr.map((x, i) => (i === idx ? v : x)));
  };

  const changed =
    original !== null &&
    (original.testDate !== testDate ||
      original.left.some((v, i) => v !== left[i]) ||
      original.right.some((v, i) => v !== right[i]));

  const save = () => {
    if (!testDate) {
      setError("请选择测试日期");
      return;
    }
    for (const [name, arr] of [
      ["左耳", left],
      ["右耳", right],
    ] as const) {
      if (arr.some((v) => !Number.isFinite(v) || v < -10 || v > 120)) {
        setError(`${name}听阈请填写 -10 ~ 120 dB HL 之间的数字`);
        return;
      }
    }
    onSave({ testDate, left, right });
  };

  return (
    <Modal onClose={onClose} title={`听力曲线 · ${patientName}`}>
      <div className="audiogram-modal">
        <label className="date-field">
          <span>测试日期</span>
          <input type="date" value={testDate} max={todayKey()} onChange={(e) => setTestDate(e.target.value)} />
        </label>
        <table className="audi-table">
          <thead>
            <tr>
              <th>耳朵 ＼ 频率</th>
              {FREQS.map((f) => (
                <th key={f}>{f} Hz</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>左耳 dB</th>
              {left.map((v, i) => (
                <td key={i}>
                  <input type="number" value={v} onChange={(e) => setVal("left", i, e.target.value)} />
                </td>
              ))}
            </tr>
            <tr>
              <th>右耳 dB</th>
              {right.map((v, i) => (
                <td key={i}>
                  <input type="number" value={v} onChange={(e) => setVal("right", i, e.target.value)} />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
        {original?.checkedBy && (
          <p className={`muted small ${changed ? "warn-text" : ""}`}>
            {changed
              ? "曲线内容已修改：保存后核对状态将作废，必须由听力师重新核对才能生成计划。"
              : `当前曲线已经 ${original.checkedBy} 核对，未改动时保存不影响核对状态。`}
          </p>
        )}
        <FormError>{error}</FormError>
        <footer className="modal-actions">
          <button onClick={onClose}>取消</button>
          <button className="primary-action" onClick={save}>
            保存曲线
          </button>
        </footer>
      </div>
    </Modal>
  );
}
