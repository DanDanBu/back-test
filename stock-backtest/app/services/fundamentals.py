import math
import yfinance as yf
from typing import Optional, Tuple
from app.models.schema import FundamentalsResponse, FundamentalMetric


def _grade_pe(v: Optional[float]) -> Tuple[str, str]:
    if v is None or v <= 0:
        return "unknown", "無法評估"
    if v < 10:
        return "excellent", "極低估值，巴菲特偏好區間"
    if v < 20:
        return "good", "合理估值範圍"
    if v < 30:
        return "fair", "略高，需謹慎評估"
    return "poor", "高估，留意下行風險"


def _grade_pb(v: Optional[float]) -> Tuple[str, str]:
    if v is None or v <= 0:
        return "unknown", "無法評估"
    if v < 1.0:
        return "excellent", "低於淨值，絕佳安全邊際"
    if v < 3.0:
        return "good", "合理淨值倍數"
    if v < 5.0:
        return "fair", "估值偏高"
    return "poor", "明顯高估"


def _grade_ps(v: Optional[float]) -> Tuple[str, str]:
    if v is None or v <= 0:
        return "unknown", "無法評估"
    if v < 1.0:
        return "excellent", "極低，林區最愛的隱藏標的"
    if v < 2.0:
        return "good", "合理範圍"
    if v < 4.0:
        return "fair", "偏高"
    return "poor", "市場高估"


def _grade_peg(v: Optional[float]) -> Tuple[str, str]:
    if v is None or v <= 0:
        return "unknown", "無法評估"
    if v < 0.5:
        return "excellent", "林區: 嚴重低估的成長股"
    if v < 1.0:
        return "good", "林區: 低估，值得關注"
    if v < 2.0:
        return "fair", "林區: 成長合理反映於股價"
    return "poor", "林區: 成長股已高估"


def _grade_roe(v: Optional[float]) -> Tuple[str, str]:
    if v is None:
        return "unknown", "無法評估"
    pct = v * 100
    if pct >= 20:
        return "excellent", "巴菲特: 卓越護城河，持續超越同業"
    if pct >= 15:
        return "good", "巴菲特: 良好股東回報"
    if pct >= 10:
        return "fair", "一般水準"
    return "poor", "獲利能力不足"


def _grade_op_margin(v: Optional[float]) -> Tuple[str, str]:
    if v is None:
        return "unknown", "無法評估"
    pct = v * 100
    if pct >= 25:
        return "excellent", "強大競爭護城河"
    if pct >= 15:
        return "good", "良好盈利能力"
    if pct >= 5:
        return "fair", "一般"
    return "poor", "盈利能力薄弱"


def _grade_net_margin(v: Optional[float]) -> Tuple[str, str]:
    if v is None:
        return "unknown", "無法評估"
    pct = v * 100
    if pct >= 20:
        return "excellent", "高淨利率，強競爭優勢"
    if pct >= 10:
        return "good", "良好淨利"
    if pct >= 5:
        return "fair", "尚可接受"
    return "poor", "淨利率過低"


def _grade_roic(v: Optional[float]) -> Tuple[str, str]:
    if v is None:
        return "unknown", "無法評估"
    pct = v * 100
    if pct >= 15:
        return "excellent", "巴菲特: 資本配置效率極高，寬護城河"
    if pct >= 10:
        return "good", "資本回報良好"
    if pct >= 5:
        return "fair", "資本效率普通"
    return "poor", "資本回報低於資金成本，護城河薄弱"


def _grade_de(v: Optional[float]) -> Tuple[str, str]:
    if v is None or v < 0:
        return "unknown", "無法評估"
    if v < 0.3:
        return "excellent", "巴菲特: 幾乎無負債，財務堡壘"
    if v < 1.0:
        return "good", "財務穩健"
    if v < 2.0:
        return "fair", "負債偏高，需密切關注"
    return "poor", "高槓桿，財務風險顯著"


