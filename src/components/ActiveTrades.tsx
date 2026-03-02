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
  confidence: number;
  status: string;
  ai_reasoning: string;
  created_at: string;
}

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-6 text-center text-slate-400">
          Loading active trades...
        </CardContent>
      </Card>
    );
  }

  if (trades.length === 0) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Active Trades</CardTitle>
          <CardDescription className="text-slate-400">Currently open positions</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8 text-slate-400">
          No active trades. AI is analyzing markets for opportunities.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader>
        <CardTitle className="text-white">Active Trades</CardTitle>
        <CardDescription className="text-slate-400">
          {trades.length} position{trades.length !== 1 ? 's' : ''} currently open
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
                <TableHead className="text-slate-400">Entry</TableHead>
                <TableHead className="text-slate-400">SL/TP</TableHead>
                <TableHead className="text-slate-400">Confidence</TableHead>
                <TableHead className="text-slate-400">AI Reasoning</TableHead>
                <TableHead className="text-slate-400">Opened</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.map((trade) => (
                <TableRow key={trade.id} className="border-slate-800">
                  <TableCell className="font-medium text-white">{trade.symbol}</TableCell>
                  <TableCell>
                    <Badge variant={trade.action === 'BUY' ? 'default' : 'destructive'} className="bg-opacity-20">
                      {trade.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-300">${trade.volume.toFixed(2)}</TableCell>
                  <TableCell className="text-slate-300">${trade.entry_price.toFixed(2)}</TableCell>
                  <TableCell className="text-slate-300 text-sm">
                    <div>${trade.stop_loss.toFixed(2)}</div>
                    <div className="text-emerald-400">${trade.take_profit.toFixed(2)}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-full bg-slate-800 rounded-full h-2 max-w-[80px]">
                        <div
                          className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-2 rounded-full"
                          style={{ width: `${trade.confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-slate-400">{(trade.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-400 text-sm max-w-[250px] truncate">
                    {trade.ai_reasoning}
                  </TableCell>
                  <TableCell className="text-slate-400 text-sm">
                    {formatDate(trade.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
