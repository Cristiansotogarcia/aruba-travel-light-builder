import React, { Suspense } from 'react';

const Loading = () => <div className="flex items-center justify-center min-h-[300px]"><div>Loading Chart...</div></div>;

// Dynamically import individual components from recharts
export const LineChart = React.lazy(() => import('recharts').then(module => ({ default: module.LineChart })));
export const BarChart = React.lazy(() => import('recharts').then(module => ({ default: module.BarChart })));
export const Line = React.lazy(() => import('recharts').then(module => ({ default: module.Line })));
export const Bar = React.lazy(() => import('recharts').then(module => ({ default: module.Bar as unknown as React.ComponentType<any> })));
export const XAxis = React.lazy(() => import('recharts').then(module => ({ default: module.XAxis })));
export const YAxis = React.lazy(() => import('recharts').then(module => ({ default: module.YAxis })));
export const CartesianGrid = React.lazy(() => import('recharts').then(module => ({ default: module.CartesianGrid })));
export const Tooltip = React.lazy(() => import('recharts').then(module => ({ default: module.Tooltip })));
export const Legend = React.lazy(() => import('recharts').then(module => ({ default: module.Legend })));
export const ResponsiveContainer = React.lazy(() => import('recharts').then(module => ({ default: module.ResponsiveContainer })));

// Wrapper component to provide Suspense
export const DynamicChartWrapper = ({ children }: { children: React.ReactNode }) => (
    <Suspense fallback={<Loading />}>
        {children}
    </Suspense>
);
