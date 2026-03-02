import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';

interface RiskData {
  kelly_fraction: number;
  kelly_percent: string;
  portfolio_heat: number;
  portfolio_heat_percent: string;
  max_portfolio_heat: string;
  current_drawdown: number;
  max_drawdown: number;
  drawdown_protection_active: boolean;
}

export function RiskMetrics() {
  const [riskData, setRiskData] = useState<RiskData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const data = await api.getRiskMetrics();
      setRiskData(data);
      setIsLoading(false);
    } catch {
      setIsLoading(false);
    }
  };

  if (isLoading || !riskData) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-6 text-center text-slate-400 text-sm">Loading risk metrics...</CardContent>
      </Card>
    );
  }

  const heatPercent = riskData.portfolio_heat * 100;
  const maxHeatPercent = Number.parseFloat(riskData.max_portfolio_heat);

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-sm">🛡️ Professional Risk Metrics</CardTitle>
        <CardDescription className="text-slate-400 text-xs">Kelly criterion & portfolio heat management</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-slate-400 text-sm">Kelly Fraction</span>
            <div className="text-right">
              <span className="text-white text-sm font-medium">{riskData.kelly_percent}</span>
              <span className="text-slate-500 text-xs ml-1">of account</span>
            </div>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${Math.min(riskData.kelly_fraction * 400, 100)}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">Quarter-Kelly position sizing for risk reduction</p>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-slate-400 text-sm">Portfolio Heat</span>
            <div className="text-right">
              <span className={`text-sm font-medium ${heatPercent > maxHeatPercent * 0.8 ? 'text-orange-400' : 'text-white'}`}>
                {riskData.portfolio_heat_percent}
              </span>
              <span className="text-slate-500 text-xs ml-1">/ {riskData.max_portfolio_heat}</span>
            </div>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                heatPercent > maxHeatPercent * 0.8
                  ? 'bg-gradient-to-r from-orange-500 to-red-500'
                  : 'bg-gradient-to-r from-emerald-500 to-cyan-500'
              }`}
              style={{ width: `${Math.min((heatPercent / maxHeatPercent) * 100, 100)}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">Total risk exposure across all open positions</p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
          <div>
            <div className="text-slate-400 text-xs mb-0.5">Current Drawdown</div>
            <div className={`text-lg font-semibold ${riskData.current_drawdown > 5 ? 'text-orange-400' : 'text-white'}`}>
              {riskData.current_drawdown.toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-slate-400 text-xs mb-0.5">Max Drawdown</div>
            <div className={`text-lg font-semibold ${riskData.max_drawdown > 10 ? 'text-red-400' : 'text-slate-300'}`}>
              {riskData.max_drawdown.toFixed(1)}%
            </div>
          </div>
        </div>

        {riskData.drawdown_protection_active && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded p-2.5">
            <p className="text-orange-400 text-xs font-medium">⚠️ Drawdown Protection Active</p>
            <p className="text-slate-400 text-xs mt-0.5">Position sizes automatically reduced due to current drawdown</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
