import { db } from './database';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';
type LogCategory = 'trade' | 'ai' | 'system' | 'api';

class Logger {
  log(level: LogLevel, category: LogCategory, message: string, data?: any) {
    const dataString = data ? JSON.stringify(data) : null;

    db.prepare(`
      INSERT INTO logs (level, category, message, data)
      VALUES (?, ?, ?, ?)
    `).run(level, category, message, dataString);

    // Also console log
    const emoji = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : level === 'info' ? 'ℹ️' : '🔍';
    console.log(`${emoji} [${category.toUpperCase()}] ${message}`, data || '');
  }

  getLogs(limit = 100, category?: LogCategory) {
    if (category) {
      return db.prepare('SELECT * FROM logs WHERE category = ? ORDER BY created_at DESC LIMIT ?')
        .all(category, limit);
    }
    return db.prepare('SELECT * FROM logs ORDER BY created_at DESC LIMIT ?').all(limit);
  }

  clearOldLogs(daysToKeep = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    db.prepare('DELETE FROM logs WHERE created_at < ?').run(cutoffDate.toISOString());
    this.log('info', 'system', `Cleared logs older than ${daysToKeep} days`);
  }
}

export const logger = new Logger();
