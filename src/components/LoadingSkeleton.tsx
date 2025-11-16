import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

/**
 * Loading Skeleton Components
 * Provide better UX during data loading instead of spinners
 */

export const ArticleCardSkeleton = () => (
  <Card className="w-full">
    <CardHeader>
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2 mt-2" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full mt-2" />
      <Skeleton className="h-4 w-2/3 mt-2" />
    </CardContent>
  </Card>
);

export const ArticleListSkeleton = ({ count = 3 }: { count?: number }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <ArticleCardSkeleton key={i} />
    ))}
  </div>
);

export const MapSkeleton = () => (
  <div className="w-full h-full flex items-center justify-center bg-muted rounded">
    <Skeleton className="w-full h-full" />
  </div>
);

export const GraphSkeleton = () => (
  <div className="w-full h-full flex flex-col items-center justify-center space-y-4 p-8">
    <Skeleton className="w-32 h-32 rounded-full" />
    <div className="flex gap-4">
      <Skeleton className="w-24 h-24 rounded-full" />
      <Skeleton className="w-24 h-24 rounded-full" />
      <Skeleton className="w-24 h-24 rounded-full" />
    </div>
    <Skeleton className="h-4 w-48" />
  </div>
);

export const TimelineSkeleton = () => (
  <div className="space-y-4 p-4">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="flex gap-4">
        <Skeleton className="w-16 h-16 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-full" />
        </div>
      </div>
    ))}
  </div>
);

export const SummaryCardSkeleton = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-48" />
    </CardHeader>
    <CardContent className="space-y-3">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
    </CardContent>
  </Card>
);

export const PredictionCardSkeleton = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-64" />
    </CardHeader>
    <CardContent className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </div>
      ))}
    </CardContent>
  </Card>
);

export const TableSkeleton = ({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) => (
  <div className="space-y-2">
    <div className="flex gap-4 pb-2 border-b">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-4 py-2">
        {Array.from({ length: columns }).map((_, j) => (
          <Skeleton key={j} className="h-3 flex-1" />
        ))}
      </div>
    ))}
  </div>
);

export const DashboardSkeleton = () => (
  <div className="p-4 space-y-4">
    {/* Header */}
    <div className="flex justify-between items-center">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-10 w-32" />
    </div>

    {/* Stats cards */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>

    {/* Main content */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="space-y-4">
        <SummaryCardSkeleton />
        <ArticleListSkeleton count={2} />
      </div>
      <div className="space-y-4">
        <GraphSkeleton />
        <TimelineSkeleton />
      </div>
    </div>
  </div>
);

export const ModuleSkeleton = ({ variant = 'default' }: { variant?: 'default' | 'map' | 'graph' | 'timeline' | 'summary' | 'predictions' }) => {
  switch (variant) {
    case 'map':
      return <MapSkeleton />;
    case 'graph':
      return <GraphSkeleton />;
    case 'timeline':
      return <TimelineSkeleton />;
    case 'summary':
      return <SummaryCardSkeleton />;
    case 'predictions':
      return <PredictionCardSkeleton />;
    default:
      return (
        <Card className="w-full h-full">
          <CardHeader>
            <Skeleton className="h-6 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      );
  }
};

