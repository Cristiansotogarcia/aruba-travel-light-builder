import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';

export const EquipmentCardSkeleton = () => {
  return (
    <Card className="flex flex-col justify-between animate-pulse">
      <CardHeader>
        <div className="h-6 bg-muted/70 rounded w-3/4"></div>
        <div className="h-4 bg-muted/70 rounded w-1/4"></div>
      </CardHeader>
      <CardContent>
        <div className="h-4 bg-muted/70 rounded w-full"></div>
        <div className="h-4 bg-muted/70 rounded w-5/6 mt-2"></div>
        <div className="h-4 bg-muted/70 rounded w-1/2 mt-2"></div>
      </CardContent>
      <CardFooter>
        <div className="h-8 bg-muted/70 rounded w-1/3"></div>
        <div className="h-8 bg-muted/70 rounded w-1/4 ml-auto"></div>
      </CardFooter>
    </Card>
  );
};
