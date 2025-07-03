interface UmamiMetrics {
  pageviews: number;
  visitors: number;
  visits: number;
  bounceRate: number;
  avgSessionDuration: number;
}

interface UmamiPageView {
  x: string;
  y: number;
}

interface UmamiApiResponse {
  pageviews: UmamiPageView[];
  sessions: UmamiPageView[];
}

class UmamiService {

  private async apiCall(method: string, ...params: any[]) {

    const umamiProxyUrl = `https://abofxrgdxfzrhjbvhdkj.supabase.co/functions/v1/umami-proxy`;

    const response = await fetch(umamiProxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ method, params }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  }

  async getWebsiteStats(startDate?: Date, endDate?: Date): Promise<UmamiMetrics> {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const start = startDate?.getTime() || thirtyDaysAgo;
    const end = endDate?.getTime() || now;

    try {
      const data = await this.apiCall('getWebsiteStats', {
        startAt: start,
        endAt: end,
      });

      if (!data) {
        throw new Error(`Umami API error: Failed to get website stats`);
      }

      const bounceRate = data.visits?.value > 0 
        ? (data.bounces?.value / data.visits?.value) * 100 
        : 0;
      const avgSessionDuration = data.visits?.value > 0
        ? data.totaltime?.value / data.visits?.value / 1000 / 60
        : 0;

      return {
        pageviews: data.pageviews?.value || 0,
        visitors: data.visitors?.value || 0,
        visits: data.visits?.value || 0,
        bounceRate: Math.round(bounceRate * 10) / 10,
        avgSessionDuration: Math.round(avgSessionDuration * 10) / 10,
      };
    } catch (error) {
      console.error('Error fetching Umami stats:', error);
      throw error;
    }
  }

  async getPageViews(startDate?: Date, endDate?: Date): Promise<UmamiApiResponse> {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const start = startDate?.getTime() || sevenDaysAgo;
    const end = endDate?.getTime() || now;

    try {
      const data = await this.apiCall('getWebsitePageviews', {
        startAt: start,
        endAt: end,
        unit: 'day',
        timezone: ''
      });

      if (!data) {
        throw new Error(`Umami API error: Failed to get page views`);
      }

      return {
  pageviews: data.pageviews.map((p: { t: string; y: number }) => ({ x: p.t, y: p.y })),
  sessions: data.sessions.map((s: { t: string; y: number }) => ({ x: s.t, y: s.y })),
};

    } catch (error) {
      console.error('Error fetching Umami pageviews:', error);
      throw error;
    }
  }

  async getTopPages(startDate?: Date, endDate?: Date, limit: number = 10) {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const start = startDate?.getTime() || thirtyDaysAgo;
    const end = endDate?.getTime() || now;

    try {
      const data = await this.apiCall('getWebsiteMetrics', {
        startAt: start,
        endAt: end,
        type: 'url',
        limit,
      });

      if (!data) {
        throw new Error(`Umami API error: Failed to get top pages`);
      }

      return data;
    } catch (error) {
      console.error('Error fetching Umami top pages:', error);
      throw error;
    }
  }

  async getRealTimeVisitors(): Promise<number> {
    try {
      const data = await this.apiCall('getWebsiteActive');

      if (!data) {
        throw new Error(`Umami API error: Failed to get real-time visitors`);
      }

      return data?.x || 0;
    } catch (error) {
      console.error('Error fetching real-time visitors:', error);
      return 0;
    }
  }
}

export const umamiService = new UmamiService();
export type { UmamiMetrics, UmamiApiResponse };
