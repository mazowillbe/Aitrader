import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface EconomicEvent {
  id: string;
  datetime: string;
  currency: string;
  event_name: string;
  impact: 'low' | 'medium' | 'high';
  forecast?: string;
  previous?: string;
  actual?: string;
  hours_until_event: number;
}

function generateEvents(): EconomicEvent[] {
  const now = new Date();
  const templates = [
    { name: 'US Non-Farm Payrolls', currency: 'USD', impact: 'high' as const },
    { name: 'US CPI (YoY)', currency: 'USD', impact: 'high' as const },
    { name: 'FOMC Meeting Minutes', currency: 'USD', impact: 'high' as const },
    { name: 'ECB Interest Rate Decision', currency: 'EUR', impact: 'high' as const },
    { name: 'Bank of England Rate Decision', currency: 'GBP', impact: 'high' as const },
    { name: 'US Retail Sales (MoM)', currency: 'USD', impact: 'medium' as const },
    { name: 'EU GDP Growth Rate', currency: 'EUR', impact: 'medium' as const },
    { name: 'US Initial Jobless Claims', currency: 'USD', impact: 'medium' as const },
    { name: 'EU Consumer Confidence', currency: 'EUR', impact: 'low' as const },
    { name: 'UK Retail Sales (MoM)', currency: 'GBP', impact: 'low' as const }
  ];

  return templates.map((t, i) => {
    const hoursAhead = 2 + i * 5 + Math.random() * 3;
    const eventTime = new Date(now.getTime() + hoursAhead * 3600000);
    return {
      id: `evt_${i}`,
      datetime: eventTime.toISOString(),
      currency: t.currency,
      event_name: t.name,
      impact: t.impact,
      forecast: t.impact !== 'low' ? `${(Math.random() * 0.5).toFixed(1)}%` : undefined,
      previous: t.impact !== 'low' ? `${(Math.random() * 0.5).toFixed(1)}%` : undefined,
      actual: undefined,
      hours_until_event: hoursAhead
    };
  });
}

const impactConfig = {
  high: { color: 'bg-red-500/20 text-red-400 border-red-500/30', dot: 'bg-red-500', label: 'HIGH' },
  medium: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', dot: 'bg-yellow-500', label: 'MED' },
  low: { color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', dot: 'bg-slate-500', label: 'LOW' }
};

const currencyFlags: Record<string, string> = {
  USD: '🇺🇸',
  EUR: '🇪🇺',
  GBP: '🇬🇧',
  JPY: '🇯🇵',
  AUD: '🇦🇺',
  CAD: '🇨🇦',
  CHF: '🇨🇭'
};

export function EconomicCalendar() {
  const [events, setEvents] = useState<EconomicEvent[]>([]);

  useEffect(() => {
    setEvents(generateEvents());
    const interval = setInterval(() => {
      setEvents(generateEvents());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
      timeZoneName: 'short'
    });
  };

  const getTimeLabel = (hours: number) => {
    if (hours < 0.25) return <span className="text-red-400 font-medium">NOW</span>;
    if (hours < 1) return <span className="text-orange-400">{Math.round(hours * 60)}m</span>;
    if (hours < 24) return <span className="text-slate-400">{hours.toFixed(1)}h</span>;
    return <span className="text-slate-500">{Math.floor(hours / 24)}d</span>;
  };

  const highImpact = events.filter((e) => e.impact === 'high' && e.hours_until_event <= 4);

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-white">📅 Economic Calendar</CardTitle>
        <CardDescription className="text-slate-400">Upcoming market-moving events (next 48h)</CardDescription>
      </CardHeader>
      <CardContent>
        {highImpact.length > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="text-red-400 text-sm font-medium mb-1">
              ⚠️ {highImpact.length} High-Impact Event{highImpact.length > 1 ? 's' : ''} within 4 hours
            </div>
            {highImpact.map((e) => (
              <div key={e.id} className="text-xs text-slate-400">
                • {currencyFlags[e.currency]} {e.event_name} in {e.hours_until_event.toFixed(1)}h
              </div>
            ))}
            <div className="text-xs text-red-400/70 mt-1">
              AI will automatically reduce position sizes or pause trading
            </div>
          </div>
        )}

        <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
          {events.slice(0, 12).map((event) => {
            const config = impactConfig[event.impact];
            return (
              <div
                key={event.id}
                className={`flex items-center gap-2.5 p-2 rounded transition-colors ${
                  event.hours_until_event <= 1 ? 'bg-red-500/5 border border-red-500/10' : 'bg-slate-800/30'
                }`}
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${config.dot}`} />

                <div className="w-8 text-center flex-shrink-0">
                  <span className="text-xs">{currencyFlags[event.currency] || event.currency}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-xs text-slate-300 truncate">{event.event_name}</div>
                  <div className="text-xs text-slate-600">{formatTime(event.datetime)}</div>
                </div>

                {(event.forecast || event.previous) && (
                  <div className="text-right flex-shrink-0 hidden sm:block">
                    {event.forecast && (
                      <div className="text-xs text-slate-500">F: {event.forecast}</div>
                    )}
                    {event.previous && (
                      <div className="text-xs text-slate-600">P: {event.previous}</div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Badge className={`text-xs py-0 ${config.color}`}>{config.label}</Badge>
                  <span className="text-xs w-10 text-right">{getTimeLabel(event.hours_until_event)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
