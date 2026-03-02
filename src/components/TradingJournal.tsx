import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

interface JournalTrade {
  id: number;
  symbol: string;
  action: string;
  volume: number;
  entry_price: number;
  exit_price: number | null;
  stop_loss: number;
  take_profit: number;
  confidence: number;
  status: string;
  profit_loss: number | null;
  ai_reasoning: string;
  created_at: string;
  closed_at: string | null;
  market_regime: string | null;
  strategy_used: string | null;
  session: string | null;
  confluence_score: number | null;
  timeframe_alignment: string | null;
  economic_events: string | null;
  r_multiple: number | null;
  max_adverse_excursion: number | null;
  max_favorable_excursion: number | null;
  trailing_stop_active: number;
  breakeven_triggered: number;
}

const regimeColors: Record<string, string> = {
  TRENDING_UP: 'bg-emerald-500/20 text-emerald-400',
  TRENDING_DOWN: 'bg-red-500/20 text-red-400',
  RANGING: 'bg-yellow-500/20 text-yellow-400',
  VOLATILE: 'bg-orange-500/20 text-orange-400',
  BREAKOUT: 'bg-purple-500/20 text-purple-400'
};

const sessionColors: Record<string, string> = {
  ASIAN: 'bg-yellow-500/20 text-yellow-400',
  LONDON: 'bg-blue-500/20 text-blue-400',
  NEW_YORK: 'bg-purple-500/20 text-purple-400',
  LONDON_NY_OVERLAP: 'bg-emerald-500/20 text-emerald-400',
  OFF_HOURS: 'bg-slate-500/20 text-slate-400'
};

export function TradingJournal() {
  const [trades, setTrades] = useState<JournalTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const data = await api.getTradingJournal(50);
      setTrades(data);
      setIsLoading(false);
    } catch {
      setIsLoading(false);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (isLoading) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-6 text-center text-slate-400">Loading journal...</CardContent>
      </Card>
    );
  }

  if (trades.length === 0) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Trading Journal</CardTitle>
          <CardDescription className="text-slate-400">Detailed trade context and analytics</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8 text-slate-400">
          No trades recorded yet. The AI will begin trading soon.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-white">Trading Journal</CardTitle>
        <CardDescription className="text-slate-400">
          {trades.length} trade{trades.length !== 1 ? 's' : ''} • Click to expand details
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
          {trades.map((trade) => (
            <div
              key={trade.id}
              className="bg-slate-800/40 rounded-lg overflow-hidden cursor-pointer hover:bg-slate-800/60 transition-colors"
              onClick={() => setExpanded(expanded === trade.id ? null : trade.id)}
            >
              <div className="flex items-center gap-3 p-3">
                <div className="flex-shrink-0">
                  <Badge
                    variant={trade.action === 'BUY' ? 'default' : 'destructive'}
                    className="text-xs"
                  >
                    {trade.action}
                  </Badge>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white text-sm font-medium">{trade.symbol}</span>

                    {trade.market_regime && (
                      <Badge className={`text-xs ${regimeColors[trade.market_regime] || 'bg-slate-500/20 text-slate-400'}`}>
                        {trade.market_regime.replace('_', ' ')}
                      </Badge>
                    )}

                    {trade.session && (
                      <Badge className={`text-xs ${sessionColors[trade.session] || 'bg-slate-500/20 text-slate-400'}`}>
                        {trade.session.replace('_', ' ')}
                      </Badge>
                    )}

                    {trade.confluence_score && (
                      <span className="text-xs text-slate-500">
                        {(trade.confluence_score * 100).toFixed(0)}% conf.
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{formatDate(trade.created_at)}</div>
                </div>

                <div className="text-right flex-shrink-0">
                  {trade.profit_loss !== null ? (
                    <div className={`text-sm font-medium ${trade.profit_loss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {trade.profit_loss >= 0 ? '+' : ''}${trade.profit_loss.toFixed(2)}
                      {trade.r_multiple !== null && (
                        <span className="text-xs ml-1 opacity-70">
                          ({trade.r_multiple.toFixed(2)}R)
                        </span>
                      )}
                    </div>
                  ) : (
                    <Badge className="bg-blue-500/20 text-blue-400 text-xs">OPEN</Badge>
                  )}
                  <div className="text-xs text-slate-500">${trade.volume.toFixed(0)}</div>
                </div>
              </div>

              {expanded === trade.id && (
                <div className="px-3 pb-3 pt-0 border-t border-slate-700/50 space-y-2">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2">
                    <div>
                      <div className="text-xs text-slate-500">Entry</div>
                      <div className="text-xs text-white">${trade.entry_price.toFixed(4)}</div>
                    </div>
                    {trade.exit_price && (
                      <div>
                        <div className="text-xs text-slate-500">Exit</div>
                        <div className="text-xs text-white">${trade.exit_price.toFixed(4)}</div>
                      </div>
                    )}
                    <div>
                      <div className="text-xs text-slate-500">Stop Loss</div>
                      <div className="text-xs text-red-400">${trade.stop_loss.toFixed(4)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Take Profit</div>
                      <div className="text-xs text-emerald-400">${trade.take_profit.toFixed(4)}</div>
                    </div>
                  </div>

                  {(trade.max_adverse_excursion !== null || trade.max_favorable_excursion !== null) && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-xs text-slate-500">Max Adverse Excursion</div>
                        <div className="text-xs text-red-400">
                          ${trade.max_adverse_excursion?.toFixed(2) || '0.00'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Max Favorable Excursion</div>
                        <div className="text-xs text-emerald-400">
                          ${trade.max_favorable_excursion?.toFixed(2) || '0.00'}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {trade.strategy_used && (
                      <Badge className="text-xs bg-cyan-500/20 text-cyan-400">
                        {trade.strategy_used.replace('_', ' ')}
                      </Badge>
                    )}
                    {trade.timeframe_alignment && (
                      <Badge className="text-xs bg-slate-700 text-slate-300">
                        {trade.timeframe_alignment}
                      </Badge>
                    )}
                    {trade.trailing_stop_active > 0 && (
                      <Badge className="text-xs bg-purple-500/20 text-purple-400">TRAILING STOP</Badge>
                    )}
                    {trade.breakeven_triggered > 0 && (
                      <Badge className="text-xs bg-blue-500/20 text-blue-400">BREAKEVEN</Badge>
                    )}
                  </div>

                  {trade.economic_events && (
                    <div className="text-xs text-slate-500">
                      📅 Events at entry: {trade.economic_events}
                    </div>
                  )}

                  {trade.ai_reasoning && (
                    <div className="text-xs text-slate-400 bg-slate-800/60 rounded p-2">
                      <span className="text-slate-500">🤖 AI: </span>{trade.ai_reasoning}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
