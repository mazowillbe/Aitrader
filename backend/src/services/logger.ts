import { db } from './database';

interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  category: string;
  message: string;
  data?: any;
}

class Logger {
  /**
   * Log an entry
   */
  log(level: LogEntry['level'], category: string, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logEntry: LogEntry = { level, category, message, data };

    // Console output
    const prefix = {
      'info': '📋',
      'warn': '⚠️',
      'error': '❌',
      'debug': '🔍'
    }[level] || '📋';

    console.log(`${prefix} [${timestamp}] [${category}] ${message}`, data || '');

    // Store in database
    try {
      db.run(`
        INSERT INTO logs (level, category, message, data)
        VALUES (?, ?, ?, ?)
      `, [level, category, message, data ? JSON.stringify(data) : null]);
    } catch (error) {
      console.error('Failed to write log to database:', error);
    }
  }

  /**
   * Convenience methods
   */
  info(category: string, message: string, data?: any) {
    this.log('info', category, message, data);
  }

  warn(category: string, message: string, data?: any) {
    this.log('warn', category, message, data);
  }

  error(category: string, message: string, data?: any) {
    this.log('error', category, message, data);
  }

  debug(category: string, message: string, data?: any) {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', category, message, data);
    }
  }

  /**
   * Get recent logs
   */
  getRecent(limit: number = 100): LogEntry[] {
    return db.query(`
      SELECT * FROM logs
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit) as LogEntry[];
  }

  /**
   * Get logs by category
   */
  getByCategory(category: string, limit: number = 50): LogEntry[] {
    return db.query(`
      SELECT * FROM logs
      WHERE category = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(category, limit) as LogEntry[];
  }

  /**
   * Get logs by level
   */
  getByLevel(level: string, limit: number = 50): LogEntry[] {
    return db.query(`
      SELECT * FROM logs
      WHERE level = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(level, limit) as LogEntry[];
  }

  /**
   * Clean old logs
   */
  cleanOldLogs(daysToKeep: number = 30) {
    const result = db.run(`
      DELETE FROM logs
      WHERE created_at < datetime('now', '-' || ? || ' days')
    `, [daysToKeep]);

    if (result.changes > 0) {
      console.log(`🧹 Cleaned ${result.changes} old log entries`);
    }
  }
}

export const logger = new Logger();
