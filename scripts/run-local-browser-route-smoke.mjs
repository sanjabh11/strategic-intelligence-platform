#!/usr/bin/env node

import { chromium } from 'playwright';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { assertArtifactDate, proofTimestamp, resolveProofDate } from './proof-date.mjs';

const args = process.argv.slice(2);
const DEFAULT_BASE_URL = 'http://127.0.0.1:4188';
let PROOF_DATE;
try {
  PROOF_DATE = resolveProofDate(args);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(2);
}
const DEFAULT_JSON_OUTPUT = `docs/launch-readiness/local-browser-route-smoke-${PROOF_DATE}.json`;
const DEFAULT_SCREENSHOT_DIR = `docs/launch-readiness/browser-route-smoke-${PROOF_DATE}`;
const FIXTURE_TIMESTAMP = proofTimestamp(PROOF_DATE);
const FIXTURE_END_TIMESTAMP = proofTimestamp(PROOF_DATE, 365);

const ROUTES = [
  {
    id: 'enterprise_decision_console',
    niche: 'Enterprise/public-sector strategic decision intelligence',
    path: '/console',
    expected_signal: 'Strategy Console',
    expected_status: 'rendered'
  },
  {
    id: 'governed_forecast_registry',
    niche: 'Governed forecasting and research workflow',
    path: '/forecasts',
    expected_signal: 'Forecast Registry',
    expected_status: 'rendered'
  },
  {
    id: 'geopolitical_risk_radar',
    niche: 'Geopolitical risk radar/scenario monitor',
    path: '/insights',
    expected_signal: 'Live Geopolitical Intelligence',
    expected_status: 'rendered'
  },
  {
    id: 'executive_briefing_auth_gate',
    niche: 'Executive/analyst briefing layer',
    path: '/war-room',
    expected_signal: 'War Room requires sign-in',
    expected_status: 'auth_gate_expected'
  },
  {
    id: 'executive_briefing_workflow',
    niche: 'Executive/analyst briefing layer',
    path: '/war-room',
    expected_signal: 'Corporate War Room',
    expected_status: 'rendered',
    auth_fixture: 'enterprise'
  },
  {
    id: 'negotiation_training',
    niche: 'Negotiation and strategic reasoning training',
    path: '/labs/negotiation',
    expected_signal: 'Negotiation Dojo',
    expected_status: 'rendered'
  },
  {
    id: 'game_tree_training',
    niche: 'Negotiation and strategic reasoning training',
    path: '/labs/game-tree',
    expected_signal: 'Sequential Game Studio',
    expected_status: 'rendered'
  }
];

function argValue(name, fallback = null) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] ?? fallback : fallback;
}

function hasFlag(name) {
  return args.includes(name);
}

function usage() {
  console.error([
    'Usage: node scripts/run-local-browser-route-smoke.mjs',
    `  [--base-url ${DEFAULT_BASE_URL}]`,
    `  [--proof-date ${PROOF_DATE}]`,
    `  [--json-output ${DEFAULT_JSON_OUTPUT}]`,
    `  [--screenshot-dir ${DEFAULT_SCREENSHOT_DIR}]`,
    '  [--no-placeholder-supabase-mock]'
  ].join('\n'));
}

if (hasFlag('--help') || hasFlag('-h')) {
  usage();
  process.exit(0);
}

const ROOT = process.cwd();
const baseUrl = argValue('--base-url', DEFAULT_BASE_URL).replace(/\/$/, '');
const jsonOutput = argValue('--json-output', DEFAULT_JSON_OUTPUT);
const screenshotDir = argValue('--screenshot-dir', DEFAULT_SCREENSHOT_DIR);
try {
  assertArtifactDate(jsonOutput, PROOF_DATE, 'JSON output');
  assertArtifactDate(screenshotDir, PROOF_DATE, 'screenshot directory');
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(2);
}
const mockPlaceholderSupabase = !hasFlag('--no-placeholder-supabase-mock');
const localSmokeUser = {
  id: 'local-smoke-enterprise-user',
  email: 'local-war-room-smoke@example.invalid'
};

function resolveRepoPath(relativePath) {
  return path.isAbsolute(relativePath) ? relativePath : path.join(ROOT, relativePath);
}

