import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface RiskMetrics {
  kellyFraction: number;
  kellyAdjusted: number;
  portfolioHeat: number;
  maxPortfolioHeat: number;
  currentDrawdown: number;
  maxDrawdown: number;
  dailyRiskUsed: number;
  dailyRiskLimit: number;
  correlationRisk: number;
  volatilityAdjustment: number;
}

export function RiskMetrics() {
  const [metrics, setMetrics] = useState<RiskMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadMetrics = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/analytics/risk');
      const data = await response.json();
      if (data.success) {
        setMetrics(data.metrics);
      }
    } catch (error) {
      console.error('Failed to load risk metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-slate-400">Loading risk metrics...</div>;
  }

  if (!metrics) {
    return <div className="text-slate-400">No risk data available</div>;
  }

  const portfolioHeatPercent = (metrics.portfolioHeat / metrics.maxPortfolioHeat) * 100;
  const drawdownPercent = metrics.currentDrawdown * 100;
  const dailyRiskPercent = (metrics.dailyRiskUsed / metrics.dailyRiskLimit) * 100;

  return (
    <div className="space-y-6">
      {/* Risk Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Portfolio Heat</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white mb-2">
              {(metrics.portfolioHeat * 100).toFixed(1)}%
            </div>
            <Progress 
              value={portfolioHeatPercent} 
              className={`h-2 ${portfolioHeatPercent > 80 ? 'bg-red-900' : portfolioHeatPercent > 60 ? 'bg-yellow-900' : 'bg-slate-700'}`}
            />
            <div className="text-xs text-slate-500 mt-1">
              Max: {(metrics.maxPortfolioHeat * 100).toFixed(0)}%
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Current Drawdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${metrics.currentDrawdown > 0.1 ? 'text-red-400' : 'text-yellow-400'}`}>
              {drawdownPercent.toFixed(1)}%
            </div>
            <Progress 
              value={drawdownPercent} 
              className={`h-2 ${drawdownPercent > 15 ? 'bg-red-900' : drawdownPercent > 10 ? 'bg-yellow-900' : 'bg-slate-700'}`}
            />
            <div className="text-xs text-slate-500 mt-1">
              Max: {(metrics.maxDrawdown * 100).toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Daily Risk Used</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              ${metrics.dailyRiskUsed.toFixed(2)}
            </div>
            <Progress 
              value={dailyRiskPercent} 
              className={`h-2 ${dailyRiskPercent > 80 ? 'bg-red-900' : dailyRiskPercent > 60 ? 'bg-yellow-900' : 'bg-slate-700'}`}
            />
            <div className="text-xs text-slate-500 mt-1">
              Limit: ${metrics.dailyRiskLimit.toFixed(0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kelly Criterion */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg">Kelly Criterion Sizing</CardTitle>
          <CardDescription>Optimal position size based on win rate and reward/risk</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-slate-400 text-sm">Raw Kelly Fraction</span>
              <div className="text-xl font-bold text-white">
                {(metrics.kellyFraction * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <span className="text-slate-400 text-sm">Adjusted (Quarter Kelly)</span>
              <div className="text-xl font-bold text-emerald-400">
                {(metrics.kellyAdjusted * 100).toFixed(1)}%
              </div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-slate-800/50 rounded text-sm text-slate-400">
            💡 Using quarter Kelly for safety. Position sizes are capped at {(metrics.kellyAdjusted * 100).toFixed(0)}% of account.
          </div>
        </CardContent>
      </Card>

      {/* Volatility Adjustment */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg">Volatility Adjustment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Position Size Multiplier</span>
            <span className={`text-xl font-bold ${
              metrics.volatilityAdjustment < 0.8 ? 'text-red-400' : 
              metrics.volatilityAdjustment > 1.2 ? 'text-emerald-400' : 'text-white'
            }`}>
              {(metrics.volatilityAdjustment * 100).toFixed(0)}%
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-2">
            {metrics.volatilityAdjustment < 0.8 
              ? '⚠️ High volatility - position sizes reduced' 
              : metrics.volatilityAdjustment > 1.2 
                ? '✅ Low volatility - position sizes increased' 
                : 'Normal volatility conditions'}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
