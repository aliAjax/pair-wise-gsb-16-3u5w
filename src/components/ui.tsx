import type { ReactNode } from "react";
import { useEffect } from "react";
import type { PromptMethod } from "../types";
import { PROMPT_METHODS } from "../data/catalog";

export function Card({
  title,
  extra,
  children,
}: {
  title: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="card">
      <header className="card-head">
        <h3>{title}</h3>
        {extra}
      </header>
      {children}
    </section>
  );
}

export function ProgressBar({
  value,
  max,
  tone = "primary",
}: {
  value: number;
  max: number;
  tone?: "primary" | "good" | "warn";
}) {
  const p = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="bar" title={`${value} / ${max} 分钟`}>
      <i className={`bar-fill ${tone}`} style={{ width: `${p}%` }} />
    </div>
  );
}

export function PromptSelect({
  value,
  onChange,
}: {
  value: PromptMethod;
  onChange: (v: PromptMethod) => void;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as PromptMethod)}>
      {PROMPT_METHODS.map((m) => (
        <option key={m.value} value={m.value}>
          {m.label}（{m.hint}）
        </option>
      ))}
    </select>
  );
}

export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-mask" onMouseDown={onClose}>
      <div className={`modal ${wide ? "wide" : ""}`} onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="关闭">
            ✕
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function FormError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p className="form-error">⚠ {children}</p>;
}

export function EmptyHint({ children }: { children: ReactNode }) {
  return <p className="empty-hint">{children}</p>;
}
