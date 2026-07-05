import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import type { WatchlistEntry, WatchlistResponse, DispositionStatus } from "../types/types";

const API = "http://localhost:8000";

const DISPOSITION_CFG: Record<DispositionStatus, { label: string; color: string; bg: string; border: string; pulse: boolean }> = {
  normal:      { label: "正常",     color: "#475569", bg: "rgba(71,85,105,0.1)",   border: "rgba(71,85,105,0.2)",   pulse: false },
  warning:     { label: "注意",     color: "#ffaa00", bg: "rgba(255,170,0,0.12)",  border: "rgba(255,170,0,0.35)",  pulse: false },
  disposition: { label: "處置",     color: "#ff4040", bg: "rgba(255,64,64,0.12)",  border: "rgba(255,64,64,0.4)",   pulse: true  },
  n_a:         { label: "US",       color: "#334155", bg: "rgba(51,65,85,0.08)",   border: "rgba(51,65,85,0.15)",   pulse: false },
  unknown:     { label: "未知",     color: "#334155", bg: "rgba(51,65,85,0.08)",   border: "rgba(51,65,85,0.15)",   pulse: false },
};

function DispositionBadge({ status }: { status: DispositionStatus }) {
  const cfg = DISPOSITION_CFG[status] ?? DISPOSITION_CFG.unknown;
  return (
    <span
      className={`badge ${cfg.pulse ? "badge-disposition-pulse" : ""}`}
      style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border, minWidth: 44, justifyContent: "center" }}
    >
      {cfg.label}
    </span>
  );
}

function PriceCell({ price, change, changePct }: { price: number | null; change: number | null; changePct: number | null }) {
  if (price == null) {
    return <span style={{ color: "#334155", fontSize: "0.97rem" }}>—</span>;
  }
  const up = (change ?? 0) >= 0;
  const color = change === 0 ? "#64748b" : up ? "#00ff88" : "#ff4040";
  return (
    <div style={{ textAlign: "right" }}>
      <div className="mono" style={{ fontSize: "1.1rem", fontWeight: 700, color, textShadow: `0 0 8px ${color}40` }}>
        {price.toFixed(2)}
      </div>
      {changePct != null && (
        <div className="mono" style={{ fontSize: "0.84rem", color: `${color}bb` }}>
          {up ? "+" : ""}{changePct.toFixed(2)}%
        </div>
      )}
    </div>
  );
}

interface Props {
  onSelectStock: (symbol: string) => void;
}

