// @ts-nocheck
// Supabase Edge Function: Cross-Domain Strategy Transfer
// PRD-Compliant strategy adaptation protocols between domains
// Implements intelligent strategy transfer with domain-specific optimization

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface DomainContext {
  name: string;
  characteristics: {
    timeScale: 'immediate' | 'short' | 'medium' | 'long'; // Decision timeframes
    stakeholderComplexity: number; // 1-10 scale
    informationAvailability: 'complete' | 'partial' | 'limited';
    regulatoryConstraints: number; // 0-1 scale
    competitiveIntensity: number; // 0-1 scale
    riskTolerance: number; // 0-1 scale
  };
  successMetrics: string[];
  commonStrategies: string[];
  culturalFactors: string[];
}

interface StrategyPattern {
  id: string;
  name: string;
  sourceDomain: string;
  coreLogic: string;
  successConditions: string[];
  failureRisks: string[];
  adaptationRequirements: string[];
  transferabilityScore: number; // 0-1 how well it transfers
}

interface TransferRequest {
  runId: string;
  sourceStrategy: {
    pattern: StrategyPattern;
    context: DomainContext;
    performance: {
      successRate: number;
      averageOutcome: number;
      riskLevel: number;
    };
  };
  targetDomain: DomainContext;
  transferObjectives: {
    maintainEffectiveness: number; // Weight 0-1
    minimizeAdaptation: number; // Weight 0-1
    preserveCore: number; // Weight 0-1
  };
  constraints: {
    maxAdaptationComplexity: number;
    timeToImplement: number; // Hours available
    resourceLimitations: string[];
  };
}

