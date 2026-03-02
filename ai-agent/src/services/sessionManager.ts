import type { 
  TradingSession, 
  SessionInfo, 
  SessionPerformance,
  StrategyType 
} from '../types/enhanced';

/**
 * Session Manager Service
 * 
 * Manages trading session logic:
 * - Identifies current trading session
 * - Provides session-specific recommendations
 * - Tracks session performance
 */
export class SessionManager {
  private isEnabled: boolean;
  private performanceHistory: Map<TradingSession, SessionPerformance> = new Map();

  // Session definitions in UTC
  private sessions = {
    asian: {
      start: 0,  // 00:00 UTC
      end: 9,    // 09:00 UTC
      name: 'Asian',
      markets: ['Tokyo', 'Sydney', 'Hong Kong', 'Singapore'],
      volatility: 'low' as const,
      liquidity: 'medium' as const,
      recommendedStrategies: ['range_trading', 'mean_reversion'] as StrategyType[]
    },
    london: {
      start: 8,  // 08:00 UTC
      end: 17,   // 17:00 UTC
      name: 'London',
      markets: ['London', 'Frankfurt', 'Paris'],
      volatility: 'high' as const,
      liquidity: 'high' as const,
      recommendedStrategies: ['breakout', 'momentum', 'trend_following'] as StrategyType[]
    },
    new_york: {
      start: 13, // 13:00 UTC
      end: 22,   // 22:00 UTC
      name: 'New York',
      markets: ['New York', 'Chicago', 'Toronto'],
      volatility: 'high' as const,
      liquidity: 'high' as const,
      recommendedStrategies: ['momentum', 'trend_following', 'swing_trading'] as StrategyType[]
    },
    london_ny_overlap: {
      start: 13, // 13:00 UTC
      end: 17,   // 17:00 UTC
      name: 'London-NY Overlap',
      markets: ['London', 'New York'],
      volatility: 'very_high' as const,
      liquidity: 'very_high' as const,
      recommendedStrategies: ['breakout', 'momentum', 'trend_following'] as StrategyType[]
    }
  };

  constructor() {
    this.isEnabled = process.env.ENABLE_SESSION_LOGIC !== 'false';
    if (!this.isEnabled) {
      console.log('⚠️ Session Logic disabled');
    }
    
    this.initializePerformanceTracking();
  }

  /**
   * Get current session info
   */
  getCurrentSession(): SessionInfo {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcMinute = now.getUTCMinutes();

    const current = this.identifySession(utcHour);
    const next = this.getNextSession(utcHour);
    const minutesToNext = this.getMinutesToNextSession(utcHour, utcMinute);

    return {
      current,
      next,
      minutesToNext,
      isOverlap: current === 'london_ny_overlap',
      volatilityRating: this.sessions[current]?.volatility || 'medium',
      liquidityRating: this.sessions[current]?.liquidity || 'medium',
      recommendedStrategies: this.sessions[current]?.recommendedStrategies || [],
      activeMarkets: this.sessions[current]?.markets || []
    };
  }

  /**
   * Identify current session
   */
  private identifySession(utcHour: number): TradingSession {
    // Check for overlap first (most volatile)
    if (utcHour >= this.sessions.london_ny_overlap.start && 
        utcHour < this.sessions.london_ny_overlap.end) {
      return 'london_ny_overlap';
    }

    // Check Asian session
    if (utcHour >= this.sessions.asian.start && utcHour < this.sessions.asian.end) {
      return 'asian';
    }

    // Check London session
    if (utcHour >= this.sessions.london.start && utcHour < this.sessions.london.end) {
      return 'london';
    }

    // Check New York session
    if (utcHour >= this.sessions.new_york.start && utcHour < this.sessions.new_york.end) {
      return 'new_york';
    }

    // Market closed
    return 'closed';
  }

  /**
   * Get next session
   */
  private getNextSession(utcHour: number): TradingSession {
    const sessions: TradingSession[] = ['asian', 'london', 'london_ny_overlap', 'new_york'];
    const current = this.identifySession(utcHour);
    
    if (current === 'closed') {
      // Find next session that will open
      for (const session of sessions) {
        if (utcHour < this.sessions[session]?.start) {
          return session;
        }
      }
      return 'asian'; // Default to Asian for next day
    }

    const currentIndex = sessions.indexOf(current);
    return sessions[(currentIndex + 1) % sessions.length] || 'asian';
  }

  /**
   * Calculate minutes until next session
   */
  private getMinutesToNextSession(utcHour: number, utcMinute: number): number {
    const current = this.identifySession(utcHour);
    
    if (current === 'closed') {
      // Find next session start
      let nextStart = 24; // Next day
      for (const session of Object.values(this.sessions)) {
        if (session.start > utcHour && session.start < nextStart) {
          nextStart = session.start;
        }
      }
      if (nextStart === 24) {
        // Next session is tomorrow
        nextStart = this.sessions.asian.start;
        return ((24 - utcHour) + nextStart) * 60 - utcMinute;
      }
      return (nextStart - utcHour) * 60 - utcMinute;
    }

    // Use end time of current session
    const currentEnd = this.sessions[current]?.end || 0;
    
    if (currentEnd > utcHour) {
      return (currentEnd - utcHour) * 60 - utcMinute;
    }

    // Session ends tomorrow
    return ((24 - utcHour) + this.sessions.asian.start) * 60 - utcMinute;
  }

