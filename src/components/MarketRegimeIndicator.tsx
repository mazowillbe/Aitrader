import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

interface RegimeStat {
  market_regime: string;
  total_trades: number;
  wins: number;
  total_pnl: number;
  avg_r_multiple: number;
}

const regimeConfig: Record<string, { color: string; icon: string; description: string }> = {
  TRENDING_UP: { color: 'text-emerald-400 bg-emerald-500/20', icon: '📈', description: 'Strong upward trend - use trend following' },
  TRENDING_DOWN: { color: 'text-red-400 bg-red-500/20', icon: '📉', description: 'Strong downward trend - use trend following' },
  RANGING: { color: 'text-yellow-400 bg-yellow-500/20', icon: '↔️', description: 'Sideways market - use mean reversion' },
  VOLATILE: { color: 'text-orange-400 bg-orange-500/20', icon: '⚡', description: 'High volatility - reduce size or avoid' },
  BREAKOUT: { color: 'text-purple-400 bg-purple-500/20', icon: '🚀', description: 'Breakout forming - use momentum entry' }
};

export function MarketRegimeIndicator() {
  const [regimeStats, setRegimeStats] = useState<RegimeStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const data = await api.getRegimeStats();
      setRegimeStats(data);
      setIsLoading(false);
    } catch {
      setIsLoading(false);
    }
  };

  const allRegimes = Object.keys(regimeConfig);

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-sm">📊 Market Regime Performance</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-slate-400 text-sm text-center py-4">Loading regime data...</div>
        ) : (
          <div className="space-y-2">
            {allRegimes.map((regime) => {
              const stat = regimeStats.find((s) => s.market_regime === regime);
              const config = regimeConfig[regime];
              const winRate = stat && stat.total_trades > 0 ? stat.wins / stat.total_trades : null;

              return (
                <div key={regime} className="flex items-center gap-3 p-2 rounded bg-slate-800/40">
                  <span className="text-base">{config.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${config.color}`}>{regime.replace('_', ' ')}</Badge>
                      {winRate !== null && (
                        <span className={`text-xs ${winRate >= 0.5 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {(winRate * 100).toFixed(0)}% WR
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 truncate">{config.description}</div>
                  </div>
                  {stat ? (
                    <div className="text-right flex-shrink-0">
                      <div className={`text-xs font-medium ${stat.total_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {stat.total_pnl >= 0 ? '+' : ''}{stat.total_pnl.toFixed(0)}
                      </div>
                      <div className="text-xs text-slate-500">{stat.total_trades} trades</div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-600">No data</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
