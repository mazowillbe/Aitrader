import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

interface PerformanceMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  expectancy: number;
  profitFactor: number;
  sharpeRatio: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  avgRMultiple: number;
  bestTrade: number;
  worstTrade: number;
  maxDrawdown: number;
}

export function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadMetrics = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/analytics/performance');
      const data = await response.json();
      if (data.success) {
        setMetrics(data.metrics);
      }
    } catch (error) {
      console.error('Failed to load metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-slate-400">Loading performance metrics...</div>;
  }

  if (!metrics) {
    return <div className="text-slate-400">No performance data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Win Rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${metrics.winRate >= 0.5 ? 'text-emerald-400' : 'text-red-400'}`}>
              {(metrics.winRate * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {metrics.winningTrades}W / {metrics.losingTrades}L
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Profit Factor</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${metrics.profitFactor >= 1 ? 'text-emerald-400' : 'text-red-400'}`}>
              {metrics.profitFactor.toFixed(2)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {metrics.profitFactor >= 1 ? 'Profitable' : 'Unprofitable'}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Avg R-Multiple</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${metrics.avgRMultiple >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {metrics.avgRMultiple.toFixed(2)}R
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Best: {metrics.bestTrade.toFixed(2)}R
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Sharpe Ratio</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${metrics.sharpeRatio >= 1 ? 'text-emerald-400' : 'text-yellow-400'}`}>
              {metrics.sharpeRatio.toFixed(2)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {metrics.sharpeRatio >= 1 ? 'Good' : metrics.sharpeRatio >= 0 ? 'Acceptable' : 'Poor'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg">Trade Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-400">Total Trades</span>
              <span className="text-white font-medium">{metrics.totalTrades}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Expectancy</span>
              <span className={`font-medium ${metrics.expectancy >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                ${metrics.expectancy.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Average Win</span>
              <span className="text-emerald-400">${metrics.avgWin.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Average Loss</span>
              <span className="text-red-400">-${Math.abs(metrics.avgLoss).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Max Drawdown</span>
              <span className="text-red-400">{(metrics.maxDrawdown * 100).toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg">Streaks & Records</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-400">Max Consecutive Wins</span>
              <span className="text-emerald-400 font-medium">{metrics.maxConsecutiveWins}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Max Consecutive Losses</span>
              <span className="text-red-400 font-medium">{metrics.maxConsecutiveLosses}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Best Trade</span>
              <span className="text-emerald-400">{metrics.bestTrade.toFixed(2)}R</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Worst Trade</span>
              <span className="text-red-400">{metrics.worstTrade.toFixed(2)}R</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
