import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Target } from 'lucide-react';

export interface RadarDataPoint {
  subject: string;
  value: number;
  fullMark: number;
}

export interface RadarSeries {
  name: string;
  data: RadarDataPoint[];
  color: string;
}

interface RadarChartModuleProps {
  series: RadarSeries[];
  title?: string;
  description?: string;
}

/**
 * RadarChartModule - Multi-dimensional comparison visualization
 * Perfect for comparing capabilities, threats, or multi-factor analysis
 */
export function RadarChartModule({ 
  series, 
  title = "Analyse radar", 
  description 
}: RadarChartModuleProps) {
  // Merge all series data by subject
  const mergedData = series[0]?.data.map((point, index) => {
    const dataPoint: any = {
      subject: point.subject,
      fullMark: point.fullMark
    };
    
    series.forEach(s => {
      dataPoint[s.name] = s.data[index]?.value || 0;
    });
    
    return dataPoint;
  }) || [];

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-500" />
          <CardTitle>{title}</CardTitle>
        </div>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <ResponsiveContainer width="100%" height="100%" minHeight={300}>
          <RadarChart data={mergedData}>
            <PolarGrid stroke="#374151" />
            <PolarAngleAxis 
              dataKey="subject" 
              tick={{ fill: '#9ca3af', fontSize: 12 }}
            />
            <PolarRadiusAxis 
              angle={90} 
              domain={[0, 100]}
              tick={{ fill: '#9ca3af', fontSize: 10 }}
            />
            {series.map((s, index) => (
              <Radar
                key={s.name}
                name={s.name}
                dataKey={s.name}
                stroke={s.color}
                fill={s.color}
                fillOpacity={0.3}
              />
            ))}
            <Legend />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '6px',
                color: '#f3f4f6'
              }}
            />
          </RadarChart>
        </ResponsiveContainer>

        {/* Summary Stats */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {series.map(s => {
            const avg = s.data.reduce((sum, p) => sum + p.value, 0) / s.data.length;
            const max = Math.max(...s.data.map(p => p.value));
            
            return (
              <div key={s.name} className="text-center p-3 rounded-lg border" style={{ borderColor: s.color }}>
                <div className="text-xs font-medium mb-1" style={{ color: s.color }}>
                  {s.name}
                </div>
                <div className="text-2xl font-bold">{avg.toFixed(0)}</div>
                <div className="text-xs text-muted-foreground">
                  Moy. (Max: {max})
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default RadarChartModule;

