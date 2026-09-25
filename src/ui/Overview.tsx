import { useMemo } from "react";
import type { AppState } from "../types";
import { isoWeek, latestPlanOf, recallList, todayStr, weekProgress } from "../data/rules";

function Card({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: number }) {
  const tones = ["status-ok", "status-watch", "status-danger"];
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <p className="metric-sub">{sub}</p>
      <i className={tones[tone % tones.length]} />
    </article>
  );
}

export function Overview({ state, onGoRecall }: { state: AppState; onGoRecall: () => void }) {
  const today = todayStr();
  const now = isoWeek(new Date());
  const stats = useMemo(() => {
    let withPlan = 0;
    let totalDone = 0;
    let totalTarget = 0;
    let anyoneDone = false;
    for (const p of state.patients) {
      const plan = latestPlanOf(state, p.id);
      // 只统计本周已生成计划的患者
      if (plan && plan.year === now.year && plan.week === now.week) {
        withPlan += 1;
        const prog = weekProgress(state.logs, plan);
        totalDone += prog.done;
        totalTarget += prog.target;
        if (prog.done > 0) anyoneDone = true;
      }
    }
    const recall = recallList(state, today);
    const totalLogs = state.logs.length;
    const adjusted = state.plans.filter((p) => p.versions.length > 1).length;
    return { withPlan, totalDone, totalTarget, recall, totalLogs, adjusted, anyoneDone };
  }, [state, now.year, now.week, today]);

  const percent = stats.totalTarget > 0 ? Math.round((stats.totalDone / stats.totalTarget) * 100) : 0;

  return (
    <section className="metrics-grid">
      <Card
        label="本周已排计划"
        value={`${stats.withPlan}/${state.patients.length}`}
        sub="听力师核对曲线后生成"
        tone={0}
      />
      <Card
        label="本周累计训练"
        value={`${stats.totalDone}`}
        sub={`目标 ${stats.totalTarget} 分钟 · 达成 ${percent}%`}
        tone={percent >= 80 ? 0 : 1}
      />
      <button type="button" className="metric-card metric-link" onClick={onGoRecall}>
        <span>复诊联系名单</span>
        <strong>{stats.recall.length}</strong>
        <p className="metric-sub">连续 4 天未登记，点击处理</p>
        <i className={stats.recall.length > 0 ? "status-danger" : "status-ok"} />
      </button>
      <Card
        label="计划调整留档"
        value={`${stats.adjusted}`}
        sub={`共 ${stats.totalLogs} 条训练登记 · 复制新版并写原因`}
        tone={stats.anyoneDone ? 0 : 1}
      />
    </section>
  );
}
