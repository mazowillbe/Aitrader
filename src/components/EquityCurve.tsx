import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { api } from '@/lib/api';

interface EquityPoint {
  date: string;
  equity: number;
  cumulative_pnl: number;
}

interface PerformanceMetrics {
  win_rate: number;
  avg_r_multiple: number;
  expectancy: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  profit_factor: number;
  max_drawdown: number;
  total_pnl: number;
  total_trades: number;
}

export function EquityCurve() {
  const [equityCurve, setEquityCurve] = useState<EquityPoint[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [curveData, perfData] = await Promise.all([
        api.getEquityCurve(30),
        api.getPerformanceMetrics(30)
      ]);
      setEquityCurve(curveData);
      setMetrics(perfData);
      setIsLoading(false);
    } catch {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatCurrency = (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const startingEquity = equityCurve[0]?.equity || 10000;

  return (
    <div className="space-y-4">
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <div className="text-slate-400 text-xs mb-1">Win Rate</div>
              <div className={`text-xl font-bold ${metrics.win_rate >= 0.5 ? 'text-emerald-400' : 'text-red-400'}`}>
                {(metrics.win_rate * 100).toFixed(1)}%
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <div className="text-slate-400 text-xs mb-1">Avg R-Multiple</div>
              <div className={`text-xl font-bold ${metrics.avg_r_multiple >= 1 ? 'text-emerald-400' : 'text-orange-400'}`}>
                {metrics.avg_r_multiple.toFixed(2)}R
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <div className="text-slate-400 text-xs mb-1">Sharpe Ratio</div>
              <div className={`text-xl font-bold ${metrics.sharpe_ratio >= 1 ? 'text-emerald-400' : 'text-yellow-400'}`}>
                {metrics.sharpe_ratio.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <div className="text-slate-400 text-xs mb-1">Profit Factor</div>
              <div className={`text-xl font-bold ${metrics.profit_factor >= 1.5 ? 'text-emerald-400' : 'text-orange-400'}`}>
                {metrics.profit_factor.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-white">Equity Curve</CardTitle>
          <CardDescription className="text-slate-400">Account equity over time (last 30 days)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-slate-400 text-center py-12">Loading equity data...</div>
          ) : equityCurve.length < 2 ? (
            <div className="text-center py-12">
              <p className="text-slate-400 text-sm">No trade history yet</p>
              <p className="text-slate-500 text-xs mt-1">Equity curve will appear after trades are closed</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={equityCurve.map((p) => ({ ...p, date: formatDate(p.date) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickFormatter={formatCurrency}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                  labelStyle={{ color: '#94a3b8' }}
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name === 'equity' ? 'Equity' : 'Cumulative P&L'
                  ]}
                />
                <ReferenceLine y={startingEquity} stroke="#475569" strokeDasharray="4 4" />
                <Line
                  type="monotone"
                  dataKey="equity"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#10b981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <div className="text-slate-400 text-xs mb-1">Total P&L</div>
              <div className={`text-lg font-bold ${metrics.total_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {metrics.total_pnl >= 0 ? '+' : ''}{formatCurrency(metrics.total_pnl)}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <div className="text-slate-400 text-xs mb-1">Expectancy</div>
              <div className={`text-lg font-bold ${metrics.expectancy >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {metrics.expectancy >= 0 ? '+' : ''}{formatCurrency(metrics.expectancy)}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <div className="text-slate-400 text-xs mb-1">Max Drawdown</div>
              <div className={`text-lg font-bold ${metrics.max_drawdown > 10 ? 'text-red-400' : 'text-orange-400'}`}>
                {metrics.max_drawdown.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <div className="text-slate-400 text-xs mb-1">Total Trades</div>
              <div className="text-lg font-bold text-white">{metrics.total_trades}</div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
