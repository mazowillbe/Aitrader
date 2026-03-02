import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';

export function AccountSummary() {
  const [balance, setBalance] = useState<any>(null);
  const [risk, setRisk] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [balanceData, riskData] = await Promise.all([
        api.getAccountBalance(),
        api.getRiskSummary()
      ]);
      setBalance(balanceData);
      setRisk(riskData);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load account data:', error);
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-6 text-center text-slate-400">
          Loading account data...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Account Balance */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Account Balance</CardTitle>
          <CardDescription className="text-slate-400">Current account status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Balance</span>
            <span className="text-2xl font-bold text-emerald-400">
              ${balance?.balance?.toLocaleString() || '0'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Equity</span>
            <span className="text-xl font-semibold text-white">
              ${balance?.equity?.toLocaleString() || '0'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Margin Used</span>
            <span className="text-lg text-slate-300">
              ${balance?.margin_used?.toFixed(2) || '0.00'}
            </span>
          </div>
          <div className="pt-4 border-t border-slate-800">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Daily Trades</span>
              <span className="text-lg text-cyan-400">
                {balance?.daily_trades || 0}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Management */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Risk Management</CardTitle>
          <CardDescription className="text-slate-400">Safety limits and usage</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-400">Daily Risk Used</span>
              <span className="text-sm text-slate-300">
                ${risk?.daily_risk_used?.toFixed(2) || '0'} / ${risk?.daily_risk_limit || '0'}
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-3">
              <div
                className={`h-3 rounded-full ${
                  (risk?.daily_risk_used / risk?.daily_risk_limit) > 0.8
                    ? 'bg-red-500'
                    : 'bg-gradient-to-r from-emerald-500 to-cyan-500'
                }`}
                style={{
                  width: `${Math.min((risk?.daily_risk_used / risk?.daily_risk_limit) * 100, 100)}%`
                }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-400">Max Trade Size</span>
              <span className="text-lg font-semibold text-white">
                ${risk?.max_trade_size || '0'}
              </span>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-400">Margin Available</span>
              <span className="text-lg font-semibold text-emerald-400">
                ${risk?.margin_available?.toFixed(2) || '0'}
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Daily Risk Remaining</span>
              <span className="text-lg text-cyan-400">
                ${risk?.daily_risk_remaining?.toFixed(2) || '0'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Configuration */}
      <Card className="bg-slate-900/50 border-slate-800 md:col-span-2">
        <CardHeader>
          <CardTitle className="text-white">AI Agent Configuration</CardTitle>
          <CardDescription className="text-slate-400">How the AI agent operates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="text-sm font-medium text-slate-400 mb-2">Decision Making</h4>
              <ul className="space-y-1 text-sm text-slate-300">
                <li>• Analyzes market data every 60 seconds</li>
                <li>• Uses technical + fundamental analysis</li>
                <li>• Filters fake news and manipulation</li>
                <li>• Only trades with confidence &gt; 60%</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium text-slate-400 mb-2">Risk Rules</h4>
              <ul className="space-y-1 text-sm text-slate-300">
                <li>• Stop loss: 2-5% from entry</li>
                <li>• Take profit: 1.5-3x risk</li>
                <li>• Max trade: ${risk?.max_trade_size || '1000'}</li>
                <li>• Daily risk limit: ${risk?.daily_risk_limit || '500'}</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium text-slate-400 mb-2">Autonomous Features</h4>
              <ul className="space-y-1 text-sm text-slate-300">
                <li>• No human confirmation required</li>
                <li>• Continuous market monitoring</li>
                <li>• Auto position sizing</li>
                <li>• Self-learning from outcomes</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
