import type { Audiogram } from "../types";
import { FREQS } from "../data/catalog";

// 听力曲线：纵轴 dB HL（数值越大越差，向下为增），左耳蓝色 ×、右耳红色 ○。
const W = 560;
const H = 320;
const ML = 56;
const MR = 24;
const MT = 28;
const MB = 46;
const LEVELS = [0, 20, 40, 60, 80, 100];

function xPos(i: number): number {
  return ML + (i * (W - ML - MR)) / (FREQS.length - 1);
}
function yPos(db: number): number {
  return MT + (db / 100) * (H - MT - MB);
}

const X_STYLE = { stroke: "#2563eb", fill: "none", strokeWidth: 2.4 } as const;
const O_STYLE = { stroke: "#dc2626", fill: "none", strokeWidth: 2.4 } as const;

function XMark({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <path d={`M ${x - 5} ${y - 5} L ${x + 5} ${y + 5}`} {...X_STYLE} />
      <path d={`M ${x + 5} ${y - 5} L ${x - 5} ${y + 5}`} {...X_STYLE} />
    </g>
  );
}

export function AudiogramChart({
  audiogram,
  highlight,
}: {
  audiogram: Audiogram | null;
  highlight?: boolean;
}) {
  if (!audiogram) {
    return <div className="chart-empty">暂无听力曲线，请先在“患者档案”中录入</div>;
  }
  return (
    <figure className={`chart ${highlight ? "highlight" : ""}`}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="听力曲线">
        {LEVELS.map((db) => (
          <g key={db}>
            <line
              x1={ML}
              x2={W - MR}
              y1={yPos(db)}
              y2={yPos(db)}
              stroke={db === 0 ? "#94a3b8" : "#e2e8f0"}
              strokeWidth={db === 0 ? 1.4 : 1}
            />
            <text x={ML - 10} y={yPos(db) + 4} textAnchor="end" className="chart-tick">
              {db}
            </text>
          </g>
        ))}
        {FREQS.map((f, i) => (
          <g key={f}>
            <line
              x1={xPos(i)}
              x2={xPos(i)}
              y1={MT}
              y2={H - MB}
              stroke="#eef2f7"
            />
            <text x={xPos(i)} y={H - MB + 20} textAnchor="middle" className="chart-tick">
              {f}
            </text>
          </g>
        ))}
        <text x={16} y={MT + 6} className="chart-unit">
          dB HL
        </text>
        <text x={(W + ML) / 2} y={H - 6} textAnchor="middle" className="chart-unit">
          频率 Hz
        </text>

        <polyline
          points={audiogram.left.map((db, i) => `${xPos(i)},${yPos(db)}`).join(" ")}
          stroke="#2563eb"
          strokeWidth={1.8}
          fill="none"
          strokeDasharray="6 4"
        />
        <polyline
          points={audiogram.right.map((db, i) => `${xPos(i)},${yPos(db)}`).join(" ")}
          stroke="#dc2626"
          strokeWidth={1.8}
          fill="none"
        />
        {audiogram.left.map((db, i) => (
          <XMark key={`l-${FREQS[i]}`} x={xPos(i)} y={yPos(db)} />
        ))}
        {audiogram.right.map((db, i) => (
          <g key={`r-${FREQS[i]}`}>
            <circle cx={xPos(i)} cy={yPos(db)} r={5.5} {...O_STYLE} />
          </g>
        ))}
      </svg>
      <figcaption className="legend">
        <span><i className="legend-x" /> 左耳（×）</span>
        <span><i className="legend-o" /> 右耳（○）</span>
        <span>测试日期：{audiogram.testDate}</span>
      </figcaption>
    </figure>
  );
}
