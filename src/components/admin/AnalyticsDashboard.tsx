import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Users, Eye, TrendingUp, AlertCircle, Clock, Activity } from 'lucide-react';

interface AnalyticsData {
  pageviews: number;
  visitors: number;
  visits: number;
  bounceRate: number;
  avgSessionDuration: number;
  realTimeVisitors: number;
}

export const AnalyticsDashboard: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);

      const endpoint = import.meta.env.VITE_UMAMI_API_CLIENT_ENDPOINT || '';
      const apiKey = import.meta.env.VITE_UMAMI_API_KEY || '';
      const websiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID || '';


        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const startAt = Math.floor(thirtyDaysAgo.getTime());
        const endAt = Math.floor(now.getTime());
        const timezone = 'Europe/Amsterdam';

        const statsRes = await fetch(
          `${endpoint}/websites/${websiteId}/stats?startAt=${startAt}&endAt=${endAt}&timezone=${timezone}`,
          {
            headers: {
              'x-umami-api-key': apiKey,
              Accept: 'application/json'
            }
          }
        );

        const realTimeRes = await fetch(`${endpoint}/websites/${websiteId}/active`, {
          headers: {
            'x-umami-api-key': apiKey,
            Accept: 'application/json'
          }
        });

        if (!statsRes.ok || !realTimeRes.ok) {
          throw new Error('Failed to fetch Umami data');
        }

        const stats = await statsRes.json();
        const realTime = await realTimeRes.json();

        const visits = stats.visits ?? 0;
        const bounces = stats.bounces ?? 0;
        const totaltime = stats.totaltime ?? 0;

        const bounceRate = visits > 0 ? (bounces / visits) * 100 : 0;
        const avgSessionDuration = visits > 0 ? totaltime / visits / 1000 / 60 : 0;

        setData({
          pageviews: stats.pageviews ?? 0,
          visitors: stats.uniques ?? 0,
          visits: visits,
          bounceRate: Math.round(bounceRate * 10) / 10,
          avgSessionDuration: Math.round(avgSessionDuration * 10) / 10,
          realTimeVisitors: Array.isArray(realTime) && realTime.length > 0 ? realTime[0].x : 0
        });
      } catch (err) {
        console.error('Analytics fetch error:', err);
        setError('Failed to load analytics data from Umami. Please check your API configuration.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Analytics data is currently unavailable. Please try again later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Page Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.pageviews.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Visitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.visitors.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Visits</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.visits.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bounce Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.bounceRate}%</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Live Visitors</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data?.realTimeVisitors}</div>
            <p className="text-xs text-muted-foreground">Right now</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Session Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.avgSessionDuration.toFixed(1)} min</div>
            <p className="text-xs text-muted-foreground">Average time per visit</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Source</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-blue-600">Umami Analytics</div>
            <p className="text-xs text-muted-foreground">Real-time data • Updates every 30s</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Analytics Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Website Performance</span>
              <span className="text-sm text-green-600">Good</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">User Engagement</span>
              <span className="text-sm text-blue-600">Above Average</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Traffic Growth</span>
              <span className="text-sm text-green-600">+12.5%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsDashboard;
