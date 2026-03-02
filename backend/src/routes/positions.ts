import { Router } from 'express';
import { db } from '../services/database';
import { positionManager } from '../services/positionManager';
import { logger } from '../services/logger';

export const positionsRouter = Router();

positionsRouter.get('/active', (req, res) => {
  try {
    const positions = db
      .prepare(`
        SELECT
          id, symbol, action, volume, entry_price, stop_loss, take_profit,
          confidence, status, ai_reasoning, created_at,
          market_regime, strategy_used, session, confluence_score,
          trailing_stop_active, trailing_stop_distance, current_stop_price,
          breakeven_triggered, partial_exits, max_adverse_excursion, max_favorable_excursion
        FROM trades
        WHERE status = 'OPEN'
        ORDER BY created_at DESC
      `)
      .all();

    res.json(positions);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

positionsRouter.post('/:id/adjust-stop', (req, res) => {
  try {
    const { id } = req.params;
    const { newStop } = req.body;

    if (typeof newStop !== 'number') {
      return res.status(400).json({ error: 'newStop must be a number' });
    }

    const trade = db.prepare('SELECT * FROM trades WHERE id = ? AND status = ?').get(id, 'OPEN');
    if (!trade) {
      return res.status(404).json({ error: 'Active trade not found' });
    }

    db.prepare(`
      UPDATE trades SET stop_loss = ?, current_stop_price = ?
      WHERE id = ?
    `).run(newStop, newStop, id);

    logger.log('info', 'trade', `Stop manually adjusted for trade ${id}`, { newStop });

    res.json({ success: true, new_stop: newStop });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

positionsRouter.post('/:id/close', (req, res) => {
  try {
    const { id } = req.params;
    const { exitPrice, reason } = req.body;

    const trade = db
      .prepare('SELECT * FROM trades WHERE id = ? AND status = ?')
      .get(id, 'OPEN') as any;

    if (!trade) {
      return res.status(404).json({ error: 'Active trade not found' });
    }

    const price = exitPrice || trade.entry_price;
    const pnl = positionManager.closeTrade(trade, price, reason || 'Manual close');

    res.json({ success: true, profit_loss: pnl });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

positionsRouter.post('/:id/toggle-trailing', (req, res) => {
  try {
    const { id } = req.params;
    const { active, distance } = req.body;

    const trade = db
      .prepare('SELECT * FROM trades WHERE id = ? AND status = ?')
      .get(id, 'OPEN') as any;

    if (!trade) {
      return res.status(404).json({ error: 'Active trade not found' });
    }

    db.prepare(`
      UPDATE trades SET trailing_stop_active = ?, trailing_stop_distance = ? WHERE id = ?
    `).run(active ? 1 : 0, distance || 1.5, id);

    logger.log('info', 'trade', `Trailing stop ${active ? 'enabled' : 'disabled'} for trade ${id}`, {
      distance
    });

    res.json({ success: true, trailing_stop_active: active, distance });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});
