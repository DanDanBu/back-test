import { useState } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { BacktestResult } from "./types/types";

export default function App() {
  const [symbol, setSymbol] = useState<string>("AAPL");
  const [shortWindow, setShortWindow] = useState<number>(20);
  const [longWindow, setLongWindow] = useState<number>(50);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await axios.get<BacktestResult>(
        "http://localhost:8000/backtest",
        {
          params: {
            symbol,
            short_window: shortWindow,
            long_window: longWindow,
          },
        }
      );
      setResult(res.data);
    } catch (err) {
      console.error(err);
      alert("API 請求錯誤或找不到資料");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-center">📈 股票回測系統</h1>

      <Card>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
          <div>
            <Label htmlFor="symbol">股票代碼</Label>
            <Input
              id="symbol"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="shortWindow">短期均線</Label>
            <Input
              id="shortWindow"
              type="number"
              value={shortWindow}
              onChange={(e) => setShortWindow(Number(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="longWindow">長期均線</Label>
            <Input
              id="longWindow"
              type="number"
              value={longWindow}
              onChange={(e) => setLongWindow(Number(e.target.value))}
            />
          </div>
          <div className="md:col-span-3 text-center">
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full md:w-auto"
            >
              {loading ? "回測中..." : "開始回測"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="text-xl font-medium">
              {result.symbol} 策略回測報酬率：
              <span className="text-green-600 font-bold ml-2">
                {(result.final_return * 100).toFixed(2)}%
              </span>
            </div>
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={result.history.map((v, i) => ({
                    date: i + 1,
                    value: v,
                  }))}
                >
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#8884d8"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
