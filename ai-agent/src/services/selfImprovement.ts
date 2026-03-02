import { GoogleGenerativeAI } from '@google/generative-ai';
import type { 
  AIInsight, 
  PerformanceMetrics, 
  TradeContext, 
  TradeOutcome,
  MarketRegime,
  StrategyType 
} from '../types/enhanced';

/**
 * Self-Improvement Service
 * 
 * AI-powered analysis and recommendations:
 * - Analyzes trading patterns
 * - Identifies strengths and weaknesses
 * - Suggests strategy adjustments
 * - Generates weekly performance reports
 */
export class SelfImprovementService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private isEnabled: boolean;
  private insightHistory: AIInsight[] = [];

  constructor() {
    this.isEnabled = process.env.ENABLE_SELF_IMPROVEMENT !== 'false';
    
    if (this.isEnabled && process.env.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    } else {
      console.log('⚠️ Self-Improvement Service disabled');
    }
  }

  /**
   * Analyze performance and generate insights
   */
  async analyzePerformance(metrics: PerformanceMetrics): Promise<AIInsight[]> {
    if (!this.isEnabled || !this.model) return [];

    try {
      const prompt = this.buildPerformanceAnalysisPrompt(metrics);
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      const insights = this.parseInsights(response);
      this.insightHistory.push(...insights);
      
      return insights;
    } catch (error) {
      console.error('Performance analysis failed:', error);
      return [];
    }
  }

  /**
   * Analyze a specific trade for learning
   */
  async analyzeTrade(context: TradeContext, outcome: TradeOutcome): Promise<AIInsight | null> {
    if (!this.isEnabled || !this.model) return null;

    try {
      const prompt = this.buildTradeAnalysisPrompt(context, outcome);
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      return this.parseSingleInsight(response, 'trade_analysis');
    } catch (error) {
      console.error('Trade analysis failed:', error);
      return null;
    }
  }

  /**
   * Get strategy recommendations based on performance
   */
  async getStrategyRecommendations(
    byRegime: Record<MarketRegime, { winRate: number; avgRMultiple: number }>,
    bySession: Record<string, { winRate: number; avgRMultiple: number }>,
    byStrategy: Record<StrategyType, { winRate: number; avgRMultiple: number }>
  ): Promise<string[]> {
    if (!this.isEnabled || !this.model) return [];

    try {
      const prompt = `Analyze trading performance by different dimensions and provide strategic recommendations.

BY MARKET REGIME:
${JSON.stringify(byRegime, null, 2)}

BY TRADING SESSION:
${JSON.stringify(bySession, null, 2)}

BY STRATEGY:
${JSON.stringify(byStrategy, null, 2)}

Provide 3-5 specific, actionable recommendations to improve trading performance.
Consider:
1. Which regimes/sessions/strategies are performing best
2. Which should be avoided or modified
3. Position sizing adjustments
4. Entry/exit timing improvements

Format each recommendation on a new line starting with "• "`;

      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      return response.split('\n')
        .filter((line: string) => line.trim().startsWith('•'))
        .map((line: string) => line.replace('• ', '').trim());
    } catch (error) {
      console.error('Strategy recommendations failed:', error);
      return [];
    }
  }

  /**
   * Detect bias in trading decisions
   */
  async detectBias(recentDecisions: Array<{
    action: string;
    symbol: string;
    confidence: number;
    outcome?: string;
  }>): Promise<{ detected: boolean; type: string; description: string }> {
    if (!this.isEnabled || !this.model || recentDecisions.length < 10) {
      return { detected: false, type: 'none', description: '' };
    }

    try {
      const prompt = `Analyze recent trading decisions for behavioral bias.

RECENT DECISIONS:
${JSON.stringify(recentDecisions, null, 2)}

Detect common trading biases:
- Confirmation bias: Only seeing signals that support existing views
- Recency bias: Overweighting recent outcomes
- Loss aversion: Holding losers too long, cutting winners too short
- Overconfidence: Taking too much risk after wins
- Herding: Following market sentiment too closely
- Anchoring: Fixating on specific price levels

Output JSON:
{
  "detected": true/false,
  "type": "bias_type",
  "description": "How this bias is manifesting and how to correct it"
}`;

      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Bias detection failed:', error);
    }

    return { detected: false, type: 'none', description: '' };
  }

  /**
   * Generate weekly performance report
   */
  async generateWeeklyReport(metrics: PerformanceMetrics): Promise<string> {
    if (!this.isEnabled || !this.model) {
      return this.generateBasicReport(metrics);
    }

    try {
      const prompt = `Generate a professional weekly trading performance report.

PERFORMANCE METRICS:
${JSON.stringify(metrics, null, 2)}

Create a structured report with:
1. Executive Summary (2-3 sentences)
2. Key Metrics Analysis
3. What Went Well
4. Areas for Improvement
5. Action Items for Next Week

Keep the report concise and actionable. Use markdown formatting.`;

      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error('Weekly report generation failed:', error);
      return this.generateBasicReport(metrics);
    }
  }

  /**
   * Build performance analysis prompt
   */
  private buildPerformanceAnalysisPrompt(metrics: PerformanceMetrics): string {
    return `Analyze this trading performance data and identify patterns, strengths, and weaknesses.

PERFORMANCE METRICS:
- Total Trades: ${metrics.totalTrades}
- Win Rate: ${(metrics.winRate * 100).toFixed(1)}%
- Profit Factor: ${metrics.profitFactor.toFixed(2)}
- Expectancy: ${metrics.expectancy.toFixed(4)}
- Sharpe Ratio: ${metrics.sharpeRatio.toFixed(2)}
- Max Drawdown: ${(metrics.maxDrawdown * 100).toFixed(1)}%
- Average R-Multiple: ${metrics.avgRMultiple.toFixed(2)}
- Best Trade: ${metrics.bestTrade.toFixed(2)}R
- Worst Trade: ${metrics.worstTrade.toFixed(2)}R
- Max Consecutive Wins: ${metrics.maxConsecutiveWins}
- Max Consecutive Losses: ${metrics.maxConsecutiveLosses}

BY MARKET REGIME:
${JSON.stringify(metrics.byRegime, null, 2)}

BY TRADING SESSION:
${JSON.stringify(metrics.bySession, null, 2)}

BY STRATEGY:
${JSON.stringify(metrics.byStrategy, null, 2)}

Identify 3-5 insights in JSON array format:
[
  {
    "type": "pattern|recommendation|warning|improvement",
    "title": "Brief title",
    "description": "Detailed insight",
    "impact": "low|medium|high",
    "category": "strategy|risk|execution|psychology"
  }
]

Focus on actionable insights that can improve future performance.`;
  }

  /**
   * Build trade analysis prompt
   */
  private buildTradeAnalysisPrompt(context: TradeContext, outcome: TradeOutcome): string {
    return `Analyze this trade for learning and improvement.

TRADE CONTEXT:
- Market Regime: ${context.marketRegime}
- Confluence Score: ${context.confluenceScore.toFixed(2)}
- Session: ${context.session}
- Strategy: ${context.strategy}
- AI Confidence: ${context.confidence.toFixed(2)}
- News Sentiment: ${context.newsSentiment}
- Time: ${context.timeOfDay} on ${context.dayOfWeek}

TRADE OUTCOME:
- R-Multiple: ${outcome.rMultiple.toFixed(2)}
- Hold Time: ${Math.round(outcome.holdTime / 60)} minutes
- Exit Reason: ${outcome.exitReason}
- Max Adverse Excursion: ${outcome.maxAdverseExcursion.toFixed(2)}
- Max Favorable Excursion: ${outcome.maxFavorableExcursion.toFixed(2)}

Provide a brief analysis in JSON format:
{
  "type": "pattern|recommendation|warning|improvement",
  "title": "Key learning from this trade",
  "description": "What can be learned or improved",
  "impact": "low|medium|high",
  "category": "strategy|risk|execution|psychology"
}`;
  }

  /**
   * Parse insights from AI response
   */
  private parseInsights(response: string): AIInsight[] {
    const insights: AIInsight[] = [];

    try {
      // Extract JSON array
      const jsonMatch = response.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        for (const item of parsed) {
          insights.push({
            id: `insight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: item.type || 'recommendation',
            title: item.title || 'Performance Insight',
            description: item.description || '',
            impact: item.impact || 'medium',
            category: item.category || 'strategy',
            createdAt: new Date()
          });
        }
      }
    } catch (error) {
      console.error('Failed to parse insights:', error);
    }

    return insights;
  }

  /**
   * Parse single insight from AI response
   */
  private parseSingleInsight(response: string, defaultType: string): AIInsight {
    try {
      const jsonMatch = response.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const item = JSON.parse(jsonMatch[0]);
        return {
          id: `insight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: item.type || defaultType,
          title: item.title || 'Trade Analysis',
          description: item.description || '',
          impact: item.impact || 'medium',
          category: item.category || 'execution',
          createdAt: new Date()
        };
      }
    } catch (error) {
      console.error('Failed to parse insight:', error);
    }

    return {
      id: `insight-${Date.now()}`,
      type: 'pattern',
      title: 'Trade Completed',
      description: 'Analysis not available',
      impact: 'low',
      category: 'execution',
      createdAt: new Date()
    };
  }

  /**
   * Generate basic report without AI
   */
  private generateBasicReport(metrics: PerformanceMetrics): string {
    const winRate = (metrics.winRate * 100).toFixed(1);
    const profitFactor = metrics.profitFactor.toFixed(2);
    
    return `# Weekly Trading Report

## Summary
- Total Trades: ${metrics.totalTrades}
- Win Rate: ${winRate}%
- Profit Factor: ${profitFactor}
- Average R-Multiple: ${metrics.avgRMultiple.toFixed(2)}
- Max Drawdown: ${(metrics.maxDrawdown * 100).toFixed(1)}%

## Performance Notes
${metrics.winRate > 0.5 ? '✅ Positive win rate maintained' : '⚠️ Win rate below 50%'}
${metrics.profitFactor > 1 ? '✅ Profitable system' : '⚠️ Profit factor below 1'}
${metrics.avgRMultiple > 0 ? '✅ Positive average R-multiple' : '⚠️ Negative average R-multiple'}

_Generated automatically by the AI Trading System_`;
  }

  /**
   * Get insight history
   */
  getInsightHistory(): AIInsight[] {
    return [...this.insightHistory];
  }

  /**
   * Get recent insights
   */
  getRecentInsights(count: number = 10): AIInsight[] {
    return this.insightHistory
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, count);
  }

  /**
   * Suggest confidence threshold adjustment
   */
  suggestConfidenceAdjustment(
    confidenceBuckets: Record<string, { wins: number; total: number }>
  ): { current: number; suggested: number; reasoning: string } {
    // Analyze win rate by confidence level
    let bestThreshold = 0.6;
    let bestScore = 0;

    for (const [confidence, stats] of Object.entries(confidenceBuckets)) {
      if (stats.total >= 5) {
        const winRate = stats.wins / stats.total;
        const score = winRate * stats.total; // Weight by sample size
        
        if (score > bestScore) {
          bestScore = score;
          bestThreshold = parseFloat(confidence);
        }
      }
    }

    return {
      current: 0.6,
      suggested: bestThreshold,
      reasoning: `Confidence level ${bestThreshold.toFixed(2)} has the best risk-adjusted win rate based on ${Math.round(bestScore)} trades`
    };
  }

  /**
   * Check if system should be in "learning mode"
   */
  shouldEnterLearningMode(metrics: PerformanceMetrics): boolean {
    // Enter learning mode if:
    // 1. Drawdown exceeds 15%
    // 2. Win rate drops below 35%
    // 3. 5+ consecutive losses
    
    if (metrics.maxDrawdown > 0.15) return true;
    if (metrics.winRate < 0.35 && metrics.totalTrades >= 20) return true;
    if (metrics.maxConsecutiveLosses >= 5) return true;
    
    return false;
  }
}
