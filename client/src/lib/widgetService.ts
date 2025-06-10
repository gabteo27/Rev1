
import { apiRequest } from "./queryClient";

export interface WeatherData {
  temperature: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  city: string;
  country: string;
}

export interface NewsItem {
  title: string;
  description: string;
  url: string;
  urlToImage?: string;
  publishedAt: string;
  source: string;
}

export interface RSSItem {
  title: string;
  link: string;
  pubDate: string;
}

export class WidgetService {
  static async getWeatherData(city: string, apiKey: string): Promise<WeatherData> {
    const response = await fetch(`/api/widgets/weather/${encodeURIComponent(city)}?apiKey=${apiKey}`);
    if (!response.ok) {
      throw new Error('Failed to fetch weather data');
    }
    return response.json();
  }

  static async getRSSFeed(url: string, maxItems: number = 5): Promise<RSSItem[]> {
    const response = await fetch(`/api/widgets/rss?url=${encodeURIComponent(url)}&maxItems=${maxItems}`);
    if (!response.ok) {
      throw new Error('Failed to fetch RSS feed');
    }
    return response.json();
  }

  static async getNewsData(apiKey: string, country: string = 'es', category: string = 'general'): Promise<NewsItem[]> {
    const response = await fetch(`/api/widgets/news?apiKey=${apiKey}&country=${country}&category=${category}`);
    if (!response.ok) {
      throw new Error('Failed to fetch news data');
    }
    return response.json();
  }

  static formatTime(timezone: string = 'Europe/Madrid', format: '12h' | '24h' = '24h'): string {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: format === '12h'
    };
    return now.toLocaleTimeString('es-ES', options);
  }

  static formatDate(timezone: string = 'Europe/Madrid'): string {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return now.toLocaleDateString('es-ES', options);
  }
}
