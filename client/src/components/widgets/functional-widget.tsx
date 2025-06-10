
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Cloud, Newspaper, Rss, AlertCircle } from "lucide-react";
import { WidgetService, type WeatherData, type NewsItem, type RSSItem } from "@/lib/widgetService";
import type { Widget } from "@shared/schema";

interface FunctionalWidgetProps {
  widget: Widget;
  className?: string;
}

export function FunctionalWidget({ widget, className = "" }: FunctionalWidgetProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!widget.isEnabled) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        switch (widget.type) {
          case 'weather':
            if (widget.settings?.apiKey && widget.settings?.city) {
              const weatherData = await WidgetService.getWeatherData(
                widget.settings.city,
                widget.settings.apiKey
              );
              setData(weatherData);
            }
            break;

          case 'rss':
            if (widget.settings?.feedUrl) {
              const rssData = await WidgetService.getRSSFeed(
                widget.settings.feedUrl,
                widget.settings?.maxItems || 5
              );
              setData(rssData);
            }
            break;

          case 'news':
            if (widget.settings?.apiKey) {
              const newsData = await WidgetService.getNewsData(
                widget.settings.apiKey,
                widget.settings?.country || 'es',
                widget.settings?.category || 'general'
              );
              setData(newsData);
            }
            break;

          case 'clock':
            // Clock updates every second
            const updateClock = () => {
              setData({
                time: WidgetService.formatTime(
                  widget.settings?.timezone || 'Europe/Madrid',
                  widget.settings?.format || '24h'
                ),
                date: widget.settings?.showDate ? WidgetService.formatDate(
                  widget.settings?.timezone || 'Europe/Madrid'
                ) : null
              });
            };
            updateClock();
            const interval = setInterval(updateClock, 1000);
            return () => clearInterval(interval);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Set up refresh intervals for different widget types
    if (widget.type === 'weather') {
      const interval = setInterval(fetchData, 10 * 60 * 1000); // 10 minutes
      return () => clearInterval(interval);
    } else if (widget.type === 'rss') {
      const interval = setInterval(fetchData, (widget.settings?.refreshInterval || 30) * 60 * 1000);
      return () => clearInterval(interval);
    } else if (widget.type === 'news') {
      const interval = setInterval(fetchData, 30 * 60 * 1000); // 30 minutes
      return () => clearInterval(interval);
    }
  }, [widget]);

  const getIcon = () => {
    switch (widget.type) {
      case 'clock':
        return <Clock className="w-4 h-4" />;
      case 'weather':
        return <Cloud className="w-4 h-4" />;
      case 'news':
        return <Newspaper className="w-4 h-4" />;
      case 'rss':
        return <Rss className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-4 text-center">
          <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
          <p className="text-xs text-red-600">{error}</p>
        </div>
      );
    }

    switch (widget.type) {
      case 'clock':
        return (
          <div className="text-center p-4">
            <div className="text-2xl font-bold text-slate-900 mb-1">
              {data?.time || '--:--:--'}
            </div>
            {data?.date && (
              <div className="text-sm text-slate-600">
                {data.date}
              </div>
            )}
          </div>
        );

      case 'weather':
        return data ? (
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg font-bold">{data.temperature}°C</span>
              <img 
                src={`https://openweathermap.org/img/w/${data.icon}.png`}
                alt={data.description}
                className="w-8 h-8"
              />
            </div>
            <p className="text-sm text-slate-600 capitalize mb-1">{data.description}</p>
            <p className="text-xs text-slate-500">{data.city}, {data.country}</p>
          </div>
        ) : null;

      case 'news':
        return data ? (
          <div className="p-4 space-y-3 max-h-48 overflow-y-auto">
            {data.slice(0, 3).map((article: NewsItem, index: number) => (
              <div key={index} className="border-b last:border-b-0 pb-2 last:pb-0">
                <h4 className="text-sm font-medium text-slate-900 line-clamp-2 mb-1">
                  {article.title}
                </h4>
                <p className="text-xs text-slate-500">{article.source} • {article.publishedAt}</p>
              </div>
            ))}
          </div>
        ) : null;

      case 'rss':
        return data ? (
          <div className="p-4 space-y-2 max-h-48 overflow-y-auto">
            {data.slice(0, 4).map((item: RSSItem, index: number) => (
              <div key={index} className="border-b last:border-b-0 pb-2 last:pb-0">
                <h4 className="text-sm font-medium text-slate-900 line-clamp-2 mb-1">
                  {item.title}
                </h4>
                <p className="text-xs text-slate-500">{item.pubDate}</p>
              </div>
            ))}
          </div>
        ) : null;

      default:
        return (
          <div className="p-4 text-center">
            <p className="text-sm text-slate-600">Widget no configurado</p>
          </div>
        );
    }
  };

  if (!widget.isEnabled) {
    return null;
  }

  return (
    <Card className={`border-slate-200 ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center space-x-2">
          {getIcon()}
          <CardTitle className="text-sm">{widget.name}</CardTitle>
          <Badge variant="outline" className="text-xs">
            {widget.type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {renderContent()}
      </CardContent>
    </Card>
  );
}
