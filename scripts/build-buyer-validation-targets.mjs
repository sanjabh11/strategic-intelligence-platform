#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const DEFAULT_JSON_OUTPUT = 'docs/launch-readiness/buyer-validation-targets-2026-06-06.json';
const DEFAULT_CSV_OUTPUT = 'docs/launch-readiness/buyer-validation-targets-2026-06-06.csv';
const DEFAULT_MD_OUTPUT = 'docs/launch-readiness/buyer-validation-targets-2026-06-06.md';

function argValue(name, fallback = null) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] ?? fallback : fallback;
}

function hasFlag(name) {
  return args.includes(name);
}

function usage() {
  console.error([
    'Usage: node scripts/build-buyer-validation-targets.mjs',
    `  [--json-output ${DEFAULT_JSON_OUTPUT}]`,
    `  [--csv-output ${DEFAULT_CSV_OUTPUT}]`,
    `  [--md-output ${DEFAULT_MD_OUTPUT}]`
  ].join('\n'));
}

if (hasFlag('--help') || hasFlag('-h')) {
  usage();
  process.exit(0);
}

const jsonOutputPath = argValue('--json-output', DEFAULT_JSON_OUTPUT);
const csvOutputPath = argValue('--csv-output', DEFAULT_CSV_OUTPUT);
const mdOutputPath = argValue('--md-output', DEFAULT_MD_OUTPUT);

if (!jsonOutputPath && !csvOutputPath && !mdOutputPath) {
  console.error('At least one output path is required.');
  process.exit(2);
}

function writeArtifact(relativePath, contents) {
  const absolutePath = path.isAbsolute(relativePath)
    ? relativePath
    : path.resolve(process.cwd(), relativePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, contents);
}

