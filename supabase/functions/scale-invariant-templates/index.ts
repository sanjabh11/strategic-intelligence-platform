// @ts-nocheck
// Supabase Edge Function: Scale-Invariant Strategy Templates
// PRD Core Innovation: Mathematical frameworks that work identically across scales
// From nuclear deterrence to job negotiations - same mathematical structure

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Core Scale-Invariant Template Interface
interface ScaleInvariantTemplate {
  id: string;
  name: string;
  mathematicalStructure: {
    gameClass: string; // 'coordination', 'chicken', 'prisoners_dilemma', 'bargaining'
    playerStructure: 'symmetric' | 'asymmetric' | 'hierarchical';
    actionSymmetry: number; // 0-1, how symmetric the action spaces are
    payoffStructure: {
      cooperationReward: number;
      defectionTemptation: number;
      mutualDefectionPenalty: number;
      suckerPayoff: number;
    };
    informationStructure: 'complete' | 'incomplete' | 'asymmetric';
    timeStructure: 'simultaneous' | 'sequential' | 'repeated';
  };
  scaleParameters: {
    minScale: number; // 1 = individual, 10 = global
    maxScale: number;
    scalingFactors: {
      timeHorizon: number; // How time scales with scope
      stakeholderCount: number; // How players scale
      resourceMagnitude: number; // How payoffs scale
      complexityGrowth: number; // How complexity scales
    };
  };
  universalPrinciples: string[]; // Scale-invariant strategic principles
  domainAdaptations: Record<string, {
    terminology: Record<string, string>;
    contextualFactors: string[];
    implementationGuidance: string[];
    successMetrics: string[];
  }>;
}

interface ScaleAdaptationRequest {
  runId: string;
  sourceTemplate: string;
  sourceScale: number; // 1-10
  targetScale: number; // 1-10
  sourceDomain: string;
  targetDomain: string;
  scenarioContext: {
    description: string;
    stakeholders: string[];
    timeframe: string;
    resources: string[];
  };
}

