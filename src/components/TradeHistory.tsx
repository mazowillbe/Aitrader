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
  exit_price: number;
  stop_loss: number;
  take_profit: number;
  confidence: number;
  status: string;
  profit_loss: number;
  ai_reasoning: string;
  created_at: string;
  closed_at: string;
}

export function TradeHistory() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTrades();
    const interval = setInterval(loadTrades, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadTrades = async () => {
    try {
      const data = await api.getTradeHistory(100);
      setTrades(data);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load trade history:', error);
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
          Loading trade history...
        </CardContent>
      </Card>
    );
  }

  if (trades.length === 0) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Trade History</CardTitle>
          <CardDescription className="text-slate-400">Past trades and their outcomes</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8 text-slate-400">
          No trade history yet. The AI agent will start trading soon.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader>
        <CardTitle className="text-white">Trade History</CardTitle>
        <CardDescription className="text-slate-400">
          Last {trades.length} trades
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
                <TableHead className="text-slate-400">Entry/Exit</TableHead>
                <TableHead className="text-slate-400">P/L</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-slate-400">Confidence</TableHead>
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
                  <TableCell className="text-slate-300 text-sm">
                    <div>${trade.entry_price?.toFixed(2)}</div>
                    {trade.exit_price && (
                      <div className="text-slate-400">${trade.exit_price.toFixed(2)}</div>
                    )}
                  </TableCell>
                  <TableCell className={trade.profit_loss >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                    {trade.profit_loss ? `$${trade.profit_loss.toFixed(2)}` : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={trade.status === 'OPEN' ? 'default' : 'secondary'}
                      className="bg-opacity-20"
                    >
                      {trade.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-400 text-sm">
                    {(trade.confidence * 100).toFixed(0)}%
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
