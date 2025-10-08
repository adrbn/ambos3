import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { Language } from "@/i18n/translations";

interface SentimentTrendModuleProps {
  articles: any[];
  language: Language;
}

const SentimentTrendModule = ({ articles, language }: SentimentTrendModuleProps) => {
  const { t } = useTranslation(language);

  const processData = () => {
    if (!articles || articles.length === 0) return [];

    // Group articles by date and calculate average sentiment
    const dateMap = new Map<string, { positive: number; negative: number; neutral: number; count: number }>();

    articles.forEach(article => {
      const date = new Date(article.publishedAt || article.published_at).toLocaleDateString();
      const sentiment = article.sentiment?.label?.toLowerCase() || 'neutral';
      
      if (!dateMap.has(date)) {
        dateMap.set(date, { positive: 0, negative: 0, neutral: 0, count: 0 });
      }
      
      const entry = dateMap.get(date)!;
      entry.count++;
      
      if (sentiment.includes('positive') || sentiment.includes('positif')) {
        entry.positive++;
      } else if (sentiment.includes('negative') || sentiment.includes('négatif')) {
        entry.negative++;
      } else {
        entry.neutral++;
      }
    });

    // Convert to chart data
    return Array.from(dateMap.entries())
      .map(([date, data]) => ({
        date,
        positive: Math.round((data.positive / data.count) * 100),
        negative: Math.round((data.negative / data.count) * 100),
        neutral: Math.round((data.neutral / data.count) * 100),
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const data = processData();

  return (
    <Card className="h-full flex flex-col bg-card/30 border-primary/30 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-primary flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          {t('sentimentTrend')}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-2 overflow-auto">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--primary) / 0.1)" />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '10px' }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '10px' }}
                label={{ value: '%', position: 'insideLeft', style: { fontSize: '10px' } }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--primary) / 0.3)',
                  borderRadius: '6px',
                  fontSize: '11px'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '10px' }} />
              <Line 
                type="monotone" 
                dataKey="positive" 
                stroke="hsl(142, 76%, 36%)" 
                strokeWidth={2}
                name={t('positive')}
                dot={{ r: 3 }}
              />
              <Line 
                type="monotone" 
                dataKey="neutral" 
                stroke="hsl(var(--muted-foreground))" 
                strokeWidth={2}
                name={t('neutral')}
                dot={{ r: 3 }}
              />
              <Line 
                type="monotone" 
                dataKey="negative" 
                stroke="hsl(0, 84%, 60%)" 
                strokeWidth={2}
                name={t('negative')}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground text-xs">{t('noDataAvailable')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SentimentTrendModule;
