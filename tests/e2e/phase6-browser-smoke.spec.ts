import { expect, test, type Page } from '@playwright/test';

type RouteCheck = {
  path: string;
  marker: string;
  installMocks?: (page: Page) => Promise<void>;
};

const ROUTE_CHECKS: RouteCheck[] = [
  { path: '/console', marker: 'Strategy Console' },
  {
    path: '/insights',
    marker: 'Live Geopolitical Intelligence',
    installMocks: async (page: Page) => {
      await page.route('https://example.supabase.co/functions/v1/gdelt-stream', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            scenarios: [
              {
                event_id: 'phase6-smoke-1',
                actors: ['Canada', 'United States'],
                pattern: 'coordination',
                goldstein_scale: 4.2,
                sentiment: 0.55,
                game_type: 'coordination_game',
                recommended_strategy: 'Coordinate',
                context: {
                  description: 'Synthetic smoke scenario for the geopolitical dashboard route.',
                  strategic_value: 7,
                  source_url: 'https://example.com/phase6-smoke',
                  confidence: 0.92,
                },
                realtime: false,
                timestamp: '2026-05-01T04:00:00.000Z',
              },
            ],
            provider: {
              provider: 'phase6-smoke',
              mode: 'simulated',
              warnings: [],
              details: [
                { name: 'gdelt', mode: 'simulated', note: 'browser smoke fixture' },
              ],
            },
          }),
        });
      });
    },
  },
  { path: '/pricing', marker: 'Choose Your Strategic Edge' },
];

async function expectStableRoute(page: Page, routeCheck: RouteCheck) {
  const pageErrors: string[] = [];
  const documentFailures: string[] = [];

  const onPageError = (error: Error) => {
    pageErrors.push(error.message);
  };
  const onRequestFailed = (request: { isNavigationRequest(): boolean; resourceType(): string; url(): string; failure(): { errorText?: string } | null }) => {
    if (request.isNavigationRequest() && request.resourceType() === 'document') {
      documentFailures.push(`${request.url()} :: ${request.failure()?.errorText || 'unknown document failure'}`);
    }
  };

  page.on('pageerror', onPageError);
  page.on('requestfailed', onRequestFailed);

  try {
    if (routeCheck.installMocks) {
      await routeCheck.installMocks(page);
    }

    const response = await page.goto(routeCheck.path, { waitUntil: 'domcontentloaded' });
    expect(response, `missing document response for ${routeCheck.path}`).not.toBeNull();
    expect(response?.ok(), `document response was not OK for ${routeCheck.path}`).toBeTruthy();

    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);
    await expect(page.getByText(routeCheck.marker, { exact: true }).first()).toBeVisible({ timeout: 15000 });

    expect(pageErrors, `uncaught page errors on ${routeCheck.path}`).toEqual([]);
    expect(documentFailures, `document request failures on ${routeCheck.path}`).toEqual([]);
  } finally {
    page.off('pageerror', onPageError);
    page.off('requestfailed', onRequestFailed);
  }
}

test.describe('Phase 6 browser smoke', () => {
  for (const routeCheck of ROUTE_CHECKS) {
    test(`route ${routeCheck.path} shows "${routeCheck.marker}"`, async ({ page }) => {
      await expectStableRoute(page, routeCheck);
    });
  }
});
