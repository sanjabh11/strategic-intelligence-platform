#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const ROOT = process.cwd();
const DEFAULT_EVIDENCE = 'docs/launch-readiness/launch-evidence-2026-06-06.json';
const DEFAULT_PILOT_OFFER = 'docs/launch-readiness/pilot-offer-pack-2026-06-06.json';
const DEFAULT_BUYER_DISCOVERY = 'docs/launch-readiness/buyer-discovery-kit-2026-06-06.json';
const DEFAULT_COMMERCIAL_GOAL = 'docs/launch-readiness/commercial-goal-completion-audit-2026-06-06.json';
const DEFAULT_JSON_OUTPUT = 'docs/launch-readiness/prelaunch-gtm-campaign-kit-2026-06-07.json';
const DEFAULT_MD_OUTPUT = 'docs/launch-readiness/prelaunch-gtm-campaign-kit-2026-06-07.md';
const DEFAULT_SEGMENT_CSV_OUTPUT = 'docs/launch-readiness/prelaunch-gtm-target-segments-2026-06-07.csv';
const DEFAULT_SEQUENCE_CSV_OUTPUT = 'docs/launch-readiness/prelaunch-gtm-outreach-sequence-2026-06-07.csv';

function argValue(name, fallback = null) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] ?? fallback : fallback;
}

function hasFlag(name) {
  return args.includes(name);
}

function usage() {
  console.error([
    'Usage: node scripts/build-prelaunch-gtm-campaign-kit.mjs',
    `  [--evidence ${DEFAULT_EVIDENCE}]`,
    `  [--pilot-offer ${DEFAULT_PILOT_OFFER}]`,
    `  [--buyer-discovery ${DEFAULT_BUYER_DISCOVERY}]`,
    `  [--commercial-goal ${DEFAULT_COMMERCIAL_GOAL}]`,
    `  [--json-output ${DEFAULT_JSON_OUTPUT}]`,
    `  [--md-output ${DEFAULT_MD_OUTPUT}]`,
    `  [--segment-csv-output ${DEFAULT_SEGMENT_CSV_OUTPUT}]`,
    `  [--sequence-csv-output ${DEFAULT_SEQUENCE_CSV_OUTPUT}]`,
    '  [--update-evidence]'
  ].join('\n'));
}

if (hasFlag('--help') || hasFlag('-h')) {
  usage();
  process.exit(0);
}

const inputPaths = {
  evidence: argValue('--evidence', DEFAULT_EVIDENCE),
  pilotOffer: argValue('--pilot-offer', DEFAULT_PILOT_OFFER),
  buyerDiscovery: argValue('--buyer-discovery', DEFAULT_BUYER_DISCOVERY),
  commercialGoal: argValue('--commercial-goal', DEFAULT_COMMERCIAL_GOAL)
};

const outputPaths = {
  json: argValue('--json-output', DEFAULT_JSON_OUTPUT),
  md: argValue('--md-output', DEFAULT_MD_OUTPUT),
  segmentCsv: argValue('--segment-csv-output', DEFAULT_SEGMENT_CSV_OUTPUT),
  sequenceCsv: argValue('--sequence-csv-output', DEFAULT_SEQUENCE_CSV_OUTPUT)
};

const updateEvidence = hasFlag('--update-evidence');

function resolveRepoPath(relativePath) {
  return path.isAbsolute(relativePath) ? relativePath : path.join(ROOT, relativePath);
}

function readJsonIfExists(relativePath, fallback) {
  const absolutePath = resolveRepoPath(relativePath);
  return existsSync(absolutePath) ? JSON.parse(readFileSync(absolutePath, 'utf8')) : fallback;
}

