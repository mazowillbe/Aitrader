export interface NewsItem {
  title: string;
  source: string;
  url: string;
  published_at: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

export interface NewsAnalysis {
  overall_sentiment: 'positive' | 'negative' | 'neutral';
  news_count: number;
  top_headlines: string[];
  key_topics: string[];
  timestamp: string;
}