function readTextIfExists(relativePath) {
  const absolutePath = resolveRepoPath(relativePath);
  return existsSync(absolutePath) ? readFileSync(absolutePath, 'utf8') : '';
}

function writeArtifact(relativePath, contents) {
  const absolutePath = resolveRepoPath(relativePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, contents);
}

function cleanText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function classifyConsoleMessage(message) {
  const text = String(message ?? '').toLowerCase();
  if (
    text.includes('example.supabase.co')
    || text.includes('failed to fetch')
    || text.includes('net::err')
    || text.includes('cors')
    || text.includes('auth/v1')
  ) {
    return 'placeholder_supabase_or_network';
  }
  if (text.includes('cannot read properties of null') && text.includes('auth')) {
    return 'null_supabase_client_crash';
  }
  return 'runtime_console_error';
}

function jsonResponse(body, status = 200) {
  return {
    status,
    contentType: 'application/json',
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS'
    },
    body: JSON.stringify(body)
  };
}

function tableNameFromUrl(url) {
  const parsed = new URL(url);
  return parsed.pathname.split('/').pop() ?? '';
}

function enterpriseTierLimitRow() {
  return {
    tier: 'enterprise',
    display_name: 'Enterprise',
    price_monthly_cents: 49900,
    price_yearly_cents: 499000,
    max_analyses_per_day: -1,
    max_matrix_size: -1,
    max_players: -1,
    max_scenarios_saved: -1,
    max_templates_access: -1,
    can_export_csv: true,
    can_export_pdf: true,
    can_use_api: true,
    can_access_gold_module: true,
    can_access_sequential_games: true,
    can_access_monte_carlo: true,
    can_access_real_time_data: true,
    can_collaborate: true,
    can_create_private_rooms: true,
    can_white_label: true,
    support_level: 'enterprise',
    can_access_labs: true,
    can_access_forecasting: true,
    can_access_intel: true
  };
}

function enterpriseWarRoomSessionRow() {
  return {
    id: 'local-war-room-session-1',
    name: 'Local Proof Executive Briefing Session',
    scenario: 'Critical infrastructure supply disruption',
    status: 'lobby',
    current_round: 0,
    total_rounds: 6,
    created_at: FIXTURE_TIMESTAMP,
    timer_end_at: null,
    teams: [
      { id: 'team-1', name: 'Executive Office', color: '#3B82F6', resources: { capital: 100, reputation: 85 }, score: 0 },
      { id: 'team-2', name: 'Regulator', color: '#10B981', resources: { capital: 80, reputation: 90 }, score: 0 }
    ]
  };
}

function enterpriseSupabaseSession() {
  const expiresAt = 1893456000; // 2030-01-01T00:00:00Z
  const user = {
    id: localSmokeUser.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: localSmokeUser.email,
    app_metadata: { provider: 'local-route-smoke' },
    user_metadata: { name: 'Local War Room Smoke' },
    created_at: FIXTURE_TIMESTAMP
  };

  return {
    access_token: 'local-route-smoke-access-token',
    refresh_token: 'local-route-smoke-refresh-token',
    token_type: 'bearer',
    expires_in: expiresAt - Math.floor(Date.now() / 1000),
    expires_at: expiresAt,
    user
  };
}

function enterpriseRestResponse(tableName) {
  switch (tableName) {
    case 'whop_users':
      return {
        user_id: localSmokeUser.id,
        whop_user_id: 'local-smoke-whop-user',
        subscription_tier: 'enterprise',
        subscription_status: 'active',
        current_period_end: FIXTURE_END_TIMESTAMP,
        cancel_at_period_end: false
      };
    case 'user_subscriptions':
      return {
        id: 'local-smoke-subscription',
        user_id: localSmokeUser.id,
        tier: 'enterprise',
        status: 'active',
        current_period_start: FIXTURE_TIMESTAMP,
        current_period_end: FIXTURE_END_TIMESTAMP,
        cancel_at_period_end: false
      };
    case 'tier_limits':
      return [enterpriseTierLimitRow()];
    case 'warroom_sessions':
      return [enterpriseWarRoomSessionRow()];
    case 'warroom_decision_logs':
    case 'warroom_assumptions':
    case 'warroom_scenario_versions':
    case 'warroom_comments':
      return [];
    default:
      return [];
  }
}

