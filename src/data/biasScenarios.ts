// Bias Dilemma Scenarios Database
// 10 real-world scenarios covering major cognitive biases

import { DilemmaScenario } from '../types/bias'

export const SCENARIOS: DilemmaScenario[] = [
  {
    id: 'salary-negotiation-1',
    title: 'Job Offer Negotiation',
    situation: `You received a job offer for $80,000. The recruiter said "this is what we typically pay." Market rate is $85,000-$95,000. You have another interview next week.`,
    options: [
      {
        text: 'Accept $80,000 immediately',
        biases_triggered: ['anchoring', 'status_quo'],
        optimal_choice: false,
        explanation: 'You\'re anchored on their $80K figure. This is a classic negotiation trap.',
        strategic_reasoning: 'The recruiter\'s anchor is working against you. Negotiate from market data.'
      },
      {
        text: 'Counter with $90,000 based on market research',
        biases_triggered: [],
        optimal_choice: true,
        explanation: 'Correct! You avoided anchoring bias by using objective market data.',
        strategic_reasoning: 'Nash Bargaining: negotiate from your best alternative, not their anchor.'
      },
      {
        text: 'Ask for $105,000 to leave room for negotiation',
        biases_triggered: ['overconfidence'],
        optimal_choice: false,
        explanation: 'Too aggressive. Overconfidence bias might lead to offer withdrawal.',
        strategic_reasoning: 'Your counter should be ambitious but realistic within market range.'
      }
    ],
    category: 'career',
    difficulty: 'easy',
    learning_point: 'Always negotiate from your BATNA and market research, never from employer\'s anchor.'
  },
  {
    id: 'investment-sunk-cost',
    title: 'Failing Investment',
    situation: `You bought crypto for $10,000, now worth $3,000. Analysis shows it will decline further. A new investment offers 15% expected return.`,
    options: [
      {
        text: 'Hold because you\'ve already lost $7,000',
        biases_triggered: ['sunk_cost', 'loss_aversion'],
        optimal_choice: false,
        explanation: 'Classic sunk cost fallacy. Past losses are irrelevant to future decisions.',
        strategic_reasoning: 'The $7K is gone regardless. Make decisions based on future expected value.'
      },
      {
        text: 'Sell and invest in better opportunity',
        biases_triggered: [],
        optimal_choice: true,
        explanation: 'Correct! You\'re optimizing from current position, not chasing past losses.',
        strategic_reasoning: 'Game theory: optimize forward-looking payoff, ignore sunk costs.'
      },
      {
        text: 'Hold half and invest half',
        biases_triggered: ['sunk_cost', 'status_quo'],
        optimal_choice: false,
        explanation: 'Compromise still reflects sunk cost thinking.',
        strategic_reasoning: 'If analysis says one asset is better, choose that one fully.'
      }
    ],
    category: 'investment',
    difficulty: 'medium',
    learning_point: 'Ignore sunk costs. Decide based on future expected value, not past investments.'
  },
  {
    id: 'project-pivot',
    title: 'Failing Project',
    situation: `6 months and $50K into a product users don't like. You could pivot to a better idea or spend 3 more months fixing. 9 months cash remaining.`,
    options: [
      {
        text: 'Continue since you\'ve invested 6 months',
        biases_triggered: ['sunk_cost', 'status_quo'],
        optimal_choice: false,
        explanation: 'Sunk cost fallacy. The 6 months are gone. Maximize remaining runway.',
        strategic_reasoning: 'Which path has better expected value going forward?'
      },
      {
        text: 'Pivot to new product based on market feedback',
        biases_triggered: [],
        optimal_choice: true,
        explanation: 'Correct! Strategic decision based on future value, not past costs.',
        strategic_reasoning: 'Optimize remaining moves, don\'t justify past moves.'
      },
      {
        text: 'Spend 1 more month, then decide',
        biases_triggered: ['sunk_cost', 'planning_fallacy'],
        optimal_choice: false,
        explanation: 'Incremental sunk cost thinking. If fundamentally flawed, 1 month won\'t fix it.',
        strategic_reasoning: 'Cut losses now rather than burning more runway.'
      }
    ],
    category: 'career',
    difficulty: 'hard',
    learning_point: 'Strategic pivots require ignoring sunk costs and optimizing from current position.'
  },
  {
    id: 'car-purchase',
    title: 'Car Dealership Negotiation',
    situation: `Sticker price $25,000. Dealer offers "special" $23,500. Market research shows $21-22K is fair. Dealer says "best I can do" and walks away.`,
    options: [
      { text: 'Accept $23,500 (it\'s $1,500 off)', biases_triggered: ['anchoring', 'framing'], optimal_choice: false,
        explanation: 'Anchored on sticker price. Real value is $21-22K.', strategic_reasoning: 'Compare to market, not their anchor.' },
      { text: 'Counter with $21,500 based on market data', biases_triggered: [], optimal_choice: true,
        explanation: 'Correct! Using market data, not their anchor.', strategic_reasoning: 'Optimal bargaining from market comps.' },
      { text: 'Walk away immediately', biases_triggered: ['overconfidence'], optimal_choice: false,
        explanation: 'Walking away is tactic, not first move.', strategic_reasoning: 'Make counter offer first.' }
    ],
    category: 'purchase', difficulty: 'easy', learning_point: 'Negotiate from market data, ignore seller anchors.'
  },
  {
    id: 'availability-health',
    title: 'Medical Decision',
    situation: `Viral story about vaccine reaction. CDC shows 99.99% safe, prevents 2% mortality disease. Doctor recommends it.`,
    options: [
      { text: 'Refuse vaccine (story was scary)', biases_triggered: ['availability', 'loss_aversion'], optimal_choice: false,
        explanation: 'Dramatic story memorable but statistically irrelevant.', strategic_reasoning: '2% disease risk >> 0.01% vaccine risk.' },
      { text: 'Get vaccine based on statistical analysis', biases_triggered: [], optimal_choice: true,
        explanation: 'Using base rates, not emotional availability.', strategic_reasoning: 'Expected value: vaccine clearly better.' },
      { text: 'Delay to research side effects', biases_triggered: ['availability', 'status_quo'], optimal_choice: false,
        explanation: 'Story causing inaction despite clear data.', strategic_reasoning: 'Delaying exposes you to 2% disease risk.' }
    ],
    category: 'investment', difficulty: 'medium', learning_point: 'Use statistics, not memorable anecdotes.'
  },
  {
    id: 'confirmation-hire',
    title: 'Hiring Decision',
    situation: `Candidate from your alma mater scores 7/10. Another scores 9/10 but no connection. You rationalize the 7.`,
    options: [
      { text: 'Hire alumni (cultural fit)', biases_triggered: ['confirmation'], optimal_choice: false,
        explanation: 'Confirming emotional preference despite scores.', strategic_reasoning: '2-point gap is significant.' },
      { text: 'Hire 9/10 candidate', biases_triggered: [], optimal_choice: true,
        explanation: 'Using objective rubric as designed.', strategic_reasoning: 'Maximize team performance.' },
      { text: 'Do more interviews on alumni', biases_triggered: ['confirmation'], optimal_choice: false,
        explanation: 'Seeking data to confirm preference.', strategic_reasoning: 'Already have objective data.' }
    ],
    category: 'career', difficulty: 'hard', learning_point: 'Use objective criteria, resist emotional preferences.'
  },
  {
    id: 'loss-aversion-salary',
    title: 'Salary Risk',
    situation: `$100K offered, want $110K (market rate). Worried about offer withdrawal. No other offers. Well-funded company.`,
    options: [
      { text: 'Accept $100K (avoid risk)', biases_triggered: ['loss_aversion', 'status_quo'], optimal_choice: false,
        explanation: 'Overweighting small withdrawal risk.', strategic_reasoning: '95% × $105K > 100% × $100K.' },
      { text: 'Counter $110K with market data', biases_triggered: [], optimal_choice: true,
        explanation: 'Professional negotiation optimizes expected value.', strategic_reasoning: 'Withdrawal risk <5%.' },
      { text: 'Ask $102K as safe middle', biases_triggered: ['loss_aversion', 'anchoring'], optimal_choice: false,
        explanation: 'Fear leaving money on table.', strategic_reasoning: 'Ask for market rate.' }
    ],
    category: 'negotiation', difficulty: 'medium', learning_point: 'Calculate expected values. Loss aversion costs you gains.'
  },
  {
    id: 'planning-fallacy',
    title: 'Project Timeline',
    situation: `Similar projects took 3-4 months. You estimate 6 weeks, feeling optimistic. Same team, more complex project.`,
    options: [
      { text: 'Commit to 6 weeks (motivated)', biases_triggered: ['planning_fallacy', 'overconfidence'], optimal_choice: false,
        explanation: 'Underestimating despite historical data.', strategic_reasoning: 'Past 5 ran long, this is more complex.' },
      { text: 'Estimate 3.5 months + buffer', biases_triggered: [], optimal_choice: true,
        explanation: 'Using base rates over intuition.', strategic_reasoning: 'Under-promise, over-deliver.' },
      { text: 'Estimate 10 weeks (compromise)', biases_triggered: ['planning_fallacy'], optimal_choice: false,
        explanation: 'Still too optimistic.', strategic_reasoning: 'Historical data should dominate.' }
    ],
    category: 'career', difficulty: 'easy', learning_point: 'Use historical data. Optimistic intuition is usually wrong.'
  },
  {
    id: 'framing-insurance',
    title: 'Insurance Framing',
    situation: `$50 insurance for $2,000 trip. 2% cancel rate. Salesperson emphasizes "protect from $2K loss."`,
    options: [
      { text: 'Buy (don\'t risk $2K)', biases_triggered: ['framing', 'loss_aversion'], optimal_choice: false,
        explanation: 'Framing emphasized loss. EV: $40, cost: $50.', strategic_reasoning: 'Paying $10 for peace of mind.' },
      { text: 'Decline (EV = $40 < $50)', biases_triggered: [], optimal_choice: true,
        explanation: 'Calculated expected value.', strategic_reasoning: 'EV of no insurance better.' },
      { text: 'Buy if can\'t afford $2K loss', biases_triggered: [], optimal_choice: true,
        explanation: 'Rational if catastrophic.', strategic_reasoning: 'Utility beyond EV for catastrophic risk.' }
    ],
    category: 'purchase', difficulty: 'medium', learning_point: 'Recognize framing. Calculate expected values explicitly.'
  },
  {
    id: 'overconfidence-startup',
    title: 'Startup Confidence',
    situation: `$120K job. Start company with "80% success" estimate. Data: 90% fail. 6 months savings. Never started company.`,
    options: [
      { text: 'Quit now (80% confident)', biases_triggered: ['overconfidence', 'confirmation'], optimal_choice: false,
        explanation: 'First-timers overestimate 3-4x.', strategic_reasoning: 'Base rate: 10% success, not 80%.' },
      { text: 'Part-time, validate, then decide', biases_triggered: [], optimal_choice: true,
        explanation: 'De-risking before commitment.', strategic_reasoning: 'Sequential decisions with information gathering.' },
      { text: 'Quit with 12 months runway', biases_triggered: ['overconfidence', 'planning_fallacy'], optimal_choice: false,
        explanation: 'More time doesn\'t fix bad odds.', strategic_reasoning: 'Need validation, not more runway.' }
    ],
    category: 'career', difficulty: 'hard', learning_point: 'Use base rates. Test assumptions before irreversible commitment.'
  }
]
