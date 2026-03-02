import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

interface InsightsData {
  recommendations: string[];
  confidence_adjustment: number;
  performance_summary: {
    win_rate: number;
    avg_r_multiple: number;
    expectancy: number;
    sharpe_ratio: number;
    consecutive_losses: number;
  };
}

interface SessionStat {
  session: string;
  total_trades: number;
  wins: number;
  total_pnl: number;
  avg_r_multiple: number;
}

const sessionLabels: Record<string, string> = {
  ASIAN: '🌏 Asian',
  LONDON: '🇬🇧 London',
  NEW_YORK: '🇺🇸 New York',
  LONDON_NY_OVERLAP: '🔥 LDN/NY Overlap',
  OFF_HOURS: '🌙 Off Hours'
};

export function AIInsights() {
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [sessionStats, setSessionStats] = useState<SessionStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [insightsData, sessionsData] = await Promise.all([
        api.getAIInsights(),
        api.getSessionStats()
      ]);
      setInsights(insightsData);
      setSessionStats(sessionsData);
      setIsLoading(false);
    } catch {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-6 text-center text-slate-400">Loading AI insights...</CardContent>
      </Card>
    );
  }

  const adjStr = insights?.confidence_adjustment
    ? `${insights.confidence_adjustment > 0 ? '+' : ''}${(insights.confidence_adjustment * 100).toFixed(0)}%`
    : '0%';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm">🤖 AI Self-Learning Recommendations</CardTitle>
            <CardDescription className="text-slate-400 text-xs">Based on recent trading performance</CardDescription>
          </CardHeader>
          <CardContent>
            {insights?.recommendations && insights.recommendations.length > 0 ? (
              <ul className="space-y-2">
                {insights.recommendations.map((rec) => (
                  <li key={rec} className="flex items-start gap-2 text-sm">
                    <span className="text-cyan-400 mt-0.5 flex-shrink-0">•</span>
                    <span className="text-slate-300">{rec}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-400 text-sm">
                Complete more trades to generate personalized AI recommendations.
              </p>
            )}

            {insights?.confidence_adjustment !== 0 && (
              <div className={`mt-4 p-2.5 rounded border text-sm ${
                (insights?.confidence_adjustment || 0) < 0
                  ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              }`}>
                Confidence threshold adjusted: {adjStr}
                {(insights?.confidence_adjustment || 0) < 0
                  ? ' (more conservative due to recent losses)'
                  : ' (more aggressive due to strong performance)'}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm">📊 Performance Summary</CardTitle>
            <CardDescription className="text-slate-400 text-xs">Last 30 days statistics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights?.performance_summary ? (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Win Rate</span>
                  <span className={`font-medium text-sm ${insights.performance_summary.win_rate >= 0.5 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {(insights.performance_summary.win_rate * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Avg R-Multiple</span>
                  <span className={`font-medium text-sm ${insights.performance_summary.avg_r_multiple >= 1 ? 'text-emerald-400' : 'text-orange-400'}`}>
                    {insights.performance_summary.avg_r_multiple.toFixed(2)}R
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Expectancy</span>
                  <span className={`font-medium text-sm ${insights.performance_summary.expectancy >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    ${insights.performance_summary.expectancy.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Sharpe Ratio</span>
                  <span className={`font-medium text-sm ${insights.performance_summary.sharpe_ratio >= 1 ? 'text-emerald-400' : 'text-yellow-400'}`}>
                    {insights.performance_summary.sharpe_ratio.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Consecutive Losses</span>
                  <div>
                    <Badge className={`text-xs ${
                      insights.performance_summary.consecutive_losses >= 3
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-slate-700 text-slate-300'
                    }`}>
                      {insights.performance_summary.consecutive_losses}
                    </Badge>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-slate-400 text-sm">No performance data yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm">🕐 Performance by Trading Session</CardTitle>
          <CardDescription className="text-slate-400 text-xs">Win rates and P&L across different market sessions</CardDescription>
        </CardHeader>
        <CardContent>
          {sessionStats.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">
              No session data yet. Trade history will populate this view.
            </p>
          ) : (
            <div className="space-y-2">
              {sessionStats.map((stat) => {
                const winRate = stat.total_trades > 0 ? stat.wins / stat.total_trades : 0;
                return (
                  <div key={stat.session} className="flex items-center gap-3 p-2.5 rounded bg-slate-800/40">
                    <div className="w-32 text-sm text-slate-300 flex-shrink-0">
                      {sessionLabels[stat.session] || stat.session}
                    </div>
                    <div className="flex-1">
                      <div className="w-full bg-slate-800 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${winRate >= 0.5 ? 'bg-emerald-500' : 'bg-red-500'}`}
                          style={{ width: `${winRate * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 space-y-0.5">
                      <div className={`text-xs font-medium ${winRate >= 0.5 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {(winRate * 100).toFixed(0)}% WR
                      </div>
                      <div className="text-xs text-slate-500">{stat.total_trades} trades</div>
                    </div>
                    <div className={`text-sm font-medium flex-shrink-0 w-16 text-right ${stat.total_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {stat.total_pnl >= 0 ? '+' : ''}${stat.total_pnl.toFixed(0)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
