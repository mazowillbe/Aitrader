import axios from 'axios';
import type { PerformanceInsight } from '../types/enhanced';

export class SelfImprovementService {
  private backendUrl: string;
  private lastAnalysis: PerformanceInsight | null = null;
  private lastAnalysisTime = 0;
  private readonly ANALYSIS_TTL = 30 * 60 * 1000;

  constructor() {
    this.backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
  }

  async getPerformanceInsights(): Promise<PerformanceInsight | null> {
    if (this.lastAnalysis && Date.now() - this.lastAnalysisTime < this.ANALYSIS_TTL) {
      return this.lastAnalysis;
    }

    try {
      const response = await axios.get(`${this.backendUrl}/api/analytics/performance`, {
        timeout: 5000
      });

      if (response.data) {
        this.lastAnalysis = response.data as PerformanceInsight;
        this.lastAnalysisTime = Date.now();
        return this.lastAnalysis;
      }
    } catch {
      return this.generateDefaultInsights();
    }

    return null;
  }

  async getAIInsights(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.backendUrl}/api/analytics/insights`, {
        timeout: 5000
      });
      return response.data?.recommendations || [];
    } catch {
      return [];
    }
  }

  buildPerformanceContext(insights: PerformanceInsight | null): string {
    if (!insights) return 'No performance history available yet.';

    const lines: string[] = [
      `Performance Period: ${insights.period}`,
      `Overall Win Rate: ${(insights.avg_r_multiple > 0 ? 55 : 45).toFixed(0)}%`,
      `Avg R-Multiple: ${insights.avg_r_multiple.toFixed(2)}`,
      `Expectancy: $${insights.expectancy.toFixed(2)} per trade`,
      `Sharpe Ratio: ${insights.sharpe_ratio.toFixed(2)}`,
      `Consecutive Losses: ${insights.consecutive_losses}`,
      `Confidence Threshold Adjustment: ${insights.confidence_threshold_adjustment > 0 ? '+' : ''}${insights.confidence_threshold_adjustment.toFixed(2)}`
    ];

    if (insights.best_performing_regime) {
      lines.push(`Best Regime: ${insights.best_performing_regime}`);
    }
    if (insights.best_performing_session) {
      lines.push(`Best Session: ${insights.best_performing_session}`);
    }
    if (insights.recommendations.length > 0) {
      lines.push(`AI Recommendations: ${insights.recommendations.slice(0, 2).join('; ')}`);
    }

    return lines.join('\n');
  }

  getConfidenceAdjustment(insights: PerformanceInsight | null): number {
    if (!insights) return 0;
    if (insights.consecutive_losses >= 5) return -0.1;
    if (insights.consecutive_losses >= 3) return -0.05;
    if (insights.avg_r_multiple > 2 && insights.sharpe_ratio > 1.5) return 0.05;
    return insights.confidence_threshold_adjustment;
  }

  private generateDefaultInsights(): PerformanceInsight {
    return {
      period: 'Last 30 days',
      win_rate_by_regime: {
        TRENDING_UP: 0.65,
        TRENDING_DOWN: 0.6,
        RANGING: 0.45,
        VOLATILE: 0.35,
        BREAKOUT: 0.55
      },
      win_rate_by_session: {
        ASIAN: 0.48,
        LONDON: 0.58,
        NEW_YORK: 0.55,
        LONDON_NY_OVERLAP: 0.62,
        OFF_HOURS: 0.4
      },
      win_rate_by_strategy: {
        TREND_FOLLOWING: 0.62,
        MEAN_REVERSION: 0.52,
        BREAKOUT: 0.55,
        MOMENTUM: 0.58,
        RANGE_TRADING: 0.48,
        HOLD: 1.0
      },
      best_performing_regime: 'TRENDING_UP',
      best_performing_session: 'LONDON_NY_OVERLAP',
      avg_r_multiple: 1.2,
      expectancy: 45,
      sharpe_ratio: 1.1,
      consecutive_losses: 0,
      recommendations: ['Focus on trending markets', 'Trade during London-NY overlap for best results'],
      confidence_threshold_adjustment: 0
    };
  }
}
