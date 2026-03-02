import { db } from './database';
import { logger } from './logger';

interface RiskAssessment {
  approved: boolean;
  adjusted_volume: number;
  reason?: string;
  kelly_fraction: number;
  portfolio_heat: number;
  drawdown_multiplier: number;
  correlation_warning?: string;
}

interface TradeForRisk {
  symbol: string;
  volume: number;
  stop_loss: number;
  entry_price: number;
  action: string;
}

export class RiskManager {
  private readonly maxPortfolioHeat: number;
  private readonly kellyFractionMax: number;
  private readonly drawdownProtectionThreshold: number;
  private readonly maxCorrelation: number;

  constructor() {
    this.maxPortfolioHeat = Number(process.env.MAX_PORTFOLIO_HEAT) || 0.06;
    this.kellyFractionMax = Number(process.env.KELLY_FRACTION_MAX) || 0.25;
    this.drawdownProtectionThreshold =
      Number(process.env.DRAWDOWN_PROTECTION_THRESHOLD) || 0.1;
    this.maxCorrelation = Number(process.env.MAX_CORRELATION) || 0.7;
  }

  assessTrade(trade: TradeForRisk): RiskAssessment {
    const account = db
      .prepare('SELECT * FROM account_state ORDER BY id DESC LIMIT 1')
      .get() as any;

    if (!account) {
      return {
        approved: false,
        adjusted_volume: 0,
        reason: 'Account data unavailable',
        kelly_fraction: 0,
        portfolio_heat: 0,
        drawdown_multiplier: 1
      };
    }

    const kellyFraction = this.calculateKellyFraction();
    const portfolioHeat = this.calculatePortfolioHeat(account.equity);
    const drawdownMultiplier = this.getDrawdownMultiplier(account);
    const correlationInfo = this.checkCorrelation(trade.symbol);

    const maxKellySize = account.equity * kellyFraction;
    const heatRemaining = (this.maxPortfolioHeat - portfolioHeat) * account.equity;

    let adjustedVolume = Math.min(trade.volume, maxKellySize, heatRemaining);
    adjustedVolume *= drawdownMultiplier;

    const maxTradeSize = Number(process.env.MAX_TRADE_SIZE) || 1000;
    adjustedVolume = Math.min(adjustedVolume, maxTradeSize);
    adjustedVolume = Math.max(0, adjustedVolume);

    const reasons: string[] = [];

    if (adjustedVolume < trade.volume * 0.5) {
      reasons.push(`Size reduced from $${trade.volume.toFixed(0)} to $${adjustedVolume.toFixed(0)} by risk controls`);
    }

    if (drawdownMultiplier < 1) {
      reasons.push(`Drawdown protection: ${((1 - drawdownMultiplier) * 100).toFixed(0)}% size reduction`);
    }

    if (portfolioHeat >= this.maxPortfolioHeat * 0.9) {
      reasons.push(`Portfolio heat near limit: ${(portfolioHeat * 100).toFixed(1)}%`);
    }

    if (correlationInfo.warning) {
      reasons.push(correlationInfo.warning);
    }

    const approved = adjustedVolume >= 10;

    if (!approved) {
      logger.log('warn', 'trade', 'Trade rejected by risk manager', {
        symbol: trade.symbol,
        requestedVolume: trade.volume,
        portfolioHeat,
        kellyFraction,
        drawdownMultiplier
      });
    }

    return {
      approved,
      adjusted_volume: adjustedVolume,
      reason: reasons.join('; '),
      kelly_fraction: kellyFraction,
      portfolio_heat: portfolioHeat,
      drawdown_multiplier: drawdownMultiplier,
      correlation_warning: correlationInfo.warning
    };
  }

