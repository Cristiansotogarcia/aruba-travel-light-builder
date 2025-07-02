import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Spinner from '@/components/common/Spinner';

const WEBSITE_ID = '79d3968a-436f-4946-9d49-a87feb3a65c4';
const API_KEY = import.meta.env.VITE_UMAMI_API_KEY;

interface UmamiStats {
  pageviews: number;
  uniques: number;
}

export const AnalyticsDashboard: React.FC = () => {
  const [stats, setStats] = useState<UmamiStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const start = new Date();
        start.setDate(start.getDate() - 7);
        const res = await fetch(
          `https://cloud.umami.is/api/websites/${WEBSITE_ID}/stats?start_at=${start.getTime()}`,
          {
            headers: { Authorization: `Bearer ${API_KEY}` },
          }
        );
        if (!res.ok) throw new Error('Failed to fetch analytics');
        const data = await res.json();
        setStats({
          pageviews: data.pageviews?.value ?? 0,
          uniques: data.uniques?.value ?? 0,
        });
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Failed to fetch analytics');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Website Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <Spinner />}
          {error && <p className="text-red-500">{error}</p>}
          {stats && !loading && !error && (
            <div className="flex gap-8">
              <div>
                <p className="text-sm text-gray-600">Pageviews</p>
                <p className="text-2xl font-bold">{stats.pageviews}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Unique Visitors</p>
                <p className="text-2xl font-bold">{stats.uniques}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
