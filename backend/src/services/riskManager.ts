import { db } from './database';
import { logger } from './logger';
import type { RiskMetrics } from '../types/enhanced';

export class RiskManager {
  private maxKellyFraction: number;
  private maxPortfolioHeat: number;
  private maxCorrelation: number;
  private drawdownProtectionThreshold: number;

  constructor() {
    this.maxKellyFraction = Number(process.env.KELLY_FRACTION_MAX) || 0.25;
    this.maxPortfolioHeat = Number(process.env.MAX_PORTFOLIO_HEAT) || 0.06;
    this.maxCorrelation = Number(process.env.MAX_CORRELATION) || 0.7;
    this.drawdownProtectionThreshold = Number(process.env.DRAWDOWN_PROTECTION_THRESHOLD) || 0.10;
    console.log('✅ Risk Manager initialized');
  }

  calculateKellyFraction(): number {
    const trades = db.query(`
      SELECT profit_loss, volume, entry_price, stop_loss
      FROM trades WHERE status = 'CLOSED' AND profit_loss IS NOT NULL
      ORDER BY closed_at DESC LIMIT 100
    `).all() as any[];

    if (trades.length < 10) return this.maxKellyFraction;

    let wins = 0, totalWin = 0, totalLoss = 0;
    for (const trade of trades) {
      if (trade.profit_loss > 0) { wins++; totalWin += trade.profit_loss; }
      else totalLoss += Math.abs(trade.profit_loss);
    }

    const winRate = wins / trades.length;
    const avgWin = totalWin / Math.max(1, wins);
    const avgLoss = totalLoss / Math.max(1, trades.length - wins);

    if (avgLoss === 0) return this.maxKellyFraction;
    const winLossRatio = avgWin / avgLoss;
    const kelly = winRate - ((1 - winRate) / winLossRatio);
    const adjustedKelly = Math.min(kelly * 0.25, this.maxKellyFraction);

    db.run(`UPDATE risk_metrics SET kelly_fraction = ?, kelly_adjusted = ? WHERE id = 1`, [Math.max(0, kelly), Math.max(0, adjustedKelly)]);
    return Math.max(0, Math.min(adjustedKelly, this.maxKellyFraction));
  }

  calculatePortfolioHeat(): number {
    const openPositions = db.query(`
      SELECT volume, entry_price, current_stop_price, symbol FROM trades WHERE status = 'OPEN'
    `).all() as any[];

    const account = db.query(`SELECT balance FROM account_state WHERE id = 1`).get() as any;
    const accountBalance = account?.balance || 10000;

    let totalRisk = 0;
    for (const position of openPositions) {
      const riskPerUnit = Math.abs(position.entry_price - position.current_stop_price);
      totalRisk += riskPerUnit * position.volume;
    }

    const portfolioHeat = totalRisk / accountBalance;
    db.run(`UPDATE risk_metrics SET portfolio_heat = ? WHERE id = 1`, [portfolioHeat]);
    return portfolioHeat;
  }

  canTakeNewRisk(symbol: string, proposedRisk: number): { allowed: boolean; reason: string } {
    const currentHeat = this.calculatePortfolioHeat();
    const account = db.query(`SELECT balance FROM account_state WHERE id = 1`).get() as any;
    const accountBalance = account?.balance || 10000;
    const proposedRiskPercent = proposedRisk / accountBalance;
    const newTotalHeat = currentHeat + proposedRiskPercent;

    if (newTotalHeat > this.maxPortfolioHeat) {
      return { allowed: false, reason: `Portfolio heat would exceed ${this.maxPortfolioHeat * 100}%` };
    }
    return { allowed: true, reason: '' };
  }

  async checkCorrelationRisk(symbol: string): Promise<{ hasHighCorrelation: boolean; correlatedPositions: string[] }> {
    const openPositions = db.query(`SELECT DISTINCT symbol FROM trades WHERE status = 'OPEN' AND symbol != ?`).all(symbol) as any[];
    const correlatedPositions: string[] = [];

    for (const pos of openPositions) {
      const correlation = this.estimateCorrelation(symbol, pos.symbol);
      if (Math.abs(correlation) > this.maxCorrelation) {
        correlatedPositions.push(pos.symbol);
      }
    }

    return { hasHighCorrelation: correlatedPositions.length > 0, correlatedPositions };
  }