async function installPlaceholderSupabaseMocks(page, options = {}) {
  const enterpriseAuth = options.enterpriseAuth === true;

  await page.route('https://example.supabase.co/**', async (route) => {
    const request = route.request();
    const url = request.url();

    if (request.method() === 'OPTIONS') {
      await route.fulfill(jsonResponse({}, 204));
      return;
    }

    if (url.includes('/auth/v1/')) {
      if (enterpriseAuth && url.includes('/auth/v1/user')) {
        await route.fulfill(jsonResponse({
          id: localSmokeUser.id,
          aud: 'authenticated',
          role: 'authenticated',
          email: localSmokeUser.email,
          app_metadata: { provider: 'local-route-smoke' },
          user_metadata: { name: 'Local War Room Smoke' },
          created_at: FIXTURE_TIMESTAMP
        }));
        return;
      }
      await route.fulfill(jsonResponse({ error: 'local smoke unauthenticated' }, 401));
      return;
    }

    if (url.includes('/functions/v1/gdelt-stream')) {
      await route.fulfill(jsonResponse({
        scenarios: [
          {
            event_id: 'local-route-smoke-1',
            actors: ['Energy regulator', 'Utility operator'],
            pattern: 'coordination',
            goldstein_scale: 3.8,
            sentiment: 0.44,
            game_type: 'coordination_game',
            recommended_strategy: 'Coordinate evidence collection and escalation timing.',
            context: {
              description: 'Local route-smoke scenario for the geopolitical dashboard.',
              strategic_value: 7,
              source_url: 'https://example.com/local-route-smoke',
              confidence: 0.9
            },
            realtime: false,
            timestamp: FIXTURE_TIMESTAMP
          }
        ],
        provider: {
          provider: 'local-route-smoke',
          mode: 'mocked-local',
          warnings: [],
          details: [{ name: 'gdelt', mode: 'mocked-local', note: 'route smoke fixture' }]
        }
      }));
      return;
    }

    if (url.includes('/rest/v1/')) {
      const tableName = tableNameFromUrl(url);
      await route.fulfill(jsonResponse(enterpriseAuth ? enterpriseRestResponse(tableName) : []));
      return;
    }

    await route.fulfill(jsonResponse({ ok: true, mode: 'local-route-smoke' }));
  });
}

async function inspectPage(page, routeConfig) {
  const bodyText = await page.evaluate(() => String(document.body?.textContent ?? '').replace(/\s+/g, ' ').trim());
  const pageData = await page.evaluate(() => {
    const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
    const pickText = (selector, limit) => Array.from(document.querySelectorAll(selector))
      .map((node) => clean(node.textContent))
      .filter(Boolean)
      .slice(0, limit);

    const text = clean(document.body?.textContent ?? '');

    return {
      title: document.title || '',
      url: location.href,
      pathname: location.pathname,
      headings: pickText('h1,h2,h3', 18),
      nav_links: Array.from(document.querySelectorAll('nav a'))
        .map((node) => ({ text: clean(node.textContent), href: node.getAttribute('href') }))
        .slice(0, 20),
      buttons: pickText('button', 18),
      paragraphs: pickText('p,li', 28),
      visible_text_sample: text.slice(0, 1800),
      body_text_length: text.length,
      has_root: Boolean(document.querySelector('#root')),
      root_child_count: document.querySelector('#root')?.childElementCount ?? 0,
      blank_page: text.length < 80,
      shows_error_boundary: /Something went wrong|TypeError|ReferenceError|Cannot read properties/.test(text)
    };
  });

  const expectedSignalFound = bodyText.includes(routeConfig.expected_signal);
  const authGateFound = /requires sign-in|sign in|auth/i.test(bodyText);
  const expectedAuthGate = routeConfig.expected_status === 'auth_gate_expected';

  return {
    ...pageData,
    expected_signal: routeConfig.expected_signal,
    expected_signal_found: expectedSignalFound,
    auth_gate_found: authGateFound,
    expected_auth_gate: expectedAuthGate
  };
}

