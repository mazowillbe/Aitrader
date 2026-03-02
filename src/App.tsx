import { useEffect, useState } from 'react';
import { Card, CardHeader, CardDescription, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ActiveTrades } from './components/ActiveTrades';
import { TradeHistory } from './components/TradeHistory';
import { SystemLogs } from './components/SystemLogs';
import { AccountSummary } from './components/AccountSummary';
import { EquityCurve } from './components/EquityCurve';
import { TradingJournal } from './components/TradingJournal';
import { AIInsights } from './components/AIInsights';
import { EconomicCalendar } from './components/EconomicCalendar';
import { SessionClock } from './components/SessionClock';
import { MarketRegimeIndicator } from './components/MarketRegimeIndicator';
import { RiskMetrics } from './components/RiskMetrics';
import { api } from './lib/api';

function App() {
  const [config, setConfig] = useState<Record<string, unknown>>({}); 
  const [accountBalance, setAccountBalance] = useState<Record<string, number>>({});
  const [stats, setStats] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadInitialData();
    const interval = setInterval(loadInitialData, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadInitialData = async () => {
    try {
      const [configData, balanceData, statsData] = await Promise.all([
        api.getConfig(),
        api.getAccountBalance(),
        api.getTradeStats()
      ]);
      setConfig(configData);
      setAccountBalance(balanceData);
      setStats(statsData);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load data:', error);
      setIsLoading(false);
    }
  };

  const handleResetAccount = async () => {
    if (confirm('Are you sure you want to reset the account? This will close all trades and reset balance to $10,000.')) {
      try {
        await api.resetAccount();
        await loadInitialData();
      } catch (error) {
        console.error('Failed to reset account:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading Professional AI Trading System...</div>
      </div>
    );
  }

  const winRate = stats?.closed_trades > 0
    ? ((stats.winning_trades / stats.closed_trades) * 100).toFixed(1)
    : '0';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                Professional AI Trading System
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Multi-timeframe analysis • Regime detection • Active position management
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
                {config?.features && Object.entries(config.features)
                  .filter(([, v]) => v)
                  .slice(0, 3)
                  .map(([k]) => (
                    <span key={k} className="bg-slate-800 px-2 py-0.5 rounded text-slate-400">
                      ✓ {k.replace(/_/g, ' ')}
                    </span>
                  ))
                }
              </div>

              <Badge
                variant={config?.trading_mode === 'LIVE' ? 'destructive' : 'secondary'}
                className="text-sm px-3 py-1"
              >
                {config?.trading_mode || 'DEMO'} MODE
              </Badge>

              {config?.trading_mode === 'DEMO' && (
                <Button onClick={handleResetAccount} variant="outline" size="sm" className="border-slate-700">
                  Reset Account
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-400">Account Balance</CardDescription>
              <CardTitle className="text-3xl text-emerald-400">
                ${accountBalance?.balance?.toLocaleString() || '0'}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-400">Total P/L</CardDescription>
              <CardTitle className={`text-3xl ${(stats?.total_profit_loss || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                ${stats?.total_profit_loss?.toFixed(2) || '0.00'}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-400">Active Positions</CardDescription>
              <CardTitle className="text-3xl text-cyan-400">
                {stats?.open_trades || 0}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-400">Win Rate</CardDescription>
              <CardTitle className="text-3xl text-purple-400">
                {winRate}%
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <SessionClock />
          <MarketRegimeIndicator />
          <RiskMetrics />
        </div>

        <Tabs defaultValue="positions" className="space-y-4">
          <TabsList className="bg-slate-900/50 border border-slate-800 flex flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="positions" className="data-[state=active]:bg-slate-800 text-sm">
              Active Positions
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-slate-800 text-sm">
              Analytics
            </TabsTrigger>
            <TabsTrigger value="journal" className="data-[state=active]:bg-slate-800 text-sm">
              Journal
            </TabsTrigger>
            <TabsTrigger value="insights" className="data-[state=active]:bg-slate-800 text-sm">
              AI Insights
            </TabsTrigger>
            <TabsTrigger value="calendar" className="data-[state=active]:bg-slate-800 text-sm">
              Calendar
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-slate-800 text-sm">
              History
            </TabsTrigger>
            <TabsTrigger value="account" className="data-[state=active]:bg-slate-800 text-sm">
              Account
            </TabsTrigger>
            <TabsTrigger value="logs" className="data-[state=active]:bg-slate-800 text-sm">
              Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="positions">
            <ActiveTrades />
          </TabsContent>

          <TabsContent value="analytics">
            <EquityCurve />
          </TabsContent>

          <TabsContent value="journal">
            <TradingJournal />
          </TabsContent>

          <TabsContent value="insights">
            <AIInsights />
          </TabsContent>

          <TabsContent value="calendar">
            <EconomicCalendar />
          </TabsContent>

          <TabsContent value="history">
            <TradeHistory />
          </TabsContent>

          <TabsContent value="account">
            <AccountSummary />
          </TabsContent>

          <TabsContent value="logs">
            <SystemLogs />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t border-slate-800 mt-12 py-6">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-2 text-slate-400 text-sm">
            <p>
              🤖 AI Agent: <span className="text-emerald-400">Active</span> •
              🔬 Multi-Timeframe: <span className="text-cyan-400">Enabled</span> •
              📊 Regime Detection: <span className="text-purple-400">Active</span> •
              🛡️ Risk Management: <span className="text-yellow-400">Professional</span>
            </p>
            <p className="text-xs text-slate-500">
              For educational and demonstration purposes only. Not financial advice.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
