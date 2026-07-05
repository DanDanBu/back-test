import type { FundamentalsData, FundamentalMetric, Grade, OverallScore } from "../types/types";

const GRADE_CFG: Record<Grade, { color: string; bg: string; border: string; label: string; badgeClass: string }> = {
  excellent: { color: "#00ff88", bg: "rgba(0,255,136,0.1)",  border: "rgba(0,255,136,0.3)",  label: "優",  badgeClass: "badge-excellent" },
  good:      { color: "#00d4ff", bg: "rgba(0,212,255,0.1)",  border: "rgba(0,212,255,0.3)",  label: "良",  badgeClass: "badge-good"      },
  fair:      { color: "#ffaa00", bg: "rgba(255,170,0,0.1)",  border: "rgba(255,170,0,0.3)",  label: "中",  badgeClass: "badge-fair"      },
  poor:      { color: "#ff4040", bg: "rgba(255,64,64,0.1)",  border: "rgba(255,64,64,0.3)",  label: "差",  badgeClass: "badge-poor"      },
  unknown:   { color: "#475569", bg: "rgba(71,85,105,0.1)", border: "rgba(71,85,105,0.3)", label: "N/A", badgeClass: "badge-unknown"   },
};

const SCORE_CFG: Record<OverallScore, { color: string; bg: string; border: string; label: string; rank: number }> = {
  strong_buy:  { color: "#00ff88", bg: "rgba(0,255,136,0.12)",  border: "rgba(0,255,136,0.4)",  label: "強力買入", rank: 5 },
  buy:         { color: "#00d4ff", bg: "rgba(0,212,255,0.12)",  border: "rgba(0,212,255,0.4)",  label: "建議買入", rank: 4 },
  hold:        { color: "#ffaa00", bg: "rgba(255,170,0,0.12)",  border: "rgba(255,170,0,0.4)",  label: "觀望持有", rank: 3 },
  sell:        { color: "#ff8c00", bg: "rgba(255,140,0,0.12)",  border: "rgba(255,140,0,0.4)",  label: "考慮賣出", rank: 2 },
  strong_sell: { color: "#ff4040", bg: "rgba(255,64,64,0.12)",  border: "rgba(255,64,64,0.4)",  label: "強力賣出", rank: 1 },
};

