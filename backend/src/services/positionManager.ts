import { db } from './database';
import { logger } from './logger';

export interface Position {
  id: number;
  symbol: string;
  action: 'BUY' | 'SELL';
  volume: number;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  current_stop_price: number;
  trailing_stop_active: boolean;
  trailing_stop_type?: string;
  trailing_stop_distance?: number;
  partial_exits: Array<{ level: number; percentage: number; executed: boolean }>;
  breakeven_triggered: boolean;
  atr_at_entry: number;
  created_at: string;
}

export interface PositionUpdate {
  tradeId: number;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  currentStop: number;
  distanceToStop: number;
  distanceToTarget: number;
  rMultiple: number;
  maxAdverseExcursion: number;
  maxFavorableExcursion: number;
  holdTimeSeconds: number;
  trailingActive: boolean;
  action: 'none' | 'move_stop' | 'close_partial' | 'close_full';
  actionReason: string;
}

/**
 * Position Manager Service
 */
export class PositionManager {
  private monitoringInterval: Timer | null = null;
  private isActive: boolean;
  private monitoringFrequencyMs: number;

  constructor() {
    this.isActive = process.env.ENABLE_POSITION_MANAGEMENT !== 'false';
    this.monitoringFrequencyMs = Number(process.env.POSITION_MONITOR_INTERVAL) || 5000;
    
    if (this.isActive) {
      console.log('✅ Position Manager initialized');
    }
  }