  private estimateCorrelation(symbol1: string, symbol2: string): number {
    const crypto = ['BTC', 'ETH', 'SOL'];
    const getType = (symbol: string) => {
      if (crypto.some(c => symbol.includes(c))) return 'crypto';
      return 'other';
    };
    const type1 = getType(symbol1);
    const type2 = getType(symbol2);
    return type1 === type2 ? 0.85 + (Math.random() - 0.5) * 0.1 : 0.2 + (Math.random() - 0.5) * 0.1;
  }

  checkDrawdownProtection(): { active: boolean; multiplier: number; reason: string } {
    const metrics = db.query(`SELECT current_drawdown FROM risk_metrics WHERE id = 1`).get() as any;
    const drawdown = metrics?.current_drawdown || 0;

    if (drawdown >= this.drawdownProtectionThreshold) {
      const multiplier = Math.max(0.25, 1 - (drawdown / 0.2));
      return { active: true, multiplier, reason: `Drawdown protection: ${(drawdown * 100).toFixed(1)}% drawdown` };
    }
    return { active: false, multiplier: 1, reason: '' };
  }

  getRiskMetrics(): RiskMetrics {
    const kellyFraction = this.calculateKellyFraction();
    const portfolioHeat = this.calculatePortfolioHeat();
    const metrics = db.query(`SELECT * FROM risk_metrics WHERE id = 1`).get() as any;
    const account = db.query(`SELECT daily_trades, daily_risk_used FROM account_state WHERE id = 1`).get() as any;

    return {
      kellyFraction: metrics?.kelly_fraction || 0,
      kellyAdjusted: kellyFraction,
      portfolioHeat,
      maxPortfolioHeat: this.maxPortfolioHeat,
      currentDrawdown: metrics?.current_drawdown || 0,
      maxDrawdown: metrics?.max_drawdown || 0,
      dailyRiskUsed: account?.daily_risk_used || 0,
      dailyRiskLimit: Number(process.env.MAX_DAILY_RISK) || 500,
      correlationRisk: 0,
      volatilityAdjustment: 1.0
    };
  }

  calculateOptimalPositionSize(symbol: string, entryPrice: number, stopLoss: number, accountRisk: number = 0.02): { size: number; riskAmount: number; adjustments: string[] } {
    const adjustments: string[] = [];
    let multiplier = 1.0;
    const account = db.query(`SELECT balance FROM account_state WHERE id = 1`).get() as any;
    const accountBalance = account?.balance || 10000;
    let riskAmount = accountBalance * accountRisk;

    const kelly = this.calculateKellyFraction();
    if (kelly < accountRisk) {
      multiplier *= kelly / accountRisk;
      adjustments.push(`Kelly reduced size by ${((1 - kelly / accountRisk) * 100).toFixed(0)}%`);
    }

    const drawdownCheck = this.checkDrawdownProtection();
    if (drawdownCheck.active) {
      multiplier *= drawdownCheck.multiplier;
      adjustments.push(drawdownCheck.reason);
    }

    const riskPerUnit = Math.abs(entryPrice - stopLoss);
    const proposedRisk = riskAmount * multiplier;
    const heatCheck = this.canTakeNewRisk(symbol, proposedRisk);
    if (!heatCheck.allowed) {
      const currentHeat = this.calculatePortfolioHeat();
      const availableHeat = this.maxPortfolioHeat - currentHeat;
      if (availableHeat > 0) {
        const maxRisk = accountBalance * availableHeat * 0.9;
        multiplier = Math.min(multiplier, maxRisk / riskAmount);
        adjustments.push(`Portfolio heat reduced size`);
      } else {
        adjustments.push('Cannot take new risk - portfolio heat limit reached');
        return { size: 0, riskAmount: 0, adjustments };
      }
    }

    const adjustedRiskAmount = riskAmount * multiplier;
    const size = adjustedRiskAmount / riskPerUnit;
    return { size: Math.round(size * 100) / 100, riskAmount: adjustedRiskAmount, adjustments };
  }

  resetDailyRiskCounters() {
    db.run(`UPDATE account_state SET daily_trades = 0, daily_risk_used = 0 WHERE id = 1`);
    logger.log('info', 'risk_manager', 'Daily risk counters reset');
  }
}

export const riskManager = new RiskManager();