def _grade_current_ratio(v: Optional[float]) -> Tuple[str, str]:
    if v is None:
        return "unknown", "無法評估"
    if v >= 2.0:
        return "excellent", "流動性充裕"
    if v >= 1.5:
        return "good", "財務穩健"
    if v >= 1.0:
        return "fair", "勉強覆蓋流動負債"
    return "poor", "短期流動性不足，注意風險"


def _grade_interest_coverage(v: Optional[float]) -> Tuple[str, str]:
    if v is None:
        return "unknown", "無法評估"
    if v >= 10:
        return "excellent", "巴菲特: 利息保障極充足，財務安全"
    if v >= 5:
        return "good", "還息能力良好"
    if v >= 2:
        return "fair", "還息能力普通，需留意"
    return "poor", "利息保障不足，財務風險高"


def _grade_earnings_growth(v: Optional[float]) -> Tuple[str, str]:
    if v is None:
        return "unknown", "無法評估"
    pct = v * 100
    if pct >= 25:
        return "excellent", "林區: 高速成長股 (25%+)"
    if pct >= 15:
        return "good", "林區: 優質成長 (15%+)"
    if pct >= 5:
        return "fair", "溫和成長"
    if pct >= 0:
        return "fair", "低成長，持續觀察"
    return "poor", "盈利萎縮，警示訊號"


def _grade_revenue_growth(v: Optional[float]) -> Tuple[str, str]:
    if v is None:
        return "unknown", "無法評估"
    pct = v * 100
    if pct >= 20:
        return "excellent", "高速業務擴張"
    if pct >= 10:
        return "good", "穩健業務成長"
    if pct >= 0:
        return "fair", "溫和成長"
    return "poor", "營收衰退，基本面惡化"


def _latest(df, row: str) -> Optional[float]:
    if df is None or row not in df.index:
        return None
    val = df.loc[row].iloc[0]
    if val is None or (isinstance(val, float) and math.isnan(val)):
        return None
    return float(val)


def _make(value: Optional[float], grade: str, hint: str, label: str, fmt: str = "number") -> FundamentalMetric:
    if value is None:
        return FundamentalMetric(value=None, formatted="N/A", grade=grade, label=label, hint=hint)

    if fmt == "ratio":
        formatted = f"{value:.2f}x"
    elif fmt == "ratio1":
        formatted = f"{value:.1f}x"
    elif fmt == "percent":
        formatted = f"{value * 100:.1f}%"
    elif fmt == "peg":
        formatted = f"{value:.2f}"
    else:
        formatted = f"{value:.2f}"

    return FundamentalMetric(value=value, formatted=formatted, grade=grade, label=label, hint=hint)


def _compute_score(grades: list) -> Tuple[str, int]:
    pts = {"excellent": 2, "good": 1, "fair": 0, "poor": -1, "unknown": 0}
    total = sum(pts.get(g, 0) for g in grades)
    if total >= 10:
        return "strong_buy", total
    if total >= 5:
        return "buy", total
    if total >= 0:
        return "hold", total
    if total >= -5:
        return "sell", total
    return "strong_sell", total


