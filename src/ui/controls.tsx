import type { ReactNode } from "react";

export function Panel({
  title,
  tag,
  action,
  children,
}: {
  title: string;
  tag?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          {tag ? <p className="eyebrow-sm">{tag}</p> : null}
          <h2>{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function Toast({ text }: { text: string | null }) {
  if (!text) return null;
  return <div className="toast">{text}</div>;
}

export function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="progress">
      <i style={{ width: `${Math.min(100, percent)}%` }} />
    </div>
  );
}

export function EarTag({ ear }: { ear: "left" | "right" }) {
  return (
    <span className={`ear-tag ${ear === "left" ? "ear-left" : "ear-right"}`}>
      {ear === "left" ? "左耳" : "右耳"}
    </span>
  );
}