async function run() {
  const absoluteScreenshotDir = resolveRepoPath(screenshotDir);
  mkdirSync(absoluteScreenshotDir, { recursive: true });

  const browser = await chromium.launch({ headless: true, timeout: 15000 });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const routes = [];

  try {
    for (const routeConfig of ROUTES) {
      const page = await context.newPage();
      const consoleMessages = [];
      const pageErrors = [];
      const requestFailures = [];

      page.on('console', (message) => {
        if (message.type() === 'error') {
          consoleMessages.push({
            type: message.type(),
            text: message.text(),
            classification: classifyConsoleMessage(message.text())
          });
        }
      });

      page.on('pageerror', (error) => {
        pageErrors.push({
          message: error.message,
          classification: classifyConsoleMessage(error.message)
        });
      });

      page.on('requestfailed', (request) => {
        if (request.isNavigationRequest() && request.resourceType() === 'document') {
          requestFailures.push({
            url: request.url(),
            error: request.failure()?.errorText ?? 'unknown document failure'
          });
        }
      });

      if (mockPlaceholderSupabase) {
        await installPlaceholderSupabaseMocks(page, {
          enterpriseAuth: routeConfig.auth_fixture === 'enterprise'
        });
      }

      await page.addInitScript(({ authFixture, session }) => {
        const storageKey = 'sb-example-auth-token';
        if (authFixture === 'enterprise') {
          window.localStorage.setItem(storageKey, JSON.stringify(session));
        } else {
          window.localStorage.removeItem(storageKey);
        }
      }, {
        authFixture: routeConfig.auth_fixture ?? null,
        session: enterpriseSupabaseSession()
      });

      const url = `${baseUrl}${routeConfig.path}`;
      const startedAt = new Date().toISOString();
      let routeResult;

      try {
        const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);
        await page.waitForTimeout(400);

        const pageData = await inspectPage(page, routeConfig);
        const screenshotPath = path.join(absoluteScreenshotDir, `${routeConfig.id}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });

        const runtimeConsoleErrorCount = [
          ...consoleMessages,
          ...pageErrors
        ].filter((entry) => entry.classification !== 'placeholder_supabase_or_network').length;

        const placeholderNetworkErrorCount = consoleMessages
          .filter((entry) => entry.classification === 'placeholder_supabase_or_network').length;

        const status = pageData.blank_page || pageData.shows_error_boundary || !pageData.expected_signal_found
          ? 'render_problem'
          : routeConfig.expected_status;

        routeResult = {
          ...routeConfig,
          url,
          started_at: startedAt,
          finished_at: new Date().toISOString(),
          status,
          document_status: response?.status() ?? null,
          page: pageData,
          console_errors: consoleMessages,
          page_errors: pageErrors,
          request_failures: requestFailures,
          console_error_count: consoleMessages.length + pageErrors.length,
          runtime_console_error_count: runtimeConsoleErrorCount,
          placeholder_network_error_count: placeholderNetworkErrorCount,
          screenshot: screenshotPath
        };
      } catch (error) {
        routeResult = {
          ...routeConfig,
          url,
          started_at: startedAt,
          finished_at: new Date().toISOString(),
          status: 'failed',
          error: error instanceof Error ? error.message : String(error),
          console_errors: consoleMessages,
          page_errors: pageErrors,
          request_failures: requestFailures,
          console_error_count: consoleMessages.length + pageErrors.length,
          runtime_console_error_count: [...consoleMessages, ...pageErrors]
            .filter((entry) => entry.classification !== 'placeholder_supabase_or_network').length,
          placeholder_network_error_count: consoleMessages
            .filter((entry) => entry.classification === 'placeholder_supabase_or_network').length
        };
      } finally {
        await page.close();
      }

      routes.push(routeResult);
    }
  } finally {
    await context.close();
    await browser.close();
  }

  const renderedLikeCount = routes
    .filter((route) => ['rendered', 'auth_gate_expected'].includes(route.status)).length;
  const runtimeConsoleErrorCount = routes
    .reduce((sum, route) => sum + Number(route.runtime_console_error_count ?? 0), 0);
  const strategyConsoleSource = readTextIfExists('src/components/StrategyConsole.tsx');
  const personalLifeCoachSource = readTextIfExists('src/components/PersonalLifeCoach.tsx');
  const supabaseSource = readTextIfExists('src/lib/supabase.ts');
  const localNullSupabaseGuardReady = [
    strategyConsoleSource.includes('if (!supabase)') && strategyConsoleSource.includes('supabase.auth.onAuthStateChange'),
    personalLifeCoachSource.includes('if (!supabase)') && personalLifeCoachSource.includes('supabase.auth.onAuthStateChange'),
    supabaseSource.includes('supabase\n    ? await supabase.auth.getSession()') && supabaseSource.includes('session: null')
  ].every(Boolean);

  const report = {
    schema_version: 'local-browser-route-smoke-v1',
    proof_date: PROOF_DATE,
    generated_at: new Date().toISOString(),
    source_mode: mockPlaceholderSupabase
      ? 'local_preview_full_beta_labs_bypass_mocked_placeholder_supabase'
      : 'local_preview_full_beta_labs_bypass_unmocked_placeholder_supabase',
    base_url: baseUrl,
    proof_bucket: 'local',
    hosted_live_proof: false,
    route_count: routes.length,
    rendered_count: routes.filter((route) => route.status === 'rendered').length,
    auth_gate_expected_count: routes.filter((route) => route.status === 'auth_gate_expected').length,
    rendered_or_expected_auth_gate_count: renderedLikeCount,
    failed_count: routes.filter((route) => route.status === 'failed').length,
    render_problem_count: routes.filter((route) => route.status === 'render_problem').length,
    runtime_console_error_count: runtimeConsoleErrorCount,
    placeholder_network_error_count: routes
      .reduce((sum, route) => sum + Number(route.placeholder_network_error_count ?? 0), 0),
    all_top_niche_routes_ready: renderedLikeCount === routes.length && runtimeConsoleErrorCount === 0,
    auth_gated_routes: routes
      .filter((route) => route.page?.auth_gate_found)
      .map((route) => route.path),
    credential_free_authenticated_routes: routes
      .filter((route) => route.auth_fixture === 'enterprise')
      .map((route) => route.path),
    credential_free_authenticated_route_count: routes
      .filter((route) => route.auth_fixture === 'enterprise' && route.status === 'rendered').length,
    browser_plugin_findings: [
      {
        id: 'in_app_browser_multi_route_timeout',
        status: 'observed',
        finding: 'The in-app Browser connected and loaded /console after visibility retry, but multi-route capture timed out when creating or reusing browser-use pages.',
        impact: 'Use repo-native Playwright for durable repeatable local route proof until the in-app Browser attach issue is cleared.'
      },
      {
        id: 'local_null_supabase_console_check',
        status: localNullSupabaseGuardReady ? 'mitigated_local_only' : 'observed',
        finding: localNullSupabaseGuardReady
          ? 'The local-mode null Supabase auth crash is guarded in StrategyConsole, PersonalLifeCoach, and getUserAuthHeaders.'
          : 'A VITE_LOCAL_ANALYZE=true build rendered the app error boundary on /console because StrategyConsole dereferenced supabase.auth while the local-mode client was null.',
        impact: localNullSupabaseGuardReady
          ? 'VITE_LOCAL_ANALYZE=true can be used for focused local page-load checks, but it still does not prove hosted/live behavior.'
          : 'Local page-load proof should use a configured placeholder Supabase client, or the code should guard auth calls before VITE_LOCAL_ANALYZE=true is used as a smoke harness.'
      }
    ],
    routes
  };

  writeArtifact(jsonOutput, `${JSON.stringify(report, null, 2)}\n`);

  console.log(JSON.stringify({
    json_output: jsonOutput,
    screenshot_dir: screenshotDir,
    route_count: report.route_count,
    rendered_or_expected_auth_gate_count: report.rendered_or_expected_auth_gate_count,
    failed_count: report.failed_count,
    render_problem_count: report.render_problem_count,
    runtime_console_error_count: report.runtime_console_error_count,
    all_top_niche_routes_ready: report.all_top_niche_routes_ready
  }, null, 2));
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