  private calculateKellyFraction(): number {
    const closedTrades = db
      .prepare(`
        SELECT profit_loss, volume, entry_price, stop_loss
        FROM trades
        WHERE status = 'CLOSED' AND profit_loss IS NOT NULL
        ORDER BY closed_at DESC
        LIMIT 50
      `)
      .all() as Array<{ profit_loss: number; volume: number; entry_price: number; stop_loss: number }>;

    if (closedTrades.length < 10) {
      return this.kellyFractionMax * 0.5;
    }

    const wins = closedTrades.filter((t) => t.profit_loss > 0);
    const losses = closedTrades.filter((t) => t.profit_loss < 0);

    const winRate = wins.length / closedTrades.length;
    const avgWin = wins.length > 0 ? wins.reduce((a, t) => a + t.profit_loss, 0) / wins.length : 0;
    const avgLoss =
      losses.length > 0
        ? Math.abs(losses.reduce((a, t) => a + t.profit_loss, 0) / losses.length)
        : 1;

    const b = avgWin / avgLoss;
    const kellyFull = (winRate * b - (1 - winRate)) / b;
    const kellyQuarter = Math.max(0, kellyFull * 0.25);

    return Math.min(kellyQuarter, this.kellyFractionMax);
  }

  private calculatePortfolioHeat(equity: number): number {
    if (equity <= 0) return 0;

    const openTrades = db
      .prepare(`
        SELECT volume, entry_price, stop_loss, action
        FROM trades
        WHERE status = 'OPEN'
      `)
      .all() as Array<{ volume: number; entry_price: number; stop_loss: number; action: string }>;

    let totalRisk = 0;
    for (const trade of openTrades) {
      const riskPerUnit = Math.abs(trade.entry_price - trade.stop_loss);
      const positionRisk = riskPerUnit > 0 ? (riskPerUnit / trade.entry_price) * trade.volume : trade.volume * 0.02;
      totalRisk += positionRisk;
    }

    return totalRisk / equity;
  }

  private getDrawdownMultiplier(account: any): number {
    const currentDrawdown = (account.current_drawdown || 0) / 100;

    if (currentDrawdown >= this.drawdownProtectionThreshold * 2) {
      return 0.25;
    }
    if (currentDrawdown >= this.drawdownProtectionThreshold * 1.5) {
      return 0.5;
    }
    if (currentDrawdown >= this.drawdownProtectionThreshold) {
      return 0.75;
    }
    return 1.0;
  }

  private checkCorrelation(symbol: string): { warning?: string } {
    const openSymbols = db
      .prepare("SELECT DISTINCT symbol FROM trades WHERE status = 'OPEN'")
      .all() as Array<{ symbol: string }>;

    const correlatedPairs: Record<string, string[]> = {
      'BTC/USD': ['ETH/USD', 'SOL/USD'],
      'ETH/USD': ['BTC/USD', 'SOL/USD'],
      'EUR/USD': ['GBP/USD'],
      'GBP/USD': ['EUR/USD'],
      AAPL: ['MSFT', 'GOOGL'],
      MSFT: ['AAPL', 'GOOGL'],
      GOOGL: ['AAPL', 'MSFT']
    };

    const correlated = correlatedPairs[symbol] || [];
    const existingCorrelated = openSymbols
      .map((s) => s.symbol)
      .filter((s) => correlated.includes(s));

    if (existingCorrelated.length > 0) {
      return {
        warning: `High correlation with open position: ${existingCorrelated.join(', ')}`
      };
    }

    return {};
  }

  getRiskSummary() {
    const account = db
      .prepare('SELECT * FROM account_state ORDER BY id DESC LIMIT 1')
      .get() as any;

    if (!account) return null;

    const kellyFraction = this.calculateKellyFraction();
    const portfolioHeat = this.calculatePortfolioHeat(account.equity);

    return {
      kelly_fraction: kellyFraction,
      kelly_percent: (kellyFraction * 100).toFixed(1) + '%',
      portfolio_heat: portfolioHeat,
      portfolio_heat_percent: (portfolioHeat * 100).toFixed(1) + '%',
      max_portfolio_heat: (this.maxPortfolioHeat * 100).toFixed(1) + '%',
      current_drawdown: account.current_drawdown || 0,
      max_drawdown: account.max_drawdown || 0,
      drawdown_protection_active: (account.current_drawdown || 0) / 100 >= this.drawdownProtectionThreshold
    };
  }
}

export const riskManager = new RiskManager();