  /**
   * Check if it's optimal time to trade
   */
  isOptimalTradingTime(): boolean {
    if (!this.isEnabled) return true;

    const session = this.getCurrentSession();
    
    // Don't trade when market is closed
    if (session.current === 'closed') return false;

    // Best times: London-NY overlap and first hours of sessions
    if (session.current === 'london_ny_overlap') return true;
    if (session.current === 'london') return true;
    if (session.current === 'new_york') return true;

    // Asian session can be good for range trading
    return session.current === 'asian';
  }

  /**
   * Get session risk multiplier
   */
  getSessionRiskMultiplier(session?: TradingSession): number {
    const currentSession = session || this.getCurrentSession().current;
    
    const multipliers: Record<TradingSession, number> = {
      'london_ny_overlap': 1.2, // Highest liquidity, can take more risk
      'london': 1.0,
      'new_york': 1.0,
      'asian': 0.8, // Lower volatility, smaller positions
      'closed': 0
    };

    return multipliers[currentSession] || 1.0;
  }

  /**
   * Get session-specific settings
   */
  getSessionSettings(session?: TradingSession): {
    preferredSymbols: string[];
    riskMultiplier: number;
    avoidTrading: boolean;
  } {
    const currentSession = session || this.getCurrentSession().current;
    
    const settings: Record<TradingSession, {
      preferredSymbols: string[];
      riskMultiplier: number;
      avoidTrading: boolean;
    }> = {
      'london_ny_overlap': {
        preferredSymbols: ['EUR/USD', 'GBP/USD', 'BTC/USD', 'ETH/USD'],
        riskMultiplier: 1.2,
        avoidTrading: false
      },
      'london': {
        preferredSymbols: ['EUR/USD', 'GBP/USD', 'EUR/GBP', 'BTC/USD'],
        riskMultiplier: 1.0,
        avoidTrading: false
      },
      'new_york': {
        preferredSymbols: ['USD/JPY', 'EUR/USD', 'AAPL', 'TSLA', 'BTC/USD'],
        riskMultiplier: 1.0,
        avoidTrading: false
      },
      'asian': {
        preferredSymbols: ['USD/JPY', 'AUD/USD', 'BTC/USD', 'ETH/USD'],
        riskMultiplier: 0.8,
        avoidTrading: false
      },
      'closed': {
        preferredSymbols: [],
        riskMultiplier: 0,
        avoidTrading: true
      }
    };

    return settings[currentSession] || settings.london;
  }

  /**
   * Initialize performance tracking
   */
  private initializePerformanceTracking(): void {
    const sessions: TradingSession[] = ['asian', 'london', 'new_york', 'london_ny_overlap'];
    
    sessions.forEach(session => {
      this.performanceHistory.set(session, {
        session,
        trades: 0,
        winRate: 0,
        avgRMultiple: 0,
        profitFactor: 0
      });
    });
  }

  /**
   * Update session performance
   */
  updatePerformance(session: TradingSession, result: { win: boolean; rMultiple: number }): void {
    const current = this.performanceHistory.get(session);
    if (!current) return;

    const newTrades = current.trades + 1;
    const newWins = current.winRate * current.trades + (result.win ? 1 : 0);
    const newWinRate = newWins / newTrades;
    
    // Running average of R-multiple
    const newAvgRMultiple = (current.avgRMultiple * current.trades + result.rMultiple) / newTrades;

    this.performanceHistory.set(session, {
      session,
      trades: newTrades,
      winRate: newWinRate,
      avgRMultiple: newAvgRMultiple,
      profitFactor: this.calculateProfitFactor(session)
    });
  }

  /**
   * Calculate profit factor for session
   */
  private calculateProfitFactor(session: TradingSession): number {
    // Placeholder - would need actual trade history
    const perf = this.performanceHistory.get(session);
    if (!perf || perf.trades === 0) return 0;
    
    // Simplified: profit factor approximation
    if (perf.winRate === 0) return 0;
    const avgWin = Math.max(0, perf.avgRMultiple);
    const avgLoss = Math.abs(Math.min(0, perf.avgRMultiple));
    return avgLoss > 0 ? (avgWin * perf.winRate) / (avgLoss * (1 - perf.winRate)) : 0;
  }

  /**
   * Get performance by session
   */
  getPerformance(session: TradingSession): SessionPerformance | undefined {
    return this.performanceHistory.get(session);
  }

  /**
   * Get all session performances
   */
  getAllPerformances(): SessionPerformance[] {
    return Array.from(this.performanceHistory.values());
  }

  /**
   * Get best performing session
   */
  getBestSession(): TradingSession {
    let best: TradingSession = 'london';
    let bestScore = 0;

    this.performanceHistory.forEach((perf, session) => {
      if (perf.trades >= 5) { // Minimum trades for significance
        const score = perf.winRate * perf.avgRMultiple;
        if (score > bestScore) {
          bestScore = score;
          best = session;
        }
      }
    });

    return best;
  }

  /**
   * Check if current session is good for trading specific symbol
   */
  isGoodForSymbol(symbol: string): boolean {
    const settings = this.getSessionSettings();
    return settings.preferredSymbols.includes(symbol);
  }

  /**
   * Get formatted session string
   */
  getSessionString(): string {
    const info = this.getCurrentSession();
    if (info.current === 'closed') {
      return 'Market Closed';
    }
    return `${this.sessions[info.current]?.name || info.current} Session`;
  }
}