function csvCell(value) {
  const text = String(value ?? '');
  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function mdCell(value) {
  return String(value ?? '').replaceAll('|', '/').replace(/\s+/g, ' ').trim();
}

const sources = [
  {
    id: 'ga_pos_csf',
    title: 'GAO Center for Strategic Foresight',
    url: 'https://www.gao.gov/about/what-gao-does/audit-role/csf/',
    note: 'Analyzes trends that affect federal agencies and programs now and in the future.'
  },
  {
    id: 'uk_go_science_futures',
    title: 'UK Government Office for Science Futures and Foresight',
    url: 'https://www.gov.uk/government/groups/futures-and-foresight',
    note: 'Supports civil servants with futures resources, training, advisory services, networks, reports, and horizon scanning.'
  },
  {
    id: 'oecd_foresight',
    title: 'OECD Strategic Foresight',
    url: 'https://www.oecd.org/strategic-foresight/',
    note: 'Supports anticipatory policy making through the Strategic Foresight Unit and Government Foresight Community.'
  },
  {
    id: 'policy_horizons_canada',
    title: 'Policy Horizons Canada',
    url: 'https://horizons.service.canada.ca/en/home/index.shtml',
    note: 'Uses foresight to help the federal government build stronger policies and programs under uncertainty.'
  },
  {
    id: 'atlantic_council_geostrategy',
    title: 'Atlantic Council GeoStrategy Initiative',
    url: 'https://www.atlanticcouncil.org/our-programs/foresight-strategy-and-risks-initiative/',
    note: 'Uses strategy development and long-range foresight for policy-relevant analysis and solutions.'
  },
  {
    id: 'csis_futures_lab',
    title: 'CSIS Futures Lab',
    url: 'https://www.csis.org/programs/futures-lab?f%5B0%5D=topics%3A845',
    note: 'Adds empirical rigor to foresight and policy analysis using computational social science, red teaming, and wargaming.'
  },
  {
    id: 'wef_strategic_intelligence',
    title: 'World Economic Forum Strategic Intelligence',
    url: 'https://www.weforum.org/focus/strategic-intelligence/',
    note: 'Strategic Intelligence is positioned around complexity, shared factual context, and foresight.'
  },
  {
    id: 'wef_global_risks',
    title: 'World Economic Forum Global Risks Initiative',
    url: 'https://initiatives.weforum.org/global-risks/home',
    note: 'Global Risks Report 2026 is a benchmark for risks at the forefront of strategic decision-making.'
  },
  {
    id: 'control_risks',
    title: 'Control Risks',
    url: 'https://www.controlrisks.com/',
    note: 'Global security and strategic intelligence firm with 2026 sanctions/geopolitical risk content.'
  },
  {
    id: 'ey_geostrategy',
    title: 'EY Geostrategic Outlook 2026',
    url: 'https://www.ey.com/en_us/insights/geostrategy/geostrategic-outlook',
    note: 'Frames geopolitics as business strategy risk and opportunity.'
  },
  {
    id: 'deloitte_cfo_2026',
    title: 'Deloitte CFO Survey April 2026',
    url: 'https://www.deloitte.com/uk/en/about/press-room/uk-finance-leaders-confidence-drops-as-geopolitical-risk-dominat-april-2026.html',
    note: 'Reports UK finance leader confidence drop as geopolitical risk dominates the agenda.'
  },
  {
    id: 'tradeweb_treasury_2026',
    title: 'Tradeweb ICD Portal Client Survey 2026',
    url: 'https://www.tradeweb.com/newsroom/media-center/news-releases/geopolitical-risk-concerns-surge-for-corporate-treasurers-according-to-2026-tradeweb-icd-portal-client-survey/',
    note: 'Reports corporate treasurers geopolitical concerns have surged.'
  },
  {
    id: 'metaculus_futureeval',
    title: 'Metaculus FutureEval',
    url: 'https://www.metaculus.com/futureeval/',
    note: 'Provides an AI forecasting evaluation context that requires resolved forecasts and baselines.'
  },
  {
    id: 'good_judgment_services',
    title: 'Good Judgment Services',
    url: 'https://goodjudgment.com/services/',
    note: 'Offers forecasting services and training around decision uncertainty.'
  },
  {
    id: 'forecastbench',
    title: 'ForecastBench',
    url: 'https://forecastingresearch.org/research/forecastbench',
    note: 'Dynamic benchmark for AI forecasting that reinforces the need for comparable questions and proper scoring.'
  },
  {
    id: 'rand_value_info',
    title: 'RAND Value of Information for Policy Analysis',
    url: 'https://www.rand.org/pubs/rgs_dissertations/RGSD408.html',
    note: 'Frames value of information methods for policy decision makers.'
  },
  {
    id: 'millennium_project',
    title: 'The Millennium Project',
    url: 'https://www.millennium-project.org/',
    note: 'Global participatory foresight network with nodes and collective intelligence orientation.'
  },
  {
    id: 'oxford_analytica',
    title: 'Oxford Analytica',
    url: 'https://www.oxan.com/',
    note: 'Macroeconomic and geopolitical risk analysis for organizations navigating uncertainty.'
  },
  {
    id: 'fiscalnote_prediction_markets',
    title: 'FiscalNote political prediction-market expansion',
    url: 'https://fiscalnote.com/newsroom/fiscalnote-announces-major-expansion-into-political-prediction-markets',
    note: 'Shows policy and political prediction-market interest among policy-intelligence buyers.'
  },
  {
    id: 'michigan_ross_decision_making',
    title: 'Michigan Ross Strategic Decision Making executive education',
    url: 'https://michiganross.umich.edu/sites/default/files/media/documents/2025/07/Michigan%20Ross%20Strategic%20Decision%20Making_07142025.pdf',
    note: 'Executive education demand for strategic decision-making training.'
  }
];

const targets = [
  {
    rank: 1,
    account_name: 'GAO Center for Strategic Foresight',
    account_type: 'public_sector_foresight',
    niche: 'Enterprise/public-sector strategic decision intelligence',
    buyer_role: 'Strategic foresight director or federal program-analysis lead',
    why_this_target: 'Clear mandate around trends affecting federal agencies and programs.',
    proof_asset: 'Console to strategist brief to human-review and forecast-draft handoff.',
    validation_question: 'Would a governed evidence-to-forecast workflow improve federal trend-analysis or audit-planning exercises?',
    source_id: 'ga_pos_csf',
    outreach_status: 'research_target_not_contacted',
    confidence: 4
  },
  {
    rank: 2,
    account_name: 'UK Government Office for Science Futures and Foresight',
    account_type: 'public_sector_foresight',
    niche: 'Enterprise/public-sector strategic decision intelligence',
    buyer_role: 'Futures, foresight, or horizon-scanning team lead',
    why_this_target: 'Publishes an active offer for futures support, training, advisory services, and horizon scanning.',
    proof_asset: 'Actor/countermove brief plus review state and forecast-governance caveats.',
    validation_question: 'Could this pilot accelerate a cross-cutting futures workshop without weakening evidence quality?',
    source_id: 'uk_go_science_futures',
    outreach_status: 'research_target_not_contacted',
    confidence: 5
  },
  {
    rank: 3,
    account_name: 'OECD Strategic Foresight Unit / Government Foresight Community',
    account_type: 'public_sector_network',
    niche: 'Enterprise/public-sector strategic decision intelligence',
    buyer_role: 'Strategic foresight unit lead or GFC program contact',
    why_this_target: 'OECD explicitly frames strategic foresight as modern evidence-based and anticipatory policymaking.',
    proof_asset: 'Public-sector scenario brief with transparent uncertainty and policy trade-off questions.',
    validation_question: 'Which evidence, capability, and feedback-loop requirements would make this credible for government foresight practitioners?',
    source_id: 'oecd_foresight',
    outreach_status: 'research_target_not_contacted',
    confidence: 5
  },
  {
    rank: 4,
    account_name: 'Policy Horizons Canada',
    account_type: 'public_sector_foresight',
    niche: 'Enterprise/public-sector strategic decision intelligence',
    buyer_role: 'Foresight analyst or policy innovation lead',
    why_this_target: 'Uses foresight to help federal policy and programs operate under uncertainty.',
    proof_asset: 'Evidence bundle and audience-specific briefing for a policy uncertainty.',
    validation_question: 'Would the workflow help structure a foresight brief from sources into scoreable assumptions?',
    source_id: 'policy_horizons_canada',
    outreach_status: 'research_target_not_contacted',
    confidence: 4
  },
  {
    rank: 5,
    account_name: 'Atlantic Council GeoStrategy Initiative',
    account_type: 'think_tank_foresight',
    niche: 'Executive and analyst briefing layer',
    buyer_role: 'Foresight, strategy, or program lead',
    why_this_target: 'Produces global foresight and long-range strategy work for complex international issues.',
    proof_asset: 'Analyst briefing layer plus forecast-draft governance for a Global Foresight scenario.',
    validation_question: 'Would the product reduce time from source pack to scenario memo while preserving analyst review?',
    source_id: 'atlantic_council_geostrategy',
    outreach_status: 'research_target_not_contacted',
    confidence: 4
  },
  {
    rank: 6,
    account_name: 'CSIS Futures Lab',
    account_type: 'think_tank_foresight',
    niche: 'Executive and analyst briefing layer',
    buyer_role: 'Futures Lab or computational social science lead',
    why_this_target: 'Uses red teaming, wargaming, computational social science, and decision support.',
    proof_asset: 'Game-tree or countermove reasoning path with analyst review and forecast handoff.',
    validation_question: 'Where would the workflow need stronger empirical rigor before it could support policy analysis?',
    source_id: 'csis_futures_lab',
    outreach_status: 'research_target_not_contacted',
    confidence: 4
  },
  {
    rank: 7,
    account_name: 'World Economic Forum Strategic Intelligence',
    account_type: 'strategic_intelligence_platform',
    niche: 'Enterprise/public-sector strategic decision intelligence',
    buyer_role: 'Strategic Intelligence partnerships or content lead',
    why_this_target: 'Strategic Intelligence is a direct conceptual reference point for shared factual context and foresight.',
    proof_asset: 'Differentiated layer: evidence-to-actor-reasoning-to-forecast draft, not trend-map replacement.',
    validation_question: 'Is the governed forecast handoff a complementary layer to strategic-intelligence maps?',
    source_id: 'wef_strategic_intelligence',
    outreach_status: 'research_target_not_contacted',
    confidence: 3
  },
  {
    rank: 8,
    account_name: 'World Economic Forum Global Risks Initiative',
    account_type: 'risk_network',
    niche: 'Geopolitical risk radar and scenario monitor',
    buyer_role: 'Global risks program, community, or report team',
    why_this_target: 'Global Risks Report 2026 is a high-visibility benchmark for strategic risk decision-making.',
    proof_asset: 'Global-risk issue brief with source provenance, actor map, and forecast-draft scoring plan.',
    validation_question: 'What proof would make this useful for risk survey follow-up or scenario workshop prep?',
    source_id: 'wef_global_risks',
    outreach_status: 'research_target_not_contacted',
    confidence: 3
  },
  {
    rank: 9,
    account_name: 'Control Risks',
    account_type: 'competitor_or_channel',
    niche: 'Geopolitical risk radar and scenario monitor',
    buyer_role: 'Innovation, analytics, or intelligence product lead',
    why_this_target: 'Incumbent strategic intelligence firm; useful for competitive benchmark and potential analyst-workflow validation.',
    proof_asset: 'Radar-to-brief workflow that complements analyst services rather than claiming to replace them.',
    validation_question: 'Would analyst teams value a governed draft-to-review tool for repeatable client briefs?',
    source_id: 'control_risks',
    outreach_status: 'research_target_not_contacted',
    confidence: 3
  },
  {
    rank: 10,
    account_name: 'EY-Parthenon Geostrategic Business Group',
    account_type: 'advisory_competitor_or_channel',
    niche: 'Corporate strategic decision intelligence',
    buyer_role: 'Geostrategy, risk transformation, or strategy partner',
    why_this_target: 'EY frames geopolitics as a driver of strategic change and business opportunity/risk.',
    proof_asset: 'Board-ready strategic risk memo with uncertainty, countermoves, and forecast draft.',
    validation_question: 'Could this help strategy teams move from geopolitical insight to client decision alternatives faster?',
    source_id: 'ey_geostrategy',
    outreach_status: 'research_target_not_contacted',
    confidence: 4
  },
  {
    rank: 11,
    account_name: 'Deloitte CFO Survey / Finance Transformation network',
    account_type: 'advisory_channel',
    niche: 'Corporate strategic decision intelligence',
    buyer_role: 'CFO program, risk advisory, or finance transformation lead',
    why_this_target: 'Deloitte reports geopolitical risk dominating UK CFO agendas in 2026.',
    proof_asset: 'CFO-facing risk brief that converts uncertainty into decision options and assumptions.',
    validation_question: 'Would CFO teams pay for a lightweight risk-to-decision workflow if hosted proof and RLS are complete?',
    source_id: 'deloitte_cfo_2026',
    outreach_status: 'research_target_not_contacted',
    confidence: 4
  },
  {
    rank: 12,
    account_name: 'Tradeweb ICD Portal / corporate treasury client segment',
    account_type: 'treasury_segment',
    niche: 'Geopolitical risk radar and scenario monitor',
    buyer_role: 'Treasury strategy, liquidity, or risk lead',
    why_this_target: 'Tradeweb reports corporate treasurers geopolitical concerns have surged in 2026.',
    proof_asset: 'Treasury/geopolitical risk scenario brief with forecast-draft assumptions and action thresholds.',
    validation_question: 'What risk/freshness proof would make the workflow useful before treasury risk committees?',
    source_id: 'tradeweb_treasury_2026',
    outreach_status: 'research_target_not_contacted',
    confidence: 4
  },
  {
    rank: 13,
    account_name: 'Metaculus FutureEval',
    account_type: 'forecasting_benchmark',
    niche: 'Governed forecasting and research workflow',
    buyer_role: 'Forecasting evaluation or services lead',
    why_this_target: 'Directly relevant to benchmark discipline and AI forecast evaluation.',
    proof_asset: 'Calibration ledger plus benchmark-comparison artifact, clearly marked sample-only until real data exists.',
    validation_question: 'What comparable baseline protocol would be acceptable before accuracy claims?',
    source_id: 'metaculus_futureeval',
    outreach_status: 'research_target_not_contacted',
    confidence: 5
  },
  {
    rank: 14,
    account_name: 'Good Judgment',
    account_type: 'forecasting_training_or_services',
    niche: 'Governed forecasting and research workflow',
    buyer_role: 'Forecasting services, training, or partnerships lead',
    why_this_target: 'Sells forecasting services and training; useful for validating the training/forecast governance wedge.',
    proof_asset: 'Forecast registry plus Brier/calibration proof path and training-facing debriefs.',
    validation_question: 'Would this serve as a pre-forecast reasoning workflow or training exercise generator?',
    source_id: 'good_judgment_services',
    outreach_status: 'research_target_not_contacted',
    confidence: 4
  },
  {
    rank: 15,
    account_name: 'Forecasting Research Institute / ForecastBench',
    account_type: 'forecasting_benchmark',
    niche: 'Governed forecasting and research workflow',
    buyer_role: 'ForecastBench or AI forecasting evaluation researcher',
    why_this_target: 'Benchmark discipline directly constrains the world-class prediction claim.',
    proof_asset: 'Benchmark comparison harness with explicit real-baseline requirements.',
    validation_question: 'What contamination, question comparability, and scoring rules must be met before a claim is credible?',
    source_id: 'forecastbench',
    outreach_status: 'research_target_not_contacted',
    confidence: 5
  },
  {
    rank: 16,
    account_name: 'RAND policy analysis researchers',
    account_type: 'policy_research',
    niche: 'Executive and analyst briefing layer',
    buyer_role: 'Policy analysis, value-of-information, or decision science researcher',
    why_this_target: 'Value-of-information framing can validate the product as decision-support, not prediction theater.',
    proof_asset: 'Evidence bundle that identifies what information would change a decision.',
    validation_question: 'Can the workflow make value-of-information assumptions inspectable enough for policy analysis?',
    source_id: 'rand_value_info',
    outreach_status: 'research_target_not_contacted',
    confidence: 3
  },
  {
    rank: 17,
    account_name: 'The Millennium Project',
    account_type: 'global_foresight_network',
    niche: 'Enterprise/public-sector strategic decision intelligence',
    buyer_role: 'Node coordinator or foresight network lead',
    why_this_target: 'Global participatory foresight network; good fit for source-backed scenario and collective-intelligence workflows.',
    proof_asset: 'Collaborative foresight brief with explicit uncertainty and forecast assumptions.',
    validation_question: 'Would node coordinators use the tool to standardize foresight contributions?',
    source_id: 'millennium_project',
    outreach_status: 'research_target_not_contacted',
    confidence: 3
  },
  {
    rank: 18,
    account_name: 'Oxford Analytica',
    account_type: 'competitor_or_channel',
    niche: 'Executive and analyst briefing layer',
    buyer_role: 'Analysis, product, or client solutions lead',
    why_this_target: 'Incumbent macro/geopolitical risk analysis provider; useful for substitute benchmark and analyst-workflow validation.',
    proof_asset: 'Analyst-reviewed brief pipeline with forecast-governance handoff.',
    validation_question: 'Where does the product need analyst controls before it can support client-facing briefs?',
    source_id: 'oxford_analytica',
    outreach_status: 'research_target_not_contacted',
    confidence: 3
  },
  {
    rank: 19,
    account_name: 'FiscalNote policy intelligence / prediction-market team',
    account_type: 'policy_intelligence',
    niche: 'Governed forecasting and research workflow',
    buyer_role: 'Policy intelligence, prediction-market, or product strategy lead',
    why_this_target: 'Policy prediction-market expansion validates interest in scoreable policy forecasts.',
    proof_asset: 'Policy forecast draft with evidence provenance, human review, and benchmark caveats.',
    validation_question: 'Could this workflow generate better governed policy-forecast inputs before market or analyst scoring?',
    source_id: 'fiscalnote_prediction_markets',
    outreach_status: 'research_target_not_contacted',
    confidence: 4
  },
  {
    rank: 20,
    account_name: 'Michigan Ross Executive Education strategic decision-making program',
    account_type: 'executive_education',
    niche: 'Negotiation and strategic reasoning training',
    buyer_role: 'Executive education program director or corporate learning lead',
    why_this_target: 'Executive decision-making training validates the adjacent training revenue lane.',
    proof_asset: 'Negotiation Dojo and game-tree module with manager-ready debriefs.',
    validation_question: 'Would an applied AI decision-workshop module be valuable if claims stay training-focused rather than predictive?',
    source_id: 'michigan_ross_decision_making',
    outreach_status: 'research_target_not_contacted',
    confidence: 3
  }
];

const sourceById = new Map(sources.map((source) => [source.id, source]));
const rows = targets.map((target) => {
  const source = sourceById.get(target.source_id);
  return {
    ...target,
    source_title: source?.title ?? '',
    source_url: source?.url ?? '',
    source_note: source?.note ?? '',
    validation_status: 'not_contacted_not_buyer_proof'
  };
});

const report = {
  schema_version: 'buyer-validation-target-pack-v1',
  generated_at: new Date().toISOString(),
  status: 'target_pack_not_buyer_proof',
  proof_boundary: 'These are named, source-backed validation targets. They are not discovery-call evidence, buyer feedback, LOIs, paid pilots, or procurement proof.',
  recommended_use: 'Use this pack to choose the first 10 validation calls and to keep outreach aligned with the governed strategic-intelligence pilot narrative.',
  success_gate_for_confidence_upgrade: {
    minimum_calls: 10,
    qualified_followups: 3,
    paid_pilot_or_loi_discussions: 1,
    required_fields_to_record: [
      'buyer_role',
      'proof_shown',
      'objection',
      'next_action',
      'willingness_to_pay_signal',
      'baseline_value_or_current_workflow',
      'pilot_outcome_value_or_expected_delta',
      'quality_signal',
      'buyer_decision_event',
      'outcome_evidence_notes'
    ]
  },
  source_count: sources.length,
  target_count: rows.length,
  niche_counts: rows.reduce((counts, row) => {
    counts[row.niche] = (counts[row.niche] ?? 0) + 1;
    return counts;
  }, {}),
  targets: rows,
  sources
};

function renderCsv(items) {
  const columns = [
    'rank',
    'account_name',
    'account_type',
    'niche',
    'buyer_role',
    'why_this_target',
    'proof_asset',
    'validation_question',
    'source_title',
    'source_url',
    'outreach_status',
    'validation_status',
    'confidence'
  ];
  return [
    columns.join(','),
    ...items.map((item) => columns.map((column) => csvCell(item[column])).join(','))
  ].join('\n') + '\n';
}

function renderMarkdown(data) {
  const targetRows = data.targets
    .map((target) => [
      target.rank,
      mdCell(target.account_name),
      mdCell(target.niche),
      mdCell(target.buyer_role),
      mdCell(target.proof_asset),
      target.source_url
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const sourceRows = data.sources
    .map((source) => [
      mdCell(source.title),
      source.url,
      mdCell(source.note)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  return `# Buyer Validation Target Pack - 2026-06-06

## Proof Boundary

Status: \`${data.status}\`.

${data.proof_boundary}

## Success Gate

- Minimum calls: ${data.success_gate_for_confidence_upgrade.minimum_calls}
- Qualified follow-ups: ${data.success_gate_for_confidence_upgrade.qualified_followups}
- Paid pilot or LOI discussions: ${data.success_gate_for_confidence_upgrade.paid_pilot_or_loi_discussions}
- Required fields: ${data.success_gate_for_confidence_upgrade.required_fields_to_record.join(', ')}

## Named Targets

| Rank | Account | Niche | Buyer Role | Proof Asset | Source |
|---:|---|---|---|---|---|
${targetRows}

## Source Register

| Source | URL | Why It Matters |
|---|---|---|
${sourceRows}

## Use Rule

Pick 10 targets from the first 15 rows, run live discovery only after owner approval, and write outcomes back into the CRM template. Do not count this target pack as willingness-to-pay proof.
`;
}

if (jsonOutputPath) {
  writeArtifact(jsonOutputPath, JSON.stringify(report, null, 2) + '\n');
}

if (csvOutputPath) {
  writeArtifact(csvOutputPath, renderCsv(rows));
}

if (mdOutputPath) {
  writeArtifact(mdOutputPath, renderMarkdown(report));
}

console.log(JSON.stringify({
  json_output: jsonOutputPath,
  csv_output: csvOutputPath,
  md_output: mdOutputPath,
  status: report.status,
  target_count: report.target_count,
  source_count: report.source_count,
  proof_boundary: report.proof_boundary
}, null, 2));