class CrossDomainTransferEngine {
  private supabase: any;
  private domainKnowledge: Map<string, DomainContext>;
  
  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
    this.domainKnowledge = this.initializeDomainKnowledge();
  }

  async transferStrategy(request: TransferRequest): Promise<{
    transferFeasibility: number;
    adaptedStrategy: StrategyPattern;
    adaptationProtocol: any[];
    riskAssessment: any;
    implementationPlan: any;
    successPrediction: number;
  }> {
    
    // Step 1: Assess transfer feasibility
    const transferFeasibility = this.assessTransferFeasibility(
      request.sourceStrategy,
      request.targetDomain
    );
    
    if (transferFeasibility < 0.3) {
      return {
        transferFeasibility,
        adaptedStrategy: request.sourceStrategy.pattern,
        adaptationProtocol: [],
        riskAssessment: { level: 'high', reason: 'Low transfer feasibility' },
        implementationPlan: { recommendation: 'Consider alternative strategies' },
        successPrediction: 0.2
      };
    }
    
    // Step 2: Adapt strategy to target domain
    const adaptedStrategy = await this.adaptStrategyToDomain(
      request.sourceStrategy.pattern,
      request.sourceStrategy.context,
      request.targetDomain,
      request.transferObjectives
    );
    
    // Step 3: Generate adaptation protocol
    const adaptationProtocol = this.generateAdaptationProtocol(
      request.sourceStrategy.pattern,
      adaptedStrategy,
      request.targetDomain
    );
    
    // Step 4: Assess transfer risks
    const riskAssessment = this.assessTransferRisks(
      request.sourceStrategy,
      adaptedStrategy,
      request.targetDomain,
      transferFeasibility
    );
    
    // Step 5: Create implementation plan
    const implementationPlan = this.createImplementationPlan(
      adaptedStrategy,
      adaptationProtocol,
      request.constraints,
      request.targetDomain
    );
    
    // Step 6: Predict success probability
    const successPrediction = this.predictTransferSuccess(
      request.sourceStrategy.performance,
      transferFeasibility,
      riskAssessment,
      request.targetDomain
    );
    
    // Step 7: Store transfer results
    await this.storeTransferResults(request.runId, {
      sourceStrategy: request.sourceStrategy.pattern,
      adaptedStrategy,
      transferFeasibility,
      successPrediction
    });
    
    return {
      transferFeasibility,
      adaptedStrategy,
      adaptationProtocol,
      riskAssessment,
      implementationPlan,
      successPrediction
    };
  }

  // Initialize domain knowledge base
  private initializeDomainKnowledge(): Map<string, DomainContext> {
    const domains = new Map();
    
    domains.set('military', {
      name: 'Military Strategy',
      characteristics: {
        timeScale: 'medium',
        stakeholderComplexity: 8,
        informationAvailability: 'partial',
        regulatoryConstraints: 0.9,
        competitiveIntensity: 0.95,
        riskTolerance: 0.3
      },
      successMetrics: ['mission_success', 'casualty_minimization', 'resource_efficiency'],
      commonStrategies: ['flanking', 'deterrence', 'attrition', 'deception'],
      culturalFactors: ['hierarchy', 'discipline', 'honor', 'sacrifice']
    });
    
    domains.set('business', {
      name: 'Business Strategy',
      characteristics: {
        timeScale: 'short',
        stakeholderComplexity: 6,
        informationAvailability: 'partial',
        regulatoryConstraints: 0.6,
        competitiveIntensity: 0.8,
        riskTolerance: 0.5
      },
      successMetrics: ['profit', 'market_share', 'growth_rate', 'customer_satisfaction'],
      commonStrategies: ['differentiation', 'cost_leadership', 'focus', 'innovation'],
      culturalFactors: ['competition', 'efficiency', 'innovation', 'profit_motive']
    });
    
    domains.set('politics', {
      name: 'Political Strategy',
      characteristics: {
        timeScale: 'long',
        stakeholderComplexity: 9,
        informationAvailability: 'limited',
        regulatoryConstraints: 0.8,
        competitiveIntensity: 0.9,
        riskTolerance: 0.4
      },
      successMetrics: ['vote_share', 'policy_implementation', 'coalition_strength'],
      commonStrategies: ['coalition_building', 'agenda_setting', 'compromise', 'mobilization'],
      culturalFactors: ['democracy', 'representation', 'consensus', 'power_balance']
    });
    
    domains.set('sports', {
      name: 'Sports Strategy',
      characteristics: {
        timeScale: 'immediate',
        stakeholderComplexity: 3,
        informationAvailability: 'complete',
        regulatoryConstraints: 0.9,
        competitiveIntensity: 1.0,
        riskTolerance: 0.7
      },
      successMetrics: ['win_rate', 'performance_metrics', 'team_cohesion'],
      commonStrategies: ['offensive', 'defensive', 'counter_attack', 'endurance'],
      culturalFactors: ['teamwork', 'competition', 'excellence', 'fair_play']
    });
    
    domains.set('personal', {
      name: 'Personal Development',
      characteristics: {
        timeScale: 'long',
        stakeholderComplexity: 2,
        informationAvailability: 'complete',
        regulatoryConstraints: 0.2,
        competitiveIntensity: 0.3,
        riskTolerance: 0.6
      },
      successMetrics: ['goal_achievement', 'satisfaction', 'growth_rate'],
      commonStrategies: ['goal_setting', 'skill_building', 'networking', 'persistence'],
      culturalFactors: ['self_improvement', 'autonomy', 'achievement', 'balance']
    });
    
    return domains;
  }

  // Assess how well a strategy can transfer between domains
  private assessTransferFeasibility(
    sourceStrategy: any,
    targetDomain: DomainContext
  ): number {
    
    const sourceContext = sourceStrategy.context;
    let feasibilityScore = 0.5; // Base score
    
    // Time scale compatibility
    const timeScaleCompatibility = this.computeTimeScaleCompatibility(
      sourceContext.characteristics.timeScale,
      targetDomain.characteristics.timeScale
    );
    feasibilityScore += timeScaleCompatibility * 0.2;
    
    // Stakeholder complexity similarity
    const complexityDiff = Math.abs(
      sourceContext.characteristics.stakeholderComplexity - 
      targetDomain.characteristics.stakeholderComplexity
    ) / 10;
    feasibilityScore += (1 - complexityDiff) * 0.15;
    
    // Information availability compatibility
    const infoCompatibility = this.computeInfoCompatibility(
      sourceContext.characteristics.informationAvailability,
      targetDomain.characteristics.informationAvailability
    );
    feasibilityScore += infoCompatibility * 0.15;
    
    // Risk tolerance alignment
    const riskAlignment = 1 - Math.abs(
      sourceContext.characteristics.riskTolerance - 
      targetDomain.characteristics.riskTolerance
    );
    feasibilityScore += riskAlignment * 0.1;
    
    // Competitive intensity similarity
    const competitionSimilarity = 1 - Math.abs(
      sourceContext.characteristics.competitiveIntensity - 
      targetDomain.characteristics.competitiveIntensity
    );
    feasibilityScore += competitionSimilarity * 0.1;
    
    // Strategy transferability score
    feasibilityScore += sourceStrategy.pattern.transferabilityScore * 0.3;
    
    return Math.max(0, Math.min(1, feasibilityScore));
  }

  // Adapt strategy to target domain
  private async adaptStrategyToDomain(
    sourcePattern: StrategyPattern,
    sourceContext: DomainContext,
    targetDomain: DomainContext,
    objectives: any
  ): Promise<StrategyPattern> {
    
    const adaptedPattern: StrategyPattern = {
      id: `${sourcePattern.id}_adapted_${targetDomain.name.toLowerCase()}`,
      name: `${sourcePattern.name} (${targetDomain.name} Adaptation)`,
      sourceDomain: targetDomain.name.toLowerCase(),
      coreLogic: this.adaptCoreLogic(sourcePattern.coreLogic, sourceContext, targetDomain),
      successConditions: this.adaptSuccessConditions(sourcePattern.successConditions, targetDomain),
      failureRisks: this.adaptFailureRisks(sourcePattern.failureRisks, targetDomain),
      adaptationRequirements: this.generateAdaptationRequirements(sourcePattern, targetDomain),
      transferabilityScore: sourcePattern.transferabilityScore * 0.8 // Slight reduction for adaptation
    };
    
    return adaptedPattern;
  }

  // Adapt core strategic logic to new domain
  private adaptCoreLogic(
    originalLogic: string,
    sourceContext: DomainContext,
    targetDomain: DomainContext
  ): string {
    
    let adaptedLogic = originalLogic;
    
    // Replace domain-specific terminology
    const terminologyMap = this.createTerminologyMap(sourceContext, targetDomain);
    
    for (const [sourceTerm, targetTerm] of terminologyMap) {
      adaptedLogic = adaptedLogic.replace(new RegExp(sourceTerm, 'gi'), targetTerm);
    }
    
    // Adjust for time scale differences
    if (sourceContext.characteristics.timeScale !== targetDomain.characteristics.timeScale) {
      adaptedLogic += ` Adjust timing for ${targetDomain.characteristics.timeScale}-term execution.`;
    }
    
    // Add domain-specific considerations
    adaptedLogic += ` Consider ${targetDomain.name.toLowerCase()}-specific factors: ${targetDomain.culturalFactors.join(', ')}.`;
    
    return adaptedLogic;
  }

  // Create terminology mapping between domains
  private createTerminologyMap(
    sourceContext: DomainContext,
    targetDomain: DomainContext
  ): Map<string, string> {
    
    const map = new Map();
    
    // Common strategic terms and their domain adaptations
    const termMappings: Record<string, Record<string, string>> = {
      'attack': {
        'military': 'assault',
        'business': 'market_entry',
        'politics': 'campaign',
        'sports': 'offensive_play',
        'personal': 'proactive_approach'
      },
      'defense': {
        'military': 'fortification',
        'business': 'market_protection',
        'politics': 'position_defense',
        'sports': 'defensive_strategy',
        'personal': 'risk_mitigation'
      },
      'resources': {
        'military': 'troops_equipment',
        'business': 'capital_assets',
        'politics': 'political_capital',
        'sports': 'team_energy',
        'personal': 'time_skills'
      },
      'opponent': {
        'military': 'enemy',
        'business': 'competitor',
        'politics': 'opposition',
        'sports': 'opposing_team',
        'personal': 'challenge'
      }
    };
    
    const sourceName = sourceContext.name.toLowerCase().split(' ')[0];
    const targetName = targetDomain.name.toLowerCase().split(' ')[0];
    
    for (const [term, domainMappings] of Object.entries(termMappings)) {
      if (domainMappings[sourceName] && domainMappings[targetName]) {
        map.set(domainMappings[sourceName], domainMappings[targetName]);
      }
    }
    
    return map;
  }

  // Adapt success conditions to target domain
  private adaptSuccessConditions(
    originalConditions: string[],
    targetDomain: DomainContext
  ): string[] {
    
    const adaptedConditions = [...originalConditions];
    
    // Add domain-specific success metrics
    for (const metric of targetDomain.successMetrics) {
      if (!adaptedConditions.some(condition => condition.toLowerCase().includes(metric))) {
        adaptedConditions.push(`Achieve positive ${metric.replace('_', ' ')}`);
      }
    }
    
    // Adjust for domain characteristics
    if (targetDomain.characteristics.riskTolerance < 0.4) {
      adaptedConditions.push('Maintain low risk profile throughout execution');
    }
    
    if (targetDomain.characteristics.regulatoryConstraints > 0.7) {
      adaptedConditions.push('Ensure full regulatory compliance');
    }
    
    return adaptedConditions;
  }

  // Adapt failure risks to target domain
  private adaptFailureRisks(
    originalRisks: string[],
    targetDomain: DomainContext
  ): string[] {
    
    const adaptedRisks = [...originalRisks];
    
    // Add domain-specific risks
    if (targetDomain.characteristics.competitiveIntensity > 0.8) {
      adaptedRisks.push('Intense competitive response may neutralize strategy');
    }
    
    if (targetDomain.characteristics.stakeholderComplexity > 7) {
      adaptedRisks.push('Complex stakeholder dynamics may create implementation challenges');
    }
    
    if (targetDomain.characteristics.informationAvailability === 'limited') {
      adaptedRisks.push('Limited information may lead to suboptimal decisions');
    }
    
    return adaptedRisks;
  }

  // Generate adaptation requirements
  private generateAdaptationRequirements(
    sourcePattern: StrategyPattern,
    targetDomain: DomainContext
  ): string[] {
    
    const requirements = [];
    
    // Cultural adaptation requirements
    requirements.push(`Align with ${targetDomain.name.toLowerCase()} cultural values: ${targetDomain.culturalFactors.join(', ')}`);
    
    // Regulatory adaptation
    if (targetDomain.characteristics.regulatoryConstraints > 0.6) {
      requirements.push('Conduct regulatory compliance review');
    }
    
    // Stakeholder adaptation
    if (targetDomain.characteristics.stakeholderComplexity > 6) {
      requirements.push('Develop stakeholder engagement strategy');
    }
    
    // Time scale adaptation
    requirements.push(`Adjust execution timeline for ${targetDomain.characteristics.timeScale}-term implementation`);
    
    // Success metrics adaptation
    requirements.push(`Establish measurement framework for: ${targetDomain.successMetrics.join(', ')}`);
    
    return requirements;
  }

  // Generate step-by-step adaptation protocol
  private generateAdaptationProtocol(
    sourcePattern: StrategyPattern,
    adaptedPattern: StrategyPattern,
    targetDomain: DomainContext
  ): any[] {
    
    const protocol = [];
    
    // Phase 1: Analysis and Planning
    protocol.push({
      phase: 1,
      name: 'Domain Analysis and Planning',
      steps: [
        'Analyze target domain characteristics and constraints',
        'Identify key stakeholders and their interests',
        'Map source strategy elements to target domain equivalents',
        'Assess regulatory and cultural requirements'
      ],
      duration: 2, // Hours
      resources: ['domain_expert', 'analyst']
    });
    
    // Phase 2: Strategy Adaptation
    protocol.push({
      phase: 2,
      name: 'Strategy Adaptation',
      steps: [
        'Adapt core strategic logic to domain context',
        'Modify success conditions and failure risks',
        'Adjust resource requirements and timelines',
        'Develop domain-specific implementation tactics'
      ],
      duration: 4,
      resources: ['strategist', 'domain_expert']
    });
    
    // Phase 3: Risk Mitigation
    protocol.push({
      phase: 3,
      name: 'Risk Assessment and Mitigation',
      steps: [
        'Identify domain-specific risks and challenges',
        'Develop risk mitigation strategies',
        'Create contingency plans for high-risk scenarios',
        'Establish monitoring and feedback mechanisms'
      ],
      duration: 3,
      resources: ['risk_analyst', 'strategist']
    });
    
    // Phase 4: Implementation Planning
    protocol.push({
      phase: 4,
      name: 'Implementation Planning',
      steps: [
        'Create detailed implementation roadmap',
        'Allocate resources and assign responsibilities',
        'Establish success metrics and KPIs',
        'Design feedback and adaptation mechanisms'
      ],
      duration: 2,
      resources: ['project_manager', 'strategist']
    });
    
    return protocol;
  }

  // Assess risks of strategy transfer
  private assessTransferRisks(
    sourceStrategy: any,
    adaptedStrategy: StrategyPattern,
    targetDomain: DomainContext,
    feasibility: number
  ): any {
    
    const risks = {
      level: 'medium',
      factors: [],
      mitigationStrategies: []
    };
    
    // Feasibility-based risk
    if (feasibility < 0.5) {
      risks.level = 'high';
      risks.factors.push('Low transfer feasibility increases failure probability');
      risks.mitigationStrategies.push('Conduct pilot implementation before full deployment');
    }
    
    // Domain complexity risk
    if (targetDomain.characteristics.stakeholderComplexity > 7) {
      risks.factors.push('High stakeholder complexity may complicate implementation');
      risks.mitigationStrategies.push('Develop comprehensive stakeholder engagement plan');
    }
    
    // Information availability risk
    if (targetDomain.characteristics.informationAvailability === 'limited') {
      risks.factors.push('Limited information availability may impact decision quality');
      risks.mitigationStrategies.push('Invest in information gathering and intelligence systems');
    }
    
    // Competitive intensity risk
    if (targetDomain.characteristics.competitiveIntensity > 0.8) {
      risks.factors.push('High competitive intensity may trigger strong countermeasures');
      risks.mitigationStrategies.push('Develop rapid execution capabilities and defensive strategies');
    }
    
    // Cultural adaptation risk
    const culturalAlignment = this.assessCulturalAlignment(sourceStrategy.context, targetDomain);
    if (culturalAlignment < 0.6) {
      risks.factors.push('Cultural misalignment may reduce strategy effectiveness');
      risks.mitigationStrategies.push('Invest in cultural adaptation and change management');
    }
    
    // Set overall risk level
    if (risks.factors.length > 3) {
      risks.level = 'high';
    } else if (risks.factors.length > 1) {
      risks.level = 'medium';
    } else {
      risks.level = 'low';
    }
    
    return risks;
  }

  // Create implementation plan
  private createImplementationPlan(
    adaptedStrategy: StrategyPattern,
    adaptationProtocol: any[],
    constraints: any,
    targetDomain: DomainContext
  ): any {
    
    const totalProtocolTime = adaptationProtocol.reduce((sum, phase) => sum + phase.duration, 0);
    
    if (totalProtocolTime > constraints.timeToImplement) {
      return {
        feasible: false,
        reason: `Implementation requires ${totalProtocolTime} hours but only ${constraints.timeToImplement} available`,
        recommendation: 'Extend timeline or simplify adaptation approach'
      };
    }
    
    return {
      feasible: true,
      timeline: {
        totalDuration: totalProtocolTime,
        phases: adaptationProtocol.map(phase => ({
          name: phase.name,
          duration: phase.duration,
          resources: phase.resources
        }))
      },
      resourceRequirements: this.computeResourceRequirements(adaptationProtocol, constraints),
      successFactors: [
        'Strong domain expertise',
        'Stakeholder buy-in',
        'Adequate resource allocation',
        'Continuous monitoring and adaptation'
      ],
      keyMilestones: [
        'Domain analysis completion',
        'Strategy adaptation finalization',
        'Risk mitigation plan approval',
        'Implementation launch'
      ]
    };
  }

  // Predict transfer success probability
  private predictTransferSuccess(
    sourcePerformance: any,
    feasibility: number,
    riskAssessment: any,
    targetDomain: DomainContext
  ): number {
    
    let successProbability = sourcePerformance.successRate; // Start with source success rate
    
    // Adjust for transfer feasibility
    successProbability *= feasibility;
    
    // Adjust for risk level
    const riskMultiplier = riskAssessment.level === 'high' ? 0.7 : 
                          riskAssessment.level === 'medium' ? 0.85 : 0.95;
    successProbability *= riskMultiplier;
    
    // Adjust for domain characteristics
    if (targetDomain.characteristics.competitiveIntensity > 0.8) {
      successProbability *= 0.9; // High competition reduces success probability
    }
    
    if (targetDomain.characteristics.regulatoryConstraints > 0.8) {
      successProbability *= 0.95; // High regulation slightly reduces success
    }
    
    return Math.max(0.1, Math.min(0.95, successProbability));
  }

  // Helper methods
  private computeTimeScaleCompatibility(sourceScale: string, targetScale: string): number {
    const scaleOrder = ['immediate', 'short', 'medium', 'long'];
    const sourceIndex = scaleOrder.indexOf(sourceScale);
    const targetIndex = scaleOrder.indexOf(targetScale);
    
    const difference = Math.abs(sourceIndex - targetIndex);
    return Math.max(0, 1 - difference * 0.25);
  }

  private computeInfoCompatibility(sourceInfo: string, targetInfo: string): number {
    const infoLevels = { 'complete': 3, 'partial': 2, 'limited': 1 };
    const sourcLevel = infoLevels[sourceInfo] || 2;
    const targetLevel = infoLevels[targetInfo] || 2;
    
    return 1 - Math.abs(sourcLevel - targetLevel) / 2;
  }

  private assessCulturalAlignment(sourceContext: DomainContext, targetDomain: DomainContext): number {
    const sourceFactors = new Set(sourceContext.culturalFactors);
    const targetFactors = new Set(targetDomain.culturalFactors);
    
    const intersection = new Set([...sourceFactors].filter(x => targetFactors.has(x)));
    const union = new Set([...sourceFactors, ...targetFactors]);
    
    return intersection.size / union.size; // Jaccard similarity
  }

  private computeResourceRequirements(adaptationProtocol: any[], constraints: any): any {
    const resourceTypes = new Set();
    let totalEffort = 0;
    
    for (const phase of adaptationProtocol) {
      totalEffort += phase.duration;
      phase.resources.forEach((resource: string) => resourceTypes.add(resource));
    }
    
    return {
      totalEffort,
      resourceTypes: Array.from(resourceTypes),
      estimatedCost: totalEffort * 100, // Simplified cost estimation
      criticalResources: ['domain_expert', 'strategist'] // Always needed
    };
  }

  private async storeTransferResults(runId: string, results: any): Promise<void> {
    try {
      await this.supabase
        .from('cross_domain_transfer_results')
        .insert({
          run_id: runId,
          transfer_results: results,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.warn('Failed to store transfer results:', error);
    }
  }
}

// Main handler
function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return jsonResponse(200, { ok: true })
  if (req.method !== 'POST') return jsonResponse(405, { ok: false, message: 'Method Not Allowed' })
  
  try {
    const ref = Deno.env.get('SUPABASE_PROJECT_REF') || 'jxdihzqoaxtydolmltdr'
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || `https://${ref}.supabase.co`
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('EDGE_SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !serviceKey) {
      return jsonResponse(500, { ok: false, message: 'Server configuration error' })
    }
    
    const supabase = createClient(supabaseUrl, serviceKey)
    const body = await req.json().catch(() => ({}))
    
    if (!body.runId || !body.sourceStrategy || !body.targetDomain) {
      return jsonResponse(400, {
        ok: false,
        message: 'Missing required fields: runId, sourceStrategy, or targetDomain'
      });
    }

    const engine = new CrossDomainTransferEngine(supabase);
    const result = await engine.transferStrategy(body);
    
    return jsonResponse(200, {
      ok: true,
      response: result
    });
    
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Cross-domain transfer error:', e);
    return jsonResponse(500, { ok: false, message: msg })
  }
});