class ScaleInvariantTemplateEngine {
  private supabase: any;
  private templates: Map<string, ScaleInvariantTemplate>;
  
  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
    this.templates = this.initializeUniversalTemplates();
  }

  // Initialize universal strategic templates
  private initializeUniversalTemplates(): Map<string, ScaleInvariantTemplate> {
    const templates = new Map();

    // Template 1: Deterrence Equilibrium (Nuclear to Personal)
    templates.set('deterrence_equilibrium', {
      id: 'deterrence_equilibrium',
      name: 'Deterrence Equilibrium Template',
      mathematicalStructure: {
        gameClass: 'chicken',
        playerStructure: 'symmetric',
        actionSymmetry: 0.9,
        payoffStructure: {
          cooperationReward: 3,
          defectionTemptation: 2,
          mutualDefectionPenalty: 0,
          suckerPayoff: 1
        },
        informationStructure: 'incomplete',
        timeStructure: 'simultaneous'
      },
      scaleParameters: {
        minScale: 1, // Personal negotiations
        maxScale: 10, // Global nuclear deterrence
        scalingFactors: {
          timeHorizon: 2.5, // Exponential time scaling
          stakeholderCount: 1.8,
          resourceMagnitude: 3.2,
          complexityGrowth: 2.1
        }
      },
      universalPrinciples: [
        'Credible threat capability maintains equilibrium',
        'Mutual vulnerability creates stability',
        'Communication channels prevent misunderstanding',
        'Graduated response options provide flexibility',
        'Reputation effects amplify deterrent power'
      ],
      domainAdaptations: {
        'nuclear_strategy': {
          terminology: { 'threat': 'nuclear capability', 'response': 'retaliation', 'signal': 'diplomatic communication' },
          contextualFactors: ['missile accuracy', 'second-strike capability', 'alliance structures'],
          implementationGuidance: ['Maintain credible second-strike', 'Establish clear red lines', 'Use back-channel communications'],
          successMetrics: ['crisis stability', 'escalation control', 'alliance cohesion']
        },
        'corporate_negotiation': {
          terminology: { 'threat': 'market leverage', 'response': 'competitive action', 'signal': 'public statement' },
          contextualFactors: ['market position', 'financial resources', 'regulatory environment'],
          implementationGuidance: ['Build market leverage', 'Communicate capabilities clearly', 'Maintain negotiation flexibility'],
          successMetrics: ['deal terms achieved', 'relationship preservation', 'market position']
        },
        'personal_relationships': {
          terminology: { 'threat': 'boundary setting', 'response': 'consequence enforcement', 'signal': 'clear communication' },
          contextualFactors: ['relationship history', 'mutual dependencies', 'social context'],
          implementationGuidance: ['Set clear boundaries', 'Communicate expectations', 'Follow through consistently'],
          successMetrics: ['relationship quality', 'boundary respect', 'mutual satisfaction']
        }
      }
    });

    // Template 2: Coordination Game (Standards to Team Formation)
    templates.set('coordination_equilibrium', {
      id: 'coordination_equilibrium',
      name: 'Coordination Equilibrium Template',
      mathematicalStructure: {
        gameClass: 'coordination',
        playerStructure: 'symmetric',
        actionSymmetry: 1.0,
        payoffStructure: {
          cooperationReward: 4,
          defectionTemptation: 0,
          mutualDefectionPenalty: 1,
          suckerPayoff: 0
        },
        informationStructure: 'complete',
        timeStructure: 'simultaneous'
      },
      scaleParameters: {
        minScale: 1,
        maxScale: 9,
        scalingFactors: {
          timeHorizon: 1.8,
          stakeholderCount: 2.2,
          resourceMagnitude: 2.0,
          complexityGrowth: 2.5
        }
      },
      universalPrinciples: [
        'Multiple equilibria require coordination mechanisms',
        'Communication enables efficient equilibrium selection',
        'First-mover advantages in equilibrium selection',
        'Network effects amplify coordination benefits',
        'Focal points emerge from cultural/historical context'
      ],
      domainAdaptations: {
        'technology_standards': {
          terminology: { 'coordination': 'standard adoption', 'equilibrium': 'market dominance', 'signal': 'product announcement' },
          contextualFactors: ['network effects', 'switching costs', 'compatibility requirements'],
          implementationGuidance: ['Build ecosystem support', 'Achieve critical mass', 'Ensure backward compatibility'],
          successMetrics: ['market share', 'ecosystem size', 'adoption rate']
        },
        'team_formation': {
          terminology: { 'coordination': 'role alignment', 'equilibrium': 'team effectiveness', 'signal': 'role communication' },
          contextualFactors: ['skill complementarity', 'communication patterns', 'shared goals'],
          implementationGuidance: ['Define clear roles', 'Establish communication norms', 'Align on objectives'],
          successMetrics: ['team performance', 'member satisfaction', 'goal achievement']
        }
      }
    });

    // Template 3: Bargaining Game (Trade Wars to Salary Negotiations)
    templates.set('bargaining_equilibrium', {
      id: 'bargaining_equilibrium',
      name: 'Bargaining Equilibrium Template',
      mathematicalStructure: {
        gameClass: 'bargaining',
        playerStructure: 'asymmetric',
        actionSymmetry: 0.7,
        payoffStructure: {
          cooperationReward: 3,
          defectionTemptation: 4,
          mutualDefectionPenalty: 1,
          suckerPayoff: 0
        },
        informationStructure: 'asymmetric',
        timeStructure: 'sequential'
      },
      scaleParameters: {
        minScale: 1,
        maxScale: 10,
        scalingFactors: {
          timeHorizon: 2.0,
          stakeholderCount: 1.5,
          resourceMagnitude: 2.8,
          complexityGrowth: 1.9
        }
      },
      universalPrinciples: [
        'BATNA (Best Alternative) determines bargaining power',
        'Information asymmetries create strategic advantages',
        'Time pressure affects concession patterns',
        'Relationship value influences cooperation',
        'Commitment strategies can improve outcomes'
      ],
      domainAdaptations: {
        'international_trade': {
          terminology: { 'bargaining': 'trade negotiation', 'BATNA': 'alternative markets', 'concession': 'tariff reduction' },
          contextualFactors: ['economic interdependence', 'political relationships', 'domestic pressures'],
          implementationGuidance: ['Develop alternative partnerships', 'Use economic leverage', 'Manage domestic constituencies'],
          successMetrics: ['trade volume', 'economic benefits', 'political stability']
        },
        'salary_negotiation': {
          terminology: { 'bargaining': 'compensation discussion', 'BATNA': 'outside offers', 'concession': 'benefit adjustment' },
          contextualFactors: ['market rates', 'performance history', 'company financial health'],
          implementationGuidance: ['Research market rates', 'Document achievements', 'Consider total compensation'],
          successMetrics: ['compensation increase', 'relationship quality', 'career advancement']
        }
      }
    });

    return templates;
  }

  // Main scale adaptation function
  async adaptAcrossScales(request: ScaleAdaptationRequest): Promise<{
    adaptedTemplate: ScaleInvariantTemplate;
    scalingAnalysis: any;
    implementationGuidance: any;
    riskFactors: string[];
    successPrediction: number;
  }> {
    
    // Get base template
    const baseTemplate = this.templates.get(request.sourceTemplate);
    if (!baseTemplate) {
      throw new Error(`Template ${request.sourceTemplate} not found`);
    }

    // Compute scaling transformations
    const scalingAnalysis = this.computeScalingTransformations(
      baseTemplate,
      request.sourceScale,
      request.targetScale
    );

    // Adapt template to target domain and scale
    const adaptedTemplate = this.adaptTemplateToContext(
      baseTemplate,
      request.targetDomain,
      request.targetScale,
      scalingAnalysis
    );

    // Generate implementation guidance
    const implementationGuidance = this.generateImplementationGuidance(
      adaptedTemplate,
      request.scenarioContext,
      scalingAnalysis
    );

    // Identify risk factors
    const riskFactors = this.identifyScalingRisks(
      baseTemplate,
      request.sourceScale,
      request.targetScale,
      request.sourceDomain,
      request.targetDomain
    );

    // Predict success probability
    const successPrediction = this.predictAdaptationSuccess(
      baseTemplate,
      scalingAnalysis,
      riskFactors
    );

    // Store adaptation results
    await this.storeAdaptationResults(request.runId, {
      sourceTemplate: request.sourceTemplate,
      scalingAnalysis,
      adaptedTemplate,
      successPrediction
    });

    return {
      adaptedTemplate,
      scalingAnalysis,
      implementationGuidance,
      riskFactors,
      successPrediction
    };
  }

  // Compute how parameters scale between different levels
  private computeScalingTransformations(
    template: ScaleInvariantTemplate,
    sourceScale: number,
    targetScale: number
  ): any {
    const scaleRatio = targetScale / sourceScale;
    const factors = template.scaleParameters.scalingFactors;

    return {
      scaleRatio,
      timeHorizonMultiplier: Math.pow(scaleRatio, factors.timeHorizon),
      stakeholderMultiplier: Math.pow(scaleRatio, factors.stakeholderCount),
      resourceMultiplier: Math.pow(scaleRatio, factors.resourceMagnitude),
      complexityMultiplier: Math.pow(scaleRatio, factors.complexityGrowth),
      transformedPayoffs: {
        cooperationReward: template.mathematicalStructure.payoffStructure.cooperationReward * Math.pow(scaleRatio, factors.resourceMagnitude),
        defectionTemptation: template.mathematicalStructure.payoffStructure.defectionTemptation * Math.pow(scaleRatio, factors.resourceMagnitude),
        mutualDefectionPenalty: template.mathematicalStructure.payoffStructure.mutualDefectionPenalty * Math.pow(scaleRatio, factors.resourceMagnitude),
        suckerPayoff: template.mathematicalStructure.payoffStructure.suckerPayoff * Math.pow(scaleRatio, factors.resourceMagnitude)
      }
    };
  }

  // Adapt template to specific domain and scale
  private adaptTemplateToContext(
    baseTemplate: ScaleInvariantTemplate,
    targetDomain: string,
    targetScale: number,
    scalingAnalysis: any
  ): ScaleInvariantTemplate {
    const adapted = JSON.parse(JSON.stringify(baseTemplate)); // Deep copy

    // Apply scaling transformations
    adapted.mathematicalStructure.payoffStructure = scalingAnalysis.transformedPayoffs;

    // Adapt to target domain if adaptation exists
    if (baseTemplate.domainAdaptations[targetDomain]) {
      const domainAdaptation = baseTemplate.domainAdaptations[targetDomain];
      
      // Update terminology and context
      adapted.name = `${baseTemplate.name} (${targetDomain} adaptation)`;
      adapted.id = `${baseTemplate.id}_${targetDomain}_scale${targetScale}`;
    }

    return adapted;
  }

  // Generate specific implementation guidance
  private generateImplementationGuidance(
    template: ScaleInvariantTemplate,
    context: ScaleAdaptationRequest['scenarioContext'],
    scalingAnalysis: any
  ): any {
    const guidance = {
      strategicPrinciples: template.universalPrinciples,
      scaledImplementation: [],
      timeframeAdjustments: [],
      resourceRequirements: [],
      stakeholderManagement: []
    };

    // Scale-specific implementation steps
    if (scalingAnalysis.scaleRatio > 2) {
      guidance.scaledImplementation.push('Establish hierarchical coordination mechanisms');
      guidance.scaledImplementation.push('Implement formal communication protocols');
      guidance.scaledImplementation.push('Create monitoring and feedback systems');
    } else if (scalingAnalysis.scaleRatio < 0.5) {
      guidance.scaledImplementation.push('Leverage direct communication channels');
      guidance.scaledImplementation.push('Focus on personal relationship building');
      guidance.scaledImplementation.push('Maintain flexibility and adaptability');
    }

    // Timeframe adjustments
    const timeMultiplier = scalingAnalysis.timeHorizonMultiplier;
    if (timeMultiplier > 2) {
      guidance.timeframeAdjustments.push(`Extend planning horizon by ${(timeMultiplier * 100).toFixed(0)}%`);
      guidance.timeframeAdjustments.push('Implement milestone-based progress tracking');
    }

    return guidance;
  }

  // Identify risks in scaling adaptation
  private identifyScalingRisks(
    template: ScaleInvariantTemplate,
    sourceScale: number,
    targetScale: number,
    sourceDomain: string,
    targetDomain: string
  ): string[] {
    const risks = [];
    const scaleRatio = targetScale / sourceScale;

    // Scale-related risks
    if (scaleRatio > 3) {
      risks.push('Coordination complexity may overwhelm management capacity');
      risks.push('Communication delays may disrupt strategic timing');
      risks.push('Emergent behaviors may deviate from template predictions');
    }

    if (scaleRatio < 0.3) {
      risks.push('Template may be over-engineered for simple context');
      risks.push('Formal mechanisms may inhibit natural coordination');
    }

    // Domain transfer risks
    if (sourceDomain !== targetDomain) {
      risks.push('Cultural and contextual factors may alter strategic dynamics');
      risks.push('Regulatory and institutional differences may constrain options');
    }

    // Template-specific risks
    if (template.mathematicalStructure.gameClass === 'chicken') {
      risks.push('Escalation dynamics may lead to mutual destruction');
    }

    return risks;
  }

  // Predict adaptation success probability
  private predictAdaptationSuccess(
    template: ScaleInvariantTemplate,
    scalingAnalysis: any,
    riskFactors: string[]
  ): number {
    let baseSuccess = 0.7; // Base template success rate

    // Adjust for scale complexity
    const complexityPenalty = Math.max(0, (scalingAnalysis.complexityMultiplier - 1) * 0.1);
    baseSuccess -= complexityPenalty;

    // Adjust for risk factors
    const riskPenalty = riskFactors.length * 0.05;
    baseSuccess -= riskPenalty;

    // Adjust for template robustness
    const robustnessBonus = template.scaleParameters.maxScale - template.scaleParameters.minScale;
    baseSuccess += robustnessBonus * 0.02;

    return Math.max(0.1, Math.min(0.95, baseSuccess));
  }

  // Store adaptation results for learning
  private async storeAdaptationResults(runId: string, results: any): Promise<void> {
    try {
      await this.supabase
        .from('scale_invariant_adaptations')
        .insert({
          run_id: runId,
          adaptation_results: results,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.warn('Failed to store adaptation results:', error);
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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, X-Client-Info'
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
    
    if (!body.runId || !body.sourceTemplate || !body.sourceScale || !body.targetScale) {
      return jsonResponse(400, {
        ok: false,
        message: 'Missing required fields: runId, sourceTemplate, sourceScale, or targetScale'
      });
    }

    const engine = new ScaleInvariantTemplateEngine(supabase);
    const result = await engine.adaptAcrossScales(body);
    
    return jsonResponse(200, {
      ok: true,
      response: result
    });
    
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Scale-invariant template error:', e);
    return jsonResponse(500, { ok: false, message: msg })
  }
});
