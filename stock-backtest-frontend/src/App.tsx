import { useState } from "react";
import axios from "axios";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import FundamentalsPanel from "./components/FundamentalsPanel";
import WatchlistPanel from "./components/WatchlistPanel";
import type { BacktestResult, FundamentalsData } from "./types/types";

const API = "http://localhost:8000";
type Tab = "analysis" | "watchlist";

function TrendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width={20} height={20}>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="16 7 22 7 22 13" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChartEmptyState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200, borderRadius: 8, border: "1px dashed rgba(0,212,255,0.1)", color: "#334155", gap: 8 }}>
      <svg viewBox="0 0 24 24" fill="none" width={32} height={32} opacity={0.4}>
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke="#00d4ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span style={{ fontSize: "0.82rem" }}>設定均線參數後執行回測</span>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("analysis");
  const [inputSymbol, setInputSymbol] = useState("AAPL");
  const [activeSymbol, setActiveSymbol] = useState("");
  const [fundamentals, setFundamentals] = useState<FundamentalsData | null>(null);
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [shortWindow, setShortWindow] = useState(20);
  const [longWindow, setLongWindow] = useState(50);
  const [loadingFund, setLoadingFund] = useState(false);
  const [loadingBack, setLoadingBack] = useState(false);
  const [fundError, setFundError] = useState("");

  const handleSearch = async (overrideSymbol?: string) => {
    const sym = (overrideSymbol ?? inputSymbol).trim().toUpperCase();
    if (!sym) return;
    setInputSymbol(sym);
    setLoadingFund(true);
    setFundError("");
    setBacktestResult(null);
    try {
      const res = await axios.get<FundamentalsData>(`${API}/fundamentals`, { params: { symbol: sym } });
      setFundamentals(res.data);
      setActiveSymbol(sym);
    } catch {
      setFundError("找不到股票資料，請確認代碼是否正確");
    } finally {
      setLoadingFund(false);
    }
  };

  const handleWatchlistSelect = (symbol: string) => {
    setInputSymbol(symbol);
    setActiveTab("analysis");
    handleSearch(symbol);
  };

  const handleBacktest = async () => {
    if (!activeSymbol) return;
    setLoadingBack(true);
    try {
      const res = await axios.get<BacktestResult>(`${API}/backtest`, {
        params: { symbol: activeSymbol, short_window: shortWindow, long_window: longWindow },
      });
      setBacktestResult(res.data);
    } catch {
      /* silent */
    } finally {
      setLoadingBack(false);
    }
  };

  const returnPct = backtestResult ? (backtestResult.final_return - 1) * 100 : 0;
  const returnColor = backtestResult ? (returnPct >= 0 ? "#00ff88" : "#ff4040") : "#00d4ff";
  const chartData = backtestResult?.history.map((v, i) => ({
    day: i + 1,
    pct: parseFloat(((v - 1) * 100).toFixed(2)),
  })) ?? [];

  return (
    <div style={{ minHeight: "100vh" }}>

      {/* ── Header ───────────────────────────────────────────── */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(5,10,20,0.94)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(0,212,255,0.06)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.25)" }}>
              <TrendIcon />
            </div>
            <div>
              <div style={{ fontWeight: 700, letterSpacing: "0.08em", fontSize: "1rem" }}>
                <span className="neon-cyan">QUANT</span>
                <span style={{ color: "#7c3aed" }}>·</span>
                <span style={{ color: "#e2e8f0" }}>DASH</span>
              </div>
              <div style={{ fontSize: "0.62rem", color: "#334155", letterSpacing: "0.06em" }}>STOCK FUNDAMENTALS SYSTEM</div>
            </div>
          </div>
          {fundamentals && activeTab === "analysis" && (
            <div style={{ fontSize: "0.78rem", color: "#475569" }}>
              {fundamentals.symbol} · {fundamentals.company_name}
            </div>
          )}
        </div>

        {/* ── Tab bar ─────────────────────────────────────────── */}
        <div className="tab-bar" style={{ maxWidth: 1280, margin: "0 auto" }}>
          <button className={`tab-btn ${activeTab === "analysis" ? "active" : ""}`} onClick={() => setActiveTab("analysis")}>
            股票搜尋分析
          </button>
          <button className={`tab-btn ${activeTab === "watchlist" ? "active" : ""}`} onClick={() => setActiveTab("watchlist")}>
            持股清單
          </button>
        </div>
      </header>

      {/* ── Main ─────────────────────────────────────────────── */}
      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 24px" }}>

        {activeTab === "watchlist" ? (
          <WatchlistPanel onSelectStock={handleWatchlistSelect} />
        ) : !fundamentals ? (

          /* ── Hero search ─────────────────────────────────── */
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "65vh", textAlign: "center", position: "relative" }}>
            <div className="hero-glow" />

            <div style={{ fontSize: "0.68rem", letterSpacing: "0.15em", color: "#334155", textTransform: "uppercase", marginBottom: 12 }}>
              Based on Buffett &amp; Lynch Principles
            </div>
            <h1 style={{ fontSize: "clamp(2.2rem, 6vw, 3.8rem)", fontWeight: 800, lineHeight: 1.1, marginBottom: 16, letterSpacing: "-0.02em" }}>
              <span className="neon-cyan">智能</span>
              <span style={{ color: "#e2e8f0" }}>股票</span>
              <span style={{ color: "#7c3aed", textShadow: "0 0 20px rgba(124,58,237,0.5)" }}>分析</span>
            </h1>
            <p style={{ color: "#64748b", marginBottom: 40, maxWidth: 420, lineHeight: 1.7, fontSize: "0.9rem" }}>
              整合<strong style={{ color: "#94a3b8" }}>巴菲特</strong>的價值投資心法與
              <strong style={{ color: "#94a3b8" }}>彼得林區</strong>的成長策略，
              量化解析每一支股票的基本面體質
            </p>

            <div style={{ display: "flex", gap: 10, width: "100%", maxWidth: 440 }}>
              <input
                type="text"
                value={inputSymbol}
                onChange={e => setInputSymbol(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder="輸入股票代碼 (e.g. AAPL)"
                className="tech-input"
                style={{ flex: 1, fontSize: "1rem" }}
              />
              <button onClick={() => handleSearch()} disabled={loadingFund} className="tech-button" style={{ fontSize: "1rem" }}>
                {loadingFund ? <span style={{ display: "flex", alignItems: "center", gap: 8 }}><span className="spinner" />搜尋中</span> : "搜尋分析"}
              </button>
            </div>

            {fundError && <div style={{ marginTop: 12, fontSize: "0.82rem", color: "#ff4040" }}>{fundError}</div>}

            <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap", justifyContent: "center" }}>
              {["AAPL", "TSLA", "NVDA", "MSFT", "2330.TW"].map(t => (
                <button key={t} onClick={() => setInputSymbol(t)}
                  style={{ background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.15)", borderRadius: 6, color: "#64748b", padding: "4px 12px", fontSize: "0.75rem", cursor: "pointer" }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

        ) : (

          /* ── Dashboard ───────────────────────────────────── */
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* compact search */}
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <input
                type="text"
                value={inputSymbol}
                onChange={e => setInputSymbol(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder="切換股票代碼..."
                className="tech-input"
                style={{ width: 200 }}
              />
              <button onClick={() => handleSearch()} disabled={loadingFund} className="tech-button" style={{ padding: "9px 16px" }}>
                {loadingFund ? <span className="spinner" /> : "切換股票"}
              </button>
              {fundError && <span style={{ fontSize: "0.8rem", color: "#ff4040" }}>{fundError}</span>}
            </div>

            {/* Company header */}
            <div className="glass-card" style={{ padding: "20px 24px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                    <span className="neon-cyan mono" style={{ fontSize: "2rem", fontWeight: 800 }}>{fundamentals.symbol}</span>
                    <span style={{ padding: "3px 12px", borderRadius: 999, fontSize: "0.75rem", fontWeight: 600, background: "rgba(124,58,237,0.14)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.3)" }}>
                      {fundamentals.sector}
                    </span>
                  </div>
                  <div style={{ fontSize: "1.1rem", color: "#cbd5e1", marginBottom: 4 }}>{fundamentals.company_name}</div>
                  <div style={{ fontSize: "0.78rem", color: "#475569" }}>{fundamentals.industry}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  {fundamentals.current_price != null && (
                    <div className="mono neon-green" style={{ fontSize: "2.4rem", fontWeight: 800, lineHeight: 1 }}>
                      ${fundamentals.current_price.toFixed(2)}
                    </div>
                  )}
                  {fundamentals.dividend_yield != null && (
                    <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 4 }}>
                      殖利率 {(fundamentals.dividend_yield * 100).toFixed(2)}%
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Two-column */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 20, alignItems: "start" }}>

              {/* Left — Fundamentals */}
              <div className="glass-card" style={{ padding: 24, position: "relative", overflow: "hidden" }}>
                <div className="scan-line" />
                <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="neon-cyan">基本面分析</span>
                  <span style={{ fontSize: "0.7rem", color: "#334155", fontWeight: 400 }}>Buffett · Lynch</span>
                </h2>
                <FundamentalsPanel data={fundamentals} />
              </div>

              {/* Right — Backtest */}
              <div className="glass-card" style={{ padding: 24 }}>
                <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="neon-cyan">均線回測策略</span>
                  <span style={{ fontSize: "0.7rem", color: "#334155", fontWeight: 400 }}>SMA Crossover</span>
                </h2>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
                  {[
                    { label: "短期均線 (天)", value: shortWindow, onChange: setShortWindow },
                    { label: "長期均線 (天)", value: longWindow,  onChange: setLongWindow  },
                  ].map(({ label, value, onChange }) => (
                    <div key={label}>
                      <label style={{ display: "block", fontSize: "0.7rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{label}</label>
                      <input type="number" value={value} onChange={e => onChange(Number(e.target.value))} className="tech-input" style={{ width: "100%" }} />
                    </div>
                  ))}
                </div>

                <button onClick={handleBacktest} disabled={loadingBack} className="tech-button" style={{ width: "100%", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {loadingBack ? <span style={{ display: "flex", alignItems: "center", gap: 8 }}><span className="spinner" />回測運算中...</span> : "執行回測"}
                </button>

                {backtestResult ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderRadius: 8, background: "rgba(0,0,0,0.3)", border: `1px solid ${returnColor}30` }}>
                      <div>
                        <div style={{ fontSize: "0.68rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>策略累積報酬</div>
                        <div style={{ fontSize: "0.8rem", color: "#334155" }}>SMA {backtestResult.short_window} / {backtestResult.long_window}</div>
                      </div>
                      <div className="mono" style={{ fontSize: "2.2rem", fontWeight: 800, color: returnColor, textShadow: `0 0 24px ${returnColor}55` }}>
                        {returnPct >= 0 ? "+" : ""}{returnPct.toFixed(2)}%
                      </div>
                    </div>

                    <div style={{ height: 220 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.05)" />
                          <XAxis dataKey="day" stroke="#1e293b" tick={{ fill: "#334155", fontSize: 10 }} />
                          <YAxis stroke="#1e293b" tick={{ fill: "#334155", fontSize: 10 }} tickFormatter={v => `${v}%`} />
                          <Tooltip
                            contentStyle={{ background: "rgba(10,22,40,0.96)", border: "1px solid rgba(0,212,255,0.2)", borderRadius: 8, color: "#e2e8f0", fontSize: "0.8rem" }}
                            formatter={(val: number) => [`${val}%`, "累積報酬"]}
                            labelFormatter={l => `第 ${l} 天`}
                          />
                          <Line type="monotone" dataKey="pct" stroke={returnColor} dot={false} strokeWidth={2} activeDot={{ r: 4, fill: returnColor }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ) : (
                  <ChartEmptyState />
                )}

                <div style={{ marginTop: 16, fontSize: "0.68rem", color: "#1e293b", lineHeight: 1.7, borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 12 }}>
                  短期均線上穿長期均線時做多；下穿時做空。回測使用最近 1 年日線資料，最後 30 日累積報酬。
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