def get_fundamentals(symbol: str) -> FundamentalsResponse:
    ticker = yf.Ticker(symbol)
    info = ticker.info

    pe_val = info.get("trailingPE")
    pb_val = info.get("priceToBook")
    ps_val = info.get("priceToSalesTrailing12Months")
    peg_val = info.get("pegRatio")
    roe_val = info.get("returnOnEquity")
    om_val = info.get("operatingMargins")
    pm_val = info.get("profitMargins")
    de_raw = info.get("debtToEquity")
    cr_val = info.get("currentRatio")
    eg_val = info.get("earningsGrowth")
    rg_val = info.get("revenueGrowth")

    # yfinance sometimes returns D/E in percentage form (e.g. 180 = 1.80x ratio)
    de_val = de_raw / 100.0 if (de_raw is not None and de_raw > 10) else de_raw

    try:
        financials = ticker.financials
        balance_sheet = ticker.balance_sheet
    except Exception:
        financials, balance_sheet = None, None

    ebit_val = _latest(financials, "EBIT")
    invested_capital_val = _latest(balance_sheet, "Invested Capital")
    tax_rate_val = _latest(financials, "Tax Rate For Calcs")
    interest_expense_val = _latest(financials, "Interest Expense")
    if interest_expense_val is None:
        interest_expense_val = _latest(financials, "Interest Expense Non Operating")

    roic_val = None
    if ebit_val is not None and invested_capital_val:
        tax_rate = tax_rate_val if tax_rate_val is not None else 0.21
        roic_val = (ebit_val * (1 - tax_rate)) / invested_capital_val

    interest_coverage_val = None
    if ebit_val is not None and interest_expense_val:
        interest_coverage_val = ebit_val / abs(interest_expense_val)

    pe_g, pe_h = _grade_pe(pe_val)
    pb_g, pb_h = _grade_pb(pb_val)
    ps_g, ps_h = _grade_ps(ps_val)
    peg_g, peg_h = _grade_peg(peg_val)
    roe_g, roe_h = _grade_roe(roe_val)
    om_g, om_h = _grade_op_margin(om_val)
    pm_g, pm_h = _grade_net_margin(pm_val)
    roic_g, roic_h = _grade_roic(roic_val)
    de_g, de_h = _grade_de(de_val)
    cr_g, cr_h = _grade_current_ratio(cr_val)
    ic_g, ic_h = _grade_interest_coverage(interest_coverage_val)
    eg_g, eg_h = _grade_earnings_growth(eg_val)
    rg_g, rg_h = _grade_revenue_growth(rg_val)

    score, pts = _compute_score(
        [pe_g, pb_g, ps_g, peg_g, roe_g, om_g, pm_g, roic_g, de_g, cr_g, ic_g, eg_g, rg_g]
    )

    return FundamentalsResponse(
        symbol=symbol.upper(),
        company_name=info.get("longName", symbol.upper()),
        sector=info.get("sector", "N/A"),
        industry=info.get("industry", "N/A"),
        current_price=info.get("currentPrice"),
        market_cap=info.get("marketCap"),
        pe_ratio=_make(pe_val, pe_g, pe_h, "本益比 P/E", "ratio1"),
        pb_ratio=_make(pb_val, pb_g, pb_h, "股價淨值比 P/B", "ratio"),
        ps_ratio=_make(ps_val, ps_g, ps_h, "股價營收比 P/S", "ratio"),
        peg_ratio=_make(peg_val, peg_g, peg_h, "PEG 比率", "peg"),
        roe=_make(roe_val, roe_g, roe_h, "股東權益報酬 ROE", "percent"),
        operating_margin=_make(om_val, om_g, om_h, "營業利潤率", "percent"),
        profit_margin=_make(pm_val, pm_g, pm_h, "淨利率", "percent"),
        roic=_make(roic_val, roic_g, roic_h, "投入資本回報 ROIC", "percent"),
        debt_to_equity=_make(de_val, de_g, de_h, "負債/股東權益", "ratio"),
        current_ratio=_make(cr_val, cr_g, cr_h, "流動比率", "ratio"),
        interest_coverage=_make(interest_coverage_val, ic_g, ic_h, "利息保障倍數", "ratio1"),
        earnings_growth=_make(eg_val, eg_g, eg_h, "盈利成長率 YoY", "percent"),
        revenue_growth=_make(rg_val, rg_g, rg_h, "營收成長率 YoY", "percent"),
        eps=info.get("trailingEps"),
        dividend_yield=info.get("dividendYield"),
        free_cashflow=info.get("freeCashflow"),
        target_mean_price=info.get("targetMeanPrice"),
        overall_score=score,
        score_points=pts,
    )
