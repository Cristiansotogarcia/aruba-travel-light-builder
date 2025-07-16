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

interface UmamiGeoData {
  x: string;
  y: number;
}

interface UmamiDeviceData {
  x: string;
  y: number;
}

interface UmamiReferrerData {
  x: string;
  y: number;
}

interface UmamiTopPage {
  x: string;
  y: number;
}

// ✅ Constantes bovenin voor hergebruik
const API_KEY = import.meta.env.VITE_UMAMI_API_KEY;
const API_ENDPOINT = import.meta.env.VITE_UMAMI_API_CLIENT_ENDPOINT;
const WEBSITE_ID = import.meta.env.VITE_UMAMI_WEBSITE_ID;

class UmamiService {
  async getWebsiteStats(startDate?: Date, endDate?: Date): Promise<UmamiMetrics> {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const start = startDate?.getTime() ?? thirtyDaysAgo;
    const end = endDate?.getTime() ?? now;

    const url = `${API_ENDPOINT}/websites/${WEBSITE_ID}/stats?startAt=${start}&endAt=${end}`;

    const res = await fetch(url, {
      headers: {
        'x-umami-api-key': API_KEY,
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Umami error ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();

    return {
      pageviews: data.pageviews?.value ?? 0,
      visitors: data.visitors?.value ?? 0,
      visits: data.visits?.value ?? 0,
      bounceRate: data.bounce_rate?.value ?? data.bouncerate?.value ?? 0,
      avgSessionDuration: data.totaltime?.value ?? 0,
    };
  }

  async getPageViews(startDate?: Date, endDate?: Date): Promise<UmamiApiResponse> {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const start = startDate?.getTime() ?? sevenDaysAgo;
    const end = endDate?.getTime() ?? now;

    const url = `${API_ENDPOINT}/websites/${WEBSITE_ID}/pageviews?startAt=${start}&endAt=${end}&unit=day`;

    const res = await fetch(url, {
      headers: {
        'x-umami-api-key': API_KEY,
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Umami error ${res.status}: ${await res.text()}`);
    }

    return res.json();
  }

  async getTopPages(startDate?: Date, endDate?: Date, limit: number = 10): Promise<UmamiTopPage[]> {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const start = startDate?.getTime() ?? thirtyDaysAgo;
    const end = endDate?.getTime() ?? now;

    const url = `${API_ENDPOINT}/websites/${WEBSITE_ID}/metrics?type=url&startAt=${start}&endAt=${end}&limit=${limit}`;

    const res = await fetch(url, {
      headers: {
        'x-umami-api-key': API_KEY,
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Umami error ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    return data || [];
  }

  async getRealTimeVisitors(): Promise<number> {
    const url = `${API_ENDPOINT}/websites/${WEBSITE_ID}/active`;

    const res = await fetch(url, {
      headers: {
        'x-umami-api-key': API_KEY,
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Umami error ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    return Array.isArray(data) ? data.length : data?.x || 0;
  }

  async getCountries(startDate?: Date, endDate?: Date, limit: number = 10): Promise<UmamiGeoData[]> {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const start = startDate?.getTime() ?? thirtyDaysAgo;
    const end = endDate?.getTime() ?? now;

    const url = `${API_ENDPOINT}/websites/${WEBSITE_ID}/metrics?type=country&startAt=${start}&endAt=${end}&limit=${limit}`;

    const res = await fetch(url, {
      headers: {
        'x-umami-api-key': API_KEY,
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Umami error ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    return data || [];
  }

  async getDevices(startDate?: Date, endDate?: Date, limit: number = 10): Promise<UmamiDeviceData[]> {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const start = startDate?.getTime() ?? thirtyDaysAgo;
    const end = endDate?.getTime() ?? now;

    const url = `${API_ENDPOINT}/websites/${WEBSITE_ID}/metrics?type=device&startAt=${start}&endAt=${end}&limit=${limit}`;

    const res = await fetch(url, {
      headers: {
        'x-umami-api-key': API_KEY,
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Umami error ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    return data || [];
  }

  async getBrowsers(startDate?: Date, endDate?: Date, limit: number = 10): Promise<UmamiDeviceData[]> {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const start = startDate?.getTime() ?? thirtyDaysAgo;
    const end = endDate?.getTime() ?? now;

    const url = `${API_ENDPOINT}/websites/${WEBSITE_ID}/metrics?type=browser&startAt=${start}&endAt=${end}&limit=${limit}`;

    const res = await fetch(url, {
      headers: {
        'x-umami-api-key': API_KEY,
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Umami error ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    return data || [];
  }

  async getReferrers(startDate?: Date, endDate?: Date, limit: number = 10): Promise<UmamiReferrerData[]> {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const start = startDate?.getTime() ?? thirtyDaysAgo;
    const end = endDate?.getTime() ?? now;

    const url = `${API_ENDPOINT}/websites/${WEBSITE_ID}/metrics?type=referrer&startAt=${start}&endAt=${end}&limit=${limit}`;

    const res = await fetch(url, {
      headers: {
        'x-umami-api-key': API_KEY,
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Umami error ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    return data || [];
  }

  async getEvents(startDate?: Date, endDate?: Date, limit: number = 10): Promise<UmamiGeoData[]> {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const start = startDate?.getTime() ?? thirtyDaysAgo;
    const end = endDate?.getTime() ?? now;

    const url = `${API_ENDPOINT}/websites/${WEBSITE_ID}/metrics?type=event&startAt=${start}&endAt=${end}&limit=${limit}`;

    const res = await fetch(url, {
      headers: {
        'x-umami-api-key': API_KEY,
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Umami error ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    return data || [];
  }

  async getOperatingSystems(startDate?: Date, endDate?: Date, limit: number = 10): Promise<UmamiDeviceData[]> {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const start = startDate?.getTime() ?? thirtyDaysAgo;
    const end = endDate?.getTime() ?? now;

    const url = `${API_ENDPOINT}/websites/${WEBSITE_ID}/metrics?type=os&startAt=${start}&endAt=${end}&limit=${limit}`;

    const res = await fetch(url, {
      headers: {
        'x-umami-api-key': API_KEY,
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Umami error ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    return data || [];
  }

  async getCities(startDate?: Date, endDate?: Date, limit: number = 10): Promise<UmamiGeoData[]> {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const start = startDate?.getTime() ?? thirtyDaysAgo;
    const end = endDate?.getTime() ?? now;

    const url = `${API_ENDPOINT}/websites/${WEBSITE_ID}/metrics?type=city&startAt=${start}&endAt=${end}&limit=${limit}`;

    const res = await fetch(url, {
      headers: {
        'x-umami-api-key': API_KEY,
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Umami error ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    return data || [];
  }
}

export const umamiService = new UmamiService();
export type { UmamiMetrics, UmamiApiResponse, UmamiGeoData, UmamiDeviceData, UmamiReferrerData, UmamiTopPage };