  startMonitoring() {
    if (!this.isActive || this.monitoringInterval) return;
    console.log(`🔍 Position monitoring started (${this.monitoringFrequencyMs}ms interval)`);
    
    this.monitoringInterval = setInterval(async () => {
      await this.monitorAllPositions();
    }, this.monitoringFrequencyMs);
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  private async monitorAllPositions() {
    try {
      const positions = this.getOpenPositions();
      for (const position of positions) {
        await this.monitorPosition(position);
      }
    } catch (error) {
      logger.log('error', 'position_manager', 'Position monitoring failed', { error: String(error) });
    }
  }

  async monitorPosition(position: Position): Promise<PositionUpdate> {
    const currentPrice = await this.getCurrentPrice(position.symbol);
    const unrealizedPnl = this.calculatePnL(position, currentPrice);
    const riskAmount = Math.abs(position.entry_price - position.stop_loss);
    const rMultiple = riskAmount > 0 
      ? (position.action === 'BUY' ? (currentPrice - position.entry_price) : (position.entry_price - currentPrice)) / riskAmount 
      : 0;
    
    const { mae, mfe } = this.updateExcursions(position.id, currentPrice, position);
    
    let newStop = position.current_stop_price;
    let trailingActive = position.trailing_stop_active;
    let action: PositionUpdate['action'] = 'none';
    let actionReason = '';

    if (!position.trailing_stop_active && rMultiple >= 1) {
      trailingActive = true;
      action = 'move_stop';
      actionReason = 'Trailing stop activated at 1R profit';
      if (!position.breakeven_triggered) {
        newStop = position.entry_price;
        this.updateBreakeven(position.id);
      }
    }

    if (trailingActive && position.trailing_stop_type) {
      const trailingUpdate = this.updateTrailingStop(position, currentPrice, rMultiple);
      if (trailingUpdate.newStop !== position.current_stop_price) {
        newStop = trailingUpdate.newStop;
        action = 'move_stop';
        actionReason = trailingUpdate.reason;
      }
    }

    if (this.isStopHit(position, currentPrice)) {
      action = 'close_full';
      actionReason = 'Stop loss hit';
    }

    if (this.isTakeProfitHit(position, currentPrice)) {
      action = 'close_full';
      actionReason = 'Take profit hit';
    }

    if (action === 'move_stop') {
      this.updateStopPrice(position.id, newStop, trailingActive);
    }

    return {
      tradeId: position.id,
      currentPrice,
      unrealizedPnl,
      unrealizedPnlPercent: (unrealizedPnl / (position.entry_price * position.volume)) * 100,
      currentStop: newStop,
      distanceToStop: position.action === 'BUY' ? (newStop - currentPrice) / currentPrice * 100 : (currentPrice - newStop) / currentPrice * 100,
      distanceToTarget: position.action === 'BUY' ? (position.take_profit - currentPrice) / currentPrice * 100 : (currentPrice - position.take_profit) / currentPrice * 100,
      rMultiple,
      maxAdverseExcursion: mae,
      maxFavorableExcursion: mfe,
      holdTimeSeconds: (Date.now() - new Date(position.created_at).getTime()) / 1000,
      trailingActive,
      action,
      actionReason
    };
  }

  getOpenPositions(): Position[] {
    const rows = db.query(`
      SELECT id, symbol, action, volume, entry_price, stop_loss, take_profit,
        current_stop_price, trailing_stop_active, trailing_stop_type, 
        trailing_stop_distance, partial_exits, breakeven_triggered,
        atr_at_entry, created_at
      FROM trades WHERE status = 'OPEN'
    `).all() as any[];

    return rows.map(row => ({
      ...row,
      action: row.action as 'BUY' | 'SELL',
      trailing_stop_active: Boolean(row.trailing_stop_active),
      breakeven_triggered: Boolean(row.breakeven_triggered),
      partial_exits: row.partial_exits ? JSON.parse(row.partial_exits) : []
    }));
  }

  initializePositionManagement(tradeId: number, config: { atr: number; stopLoss: number; takeProfit: number; trailingStopType?: string; partialExits?: any[] }) {
    const trailingDistance = config.trailingStopType === 'atr' ? config.atr * 2 : config.atr * 3;
    const partialExits = config.partialExits || [{ level: 1, percentage: 25 }, { level: 2, percentage: 25 }, { level: 3, percentage: 25 }];

    db.run(`
      UPDATE trades SET current_stop_price = ?, trailing_stop_type = ?, trailing_stop_distance = ?,
        partial_exits = ?, atr_at_entry = ?, risk_reward_ratio = ?
      WHERE id = ?
    `, [config.stopLoss, config.trailingStopType || 'atr', trailingDistance, JSON.stringify(partialExits), config.atr, Math.abs(config.takeProfit - config.stopLoss) / Math.abs(config.stopLoss), tradeId]);
  }

  private async getCurrentPrice(symbol: string): Promise<number> {
    const prices: Record<string, number> = { 'BTC/USD': 42000 + (Math.random() - 0.5) * 1000, 'ETH/USD': 2200 + (Math.random() - 0.5) * 100, 'EUR/USD': 1.08 + (Math.random() - 0.5) * 0.01 };
    return prices[symbol] || 100 + Math.random() * 10;
  }

  private calculatePnL(position: Position, currentPrice: number): number {
    return position.action === 'BUY' ? (currentPrice - position.entry_price) * position.volume : (position.entry_price - currentPrice) * position.volume;
  }

  private updateExcursions(tradeId: number, currentPrice: number, position: Position): { mae: number; mfe: number } {
    const existing = db.query(`SELECT max_adverse_excursion, max_favorable_excursion FROM trades WHERE id = ?`).get(tradeId) as any;
    let mae = existing?.max_adverse_excursion || 0;
    let mfe = existing?.max_favorable_excursion || 0;
    const riskAmount = Math.abs(position.entry_price - position.stop_loss);
    const adverse = position.action === 'BUY' ? Math.min(0, (currentPrice - position.entry_price) / riskAmount) : Math.min(0, (position.entry_price - currentPrice) / riskAmount);
    const favorable = position.action === 'BUY' ? Math.max(0, (currentPrice - position.entry_price) / riskAmount) : Math.max(0, (position.entry_price - currentPrice) / riskAmount);
    mae = Math.min(mae, adverse);
    mfe = Math.max(mfe, favorable);
    db.run(`UPDATE trades SET max_adverse_excursion = ?, max_favorable_excursion = ? WHERE id = ?`, [mae, mfe, tradeId]);
    return { mae, mfe };
  }

  private updateTrailingStop(position: Position, currentPrice: number, rMultiple: number): { newStop: number; reason: string } {
    let newStop = position.current_stop_price;
    let reason = '';
    if (position.action === 'BUY') {
      const proposedStop = currentPrice - (position.trailing_stop_distance || 0);
      if (proposedStop > position.current_stop_price) {
        newStop = proposedStop;
        reason = `Trailing stop moved up to ${newStop.toFixed(2)}`;
      }
    } else {
      const proposedStop = currentPrice + (position.trailing_stop_distance || 0);
      if (proposedStop < position.current_stop_price) {
        newStop = proposedStop;
        reason = `Trailing stop moved down to ${newStop.toFixed(2)}`;
      }
    }
    return { newStop, reason };
  }

  private isStopHit(position: Position, currentPrice: number): boolean {
    return position.action === 'BUY' ? currentPrice <= position.current_stop_price : currentPrice >= position.current_stop_price;
  }

  private isTakeProfitHit(position: Position, currentPrice: number): boolean {
    return position.action === 'BUY' ? currentPrice >= position.take_profit : currentPrice <= position.take_profit;
  }

  private updateStopPrice(tradeId: number, newStop: number, trailingActive: boolean) {
    db.run(`UPDATE trades SET current_stop_price = ?, trailing_stop_active = ? WHERE id = ?`, [newStop, trailingActive ? 1 : 0, tradeId]);
  }

  private updateBreakeven(tradeId: number) {
    db.run(`UPDATE trades SET breakeven_triggered = 1 WHERE id = ?`, [tradeId]);
  }

  closePosition(tradeId: number, exitPrice: number, reason: string) {
    const trade = db.query(`SELECT * FROM trades WHERE id = ?`).get(tradeId) as any;
    if (!trade || trade.status !== 'OPEN') return { success: false, error: 'Trade not found or already closed' };

    const profitLoss = trade.action === 'BUY' ? (exitPrice - trade.entry_price) * trade.volume : (trade.entry_price - exitPrice) * trade.volume;
    const riskAmount = Math.abs(trade.entry_price - trade.stop_loss);
    const rMultiple = riskAmount > 0 ? (trade.action === 'BUY' ? (exitPrice - trade.entry_price) : (trade.entry_price - exitPrice)) / riskAmount : 0;

    db.run(`UPDATE trades SET status = 'CLOSED', exit_price = ?, profit_loss = ?, r_multiple = ?, closed_at = CURRENT_TIMESTAMP WHERE id = ?`, [exitPrice, profitLoss, rMultiple, tradeId]);
    this.updateAccountAfterClose(trade.volume, profitLoss);

    logger.log('info', 'position_manager', `Position closed: ${reason}`, { tradeId, exitPrice, profitLoss, rMultiple: rMultiple.toFixed(2) });
    return { success: true, profitLoss, rMultiple };
  }

  takePartialProfit(tradeId: number, exitPrice: number, percentage: number): { success: boolean; profitLoss: number; remainingVolume: number } {
    const trade = db.query(`SELECT * FROM trades WHERE id = ?`).get(tradeId) as any;
    if (!trade || trade.status !== 'OPEN') return { success: false, profitLoss: 0, remainingVolume: trade?.volume || 0 };

    const volumeToClose = trade.volume * (percentage / 100);
    const profitLoss = trade.action === 'BUY' ? (exitPrice - trade.entry_price) * volumeToClose : (trade.entry_price - exitPrice) * volumeToClose;
    const remainingVolume = trade.volume - volumeToClose;

    db.run(`UPDATE trades SET volume = ? WHERE id = ?`, [remainingVolume, tradeId]);
    this.updateAccountAfterClose(volumeToClose, profitLoss);

    return { success: true, profitLoss, remainingVolume };
  }

  private updateAccountAfterClose(volume: number, profitLoss: number) {
    db.run(`UPDATE account_state SET equity = equity + ?, margin_used = MAX(0, margin_used - ?), updated_at = CURRENT_TIMESTAMP WHERE id = 1`, [profitLoss, volume]);
    
    const account = db.query(`SELECT * FROM account_state WHERE id = 1`).get() as any;
    if (account) {
      if (account.equity > account.peak_equity) {
        db.run(`UPDATE account_state SET peak_equity = ? WHERE id = 1`, [account.equity]);
      }
      const drawdown = (account.peak_equity - account.equity) / account.peak_equity;
      db.run(`UPDATE risk_metrics SET current_drawdown = ?, max_drawdown = MAX(max_drawdown, ?) WHERE id = 1`, [drawdown, drawdown]);
    }
  }
}

export const positionManager = new PositionManager();
