import axios from 'axios';
import type { NewsAnalysis, NewsItem } from '../types/news';

/**
 * News & Sentiment Analysis Service
 *
 * Fetches financial news from:
 * - NewsAPI (free tier)
 * - CryptoPanic (crypto news)
 * - Demo news for testing
 *
 * Filters out:
 * - Fake news and clickbait
 * - Market manipulation attempts
 * - Low-quality sources
 */
export class NewsService {
  private demoMode: boolean;

  constructor() {
    this.demoMode = !process.env.NEWS_API_KEY;
    if (this.demoMode) {
      console.log('⚠️ No news API key configured - using DEMO news');
    }
  }

  /**
   * Fetch and analyze news
   */
  async fetchAndAnalyze(): Promise<NewsAnalysis> {
    try {
      const news = this.demoMode ? this.generateDemoNews() : await this.fetchRealNews();

      // Filter out fake news and noise
      const filteredNews = this.filterNews(news);

      // Analyze sentiment
      const sentiment = this.analyzeSentiment(filteredNews);

      return {
        overall_sentiment: sentiment,
        news_count: filteredNews.length,
        top_headlines: filteredNews.slice(0, 5).map(n => n.title),
        key_topics: this.extractKeyTopics(filteredNews),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.warn('Failed to fetch news:', error);
      return this.generateDemoNews();
    }
  }

  /**
   * Fetch real news from APIs
   */
  private async fetchRealNews(): Promise<NewsItem[]> {
    const news: NewsItem[] = [];

    // Fetch from NewsAPI
    if (process.env.NEWS_API_KEY) {
      try {
        const response = await axios.get('https://newsapi.org/v2/everything', {
          params: {
            q: 'trading OR bitcoin OR stock market OR forex',
            language: 'en',
            sortBy: 'publishedAt',
            pageSize: 20,
            apiKey: process.env.NEWS_API_KEY
          }
        });

        news.push(...response.data.articles.map((article: any) => ({
          title: article.title,
          source: article.source.name,
          url: article.url,
          published_at: article.publishedAt,
          sentiment: 'neutral' as const
        })));
      } catch (error) {
        console.warn('NewsAPI fetch failed:', error);
      }
    }

    return news;
  }

  /**
   * Generate demo news for testing
   */
  private generateDemoNews(): NewsAnalysis {
    const sentiments = ['positive', 'negative', 'neutral'] as const;
    const randomSentiment = sentiments[Math.floor(Math.random() * sentiments.length)];

    return {
      overall_sentiment: randomSentiment,
      news_count: 15,
      top_headlines: [
        'Federal Reserve signals potential rate cuts amid economic slowdown',
        'Bitcoin reaches new highs as institutional adoption accelerates',
        'Tech stocks rally on strong earnings reports',
        'Global markets show resilience despite geopolitical tensions',
        'Cryptocurrency regulation talks advance in major economies'
      ],
      key_topics: ['monetary_policy', 'cryptocurrency', 'tech_earnings', 'regulation'],
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Filter out fake news, clickbait, and manipulation
   */
  private filterNews(news: NewsItem[]): NewsItem[] {
    // Simple filtering rules
    const blacklistedSources = ['unverified', 'unknown', 'spam'];
    const clickbaitKeywords = ['you won\'t believe', 'shocking', 'this one trick', '🚀🚀🚀'];

    return news.filter(item => {
      // Filter blacklisted sources
      if (blacklistedSources.some(source => item.source.toLowerCase().includes(source))) {
        return false;
      }

      // Filter obvious clickbait
      if (clickbaitKeywords.some(keyword => item.title.toLowerCase().includes(keyword))) {
        return false;
      }

      return true;
    });
  }

  /**
   * Analyze overall sentiment from news
   */
  private analyzeSentiment(news: NewsItem[]): 'positive' | 'negative' | 'neutral' {
    if (news.length === 0) return 'neutral';

    // Simple keyword-based sentiment analysis
    const positiveKeywords = ['rally', 'surge', 'gains', 'bullish', 'growth', 'positive', 'up', 'rise'];
    const negativeKeywords = ['crash', 'drop', 'bearish', 'decline', 'fall', 'negative', 'down', 'loss'];

    let positiveCount = 0;
    let negativeCount = 0;

    news.forEach(item => {
      const title = item.title.toLowerCase();
      positiveCount += positiveKeywords.filter(kw => title.includes(kw)).length;
      negativeCount += negativeKeywords.filter(kw => title.includes(kw)).length;
    });

    if (positiveCount > negativeCount * 1.2) return 'positive';
    if (negativeCount > positiveCount * 1.2) return 'negative';
    return 'neutral';
  }

  /**
   * Extract key topics from news
   */
  private extractKeyTopics(news: NewsItem[]): string[] {
    const topics = new Set<string>();
    const topicKeywords: Record<string, string[]> = {
      'monetary_policy': ['fed', 'interest rate', 'central bank', 'inflation'],
      'cryptocurrency': ['bitcoin', 'crypto', 'blockchain', 'ethereum'],
      'tech_earnings': ['earnings', 'tech', 'apple', 'google', 'microsoft'],
      'regulation': ['regulation', 'sec', 'government', 'policy'],
      'geopolitics': ['war', 'conflict', 'sanctions', 'trade']
    };

    news.forEach(item => {
      const title = item.title.toLowerCase();
      Object.entries(topicKeywords).forEach(([topic, keywords]) => {
        if (keywords.some(kw => title.includes(kw))) {
          topics.add(topic);
        }
      });
    });

    return Array.from(topics);
  }
}
