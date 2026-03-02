import type { SessionInfo, TradingSession, TradingStrategy } from '../types/enhanced';

interface SessionDefinition {
  name: TradingSession;
  startUTC: number;
  endUTC: number;
  typicalVolatility: 'low' | 'medium' | 'high' | 'very_high';
  recommendedStrategy: TradingStrategy;
}

const SESSIONS: SessionDefinition[] = [
  {
    name: 'LONDON_NY_OVERLAP',
    startUTC: 13,
    endUTC: 17,
    typicalVolatility: 'very_high',
    recommendedStrategy: 'TREND_FOLLOWING'
  },
  {
    name: 'LONDON',
    startUTC: 8,
    endUTC: 17,
    typicalVolatility: 'high',
    recommendedStrategy: 'BREAKOUT'
  },
  {
    name: 'NEW_YORK',
    startUTC: 13,
    endUTC: 22,
    typicalVolatility: 'high',
    recommendedStrategy: 'MOMENTUM'
  },
  {
    name: 'ASIAN',
    startUTC: 0,
    endUTC: 9,
    typicalVolatility: 'low',
    recommendedStrategy: 'RANGE_TRADING'
  }
];

export class SessionManager {
  private asianRangeHigh: Map<string, number> = new Map();
  private asianRangeLow: Map<string, number> = new Map();

  getCurrentSession(): SessionInfo {
    const now = new Date();
    const utcHour = now.getUTCHours();

    const isLondon = utcHour >= 8 && utcHour < 17;
    const isNY = utcHour >= 13 && utcHour < 22;
    const isAsian = utcHour >= 0 && utcHour < 9;

    let currentSession: TradingSession;
    let volatility: 'low' | 'medium' | 'high' | 'very_high';
    let strategy: TradingStrategy;

    if (isLondon && isNY) {
      currentSession = 'LONDON_NY_OVERLAP';
      volatility = 'very_high';
      strategy = 'TREND_FOLLOWING';
    } else if (isLondon) {
      currentSession = 'LONDON';
      volatility = 'high';
      strategy = 'BREAKOUT';
    } else if (isNY) {
      currentSession = 'NEW_YORK';
      volatility = 'high';
      strategy = 'MOMENTUM';
    } else if (isAsian) {
      currentSession = 'ASIAN';
      volatility = 'low';
      strategy = 'RANGE_TRADING';
    } else {
      currentSession = 'OFF_HOURS';
      volatility = 'low';
      strategy = 'HOLD';
    }

    const sessionDef = SESSIONS.find((s) => s.name === currentSession);
    const sessionStart = sessionDef ? this.formatSessionTime(sessionDef.startUTC) : '00:00';
    const sessionEnd = sessionDef ? this.formatSessionTime(sessionDef.endUTC) : '24:00';

    const { nextSession, hoursUntilNext } = this.getNextSession(utcHour, currentSession);

    return {
      current_session: currentSession,
      session_start_utc: sessionStart,
      session_end_utc: sessionEnd,
      hours_until_next_session: hoursUntilNext,
      next_session: nextSession,
      typical_volatility: volatility,
      recommended_strategy: strategy,
      asian_range_high: this.asianRangeHigh.get('global'),
      asian_range_low: this.asianRangeLow.get('global')
    };
  }

  updateAsianRange(symbol: string, price: number) {
    const session = this.getCurrentSession();
    if (session.current_session !== 'ASIAN') return;

    const currentHigh = this.asianRangeHigh.get(symbol) || 0;
    const currentLow = this.asianRangeLow.get(symbol) || Number.MAX_VALUE;

    this.asianRangeHigh.set(symbol, Math.max(currentHigh, price));
    this.asianRangeLow.set(symbol, Math.min(currentLow, price));
  }

  isLondonBreakout(symbol: string, currentPrice: number): boolean {
    const session = this.getCurrentSession();
    if (session.current_session !== 'LONDON') return false;

    const asianHigh = this.asianRangeHigh.get(symbol);
    const asianLow = this.asianRangeLow.get(symbol);

    if (!asianHigh || !asianLow) return false;
    return currentPrice > asianHigh || currentPrice < asianLow;
  }

  private formatSessionTime(utcHour: number): string {
    return `${String(utcHour).padStart(2, '0')}:00 UTC`;
  }

  private getNextSession(
    utcHour: number,
    currentSession: TradingSession
  ): { nextSession: TradingSession; hoursUntilNext: number } {
    if (currentSession === 'ASIAN') {
      return { nextSession: 'LONDON', hoursUntilNext: Math.max(0, 8 - utcHour) };
    }
    if (currentSession === 'LONDON') {
      return {
        nextSession: 'LONDON_NY_OVERLAP',
        hoursUntilNext: Math.max(0, 13 - utcHour)
      };
    }
    if (currentSession === 'LONDON_NY_OVERLAP') {
      return { nextSession: 'NEW_YORK', hoursUntilNext: Math.max(0, 17 - utcHour) };
    }
    if (currentSession === 'NEW_YORK') {
      return { nextSession: 'ASIAN', hoursUntilNext: Math.max(0, 24 - utcHour) };
    }
    const hoursUntilAsian = utcHour >= 22 ? 24 - utcHour : 0;
    return { nextSession: 'ASIAN', hoursUntilNext: hoursUntilAsian };
  }

  getSessionLabel(session: TradingSession): string {
    const labels: Record<TradingSession, string> = {
      ASIAN: 'Asian Session (Tokyo/Sydney)',
      LONDON: 'London Session',
      NEW_YORK: 'New York Session',
      LONDON_NY_OVERLAP: 'London-NY Overlap (Peak Volume)',
      OFF_HOURS: 'Off Hours (Low Activity)'
    };
    return labels[session];
  }
}
