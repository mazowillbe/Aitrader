import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SessionInfo {
  current: string;
  next: string;
  minutesToNext: number;
  isOverlap: boolean;
  volatilityRating: 'low' | 'medium' | 'high' | 'very_high';
  liquidityRating: 'low' | 'medium' | 'high' | 'very_high';
  recommendedStrategies: string[];
  activeMarkets: string[];
}

export function SessionClock() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const updateTime = () => {
    setCurrentTime(new Date());
    calculateSession();
  };

  const calculateSession = () => {
    const utcHour = new Date().getUTCHours();
    const utcMinute = new Date().getUTCMinutes();

    // Session definitions (UTC hours)
    const sessions = {
      asian: { start: 0, end: 9, name: 'Asian', markets: ['Tokyo', 'Sydney', 'Hong Kong'] },
      london: { start: 8, end: 17, name: 'London', markets: ['London', 'Frankfurt'] },
      new_york: { start: 13, end: 22, name: 'New York', markets: ['New York', 'Chicago'] },
      london_ny_overlap: { start: 13, end: 17, name: 'London-NY Overlap', markets: ['London', 'New York'] }
    };

    let current: string;
    let volatilityRating: 'low' | 'medium' | 'high' | 'very_high';
    let liquidityRating: 'low' | 'medium' | 'high' | 'very_high';

    // Determine current session
    if (utcHour >= sessions.london_ny_overlap.start && utcHour < sessions.london_ny_overlap.end) {
      current = 'london_ny_overlap';
      volatilityRating = 'very_high';
      liquidityRating = 'very_high';
    } else if (utcHour >= sessions.asian.start && utcHour < sessions.asian.end) {
      current = 'asian';
      volatilityRating = 'low';
      liquidityRating = 'medium';
    } else if (utcHour >= sessions.london.start && utcHour < sessions.london.end) {
      current = 'london';
      volatilityRating = 'high';
      liquidityRating = 'high';
    } else if (utcHour >= sessions.new_york.start && utcHour < sessions.new_york.end) {
      current = 'new_york';
      volatilityRating = 'high';
      liquidityRating = 'high';
    } else {
      current = 'closed';
      volatilityRating = 'low';
      liquidityRating = 'low';
    }

    // Determine next session
    let next: string;
    let minutesToNext: number;

    if (current === 'closed') {
      if (utcHour < sessions.asian.start) {
        next = 'asian';
        minutesToNext = (sessions.asian.start - utcHour) * 60 - utcMinute;
      } else if (utcHour < sessions.london.start) {
        next = 'london';
        minutesToNext = (sessions.london.start - utcHour) * 60 - utcMinute;
      } else {
        next = 'asian';
        minutesToNext = ((24 - utcHour) + sessions.asian.start) * 60 - utcMinute;
      }
    } else {
      const sessionOrder = ['asian', 'london', 'london_ny_overlap', 'new_york'];
      const currentIndex = sessionOrder.indexOf(current);
      next = sessionOrder[(currentIndex + 1) % sessionOrder.length] || 'asian';
      
      // Calculate minutes to next session
      const nextSession = sessions[next as keyof typeof sessions];
      if (nextSession.start > utcHour) {
        minutesToNext = (nextSession.start - utcHour) * 60 - utcMinute;
      } else {
        minutesToNext = ((24 - utcHour) + nextSession.start) * 60 - utcMinute;
      }
    }

    // Recommended strategies by session
    const strategyMap: Record<string, string[]> = {
      'london_ny_overlap': ['breakout', 'momentum', 'trend_following'],
      'london': ['breakout', 'momentum', 'trend_following'],
      'new_york': ['momentum', 'trend_following', 'swing_trading'],
      'asian': ['range_trading', 'mean_reversion'],
      'closed': []
    };

    const activeMarketsMap: Record<string, string[]> = {
      'london_ny_overlap': ['London', 'New York'],
      'london': ['London', 'Frankfurt', 'Paris'],
      'new_york': ['New York', 'Chicago'],
      'asian': ['Tokyo', 'Sydney', 'Hong Kong', 'Singapore'],
      'closed': []
    };

    setSession({
      current,
      next,
      minutesToNext,
      isOverlap: current === 'london_ny_overlap',
      volatilityRating,
      liquidityRating,
      recommendedStrategies: strategyMap[current] || [],
      activeMarkets: activeMarketsMap[current] || []
    });
  };

  const formatSessionName = (session: string): string => {
    const names: Record<string, string> = {
      'london_ny_overlap': 'London-NY Overlap',
      'london': 'London',
      'new_york': 'New York',
      'asian': 'Asian',
      'closed': 'Market Closed'
    };
    return names[session] || session;
  };

  const formatMinutesToNext = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getVolatilityColor = (rating: string): string => {
    const colors: Record<string, string> = {
      'very_high': 'text-red-400',
      'high': 'text-yellow-400',
      'medium': 'text-blue-400',
      'low': 'text-green-400'
    };
    return colors[rating] || 'text-slate-400';
  };

  if (!session) return null;

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg">
              {formatSessionName(session.current)}
            </CardTitle>
            <CardDescription>
              {currentTime.toUTCString().split(' ')[4]} UTC
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-mono text-white">
              {currentTime.toLocaleTimeString()}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <span className="text-slate-400 text-sm">Volatility</span>
            <div className={`font-bold ${getVolatilityColor(session.volatilityRating)}`}>
              {session.volatilityRating.toUpperCase()}
            </div>
          </div>
          <div>
            <span className="text-slate-400 text-sm">Liquidity</span>
            <div className={`font-bold ${getVolatilityColor(session.liquidityRating)}`}>
              {session.liquidityRating.toUpperCase()}
            </div>
          </div>
        </div>

        {session.current !== 'closed' && (
          <>
            <div className="mb-4">
              <span className="text-slate-400 text-sm">Active Markets</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {session.activeMarkets.map(market => (
                  <Badge key={market} variant="outline" className="text-xs">
                    {market}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <span className="text-slate-400 text-sm">Recommended Strategies</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {session.recommendedStrategies.map(strategy => (
                  <Badge key={strategy} variant="secondary" className="text-xs">
                    {strategy.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="mt-4 pt-4 border-t border-slate-800">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Next: {formatSessionName(session.next)}</span>
            <span className="text-white">
              {session.current === 'closed' ? 'Opens in ' : 'In '}
              {formatMinutesToNext(session.minutesToNext)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
