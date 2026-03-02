import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type TradingSession = 'ASIAN' | 'LONDON' | 'NEW_YORK' | 'LONDON_NY_OVERLAP' | 'OFF_HOURS';

interface SessionData {
  name: TradingSession;
  label: string;
  startUTC: number;
  endUTC: number;
  color: string;
  volatility: 'low' | 'medium' | 'high' | 'very_high';
}

const SESSIONS: SessionData[] = [
  { name: 'ASIAN', label: 'Asian', startUTC: 0, endUTC: 9, color: 'text-yellow-400', volatility: 'low' },
  { name: 'LONDON', label: 'London', startUTC: 8, endUTC: 17, color: 'text-blue-400', volatility: 'high' },
  { name: 'LONDON_NY_OVERLAP', label: 'LDN/NY', startUTC: 13, endUTC: 17, color: 'text-emerald-400', volatility: 'very_high' },
  { name: 'NEW_YORK', label: 'New York', startUTC: 13, endUTC: 22, color: 'text-purple-400', volatility: 'high' }
];

const volatilityColors: Record<string, string> = {
  low: 'bg-slate-500/20 text-slate-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  high: 'bg-orange-500/20 text-orange-400',
  very_high: 'bg-red-500/20 text-red-400'
};

function getCurrentSessionInfo() {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMinute = now.getUTCMinutes();
  const utcSecond = now.getUTCSeconds();

  const isLondon = utcHour >= 8 && utcHour < 17;
  const isNY = utcHour >= 13 && utcHour < 22;
  const isAsian = utcHour >= 0 && utcHour < 9;

  let currentSession: TradingSession;
  let volatility: 'low' | 'medium' | 'high' | 'very_high';

  if (isLondon && isNY) {
    currentSession = 'LONDON_NY_OVERLAP';
    volatility = 'very_high';
  } else if (isLondon) {
    currentSession = 'LONDON';
    volatility = 'high';
  } else if (isNY) {
    currentSession = 'NEW_YORK';
    volatility = 'high';
  } else if (isAsian) {
    currentSession = 'ASIAN';
    volatility = 'low';
  } else {
    currentSession = 'OFF_HOURS';
    volatility = 'low';
  }

  return {
    currentSession,
    volatility,
    utcTime: `${String(utcHour).padStart(2, '0')}:${String(utcMinute).padStart(2, '0')}:${String(utcSecond).padStart(2, '0')} UTC`
  };
}

export function SessionClock() {
  const [sessionInfo, setSessionInfo] = useState(getCurrentSessionInfo());

  useEffect(() => {
    const interval = setInterval(() => {
      setSessionInfo(getCurrentSessionInfo());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const sessionLabels: Record<TradingSession, string> = {
    ASIAN: 'Asian Session',
    LONDON: 'London Session',
    NEW_YORK: 'New York Session',
    LONDON_NY_OVERLAP: 'London-NY Overlap',
    OFF_HOURS: 'Off Hours'
  };

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-sm flex items-center gap-2">
          🕐 Trading Sessions
          <span className="text-slate-400 font-normal text-xs">{sessionInfo.utcTime}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1">
            <div className="text-white font-semibold">{sessionLabels[sessionInfo.currentSession]}</div>
            <Badge className={`text-xs mt-1 ${volatilityColors[sessionInfo.volatility]}`}>
              {sessionInfo.volatility.replace('_', ' ').toUpperCase()} VOLATILITY
            </Badge>
          </div>
          <div className={`w-3 h-3 rounded-full animate-pulse ${
            sessionInfo.currentSession === 'OFF_HOURS' ? 'bg-slate-500' :
            sessionInfo.currentSession === 'LONDON_NY_OVERLAP' ? 'bg-emerald-400' : 'bg-blue-400'
          }`} />
        </div>

        <div className="space-y-1.5">
          {SESSIONS.map((session) => {
            const utcHour = new Date().getUTCHours();
            const isActive = utcHour >= session.startUTC && utcHour < session.endUTC;
            const hoursUntilOpen = session.startUTC > utcHour
              ? session.startUTC - utcHour
              : session.startUTC + 24 - utcHour;

            return (
              <div
                key={session.name}
                className={`flex items-center justify-between rounded px-2 py-1.5 text-xs ${
                  isActive ? 'bg-slate-700/50' : 'bg-slate-800/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                  <span className={isActive ? session.color : 'text-slate-500'}>{session.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">
                    {String(session.startUTC).padStart(2, '0')}:00 - {String(session.endUTC).padStart(2, '0')}:00
                  </span>
                  {isActive ? (
                    <Badge className="bg-emerald-500/20 text-emerald-400 text-xs py-0">OPEN</Badge>
                  ) : (
                    <span className="text-slate-600">in {hoursUntilOpen}h</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
