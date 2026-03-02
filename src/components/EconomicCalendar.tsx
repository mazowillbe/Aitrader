import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface EconomicEvent {
  id: string;
  name: string;
  currency: string;
  impact: 'high' | 'medium' | 'low';
  forecast?: string;
  previous?: string;
  datetime: string;
  timestamp: number;
  isPast: boolean;
}

export function EconomicCalendar() {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
    const interval = setInterval(loadEvents, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const loadEvents = async () => {
    try {
      // Simulated events - in production, fetch from AI agent's calendar service
      const now = Date.now();
      const demoEvents: EconomicEvent[] = [
        {
          id: '1',
          name: 'Non-Farm Payrolls',
          currency: 'USD',
          impact: 'high',
          forecast: '185K',
          previous: '199K',
          datetime: new Date(now + 30 * 60 * 1000).toISOString(),
          timestamp: now + 30 * 60 * 1000,
          isPast: false
        },
        {
          id: '2',
          name: 'FOMC Statement',
          currency: 'USD',
          impact: 'high',
          forecast: '5.25%',
          previous: '5.25%',
          datetime: new Date(now + 2 * 60 * 60 * 1000).toISOString(),
          timestamp: now + 2 * 60 * 60 * 1000,
          isPast: false
        },
        {
          id: '3',
          name: 'ECB Interest Rate Decision',
          currency: 'EUR',
          impact: 'high',
          forecast: '4.50%',
          previous: '4.50%',
          datetime: new Date(now + 4 * 60 * 60 * 1000).toISOString(),
          timestamp: now + 4 * 60 * 60 * 1000,
          isPast: false
        },
        {
          id: '4',
          name: 'ISM Manufacturing PMI',
          currency: 'USD',
          impact: 'medium',
          forecast: '50.5',
          previous: '49.2',
          datetime: new Date(now + 6 * 60 * 60 * 1000).toISOString(),
          timestamp: now + 6 * 60 * 60 * 1000,
          isPast: false
        },
        {
          id: '5',
          name: 'CPI Release',
          currency: 'USD',
          impact: 'high',
          forecast: '3.2%',
          previous: '3.4%',
          datetime: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
          timestamp: now + 24 * 60 * 60 * 1000,
          isPast: false
        }
      ];

      setEvents(demoEvents);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getImpactColor = (impact: string): string => {
    switch (impact) {
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'low': return 'bg-green-500/20 text-green-400 border-green-500/50';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/50';
    }
  };

  const formatEventTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = timestamp - now;
    
    if (diff < 0) return 'Past';
    if (diff < 60 * 60 * 1000) {
      const minutes = Math.floor(diff / (60 * 1000));
      return `In ${minutes}m`;
    }
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      return `In ${hours}h`;
    }
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    return `In ${days}d`;
  };

  const getExactTime = (datetime: string): string => {
    const date = new Date(datetime);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const highImpactEvents = events.filter(e => e.impact === 'high' && !e.isPast);
  const nextHighImpact = highImpactEvents[0];
  const minutesToNext = nextHighImpact 
    ? Math.round((nextHighImpact.timestamp - Date.now()) / (60 * 1000))
    : null;

  if (loading) {
    return <div className="text-slate-400">Loading economic calendar...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Warning Banner for Imminent Events */}
      {minutesToNext !== null && minutesToNext < 60 && (
        <Card className="bg-red-900/20 border-red-500/50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              <div>
                <div className="font-bold text-red-400">
                  High-Impact Event in {minutesToNext} minutes
                </div>
                <div className="text-sm text-red-300">
                  {nextHighImpact?.name} ({nextHighImpact?.currency})
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Events List */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg">Upcoming Events</CardTitle>
          <CardDescription>Next 24 hours</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {events.slice(0, 6).map((event) => (
              <div 
                key={event.id}
                className={`p-3 rounded-lg border ${
                  event.impact === 'high' && !event.isPast
                    ? 'border-red-500/30 bg-red-900/10'
                    : 'border-slate-800 bg-slate-800/30'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="font-medium text-white text-sm">
                      {event.name}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {event.currency}
                      </Badge>
                      <Badge className={`text-xs ${getImpactColor(event.impact)}`}>
                        {event.impact.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${
                      event.impact === 'high' && !event.isPast 
                        ? 'text-red-400' 
                        : 'text-slate-400'
                    }`}>
                      {formatEventTime(event.timestamp)}
                    </div>
                    <div className="text-xs text-slate-500">
                      {getExactTime(event.datetime)}
                    </div>
                  </div>
                </div>
                
                {(event.forecast || event.previous) && (
                  <div className="flex gap-4 text-xs text-slate-400">
                    {event.forecast && (
                      <span>F: {event.forecast}</span>
                    )}
                    {event.previous && (
                      <span>P: {event.previous}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Risk Level Summary */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Event Risk Level</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${
              minutesToNext !== null && minutesToNext < 60
                ? 'bg-red-500 animate-pulse'
                : minutesToNext !== null && minutesToNext < 240
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
            }`} />
            <span className="text-slate-300">
              {minutesToNext !== null && minutesToNext < 60
                ? 'Critical - High impact event imminent'
                : minutesToNext !== null && minutesToNext < 240
                  ? 'High - Major event within 4 hours'
                  : 'Low - No immediate high-impact events'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
