import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

interface Log {
  id: number;
  level: string;
  category: string;
  message: string;
  data: string;
  created_at: string;
}

export function SystemLogs() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 3000);
    return () => clearInterval(interval);
  }, [filter]);

  const loadLogs = async () => {
    try {
      const category = filter === 'all' ? undefined : filter;
      const data = await api.getLogs(100, category);
      setLogs(data);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load logs:', error);
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString();
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'warn': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'info': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'trade': return 'bg-emerald-500/20 text-emerald-400';
      case 'ai': return 'bg-purple-500/20 text-purple-400';
      case 'system': return 'bg-cyan-500/20 text-cyan-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-6 text-center text-slate-400">
          Loading system logs...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white">System Logs</CardTitle>
            <CardDescription className="text-slate-400">
              Real-time activity and AI decisions
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded text-sm ${
                filter === 'all'
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('ai')}
              className={`px-3 py-1 rounded text-sm ${
                filter === 'ai'
                  ? 'bg-purple-500/30 text-purple-400'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              AI
            </button>
            <button
              onClick={() => setFilter('trade')}
              className={`px-3 py-1 rounded text-sm ${
                filter === 'trade'
                  ? 'bg-emerald-500/30 text-emerald-400'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Trades
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {logs.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              No logs yet. System activity will appear here.
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
              >
                <div className="flex-shrink-0 pt-0.5">
                  <Badge className={getLevelColor(log.level)}>
                    {log.level.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex-shrink-0">
                  <Badge className={getCategoryColor(log.category)}>
                    {log.category.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">{log.message}</p>
                  {log.data && (
                    <pre className="text-xs text-slate-400 mt-1 overflow-x-auto">
                      {typeof log.data === 'string' ? log.data : JSON.stringify(JSON.parse(log.data), null, 2)}
                    </pre>
                  )}
                </div>
                <div className="flex-shrink-0 text-xs text-slate-500">
                  {formatDate(log.created_at)}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
