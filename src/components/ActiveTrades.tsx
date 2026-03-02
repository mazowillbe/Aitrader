import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

interface Trade {
  id: number;
  symbol: string;
  action: string;
  volume: number;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  current_stop_price: number | null;
  confidence: number;
  status: string;
  ai_reasoning: string;
  created_at: string;
  market_regime: string | null;
  strategy_used: string | null;
  session: string | null;
  confluence_score: number | null;
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

export function ActiveTrades() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTrades();
    const interval = setInterval(loadTrades, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadTrades = async () => {
    try {
      const data = await api.getActiveTrades();
      setTrades(data);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load active trades:', error);
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleString();

  if (isLoading) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-6 text-center text-slate-400">Loading active trades...</CardContent>
      </Card>
    );
  }

  if (trades.length === 0) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Active Positions</CardTitle>
          <CardDescription className="text-slate-400">Currently open positions with live management</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8 text-slate-400">
          No active positions. AI is analyzing markets for professional trade setups.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader>
        <CardTitle className="text-white">Active Positions</CardTitle>
        <CardDescription className="text-slate-400">
          {trades.length} position{trades.length !== 1 ? 's' : ''} • Auto-managed with trailing stops & breakeven
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800">
                <TableHead className="text-slate-400">Symbol</TableHead>
                <TableHead className="text-slate-400">Action</TableHead>
                <TableHead className="text-slate-400">Volume</TableHead>
                <TableHead className="text-slate-400">Entry / Stop / TP</TableHead>
                <TableHead className="text-slate-400">Regime</TableHead>
                <TableHead className="text-slate-400">Session</TableHead>
                <TableHead className="text-slate-400">Confluence</TableHead>
                <TableHead className="text-slate-400">Features</TableHead>
                <TableHead className="text-slate-400">Opened</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.map((trade) => (
                <TableRow key={trade.id} className="border-slate-800">
                  <TableCell className="font-medium text-white">{trade.symbol}</TableCell>
                  <TableCell>
                    <Badge variant={trade.action === 'BUY' ? 'default' : 'destructive'}>
                      {trade.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-300">${trade.volume.toFixed(2)}</TableCell>
                  <TableCell className="text-slate-300 text-xs">
                    <div>E: ${trade.entry_price.toFixed(4)}</div>
                    <div className="text-red-400">
                      SL: ${(trade.current_stop_price || trade.stop_loss).toFixed(4)}
                    </div>
                    <div className="text-emerald-400">TP: ${trade.take_profit.toFixed(4)}</div>
                  </TableCell>
                  <TableCell>
                    {trade.market_regime ? (
                      <Badge className={`text-xs ${regimeColors[trade.market_regime] || 'bg-slate-700 text-slate-300'}`}>
                        {trade.market_regime.replace('_', ' ')}
                      </Badge>
                    ) : (
                      <span className="text-slate-600 text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {trade.session ? (
                      <span className="text-slate-400 text-xs">{trade.session.replace('_', ' ')}</span>
                    ) : (
                      <span className="text-slate-600 text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {trade.confluence_score !== null ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 bg-slate-800 rounded-full h-1.5">
                          <div
                            className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-1.5 rounded-full"
                            style={{ width: `${(trade.confluence_score || 0) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-400">
                          {((trade.confluence_score || 0) * 100).toFixed(0)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-600 text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {trade.trailing_stop_active > 0 && (
                        <Badge className="text-xs bg-purple-500/20 text-purple-400 py-0">Trail</Badge>
                      )}
                      {trade.breakeven_triggered > 0 && (
                        <Badge className="text-xs bg-blue-500/20 text-blue-400 py-0">BE</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-400 text-xs">{formatDate(trade.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