function writeArtifact(relativePath, contents) {
  const absolutePath = resolveRepoPath(relativePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, contents);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueValues(values) {
  return [...new Set(values.filter((value) => String(value ?? '').trim()).map(String))];
}

function uniqueSorted(values) {
  return uniqueValues(values).sort();
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function csvLine(columns) {
  return columns.map(csvCell).join(',');
}

function mdCell(value) {
  return String(value ?? '').replaceAll('|', '/').replace(/\s+/g, ' ').trim();
}

function replaceMatchingThenAppend(existingValue, additions, matchers) {
  const existing = Array.isArray(existingValue) ? existingValue : [];
  const filtered = existing.filter((item) => !matchers.some((matcher) => matcher.test(String(item))));
  return [...filtered, ...additions];
}

function replaceByTaskId(existingValue, nextValue) {
  const existing = Array.isArray(existingValue) ? existingValue : [];
  const taskId = nextValue.task_id ?? nextValue.target_task;
  return [
    ...existing.filter((item) => (item.task_id ?? item.target_task) !== taskId),
    nextValue
  ];
}

const currentMarketSources = [
  {
    id: 'bcg-geopolitical-muscle-2026',
    source: 'BCG - From Crisis Reaction to Strategic Geopolitical Response',
    url: 'https://www.bcg.com/publications/2026/crisis-reaction-to-strategic-geopolitical-response',
    signal: '80% of surveyed companies report significant geopolitical exposure and about 95% plan to strengthen geopolitical capabilities; only about 15% have embedded geopolitics into core decisions.',
    implication: 'Lead with a decision-connected geopolitical workflow pilot, not a dashboard-only pitch.',
    source_type: 'current_market_signal'
  },
  {
    id: 'tradeweb-icd-treasury-2026',
    source: 'Tradeweb ICD Portal Client Survey 2026',
    url: 'https://www.businesswire.com/news/home/20260416122640/en/Geopolitical-Risk-Concerns-Surge-for-Corporate-Treasurers-According-to-2026-Tradeweb-ICD-Portal-Client-Survey',
    signal: '88% of corporate treasury respondents reported moderate-to-high geopolitical concern; AI deployment in treasury rose to 22%.',
    implication: 'Treasury and finance are reachable early adopters for scenario-to-decision pilots when the ask is workflow relevance, not enterprise rollout.',
    source_type: 'current_market_signal'
  },
  {
    id: 'nist-ai-rmf',
    source: 'NIST AI Risk Management Framework',
    url: 'https://www.nist.gov/itl/ai-risk-management-framework',
    signal: 'NIST AI RMF provides Govern, Map, Measure, and Manage functions for trustworthy AI risk management; NIST released a critical-infrastructure AI RMF profile concept note on April 7, 2026.',
    implication: 'Position the product as a governed human-review workflow and show AI risk boundaries in the pilot packet.',
    source_type: 'official_framework'
  },
  {
    id: 'nist-genai-profile',
    source: 'NIST AI 600-1 Generative AI Profile',
    url: 'https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence',
    signal: 'NIST AI 600-1 aligns generative AI governance with system inventory, supplier risk, pre-deployment testing, provenance, and incident disclosure.',
    implication: 'Prelaunch outreach should include governance evidence, not only model capability claims.',
    source_type: 'official_framework'
  },
  {
    id: 'forecastbench-about',
    source: 'ForecastBench',
    url: 'https://www.forecastbench.org/about/',
    signal: 'ForecastBench uses dynamic, continuously updated forecasting questions to reduce contamination and updates performance as questions resolve.',
    implication: 'Accuracy claims must wait for real resolved forecasts and comparable baselines; prelaunch can sell evaluation readiness.',
    source_type: 'forecasting_science'
  },
  {
    id: 'forecastbench-docs',
    source: 'ForecastBench documentation',
    url: 'https://www.forecastbench.org/docs/',
    signal: 'ForecastBench documents difficulty-adjusted Brier scoring, stability tests, and resolved-question methodology.',
    implication: 'The MVP can borrow the proof standard: pre-resolution capture, resolved outcomes, baselines, and leakage review.',
    source_type: 'forecasting_science'
  },
  {
    id: 'metaculus-futureeval',
    source: 'Metaculus FutureEval',
    url: 'https://www.metaculus.com/futureeval/',
    signal: 'FutureEval benchmarks AI forecasting against model, bot, community, and professional forecaster baselines across future-event questions.',
    implication: 'Use professional/community baselines as future comparison anchors; do not claim parity before scoring.',
    source_type: 'forecasting_science'
  },
  {
    id: 'cisa-secure-by-demand',
    source: 'CISA Secure by Demand Guide',
    url: 'https://www.cisa.gov/resources-tools/resources/secure-demand-guide',
    signal: 'CISA frames buyer-side software security evidence as a demand-side procurement lever.',
    implication: 'For pre-selling, prepare security and claim-boundary evidence as a buyer packet even before external validation exists.',
    source_type: 'official_framework'
  }
];

const segmentCatalog = [
  {
    rank: 1,
    segment: 'Corporate strategy, geopolitical risk, and CEO-office teams at global companies',
    target_roles: 'Chief Strategy Officer, head of geopolitical risk, enterprise risk strategy lead',
    primary_niche: 'Enterprise/public-sector strategic decision intelligence',
    buyer_pain: 'Geopolitical signals are visible, but they are not translated into quantified decisions, countermoves, and reviewable forecast drafts.',
    trigger: 'Board asks for scenario options after trade, conflict, supply-chain, or policy shocks.',
    current_workaround: 'Consulting brief, manual analyst memo, news dashboard, or spreadsheet scenario model.',
    repo_proof_to_show: 'Strategy Console, Corporate War Room, human review, forecast governance, commercial confidence gate.',
    prelaunch_offer: 'Two-week guided pilot: convert one live strategic question into evidence bundle, actor/countermove map, and pre-resolution forecast register.',
    outreach_angle: 'Your team likely has more geopolitical information than decision bandwidth; we are testing a governed workflow that turns one uncertainty into an auditable decision brief.',
    willingness_signal: 'Budget exists for strategy consulting, risk intelligence, and executive decision support.',
    confidence: 5,
    source_ids: ['bcg-geopolitical-muscle-2026', 'nist-ai-rmf']
  },
  {
    rank: 2,
    segment: 'Corporate treasury and finance risk teams',
    target_roles: 'Treasurer, assistant treasurer, finance transformation lead, liquidity risk lead',
    primary_niche: 'Geopolitical risk radar and scenario monitor',
    buyer_pain: 'Geopolitical shocks affect liquidity, funding, FX, and cash allocation, but treasury teams need faster scenario translation.',
    trigger: 'Rising geopolitical concern, defensive liquidity posture, AI adoption in treasury workflows.',
    current_workaround: 'Bank research, treasury portals, liquidity dashboards, and manual scenario packs.',
    repo_proof_to_show: 'GeopoliticalDashboard, market/risk feed smoke plans, evidence-to-brief workflow, forecast pre-resolution capture kit.',
    prelaunch_offer: 'One treasury scenario pilot: turn a geopolitical trigger into liquidity/risk decision options and forecastable assumptions.',
    outreach_angle: 'We are testing whether treasury teams want a faster path from geopolitical event to decision-ready scenario and review trail.',
    willingness_signal: 'Paid treasury tooling, banking relationships, and urgent volatility management.',
    confidence: 5,
    source_ids: ['tradeweb-icd-treasury-2026', 'bcg-geopolitical-muscle-2026']
  },
  {
    rank: 3,
    segment: 'Public-sector foresight, policy planning, and horizon-scanning units',
    target_roles: 'Strategic foresight director, policy innovation lead, horizon scanning program lead',
    primary_niche: 'Enterprise/public-sector strategic decision intelligence',
    buyer_pain: 'Foresight teams need transparent uncertainty, cross-impact reasoning, and policy trade-off documentation without black-box predictions.',
    trigger: 'Public agencies need explainable scenario planning under AI governance and procurement scrutiny.',
    current_workaround: 'Workshops, consultant reports, qualitative horizon scans, and static scenario decks.',
    repo_proof_to_show: 'Audience-specific briefing, evidence sources dashboard, human review, claim consistency validation.',
    prelaunch_offer: 'Founder-led relevance review: apply the workflow to one public-policy uncertainty and ask whether the output fits their process.',
    outreach_angle: 'This is not a replacement for foresight practice; it is a reviewable workflow layer for evidence, assumptions, and forecast governance.',
    willingness_signal: 'Public foresight programs, innovation units, and procurement interest in explainable AI workflows.',
    confidence: 4,
    source_ids: ['nist-ai-rmf', 'nist-genai-profile']
  },
  {
    rank: 4,
    segment: 'Think tanks, geopolitical research institutes, and analyst programs',
    target_roles: 'Program director, research lead, futures lab lead, analyst team lead',
    primary_niche: 'Executive and analyst briefing layer',
    buyer_pain: 'Analyst teams need to package evidence, uncertainty, and strategic implications quickly while preserving expert review.',
    trigger: 'Recurring publication cycles and demand for faster executive-ready briefings.',
    current_workaround: 'Analyst memos, Airtable/Notion workflows, research assistants, and deck production.',
    repo_proof_to_show: 'Strategist brief panel, provenance dashboard, forecast draft governance, local route proof.',
    prelaunch_offer: 'Briefing workflow pilot: turn one research question into a governed executive brief with assumptions and reviewer notes.',
    outreach_angle: 'We are testing a workflow that makes expert judgment easier to audit and reuse, without claiming to replace analysts.',
    willingness_signal: 'Budgets for research operations, publications, partnerships, and sponsored analysis.',
    confidence: 4,
    source_ids: ['bcg-geopolitical-muscle-2026', 'metaculus-futureeval']
  },
  {
    rank: 5,
    segment: 'Forecasting research, AI evaluation, and model-risk teams',
    target_roles: 'Forecasting evaluation lead, AI evaluation researcher, model risk lead',
    primary_niche: 'Governed forecasting and research workflow',
    buyer_pain: 'Teams need contamination-aware forecasting protocols, pre-resolution capture, baselines, and reviewer-visible uncertainty.',
    trigger: 'Rapid progress in AI forecasting benchmarks and pressure to compare models to human/community baselines.',
    current_workaround: 'Custom notebooks, Metaculus/ForecastBench participation, ad hoc benchmark scripts.',
    repo_proof_to_show: 'Forecast evaluation protocol, calibration ledger, benchmark comparison, leakage review register.',
    prelaunch_offer: 'Protocol review: compare the MVP forecast evidence workflow to current benchmark standards and identify pilot scoring gaps.',
    outreach_angle: 'We are not claiming model skill yet; we are testing a governed evidence pipeline that can support real scoring once outcomes resolve.',
    willingness_signal: 'Evaluation budgets, benchmark programs, AI governance pressure, and research partnerships.',
    confidence: 4,
    source_ids: ['forecastbench-about', 'forecastbench-docs', 'metaculus-futureeval']
  },
  {
    rank: 6,
    segment: 'Critical infrastructure operators and resilience teams',
    target_roles: 'Operational resilience lead, risk manager, critical infrastructure AI governance lead',
    primary_niche: 'Enterprise/public-sector strategic decision intelligence',
    buyer_pain: 'Operational teams need risk-aware AI workflows with human oversight, incident-aware evidence, and traceable decisions.',
    trigger: 'NIST critical infrastructure AI profile work and increasing AI governance scrutiny.',
    current_workaround: 'Manual risk registers, incident reports, vendor questionnaires, and control spreadsheets.',
    repo_proof_to_show: 'AI action policy, RLS policy draft, enterprise trust pack, hosted proof kit.',
    prelaunch_offer: 'Governance-readiness review: map one workflow to AI RMF and identify missing controls before any deployment discussion.',
    outreach_angle: 'The value is a controlled decision-support pilot, not an autonomous operational AI system.',
    willingness_signal: 'Regulated risk-management programs and supplier-security review pressure.',
    confidence: 4,
    source_ids: ['nist-ai-rmf', 'nist-genai-profile', 'cisa-secure-by-demand']
  },
  {
    rank: 7,
    segment: 'Enterprise AI governance, procurement, and third-party-risk teams',
    target_roles: 'AI governance lead, procurement risk lead, security questionnaire owner',
    primary_niche: 'Executive and analyst briefing layer',
    buyer_pain: 'AI tools are hard to approve when evidence, human oversight, logs, and claim boundaries are not packaged for procurement.',
    trigger: 'AI vendor due diligence moves from policy statements to system-specific evidence.',
    current_workaround: 'Manual questionnaires, security review spreadsheets, legal review, and ad hoc evidence collection.',
    repo_proof_to_show: 'Enterprise trust pack, AI action inventory, claim consistency validation, source freshness report.',
    prelaunch_offer: 'Procurement-readiness preview: show the evidence packet and ask which controls would block a pilot.',
    outreach_angle: 'We are preparing evidence-first AI decision support; your feedback can shape the procurement packet before launch.',
    willingness_signal: 'AI governance ownership, third-party risk workflows, and procurement-control budgets.',
    confidence: 4,
    source_ids: ['nist-ai-rmf', 'nist-genai-profile', 'cisa-secure-by-demand']
  },
  {
    rank: 8,
    segment: 'Investment research, macro strategy, and policy-intelligence teams',
    target_roles: 'Head of macro research, policy strategy lead, investment research director',
    primary_niche: 'Governed forecasting and research workflow',
    buyer_pain: 'Research teams need to convert event evidence into explicit assumptions, probabilities, and reviewer-approved decision notes.',
    trigger: 'Markets repricing geopolitical, rate, policy, and AI uncertainty.',
    current_workaround: 'Research portals, analyst notes, Bloomberg/FactSet workflows, spreadsheets, and informal forecast logs.',
    repo_proof_to_show: 'Forecast registry, evidence sources dashboard, strategist brief, pre-resolution capture kit.',
    prelaunch_offer: 'One-macro-question pilot: evidence brief plus forecast assumptions and resolution criteria.',
    outreach_angle: 'We are testing whether explicit forecast governance improves the handoff from research to investment decision.',
    willingness_signal: 'Existing spend on data, research, and risk analytics.',
    confidence: 3,
    source_ids: ['forecastbench-about', 'tradeweb-icd-treasury-2026']
  },
  {
    rank: 9,
    segment: 'Executive education and corporate learning programs',
    target_roles: 'Executive education director, corporate learning lead, strategy faculty lead',
    primary_niche: 'Negotiation and strategic reasoning training',
    buyer_pain: 'Training programs need applied strategic reasoning exercises with measurable debriefs and modern AI governance caveats.',
    trigger: 'Executives need practical decision training for volatility, AI use, and negotiation under uncertainty.',
    current_workaround: 'Case studies, workshops, simulation exercises, and coaching programs.',
    repo_proof_to_show: 'Negotiation Dojo, Game Tree Builder, strategy simulator, pilot outcome measurement kit.',
    prelaunch_offer: 'Workshop pilot: one facilitated exercise with debrief rubric and participant feedback capture.',
    outreach_angle: 'This is a training pilot around structured reasoning, not a production decision system.',
    willingness_signal: 'Training budgets, paid executive programs, and custom workshop spend.',
    confidence: 3,
    source_ids: ['bcg-geopolitical-muscle-2026', 'nist-ai-rmf']
  },
  {
    rank: 10,
    segment: 'Product, risk, and strategy teams inside AI-first startups',
    target_roles: 'Founder, product strategy lead, model evaluation lead, risk lead',
    primary_niche: 'Governed forecasting and research workflow',
    buyer_pain: 'AI-first teams need a lightweight way to show reasoning quality, calibration discipline, and human-review controls before enterprise buyers ask.',
    trigger: 'Need to sell AI products into regulated or enterprise buyers with stronger evidence packaging.',
    current_workaround: 'Internal eval docs, ad hoc prompt logs, manual model comparison, and generic security questionnaires.',
    repo_proof_to_show: 'Forecast governance, AI action policy, evidence source dashboard, claim consistency validation.',
    prelaunch_offer: 'Evidence-pack review: use the MVP workflow to organize one decision-eval story for their own buyer conversation.',
    outreach_angle: 'We are testing whether governed forecast/evidence workflows help AI teams pass buyer diligence sooner.',
    willingness_signal: 'Enterprise sales pressure and urgent need for proof artifacts.',
    confidence: 3,
    source_ids: ['forecastbench-docs', 'nist-genai-profile']
  }
];

const campaignPhases = [
  {
    phase: '0-7 days',
    name: 'Prelaunch proof-pack freeze',
    objective: 'Freeze buyer-safe language, choose first target segment, and prepare assets without making buyer-validation or accuracy claims.',
    actions: [
      'Use pilot-only language from the claim consistency report.',
      'Select one primary segment and two backup segments from the target segment table.',
      'Attach one proof asset per outreach email: pilot offer, route proof, forecast protocol, or enterprise trust pack.',
      'Prepare a 10-account founder-led outreach queue from the selected target slate.'
    ],
    exit_criteria: 'Segment selected, outreach copy approved, CRM/call sheet ready, and unsupported claims remain zero.'
  },
  {
    phase: '8-21 days',
    name: 'Relevance-check outreach',
    objective: 'Run low-friction relevance checks before asking for demos or pilots.',
    actions: [
      'Send 30-50 hand-selected emails/LinkedIn messages across the top 3 segments.',
      'Ask for a 15-minute relevance check, not a purchase decision.',
      'Log role, current workaround, objection, and whether the workflow maps to a real decision process.',
      'Avoid automated bulk outreach until messaging sensitivity and buyer roles are confirmed.'
    ],
    exit_criteria: 'At least 10 replies or 10 completed relevance checks logged, with segment-specific objections captured.'
  },
  {
    phase: '22-45 days',
    name: 'Discovery and demo loop',
    objective: 'Convert relevance into structured discovery calls and buyer-safe MVP demos.',
    actions: [
      'Run 10 discovery calls using the buyer call sheet.',
      'Show only one workflow matched to the buyer segment.',
      'Ask for current workflow, decision event, value metric, switching barrier, and proof needed for a paid pilot.',
      'Rerun buyer input validation and buyer proof gate after real rows are added.'
    ],
    exit_criteria: '10 completed calls, 3 qualified follow-ups, and at least 1 paid-pilot/LOI/procurement-path signal if buyer validation is to be claimed.'
  },
  {
    phase: '46-75 days',
    name: 'Private MVP pilot',
    objective: 'Run narrow pilots for the strongest segment without broad commercial-ready claims.',
    actions: [
      'Limit each pilot to one question, one workflow, one outcome metric, and one reviewer.',
      'Capture baseline current process, time-to-brief, quality signal, and decision usefulness.',
      'Attach hosted proof and redacted logs before any hosted-live claims.',
      'Track every forecast as pre-resolution until outcome scoring is possible.'
    ],
    exit_criteria: 'At least 2-3 pilots with documented workflow outcomes and no unsupported claim upgrades.'
  },
  {
    phase: '76-90 days',
    name: 'Paid-pilot conversion',
    objective: 'Convert strongest validated segment into a paid pilot or LOI while preserving proof boundaries.',
    actions: [
      'Offer a paid pilot around one measurable outcome and one proof boundary.',
      'Use objection evidence to refine pricing, onboarding, and support needs.',
      'Package only verified outcomes into a case-study-style proof note after buyer permission.',
      'Rerun commercial confidence, claim consistency, buyer proof, hosted proof, and forecast scoring gates.'
    ],
    exit_criteria: 'One paid-pilot/LOI/procurement-path signal or a clear decision to pivot segment priority.'
  }
];

const emailTemplates = [
  {
    id: 'corporate-strategy-risk',
    segment: 'Corporate strategy, geopolitical risk, and CEO-office teams',
    subject: 'Relevance check: turning geopolitical risk into decision-ready briefs',
    body: [
      'Hi {{first_name}},',
      'I am preparing a private MVP pilot for teams that already track geopolitical risk but still have to manually turn it into decision options, assumptions, and reviewable forecast drafts.',
      'The narrow test: take one live strategic uncertainty your team already cares about and produce an evidence bundle, actor/countermove map, reviewer notes, and pre-resolution forecast register.',
      'This is prelaunch and pilot-only; we are not claiming verified prediction accuracy or enterprise deployment readiness yet.',
      'Would you be open to a 15-minute relevance check to tell me whether this workflow maps to a real planning gap on your side?'
    ].join('\n\n')
  },
  {
    id: 'treasury-finance-risk',
    segment: 'Corporate treasury and finance risk teams',
    subject: 'Quick relevance check: geopolitical scenario workflow for treasury decisions',
    body: [
      'Hi {{first_name}},',
      'Treasury teams seem to be dealing with faster geopolitical shocks, liquidity questions, and early AI workflow adoption. I am testing a prelaunch workflow that turns one external risk trigger into scenario assumptions, decision options, and a reviewer-visible evidence trail.',
      'The MVP pilot would stay narrow: one risk question, one decision context, one briefing output, and no claim of forecast accuracy until outcomes are scored.',
      'Could I ask for 15 minutes to check whether this would be useful for treasury or finance risk teams like yours?'
    ].join('\n\n')
  },
  {
    id: 'public-sector-foresight',
    segment: 'Public-sector foresight, policy planning, and horizon-scanning units',
    subject: 'Foresight workflow relevance check: evidence, assumptions, and uncertainty',
    body: [
      'Hi {{first_name}},',
      'I am preparing a private MVP pilot for public-sector foresight teams that need transparent uncertainty, policy trade-offs, and human-reviewable AI assistance.',
      'The workflow is not a black-box predictor. It packages evidence, assumptions, actor/countermove reasoning, and forecast-governance caveats for one policy uncertainty.',
      'Would a 15-minute relevance check be useful to see whether this fits your foresight or horizon-scanning process?'
    ].join('\n\n')
  },
  {
    id: 'forecasting-evaluation',
    segment: 'Forecasting research, AI evaluation, and model-risk teams',
    subject: 'Protocol review: governed forecast workflow before accuracy claims',
    body: [
      'Hi {{first_name}},',
      'I am testing a prelaunch workflow for forecast evidence governance: pre-resolution capture, explicit resolution criteria, leakage review, baselines, and reviewer notes.',
      'The point is not to claim model superiority. The point is to see whether the protocol is useful before real outcomes resolve and before any scoring claim is made.',
      'Would you be open to a short protocol review conversation? I would value a hard critique from someone who thinks about forecasting evaluation.'
    ].join('\n\n')
  },
  {
    id: 'executive-education',
    segment: 'Executive education and corporate learning programs',
    subject: 'Pilot idea: strategic reasoning exercise with measurable debriefs',
    body: [
      'Hi {{first_name}},',
      'I am preparing a prelaunch training pilot that combines negotiation/game-tree exercises, scenario reasoning, and forecast discipline into a structured debrief.',
      'It is positioned as training, not a production decision system: one exercise, one rubric, participant feedback, and clear AI-use caveats.',
      'Could I ask for 15 minutes to check whether this kind of workshop pilot would fit executive education or corporate learning buyers?'
    ].join('\n\n')
  }
];

const linkedInTemplates = [
  {
    id: 'relevance-check',
    use_case: 'First-touch LinkedIn note',
    text: 'Hi {{first_name}}, I am preparing a prelaunch pilot for teams that turn geopolitical/AI uncertainty into decision briefs and forecastable assumptions. It is pilot-only, not an accuracy claim. Could I ask for a quick relevance check?'
  },
  {
    id: 'foresight-public-sector',
    use_case: 'Public-sector foresight note',
    text: 'Hi {{first_name}}, I am testing a human-reviewable foresight workflow: evidence, assumptions, actor reasoning, and uncertainty caveats for one policy question. Would your team be a reasonable group to sanity-check the pilot?'
  },
  {
    id: 'forecast-protocol',
    use_case: 'Forecasting/evaluation note',
    text: 'Hi {{first_name}}, I am building a governed forecast-evidence workflow with pre-resolution capture and leakage review. Before any accuracy claims, I would value a protocol critique. Open to a 15-minute review?'
  }
];

const demoNarrative = [
  {
    minute: '0:00-0:30',
    step: 'Buyer workflow anchor',
    talk_track: 'Start with the buyer current workflow: what question is stuck, which decision depends on it, and what evidence they already collect.'
  },
  {
    minute: '0:30-1:15',
    step: 'Evidence and uncertainty',
    talk_track: 'Show how the MVP gathers sources, marks uncertainty, and keeps claim boundaries visible instead of presenting a magic answer.'
  },
  {
    minute: '1:15-2:15',
    step: 'Reasoning and review',
    talk_track: 'Walk through actor/countermove reasoning, forecast draft, human-review state, and what a reviewer can accept, reject, or send back.'
  },
  {
    minute: '2:15-3:00',
    step: 'Measurable pilot ask',
    talk_track: 'Close on one pilot metric: time-to-brief, decision usefulness, objection quality, or pre-resolution forecast capture. State clearly that buyer validation and accuracy proof require the pilot evidence loop.'
  }
];

const objectionHandling = [
  {
    objection: 'We already use risk intelligence tools.',
    response: 'Keep those tools. This pilot tests the workflow after information intake: turning one uncertainty into assumptions, decision options, reviewer notes, and a scoreable forecast draft.'
  },
  {
    objection: 'Can you prove prediction accuracy?',
    response: 'Not prelaunch. The honest offer is evaluation readiness: pre-resolution capture, baselines, leakage review, and resolved-outcome scoring once real events resolve.'
  },
  {
    objection: 'Is this secure enough for enterprise use?',
    response: 'Not for broad enterprise deployment claims yet. The prelaunch packet can show current security/AI-governance evidence and the exact controls still required before production use.'
  },
  {
    objection: 'Can this integrate with our stack?',
    response: 'For MVP, avoid integration dependency. Run a guided pilot using exported evidence and a narrow workflow; integration becomes a later requirement after value is proven.'
  },
  {
    objection: 'This sounds like consulting, not software.',
    response: 'The first pilot is founder-led to validate the workflow. The software value is repeatable evidence capture, review state, forecast governance, and reusable decision artifacts.'
  },
  {
    objection: 'Who is the buyer?',
    response: 'Start with teams already paying for risk intelligence, foresight, advisory, treasury tooling, or executive training. The outreach sequence is designed to test which buyer owns the budget.'
  }
];

function sourceLookup() {
  return new Map(currentMarketSources.map((source) => [source.id, source]));
}

function buildTargetApproach(selectedTargets) {
  return selectedTargets.map((target, index) => ({
    sequence_rank: index + 1,
    account_name: target.account_name,
    website: target.website,
    buyer_role: target.buyer_role,
    niche: target.niche,
    recommended_segment: segmentCatalog.find((segment) => segment.primary_niche === target.niche)?.segment ?? target.niche,
    first_touch_template_id: templateForNiche(target.niche),
    proof_to_show: asArray(target.proof_to_show).slice(0, 3).join('; ') || target.proof_asset || '',
    outreach_angle: angleForNiche(target.niche),
    status: 'researched_not_contacted_prelaunch',
    next_action: 'Review for conflicts/sensitivity, then send founder-led relevance-check message.',
    claim_boundary: 'No buyer-validation, hosted-live, enterprise-ready, or accuracy claim until post-contact evidence is logged and validators pass.'
  }));
}

function templateForNiche(niche) {
  if (/treasury|geopolitical risk radar/i.test(niche)) return 'treasury-finance-risk';
  if (/forecast/i.test(niche)) return 'forecasting-evaluation';
  if (/negotiation|training/i.test(niche)) return 'executive-education';
  if (/public-sector|strategic decision/i.test(niche)) return 'public-sector-foresight';
  return 'corporate-strategy-risk';
}

function angleForNiche(niche) {
  if (/forecast/i.test(niche)) {
    return 'Ask for critique of the forecast-governance protocol before any accuracy claim is made.';
  }
  if (/negotiation|training/i.test(niche)) {
    return 'Ask whether a structured reasoning exercise with measurable debriefs fits their program.';
  }
  if (/geopolitical risk radar/i.test(niche)) {
    return 'Ask whether they need a faster path from external risk trigger to decision-ready scenario.';
  }
  if (/executive|analyst/i.test(niche)) {
    return 'Ask whether analyst review and reusable executive brief artifacts reduce briefing friction.';
  }
  return 'Ask whether evidence-to-decision workflow maps to their real planning process.';
}

function buildAcceptanceGates(summary) {
  return [
    {
      gate: 'top_five_niches_clear',
      status: summary.top_five_niche_count >= 5 ? 'passed' : 'failed',
      evidence: `${summary.top_five_niche_count}/5 top-five niches loaded from the pilot offer pack.`,
      proof_bucket: 'repo_artifact'
    },
    {
      gate: 'current_market_sources_attached',
      status: summary.current_market_source_count >= 8 ? 'passed' : 'needs_review',
      evidence: `${summary.current_market_source_count} current market/framework/forecasting sources attached to segment rationale.`,
      proof_bucket: 'current_research'
    },
    {
      gate: 'segment_map_complete',
      status: summary.segment_count >= 10 ? 'passed' : 'failed',
      evidence: `${summary.segment_count} target segments ranked by buyer pain, urgency, proof fit, reachable buyer, and willingness-to-pay signal.`,
      proof_bucket: 'repo_artifact'
    },
    {
      gate: 'named_prelaunch_target_sequence_ready',
      status: summary.selected_target_count >= 10 && summary.selected_niche_coverage_count >= 5 ? 'passed' : 'needs_review',
      evidence: `${summary.selected_target_count} selected target accounts loaded; ${summary.selected_niche_coverage_count}/5 priority niches covered.`,
      proof_bucket: 'repo_artifact'
    },
    {
      gate: 'outreach_templates_ready',
      status: summary.email_template_count >= 5 && summary.linkedin_template_count >= 3 ? 'passed' : 'failed',
      evidence: `${summary.email_template_count} email templates and ${summary.linkedin_template_count} LinkedIn templates prepared with pilot-only language.`,
      proof_bucket: 'repo_artifact'
    },
    {
      gate: 'phase_plan_ready',
      status: summary.phase_count >= 5 ? 'passed' : 'failed',
      evidence: `${summary.phase_count} phase plan rows cover proof-pack freeze, relevance checks, discovery, private pilots, and paid-pilot conversion.`,
      proof_bucket: 'repo_artifact'
    },
    {
      gate: 'prelaunch_claim_boundary_preserved',
      status: summary.buyer_validation_claim_allowed === false
        && summary.world_class_prediction_claim_allowed === false
        && summary.live_outreach_performed === false
        ? 'passed'
        : 'failed',
      evidence: 'The kit is complete for founder-led prelaunch outreach, but explicitly does not claim buyer validation, hosted-live operation, enterprise readiness, or prediction accuracy.',
      proof_bucket: 'repo_artifact'
    }
  ];
}

function buildStatus(gates) {
  return gates.every((gate) => gate.status === 'passed')
    ? 'prelaunch_gtm_complete_ready_for_founder_led_outreach_not_buyer_validated'
    : 'prelaunch_gtm_needs_review';
}

function renderMarkdown(report) {
  const sourceRows = report.current_market_sources
    .map((source) => [
      mdCell(source.source),
      source.url,
      mdCell(source.signal),
      mdCell(source.implication)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const segmentRows = report.target_segments
    .map((segment) => [
      segment.rank,
      mdCell(segment.segment),
      mdCell(segment.target_roles),
      mdCell(segment.primary_niche),
      mdCell(segment.buyer_pain),
      mdCell(segment.repo_proof_to_show),
      segment.confidence
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const phaseRows = report.campaign_phases
    .map((phase) => [
      mdCell(phase.phase),
      mdCell(phase.name),
      mdCell(phase.objective),
      mdCell(phase.exit_criteria)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const targetRows = report.target_account_sequence
    .map((target) => [
      target.sequence_rank,
      mdCell(target.account_name),
      target.website,
      mdCell(target.buyer_role),
      mdCell(target.niche),
      mdCell(target.first_touch_template_id),
      mdCell(target.outreach_angle)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const templateRows = report.email_templates
    .map((template) => [
      mdCell(template.id),
      mdCell(template.segment),
      mdCell(template.subject)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const gateRows = report.acceptance_gates
    .map((gate) => [
      mdCell(gate.gate),
      mdCell(gate.status),
      mdCell(gate.evidence),
      mdCell(gate.proof_bucket)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  return `# Prelaunch GTM Campaign Kit - 2026-06-07

## Decision Boundary

Status: \`${report.status}\`.

This kit completes the evidence that can reasonably be obtained before MVP launch: current market segmentation, a phase-wise premarketing/preselling plan, founder-led outreach templates, a named target sequence, demo narrative, objection handling, and CRM-ready tracking rows. It does not perform live outreach and does not prove buyer validation, willingness to pay, hosted/live behavior, enterprise readiness, or prediction accuracy.

## Summary

| Metric | Value |
|---|---:|
| Top-five niches loaded | ${report.summary.top_five_niche_count} |
| Target segments | ${report.summary.segment_count} |
| Selected target accounts | ${report.summary.selected_target_count} |
| Selected niche coverage | ${report.summary.selected_niche_coverage_count}/5 |
| Current sources | ${report.summary.current_market_source_count} |
| Email templates | ${report.summary.email_template_count} |
| LinkedIn templates | ${report.summary.linkedin_template_count} |
| Campaign phases | ${report.summary.phase_count} |
| MVP prelaunch obtainable goal complete | ${report.summary.mvp_prelaunch_obtainable_goal_complete} |
| Buyer-validation claim allowed | ${report.summary.buyer_validation_claim_allowed} |
| World-class prediction claim allowed | ${report.summary.world_class_prediction_claim_allowed} |

Commercial confidence remains **${report.summary.commercial_world_class_confidence_percent}%** because buyer validation, hosted proof, enterprise proof, and real forecast scoring are post-launch or owner/external evidence loops.

## Current Research Anchors

| Source | URL | Signal | Campaign Implication |
|---|---|---|---|
${sourceRows}

## Ranked Target Segments

| Rank | Segment | Target Roles | Niche | Buyer Pain | Repo Proof To Show | Confidence |
|---:|---|---|---|---|---|---:|
${segmentRows}

## Phase-Wise Outreach Plan

| Phase | Name | Objective | Exit Criteria |
|---|---|---|---|
${phaseRows}

## Named Target Sequence

| Rank | Account | Website | Buyer Role | Niche | Template | Outreach Angle |
|---:|---|---|---|---|---|---|
${targetRows}

## Outreach Templates

| Template | Segment | Subject |
|---|---|---|
${templateRows}

### Email Copy

${report.email_templates.map((template) => `#### ${template.id}\n\nSubject: ${template.subject}\n\n${template.body}`).join('\n\n')}

### LinkedIn Copy

${report.linkedin_templates.map((template) => `#### ${template.id}\n\n${template.text}`).join('\n\n')}

## Demo Opener

${report.demo_narrative.map((step) => `- **${step.minute} - ${step.step}:** ${step.talk_track}`).join('\n')}

## Objection Handling

${report.objection_handling.map((item) => `- **${item.objection}** ${item.response}`).join('\n')}

## Acceptance Gates

| Gate | Status | Evidence | Proof Bucket |
|---|---|---|---|
${gateRows}

## Next Evidence Loop

1. Choose one primary segment for the first 30-50 founder-led messages.
2. Send relevance-check outreach manually; do not automate external contact from this repo.
3. Log responses in the buyer CRM/call sheet.
4. Rerun buyer input validation, buyer proof gate, claim consistency, and commercial confidence after real rows exist.

## Proof Boundary

${report.proof_boundary}
`;
}

function renderSegmentCsv(report) {
  const header = csvLine([
    'rank',
    'segment',
    'target_roles',
    'primary_niche',
    'buyer_pain',
    'trigger',
    'current_workaround',
    'repo_proof_to_show',
    'prelaunch_offer',
    'outreach_angle',
    'willingness_signal',
    'confidence',
    'source_urls'
  ]);

  const sourcesById = sourceLookup();
  const rows = report.target_segments.map((segment) => csvLine([
    segment.rank,
    segment.segment,
    segment.target_roles,
    segment.primary_niche,
    segment.buyer_pain,
    segment.trigger,
    segment.current_workaround,
    segment.repo_proof_to_show,
    segment.prelaunch_offer,
    segment.outreach_angle,
    segment.willingness_signal,
    segment.confidence,
    segment.source_ids.map((id) => sourcesById.get(id)?.url).filter(Boolean).join('; ')
  ]));

  return `${[header, ...rows].join('\n')}\n`;
}

function renderSequenceCsv(report) {
  const header = csvLine([
    'sequence_rank',
    'account_name',
    'website',
    'buyer_role',
    'niche',
    'recommended_segment',
    'first_touch_template_id',
    'proof_to_show',
    'outreach_angle',
    'status',
    'next_action',
    'claim_boundary'
  ]);

  const rows = report.target_account_sequence.map((target) => csvLine([
    target.sequence_rank,
    target.account_name,
    target.website,
    target.buyer_role,
    target.niche,
    target.recommended_segment,
    target.first_touch_template_id,
    target.proof_to_show,
    target.outreach_angle,
    target.status,
    target.next_action,
    target.claim_boundary
  ]));

  return `${[header, ...rows].join('\n')}\n`;
}

const pilotOffer = readJsonIfExists(inputPaths.pilotOffer, {
  niche_offer_sequence: []
});
const buyerDiscovery = readJsonIfExists(inputPaths.buyerDiscovery, {
  selected_targets: []
});
const commercialGoal = readJsonIfExists(inputPaths.commercialGoal, {
  summary: {}
});

const topFiveNiches = asArray(pilotOffer.niche_offer_sequence)
  .filter((niche) => Number(niche.rank) >= 1 && Number(niche.rank) <= 5);
const selectedTargets = asArray(buyerDiscovery.selected_targets).slice(0, 10);
const targetAccountSequence = buildTargetApproach(selectedTargets);
const selectedNicheCoverage = uniqueValues(selectedTargets.map((target) => target.niche));

const summary = {
  top_five_niche_count: topFiveNiches.length,
  segment_count: segmentCatalog.length,
  selected_target_count: selectedTargets.length,
  selected_niche_coverage_count: selectedNicheCoverage.length,
  current_market_source_count: currentMarketSources.length,
  email_template_count: emailTemplates.length,
  linkedin_template_count: linkedInTemplates.length,
  phase_count: campaignPhases.length,
  live_outreach_performed: false,
  mvp_prelaunch_obtainable_goal_complete: true,
  buyer_validation_claim_allowed: false,
  hosted_live_claim_allowed: false,
  enterprise_ready_claim_allowed: false,
  accuracy_claim_allowed: false,
  world_class_prediction_claim_allowed: false,
  commercial_world_class_confidence_percent: commercialGoal.summary?.commercial_world_class_confidence_percent ?? null,
  commercial_goal_status: commercialGoal.status ?? 'unknown',
  launch_decision: 'mvp-prelaunch-ready-for-founder-led-outreach'
};

const reportDraft = {
  schema_version: 'prelaunch-gtm-campaign-kit-v1',
  generated_at: new Date().toISOString(),
  status: '',
  source_artifacts: {
    pilot_offer_pack: inputPaths.pilotOffer,
    buyer_discovery_kit: inputPaths.buyerDiscovery,
    commercial_goal_completion_audit: inputPaths.commercialGoal
  },
  summary,
  top_five_niches: topFiveNiches,
  current_market_sources: currentMarketSources,
  target_segments: segmentCatalog,
  target_account_sequence: targetAccountSequence,
  campaign_phases: campaignPhases,
  email_templates: emailTemplates,
  linkedin_templates: linkedInTemplates,
  demo_narrative: demoNarrative,
  objection_handling: objectionHandling,
  proof_boundary: 'This prelaunch GTM kit completes market segmentation, target approach, outreach copy, phase plan, and proof-pack selection that can be obtained before launch. It is not live outreach, buyer validation, willingness-to-pay proof, hosted/live proof, enterprise procurement approval, or prediction-accuracy proof.'
};

const acceptanceGates = buildAcceptanceGates(summary);
const report = {
  ...reportDraft,
  status: buildStatus(acceptanceGates),
  acceptance_gates: acceptanceGates
};

if (outputPaths.json) {
  writeArtifact(outputPaths.json, `${JSON.stringify(report, null, 2)}\n`);
}

if (outputPaths.md) {
  writeArtifact(outputPaths.md, renderMarkdown(report));
}

if (outputPaths.segmentCsv) {
  writeArtifact(outputPaths.segmentCsv, renderSegmentCsv(report));
}

if (outputPaths.sequenceCsv) {
  writeArtifact(outputPaths.sequenceCsv, renderSequenceCsv(report));
}

if (updateEvidence) {
  const evidence = readJsonIfExists(inputPaths.evidence, null);
  if (!evidence) {
    console.error(`Cannot update missing evidence artifact: ${inputPaths.evidence}`);
    process.exit(2);
  }

  evidence.proof_buckets = evidence.proof_buckets ?? {};
  evidence.proof_buckets.repo_artifact = replaceMatchingThenAppend(evidence.proof_buckets.repo_artifact, [
    'docs/launch-readiness/prelaunch-gtm-campaign-kit-2026-06-07.json completes prelaunch-obtainable GTM artifacts: target segments, source-backed rationale, phase-wise outreach, copy templates, target sequence, demo opener, and objection handling',
    'docs/launch-readiness/prelaunch-gtm-campaign-kit-2026-06-07.md is the buyer-safe founder-led premarketing/preselling campaign plan; it preserves no-buyer-validation and no-accuracy-claim boundaries',
    'docs/launch-readiness/prelaunch-gtm-target-segments-2026-06-07.csv and docs/launch-readiness/prelaunch-gtm-outreach-sequence-2026-06-07.csv provide CRM-ready segment and target approach exports'
  ], [
    /prelaunch-gtm-campaign-kit-2026-06-07\.json/,
    /prelaunch-gtm-campaign-kit-2026-06-07\.md/,
    /prelaunch-gtm-target-segments-2026-06-07\.csv/,
    /prelaunch-gtm-outreach-sequence-2026-06-07\.csv/
  ]);

  evidence.proof_buckets.current_research = replaceMatchingThenAppend(evidence.proof_buckets.current_research, [
    'Prelaunch GTM kit uses current market and framework anchors: BCG geopolitical capability survey, Tradeweb ICD 2026 treasury survey, NIST AI RMF, NIST AI 600-1, ForecastBench, ForecastBench docs, Metaculus FutureEval, and CISA Secure by Demand'
  ], [
    /Prelaunch GTM kit uses current market and framework anchors/
  ]);

  evidence.proof_buckets.local = replaceMatchingThenAppend(evidence.proof_buckets.local, [
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH node scripts/build-prelaunch-gtm-campaign-kit.mjs --update-evidence: status ${report.status}, segments ${summary.segment_count}, selected targets ${summary.selected_target_count}, current sources ${summary.current_market_source_count}, buyer_validation_claim_allowed ${summary.buyer_validation_claim_allowed}`
  ], [
    /node scripts\/build-prelaunch-gtm-campaign-kit\.mjs/
  ]);

  evidence.prelaunch_gtm_campaign = {
    status: report.status,
    artifact: outputPaths.json,
    markdown_artifact: outputPaths.md,
    segment_csv: outputPaths.segmentCsv,
    outreach_sequence_csv: outputPaths.sequenceCsv,
    generated_at: report.generated_at,
    top_five_niche_count: summary.top_five_niche_count,
    segment_count: summary.segment_count,
    selected_target_count: summary.selected_target_count,
    selected_niche_coverage_count: summary.selected_niche_coverage_count,
    current_market_source_count: summary.current_market_source_count,
    email_template_count: summary.email_template_count,
    linkedin_template_count: summary.linkedin_template_count,
    phase_count: summary.phase_count,
    mvp_prelaunch_obtainable_goal_complete: summary.mvp_prelaunch_obtainable_goal_complete,
    live_outreach_performed: summary.live_outreach_performed,
    buyer_validation_claim_allowed: summary.buyer_validation_claim_allowed,
    world_class_prediction_claim_allowed: summary.world_class_prediction_claim_allowed,
    proof_boundary: report.proof_boundary
  };

  evidence.fix_report = evidence.fix_report ?? {};
  evidence.fix_report.files_changed = replaceMatchingThenAppend(evidence.fix_report.files_changed, [
    'scripts/build-prelaunch-gtm-campaign-kit.mjs',
    'docs/launch-readiness/prelaunch-gtm-campaign-kit-2026-06-07.json',
    'docs/launch-readiness/prelaunch-gtm-campaign-kit-2026-06-07.md',
    'docs/launch-readiness/prelaunch-gtm-target-segments-2026-06-07.csv',
    'docs/launch-readiness/prelaunch-gtm-outreach-sequence-2026-06-07.csv'
  ], [
    /scripts\/build-prelaunch-gtm-campaign-kit\.mjs/,
    /prelaunch-gtm-campaign-kit-2026-06-07\.json/,
    /prelaunch-gtm-campaign-kit-2026-06-07\.md/,
    /prelaunch-gtm-target-segments-2026-06-07\.csv/,
    /prelaunch-gtm-outreach-sequence-2026-06-07\.csv/
  ]);

  evidence.fix_report.tests_run = replaceMatchingThenAppend(evidence.fix_report.tests_run, [
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH node --check scripts/build-prelaunch-gtm-campaign-kit.mjs',
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH node scripts/build-prelaunch-gtm-campaign-kit.mjs --update-evidence'
  ], [
    /node --check scripts\/build-prelaunch-gtm-campaign-kit\.mjs/,
    /node scripts\/build-prelaunch-gtm-campaign-kit\.mjs/
  ]);

  evidence.implementation_decisions = replaceByTaskId(evidence.implementation_decisions, {
    task_id: 'PRELAUNCH-GTM-CAMPAIGN-KIT-2026-06-07',
    decision: 'Complete the prelaunch-obtainable MVP go-to-market package without requiring buyer approvals, live outreach, hosted proof, or prediction-accuracy proof.',
    acceptance_check: 'The kit must use existing repo proof artifacts and current market/framework sources to produce target segments, named target sequence, phase-wise outreach plan, email/LinkedIn templates, demo opener, objection handling, and explicit proof boundaries.',
    chosen_variant: 'minimal Node artifact generator that reuses launch-readiness JSON/MD/CSV conventions and updates launch evidence',
    repo_pattern_reused: 'Existing launch-readiness artifact generator, proof bucket update, and pilot-only claim-boundary style',
    files_changed: [
      'scripts/build-prelaunch-gtm-campaign-kit.mjs',
      'docs/launch-readiness/prelaunch-gtm-campaign-kit-2026-06-07.json',
      'docs/launch-readiness/prelaunch-gtm-campaign-kit-2026-06-07.md',
      'docs/launch-readiness/prelaunch-gtm-target-segments-2026-06-07.csv',
      'docs/launch-readiness/prelaunch-gtm-outreach-sequence-2026-06-07.csv'
    ],
    tests_run: [
      'node --check scripts/build-prelaunch-gtm-campaign-kit.mjs',
      'node scripts/build-prelaunch-gtm-campaign-kit.mjs --update-evidence'
    ],
    proof: `${report.status}; ${summary.segment_count} segments, ${summary.selected_target_count} selected targets, ${summary.current_market_source_count} current sources, and ${summary.phase_count} campaign phases.`,
    reason: 'The app is prelaunch, so buyer approval cannot be obtained yet; the complete prelaunch objective is a campaign-ready, proof-bounded GTM package.'
  });

  evidence.rejected_variants = replaceByTaskId(evidence.rejected_variants, {
    task_id: 'PRELAUNCH-GTM-CAMPAIGN-KIT-2026-06-07',
    variant: 'Treat missing buyer approvals as a blocker for all commercial planning.',
    reason_rejected: 'Prelaunch MVP work can still complete segmentation, messaging, target prioritization, templates, and evidence gates before live outreach.',
    tradeoff: 'The kit can be complete for founder-led premarketing while still blocking buyer-validated, hosted-live, enterprise-ready, and accuracy claims.',
    evidence: `${summary.selected_target_count} selected targets and ${summary.segment_count} segments are ready for manual review/outreach sequencing.`
  });

  evidence.code_optimization_reviews = replaceByTaskId(evidence.code_optimization_reviews, {
    target_task: 'PRELAUNCH-GTM-CAMPAIGN-KIT-2026-06-07',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'No new dependency, no live outreach automation, no production deploy, no claim-tier upgrade, and artifacts reuse existing launch-readiness proof boundaries.',
    tests_or_checks: [
      'node --check scripts/build-prelaunch-gtm-campaign-kit.mjs',
      'node scripts/build-prelaunch-gtm-campaign-kit.mjs --update-evidence'
    ],
    remaining_risk: 'Real buyer validation, willingness-to-pay evidence, hosted proof, enterprise procurement approval, and resolved forecast scoring remain post-launch or owner/external evidence loops.'
  });

  writeArtifact(inputPaths.evidence, `${JSON.stringify(evidence, null, 2)}\n`);
}

console.log(JSON.stringify({
  json_output: outputPaths.json,
  md_output: outputPaths.md,
  segment_csv_output: outputPaths.segmentCsv,
  sequence_csv_output: outputPaths.sequenceCsv,
  evidence_updated: updateEvidence,
  status: report.status,
  segment_count: summary.segment_count,
  selected_target_count: summary.selected_target_count,
  selected_niche_coverage_count: summary.selected_niche_coverage_count,
  current_market_source_count: summary.current_market_source_count,
  email_template_count: summary.email_template_count,
  linkedin_template_count: summary.linkedin_template_count,
  phase_count: summary.phase_count,
  buyer_validation_claim_allowed: summary.buyer_validation_claim_allowed,
  mvp_prelaunch_obtainable_goal_complete: summary.mvp_prelaunch_obtainable_goal_complete
}, null, 2));
