import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ActiveTrades } from './components/ActiveTrades';
import { TradeHistory } from './components/TradeHistory';
import { SystemLogs } from './components/SystemLogs';
import { AccountSummary } from './components/AccountSummary';
import { PerformanceDashboard } from './components/PerformanceDashboard';
import { RiskMetrics } from './components/RiskMetrics';
import { SessionClock } from './components/SessionClock';
import { EconomicCalendar } from './components/EconomicCalendar';
import { api } from './lib/api';

function App() {
  const [config, setConfig] = useState<any>(null);
  const [accountBalance, setAccountBalance] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [features, setFeatures] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadInitialData();

    // Refresh data every 10 seconds
    const interval = setInterval(loadInitialData, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadInitialData = async () => {
    try {
      const [configData, balanceData, statsData, featuresData] = await Promise.all([
        api.getConfig(),
        api.getAccountBalance(),
        api.getTradeStats(),
        fetch('http://localhost:3001/api/features').then(r => r.json())
      ]);

      setConfig(configData);
      setAccountBalance(balanceData);
      setStats(statsData);
      setFeatures(featuresData.features);
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
        <div className="text-white text-xl">Loading AI Trading System...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                AI Trading System
              </h1>
              <p className="text-sm text-slate-400 mt-1">Professional autonomous trading powered by Gemini 3.1</p>
            </div>

            <div className="flex items-center gap-4">
              {/* Feature Status Badges */}
              <div className="hidden md:flex items-center gap-2">
                {features?.enableRegimeDetection && (
                  <Badge variant="outline" className="text-xs border-purple-500/50 text-purple-400">
                    Regime Detection
                  </Badge>
                )}
                {features?.enablePositionManagement && (
                  <Badge variant="outline" className="text-xs border-blue-500/50 text-blue-400">
                    Position Management
                  </Badge>
                )}
              </div>

              <Badge variant={config?.trading_mode === 'LIVE' ? 'destructive' : 'secondary'} className="text-sm px-3 py-1">
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

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Account Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
              <CardTitle className={`text-3xl ${stats?.total_profit_loss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                ${stats?.total_profit_loss?.toFixed(2) || '0.00'}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-400">Active Trades</CardDescription>
              <CardTitle className="text-3xl text-cyan-400">
                {stats?.open_trades || 0}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-400">Win Rate</CardDescription>
              <CardTitle className="text-3xl text-purple-400">
                {stats?.closed_trades > 0
                  ? `${((stats.winning_trades / stats.closed_trades) * 100).toFixed(1)}%`
                  : '0%'
                }
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Session & Economic Calendar Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          <div className="lg:col-span-1">
            <SessionClock />
          </div>
          <div className="lg:col-span-2">
            <EconomicCalendar />
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="active" className="space-y-4">
          <TabsList className="bg-slate-900/50 border border-slate-800 flex-wrap h-auto">
            <TabsTrigger value="active" className="data-[state=active]:bg-slate-800">
              Active Trades
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-slate-800">
              History
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-slate-800">
              Analytics
            </TabsTrigger>
            <TabsTrigger value="risk" className="data-[state=active]:bg-slate-800">
              Risk
            </TabsTrigger>
            <TabsTrigger value="account" className="data-[state=active]:bg-slate-800">
              Account
            </TabsTrigger>
            <TabsTrigger value="logs" className="data-[state=active]:bg-slate-800">
              System Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <ActiveTrades />
          </TabsContent>

          <TabsContent value="history">
            <TradeHistory />
          </TabsContent>

          <TabsContent value="analytics">
            <PerformanceDashboard />
          </TabsContent>

          <TabsContent value="risk">
            <RiskMetrics />
          </TabsContent>

          <TabsContent value="account">
            <AccountSummary />
          </TabsContent>

          <TabsContent value="logs">
            <SystemLogs />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-12 py-6">
        <div className="container mx-auto px-6 text-center text-slate-400 text-sm">
          <p>🤖 AI Agent Status: <span className="text-emerald-400">Active</span> • Professional autonomous trading with multi-timeframe analysis</p>
          <p className="mt-2 text-xs text-slate-500">
            For educational and demonstration purposes only. Not financial advice.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
