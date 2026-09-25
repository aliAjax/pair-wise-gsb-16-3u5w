import type { AudiogramPoint } from "../types";

// 听力曲线：SVG 绘制，蓝线为左耳、红线为右耳（听力图惯例）
export function AudiogramChart({
  points,
  height = 190,
}: {
  points: AudiogramPoint[];
  height?: number;
}) {
  const width = 460;
  const padL = 42;
  const padR = 76;
  const padT = 14;
  const padB = 30;
  const minDb = 0;
  const maxDb = 90;
  const freqs = points.map((p) => p.freq);
  const x = (freq: number) => {
    const i = freqs.indexOf(freq);
    return padL + (i * (width - padL - padR)) / Math.max(1, freqs.length - 1);
  };
  const y = (db: number) =>
    padT + ((db - minDb) / (maxDb - minDb)) * (height - padT - padB);

  const line = (ear: "left" | "right") => {
    const coords = points
      .filter((p) => p[ear] !== null)
      .map((p) => `${x(p.freq)},${y(p[ear] as number)}`);
    return coords.length > 1 ? coords.join(" ") : "";
  };

  const dbGrid = [0, 20, 40, 60, 80];

  return (
    <svg className="audiogram" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="听力曲线">
      {dbGrid.map((db) => (
        <g key={db}>
          <line
            x1={padL}
            x2={width - padR}
            y1={y(db)}
            y2={y(db)}
            className="ag-grid"
          />
          <text x={padL - 8} y={y(db) + 4} className="ag-label" textAnchor="end">
            {db}
          </text>
        </g>
      ))}
      {freqs.map((f) => (
        <text key={f} x={x(f)} y={height - 9} className="ag-label" textAnchor="middle">
          {f >= 1000 ? `${f / 1000}k` : f}
        </text>
      ))}
      <text x={padL} y={height - 9 + 22} className="ag-axis">
        Hz · dB HL
      </text>

      <polyline points={line("left")} className="ag-line ag-left" />
      <polyline points={line("right")} className="ag-line ag-right" />

      {points.map((p) =>
        p.left === null ? null : (
          <text key={`l${p.freq}`} x={x(p.freq)} y={y(p.left) + 4} className="ag-dot ag-left" textAnchor="middle">
            ×
          </text>
        )
      )}
      {points.map((p) =>
        p.right === null ? null : (
          <circle key={`r${p.freq}`} cx={x(p.freq)} cy={y(p.right)} r={3.4} className="ag-dot ag-right-dot" />
        )
      )}

      <g className="ag-legend">
        <line x1={width - padR + 10} x2={width - padR + 26} y1={padT + 6} y2={padT + 6} className="ag-line ag-left" />
        <text x={width - padR + 30} y={padT + 10} className="ag-label">左耳 ×</text>
        <line x1={width - padR + 10} x2={width - padR + 26} y1={padT + 26} y2={padT + 26} className="ag-line ag-right" />
        <text x={width - padR + 30} y={padT + 30} className="ag-label">右耳 ●</text>
      </g>
    </svg>
  );
}
