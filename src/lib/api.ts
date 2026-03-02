const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

class API {
  async getConfig() {
    const response = await fetch(`${BACKEND_URL}/api/config`);
    if (!response.ok) throw new Error('Failed to fetch config');
    return response.json();
  }

  async getAccountBalance() {
    const response = await fetch(`${BACKEND_URL}/api/account/balance`);
    if (!response.ok) throw new Error('Failed to fetch balance');
    return response.json();
  }

  async getRiskSummary() {
    const response = await fetch(`${BACKEND_URL}/api/account/risk-summary`);
    if (!response.ok) throw new Error('Failed to fetch risk summary');
    return response.json();
  }

  async getActiveTrades() {
    const response = await fetch(`${BACKEND_URL}/api/positions/active`);
    if (!response.ok) throw new Error('Failed to fetch active trades');
    return response.json();
  }

  async getTradeHistory(limit = 50) {
    const response = await fetch(`${BACKEND_URL}/api/trades/history?limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch trade history');
    return response.json();
  }

  async getTradeStats() {
    const response = await fetch(`${BACKEND_URL}/api/trades/stats`);
    if (!response.ok) throw new Error('Failed to fetch trade stats');
    return response.json();
  }

  async getLogs(limit = 100, category?: string) {
    const url = category
      ? `${BACKEND_URL}/api/logs?limit=${limit}&category=${category}`
      : `${BACKEND_URL}/api/logs?limit=${limit}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch logs');
    return response.json();
  }

  async resetAccount() {
    const response = await fetch(`${BACKEND_URL}/api/account/reset`, { method: 'POST' });
    if (!response.ok) throw new Error('Failed to reset account');
    return response.json();
  }

  async closeTrade(tradeId: number, exitPrice: number, reason: string) {
    const response = await fetch(`${BACKEND_URL}/api/positions/${tradeId}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exitPrice, reason })
    });
    if (!response.ok) throw new Error('Failed to close trade');
    return response.json();
  }

  async getPerformanceMetrics(days = 30) {
    const response = await fetch(`${BACKEND_URL}/api/analytics/performance?days=${days}`);
    if (!response.ok) throw new Error('Failed to fetch performance metrics');
    return response.json();
  }

  async getEquityCurve(days = 30) {
    const response = await fetch(`${BACKEND_URL}/api/analytics/equity-curve?days=${days}`);
    if (!response.ok) throw new Error('Failed to fetch equity curve');
    return response.json();
  }

  async getAIInsights() {
    const response = await fetch(`${BACKEND_URL}/api/analytics/insights`);
    if (!response.ok) throw new Error('Failed to fetch AI insights');
    return response.json();
  }

  async getTradingJournal(limit = 50) {
    const response = await fetch(`${BACKEND_URL}/api/analytics/journal?limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch trading journal');
    return response.json();
  }

  async getSessionStats() {
    const response = await fetch(`${BACKEND_URL}/api/analytics/session-stats`);
    if (!response.ok) throw new Error('Failed to fetch session stats');
    return response.json();
  }

  async getRegimeStats() {
    const response = await fetch(`${BACKEND_URL}/api/analytics/regime-stats`);
    if (!response.ok) throw new Error('Failed to fetch regime stats');
    return response.json();
  }

  async getRiskMetrics() {
    const response = await fetch(`${BACKEND_URL}/api/analytics/risk`);
    if (!response.ok) throw new Error('Failed to fetch risk metrics');
    return response.json();
  }

  async toggleTrailingStop(tradeId: number, active: boolean, distance?: number) {
    const response = await fetch(`${BACKEND_URL}/api/positions/${tradeId}/toggle-trailing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active, distance })
    });
    if (!response.ok) throw new Error('Failed to toggle trailing stop');
    return response.json();
  }
}

export const api = new API();