function MetricCard({ metric }: { metric: FundamentalMetric }) {
  const cfg = GRADE_CFG[metric.grade] ?? GRADE_CFG.unknown;
  return (
    <div className="metric-card" style={{ borderLeft: `3px solid ${cfg.border}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: "0.84rem", color: "#94a3b8" }}>{metric.label}</span>
        <span className={`badge ${cfg.badgeClass}`}>{cfg.label}</span>
      </div>
      <div
        className="mono"
        style={{
          fontSize: "1.5rem",
          fontWeight: 700,
          color: cfg.color,
          textShadow: `0 0 10px ${cfg.color}55`,
          marginBottom: 2,
          lineHeight: 1.2,
        }}
      >
        {metric.formatted}
      </div>
      <div style={{ fontSize: "0.8rem", color: "#475569", lineHeight: 1.4 }}>{metric.hint}</div>
    </div>
  );
}

function formatMarketCap(cap: number | null): string {
  if (!cap) return "N/A";
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9)  return `$${(cap / 1e9).toFixed(1)}B`;
  if (cap >= 1e6)  return `$${(cap / 1e6).toFixed(1)}M`;
  return `$${cap.toLocaleString()}`;
}

function formatFCF(fcf: number | null): string {
  if (fcf == null) return "N/A";
  const abs = Math.abs(fcf);
  const sign = fcf < 0 ? "-" : "+";
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  return `${sign}$${abs.toLocaleString()}`;
}

interface Props { data: FundamentalsData }

export default function FundamentalsPanel({ data }: Props) {
  const sc = SCORE_CFG[data.overall_score] ?? SCORE_CFG.hold;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>

      {/* ── Overall score ───────────────────────────────────── */}
      <div
        className="glass-card"
        style={{
          padding: "20px 24px",
          border: `1px solid ${sc.border}`,
          display: "flex",
          alignItems: "center",
          gap: 18,
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "0.8rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
            綜合評分
          </div>
          <div style={{ fontSize: "1.35rem", fontWeight: 700, color: sc.color }}>{sc.label}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            className="mono"
            style={{ fontSize: "2.4rem", fontWeight: 700, color: sc.color, textShadow: `0 0 24px ${sc.color}60`, lineHeight: 1 }}
          >
            {data.score_points > 0 ? "+" : ""}{data.score_points}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#475569" }}>評分點數</div>
        </div>
        <div className="score-bar" style={{ marginLeft: 4 }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div
              key={i}
              className="score-dot"
              style={{
                background: i <= sc.rank ? sc.color : "rgba(255,255,255,0.04)",
                boxShadow: i <= sc.rank ? `0 0 6px ${sc.color}` : "none",
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Quick stats ─────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {[
          {
            label: "市值",
            value: formatMarketCap(data.market_cap),
            color: "#00d4ff",
          },
          {
            label: "每股盈餘 EPS",
            value: data.eps != null ? `$${data.eps.toFixed(2)}` : "N/A",
            color: data.eps != null && data.eps > 0 ? "#00ff88" : "#ff4040",
          },
          {
            label: "自由現金流",
            value: formatFCF(data.free_cashflow),
            color: data.free_cashflow != null && data.free_cashflow > 0 ? "#00ff88" : data.free_cashflow != null ? "#ff4040" : "#475569",
          },
          {
            label: "分析師目標價",
            value: data.target_mean_price ? `$${data.target_mean_price.toFixed(2)}` : "N/A",
            color: "#00d4ff",
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass-card" style={{ padding: "12px 16px" }}>
            <div style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: 4 }}>{label}</div>
            <div className="mono" style={{ fontSize: "1.1rem", fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── Valuation ───────────────────────────────────────── */}
      <div>
        <div className="section-label">
          估值指標 <span className="sub">巴菲特 · 林區</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <MetricCard metric={data.pe_ratio} />
          <MetricCard metric={data.pb_ratio} />
          <MetricCard metric={data.peg_ratio} />
          <MetricCard metric={data.ps_ratio} />
        </div>
      </div>

      {/* ── Profitability ────────────────────────────────────── */}
      <div>
        <div className="section-label">
          獲利能力 <span className="sub">巴菲特護城河</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <MetricCard metric={data.roe} />
          <MetricCard metric={data.operating_margin} />
          <MetricCard metric={data.profit_margin} />
          <MetricCard metric={data.roic} />
        </div>
      </div>

      {/* ── Financial health ─────────────────────────────────── */}
      <div>
        <div className="section-label">
          財務健康 <span className="sub">巴菲特安全邊際</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <MetricCard metric={data.debt_to_equity} />
          <MetricCard metric={data.current_ratio} />
          <MetricCard metric={data.interest_coverage} />
        </div>
      </div>

      {/* ── Growth ───────────────────────────────────────────── */}
      <div>
        <div className="section-label">
          成長指標 <span className="sub">林區成長策略</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <MetricCard metric={data.earnings_growth} />
          <MetricCard metric={data.revenue_growth} />
        </div>
      </div>

      {/* ── Buffett / Lynch legend ───────────────────────────── */}
      <div
        style={{
          fontSize: "0.8rem",
          color: "#334155",
          lineHeight: 1.7,
          borderTop: "1px solid rgba(255,255,255,0.04)",
          paddingTop: 12,
        }}
      >
        <strong style={{ color: "#475569" }}>巴菲特</strong>：ROE&gt;20%、ROIC&gt;15%、低D/E、利息保障&gt;10x、寬護城河（高利潤率）、低P/B｜
        <strong style={{ color: "#475569" }}>林區</strong>：PEG&lt;1、高盈利成長、低P/S
      </div>
    </div>
  );
}
