const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST as string | undefined || 'https://us.i.posthog.com';

let initialized = false;

export function initAnalytics(): void {
  if (initialized || !POSTHOG_KEY) return;
  initialized = true;

  const script = document.createElement('script');
  script.innerHTML = `
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function n(t){e[t]=function(){e.push([t].concat(Array.prototype.slice.call(arguments,0)))}}var c=["identify","reset","group","setProperties","register","registerOnce","unregister","capture","captureException","captureRevenue"]};for(var u of c)n(u);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
    posthog.init('${POSTHOG_KEY}', {api_host: '${POSTHOG_HOST}', autocapture: true, capture_pageview: true});
  `;
  script.async = true;
  document.head.appendChild(script);
}

export function track(event: string, properties?: Record<string, unknown>): void {
  if (typeof window !== 'undefined' && (window as any).posthog) {
    (window as any).posthog.capture(event, properties);
  }
}

export function identifyUser(userId: string, properties?: Record<string, unknown>): void {
  if (typeof window !== 'undefined' && (window as any).posthog) {
    (window as any).posthog.identify(userId, properties);
  }
}

export const AnalyticsEvents = {
  PAGE_VIEW: 'page_view',
  SIGNUP_START: 'signup_start',
  SIGNUP_COMPLETE: 'signup_complete',
  ANALYSIS_RUN: 'analysis_run',
  PRICING_VIEW: 'pricing_view',
  PRICING_PILOT_REQUEST: 'pricing_pilot_request',
  DEMO_REQUEST: 'demo_request',
  FORECAST_CREATE: 'forecast_create',
  FORECAST_PUBLISH: 'forecast_publish',
  ONBOARDING_DISMISS: 'onboarding_dismiss',
  ONBOARDING_GET_STARTED: 'onboarding_get_started',
} as const;