export default function WatchlistPanel({ onSelectStock }: Props) {
  const [data, setData] = useState<WatchlistResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [addInput, setAddInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  const fetchWatchlist = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get<WatchlistResponse>(`${API}/watchlist`);
      setData(res.data);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  const handleAdd = async () => {
    const sym = addInput.trim().toUpperCase();
    if (!sym) return;
    setAdding(true);
    setAddError("");
    try {
      const res = await axios.post<WatchlistResponse>(`${API}/watchlist`, { symbol: sym });
      setData(res.data);
      setAddInput("");
    } catch {
      setAddError("新增失敗，請確認股票代碼是否正確");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (symbol: string) => {
    try {
      const res = await axios.delete<WatchlistResponse>(`${API}/watchlist/${symbol}`);
      setData(res.data);
    } catch {
      /* silent */
    }
  };

  const items: WatchlistEntry[] = data?.items ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 920, margin: "0 auto" }}>

      {/* ── Add stock ──────────────────────────────────────── */}
      <div className="glass-card" style={{ padding: "22px 24px" }}>
        <div style={{ fontSize: "0.82rem", color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
          新增股票到持股清單
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            type="text"
            value={addInput}
            onChange={e => setAddInput(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            placeholder="股票代碼 (e.g. AAPL、2330.TW)"
            className="tech-input"
            style={{ flex: 1, minWidth: 200 }}
          />
          <button onClick={handleAdd} disabled={adding} className="tech-button">
            {adding ? <span className="spinner" /> : "+ 新增"}
          </button>
          <button
            onClick={fetchWatchlist}
            disabled={loading}
            className="tech-button"
            style={{ padding: "9px 14px", fontSize: "0.97rem", color: "#64748b", borderColor: "rgba(100,116,139,0.3)" }}
          >
            {loading ? <span className="spinner" /> : "重新整理"}
          </button>
        </div>
        {addError && <div style={{ fontSize: "0.95rem", color: "#ff4040", marginTop: 8 }}>{addError}</div>}
        <div style={{ fontSize: "0.8rem", color: "#334155", marginTop: 10 }}>
          台股請加 <code style={{ color: "#475569" }}>.TW</code> 後綴 (如 <code style={{ color: "#475569" }}>2330.TW</code>)
          ，上櫃股票加 <code style={{ color: "#475569" }}>.TWO</code>。
          處置狀態僅適用於台灣上市股票 (TWSE)。
        </div>
      </div>

      {/* ── Legend ─────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: "0.8rem", color: "#334155" }}>處置狀態說明：</span>
        {(["normal", "warning", "disposition"] as DispositionStatus[]).map(s => {
          const cfg = DISPOSITION_CFG[s];
          return (
            <span key={s} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.84rem" }}>
              <span
                className="badge"
                style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}
              >
                {cfg.label}
              </span>
              <span style={{ color: "#334155" }}>
                {s === "normal" && "無限制"}
                {s === "warning" && "注意股票，即將處置"}
                {s === "disposition" && "處置股票，交易受限"}
              </span>
            </span>
          );
        })}
      </div>

      {/* ── Stock list ─────────────────────────────────────── */}
      {loading && !data ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#334155" }}>
          <span className="spinner" style={{ width: 24, height: 24, borderWidth: 3 }} />
          <div style={{ marginTop: 12, fontSize: "0.97rem" }}>載入持股資料中...</div>
        </div>
      ) : items.length === 0 ? (
        <div
          style={{
            textAlign: "center", padding: "60px 24px",
            borderRadius: 12, border: "1px dashed rgba(0,212,255,0.1)",
            color: "#334155",
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" width={40} height={40} style={{ margin: "0 auto 12px", display: "block", opacity: 0.3 }}>
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="#00d4ff" strokeWidth="1.5" />
            <path d="M8 12h8M12 8v8" stroke="#00d4ff" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <div style={{ fontSize: "1.05rem", marginBottom: 6 }}>持股清單是空的</div>
          <div style={{ fontSize: "0.88rem" }}>在上方輸入股票代碼開始追蹤</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {/* header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr auto auto auto",
              gap: 14, padding: "8px 18px",
              fontSize: "0.75rem", color: "#334155",
              textTransform: "uppercase", letterSpacing: "0.1em",
            }}
          >
            <span>股票</span>
            <span>公司名稱</span>
            <span style={{ textAlign: "right", minWidth: 80 }}>現價 / 漲跌</span>
            <span style={{ minWidth: 44, textAlign: "center" }}>處置狀態</span>
            <span style={{ width: 28 }} />
          </div>

          {items.map(item => (
            <div
              key={item.symbol}
              className="wl-row wl-row-clickable"
              onClick={() => onSelectStock(item.symbol)}
            >
              {/* Symbol */}
              <div>
                <div className="mono neon-cyan" style={{ fontWeight: 700, fontSize: "1.1rem" }}>
                  {item.symbol}
                </div>
                <div style={{ fontSize: "0.8rem", color: "#334155" }}>點擊分析</div>
              </div>

              {/* Company name */}
              <div style={{ fontSize: "0.97rem", color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.company_name}
              </div>

              {/* Price */}
              <PriceCell price={item.current_price} change={item.change} changePct={item.change_pct} />

              {/* Disposition */}
              <div style={{ display: "flex", justifyContent: "center" }}>
                <DispositionBadge status={item.disposition_status} />
              </div>

              {/* Delete */}
              <button
                className="btn-icon"
                title="移除"
                onClick={e => { e.stopPropagation(); handleRemove(item.symbol); }}
              >
                <svg viewBox="0 0 24 24" fill="none" width={16} height={16}>
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Updated timestamp ──────────────────────────────── */}
      {data && (
        <div style={{ fontSize: "0.8rem", color: "#1e293b", textAlign: "right" }}>
          最後更新：{data.updated_at}
        </div>
      )}
    </div>
  );
}
