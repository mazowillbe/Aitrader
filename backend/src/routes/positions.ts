import { Router } from 'express';
import { positionManager } from '../services/positionManager';
import { riskManager } from '../services/riskManager';
import { db } from '../services/database';

export const positionsRouter = Router();

positionsRouter.get('/active', async (req, res) => {
  try {
    const positions = positionManager.getOpenPositions();
    const enrichedPositions = await Promise.all(positions.map(async (pos) => {
      const update = await positionManager.monitorPosition(pos);
      return { ...pos, ...update };
    }));
    res.json({ success: true, positions: enrichedPositions, count: enrichedPositions.length });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

positionsRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const trade = db.query(`SELECT * FROM trades WHERE id = ? AND status = 'OPEN'`).get(id) as any;
    if (!trade) return res.status(404).json({ success: false, error: 'Position not found' });

    const position = { ...trade, trailing_stop_active: Boolean(trade.trailing_stop_active), breakeven_triggered: Boolean(trade.breakeven_triggered), partial_exits: trade.partial_exits ? JSON.parse(trade.partial_exits) : [] };
    const update = await positionManager.monitorPosition(position);
    res.json({ success: true, position: { ...position, ...update } });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

positionsRouter.post('/:id/adjust-stop', async (req, res) => {
  try {
    const { id } = req.params;
    const { newStop } = req.body;
    if (!newStop || typeof newStop !== 'number') return res.status(400).json({ success: false, error: 'newStop is required' });

    const trade = db.query(`SELECT * FROM trades WHERE id = ? AND status = 'OPEN'`).get(id) as any;
    if (!trade) return res.status(404).json({ success: false, error: 'Position not found' });

    if (trade.action === 'BUY' && newStop >= trade.entry_price) return res.status(400).json({ success: false, error: 'Stop for BUY must be below entry price' });
    if (trade.action === 'SELL' && newStop <= trade.entry_price) return res.status(400).json({ success: false, error: 'Stop for SELL must be above entry price' });

    db.run(`UPDATE trades SET current_stop_price = ? WHERE id = ?`, [newStop, id]);
    res.json({ success: true, message: 'Stop loss updated', tradeId: id, oldStop: trade.current_stop_price, newStop });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

positionsRouter.post('/:id/take-partial', async (req, res) => {
  try {
    const { id } = req.params;
    const { percentage, price } = req.body;
    if (!percentage || typeof percentage !== 'number') return res.status(400).json({ success: false, error: 'percentage is required' });

    const trade = db.query(`SELECT * FROM trades WHERE id = ? AND status = 'OPEN'`).get(id) as any;
    if (!trade) return res.status(404).json({ success: false, error: 'Position not found' });

    const exitPrice = price || trade.entry_price * (1 + (trade.action === 'BUY' ? 0.01 : -0.01));
    const result = positionManager.takePartialProfit(Number(id), exitPrice, percentage);

    if (!result.success) return res.status(400).json(result);
    res.json({ success: true, message: `Partial profit taken: ${percentage}%`, profitLoss: result.profitLoss, remainingVolume: result.remainingVolume });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

positionsRouter.post('/:id/close', async (req, res) => {
  try {
    const { id } = req.params;
    const { price, reason } = req.body;

    const trade = db.query(`SELECT * FROM trades WHERE id = ? AND status = 'OPEN'`).get(id) as any;
    if (!trade) return res.status(404).json({ success: false, error: 'Position not found' });

    const exitPrice = price || trade.entry_price * (1 + (trade.action === 'BUY' ? 0.005 : -0.005));
    const result = positionManager.closePosition(Number(id), exitPrice, reason || 'Manual close');

    if (!result.success) return res.status(400).json(result);
    res.json({ success: true, message: 'Position closed', exitPrice, profitLoss: result.profitLoss, rMultiple: result.rMultiple });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

positionsRouter.get('/:id/risk', async (req, res) => {
  try {
    const { id } = req.params;
    const trade = db.query(`SELECT * FROM trades WHERE id = ?`).get(id) as any;
    if (!trade) return res.status(404).json({ success: false, error: 'Position not found' });

    const riskAmount = Math.abs(trade.entry_price - (trade.current_stop_price || trade.stop_loss)) * trade.volume;
    const rewardAmount = Math.abs((trade.take_profit || trade.entry_price) - trade.entry_price) * trade.volume;
    const correlationCheck = await riskManager.checkCorrelationRisk(trade.symbol);

    res.json({ success: true, risk: { tradeId: trade.id, symbol: trade.symbol, riskAmount, rewardAmount, riskRewardRatio: riskAmount > 0 ? rewardAmount / riskAmount : 0, correlatedPositions: correlationCheck.correlatedPositions, hasHighCorrelation: correlationCheck.hasHighCorrelation } });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});
