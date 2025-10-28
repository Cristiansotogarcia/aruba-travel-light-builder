// Lazy-loaded admin dashboard components to reduce bundle size
import React, { Suspense } from 'react';

const ReportsDashboard = React.lazy(() => import('./ReportsDashboard').then(module => ({ default: module.ReportsDashboard })));
const EnhancedReportsDashboard = React.lazy(() => import('./EnhancedReportsDashboard').then(module => ({ default: module.EnhancedReportsDashboard })));

// Wrapper component for ReportsDashboard
export const LazyReportsDashboard = () => (
  <Suspense fallback={
    <div className="p-4">
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Loading Reports Dashboard...</span>
      </div>
    </div>
  }>
    <ReportsDashboard />
  </Suspense>
);

// Wrapper component for EnhancedReportsDashboard
export const LazyEnhancedReportsDashboard = () => (
  <Suspense fallback={
    <div className="p-4">
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Loading Enhanced Analytics...</span>
      </div>
    </div>
  }>
    <EnhancedReportsDashboard />
  </Suspense>
);
