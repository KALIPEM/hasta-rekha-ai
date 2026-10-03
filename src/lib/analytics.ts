type AnalyticsParams = Record<string, unknown>;
type Attribution = { source?: string; medium?: string; campaign?: string; term?: string; content?: string; landing_page?: string; captured_at?: string };

const ATTRIBUTION_KEY = 'hasta_attribution';
let measurementId = '';

export function initAnalytics(id?: string) {
  if (typeof window === 'undefined' || !id || !/^G-[A-Z0-9]+$/i.test(id)) return;
  measurementId = id;
  captureAttribution();
  const w = window as typeof window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };
  w.dataLayer = w.dataLayer || [];
  w.gtag = w.gtag || function (...args: unknown[]) { w.dataLayer!.push(args); };
  if (!document.querySelector(`script[data-ga4="${id}"]`)) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    script.dataset.ga4 = id;
    document.head.appendChild(script);
  }
  w.gtag('js', new Date());
  w.gtag('config', id, { send_page_view: false });
}

export function captureAttribution() {
  if (typeof window === 'undefined') return;
  const query = new URLSearchParams(window.location.search);
  const fields = { source: 'utm_source', medium: 'utm_medium', campaign: 'utm_campaign', term: 'utm_term', content: 'utm_content' } as const;
  const attribution: Attribution = {};
  for (const [key, parameter] of Object.entries(fields)) {
    const value = query.get(parameter);
    if (value) attribution[key as keyof Attribution] = value;
  }
  if (Object.keys(attribution).length) {
    attribution.landing_page = `${window.location.pathname}${window.location.search}`;
    attribution.captured_at = new Date().toISOString();
    try { window.localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution)); } catch { /* storage may be blocked */ }
  }
}

export function getAttribution(): Attribution {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(window.localStorage.getItem(ATTRIBUTION_KEY) || '{}') as Attribution; } catch { return {}; }
}

export function trackAnalyticsEvent(name: string, params: AnalyticsParams = {}) {
  if (!measurementId || typeof window === 'undefined') return;
  const w = window as typeof window & { gtag?: (...args: unknown[]) => void };
  w.gtag?.('event', name, params);
}

export function trackPageView(path = window.location.pathname) {
  trackAnalyticsEvent('page_view', { page_path: path, page_location: window.location.href, page_title: document.title });
}
