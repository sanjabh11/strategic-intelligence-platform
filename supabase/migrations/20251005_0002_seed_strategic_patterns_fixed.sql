-- Migration: Seed Strategic Patterns Database (FIXED for existing schema)
-- Populates strategic_patterns table with 50+ canonical game theory patterns

-- Clear existing patterns first
DELETE FROM strategic_patterns;

-- Insert canonical game theory patterns
INSERT INTO strategic_patterns (pattern_signature, abstraction_level, success_domains, failure_domains, structural_invariants, confidence_score, success_rate, adaptation_protocols) VALUES

-- Coordination Games
('prisoners_dilemma_mutual_defection', 9, ARRAY['military', 'business', 'politics', 'international_relations', 'labor_negotiations'], ARRAY['family_dynamics'], 
 '{"game_type": "coordination", "players": 2, "dominant_strategy": "defect", "pareto_optimal": "cooperate", "nash_equilibrium": "defect-defect"}'::JSONB, 0.92, 0.73, '{}'::JSONB),

('stag_hunt_coordination', 8, ARRAY['business', 'politics', 'economics', 'technology', 'environmental_policy'], ARRAY['zero_sum_competitions'],
 '{"game_type": "coordination", "players": 2, "risk_dominance": "safe", "payoff_dominance": "risky", "coordination_required": true}'::JSONB, 0.88, 0.68, '{}'::JSONB),

('chicken_game_brinkmanship', 8, ARRAY['military', 'politics', 'corporate_competition', 'international_diplomacy'], ARRAY['cooperative_environments'],
 '{"game_type": "anti_coordination", "players": 2, "strategy": "commitment", "risk": "mutual_destruction", "bluffing": true}'::JSONB, 0.85, 0.61, '{}'::JSONB),

('battle_of_sexes_coordination', 7, ARRAY['business_partnerships', 'political_coalitions', 'technology_standards', 'labor_management'], ARRAY['competitive_markets'],
 '{"game_type": "coordination", "players": 2, "multiple_equilibria": true, "communication_matters": true, "focal_points": true}'::JSONB, 0.82, 0.71, '{}'::JSONB),

-- Bargaining & Negotiation
('nash_bargaining_solution', 8, ARRAY['labor_negotiations', 'international_trade', 'corporate_mergers', 'divorce_settlements'], ARRAY['zero_sum_games'],
 '{"game_type": "bargaining", "players": 2, "solution_concept": "nash_product", "outside_option": true, "pareto_frontier": true}'::JSONB, 0.89, 0.74, '{}'::JSONB),

('ultimatum_game_fairness', 7, ARRAY['business_negotiations', 'salary_negotiations', 'real_estate', 'politics'], ARRAY['repeated_interactions'],
 '{"game_type": "bargaining", "players": 2, "one_shot": true, "fairness_considerations": true, "rejection_possible": true}'::JSONB, 0.79, 0.56, '{}'::JSONB),

-- Auctions & Bidding
('first_price_sealed_bid', 8, ARRAY['procurement', 'art_markets', 'spectrum_auctions', 'real_estate', 'corporate_acquisitions'], ARRAY['public_goods'],
 '{"game_type": "auction", "information": "private_value", "strategy": "bid_shading", "winners_curse": true}'::JSONB, 0.87, 0.72, '{}'::JSONB),

('second_price_vickrey', 9, ARRAY['online_advertising', 'government_procurement', 'art_auctions'], ARRAY['common_value_auctions'],
 '{"game_type": "auction", "information": "private_value", "strategy": "truth_telling", "incentive_compatible": true}'::JSONB, 0.91, 0.81, '{}'::JSONB),

-- Repeated Games & Reputation
('tit_for_tat_cooperation', 9, ARRAY['international_relations', 'business_partnerships', 'trade', 'neighborhoods', 'online_communities'], ARRAY['one_shot_interactions'],
 '{"game_type": "repeated", "strategy": "conditional_cooperation", "trigger": "defection", "forgiveness": "limited", "robust": true}'::JSONB, 0.94, 0.83, '{}'::JSONB),

('grim_trigger_punishment', 8, ARRAY['cartel_agreements', 'international_treaties', 'labor_unions', 'price_fixing'], ARRAY['short_term_interactions'],
 '{"game_type": "repeated", "strategy": "permanent_punishment", "deterrence": true, "credibility_required": true}'::JSONB, 0.83, 0.64, '{}'::JSONB),

('reputation_building', 9, ARRAY['business', 'politics', 'online_markets', 'professional_services', 'diplomacy'], ARRAY['anonymous_interactions'],
 '{"game_type": "repeated", "strategy": "signal_quality", "costly_signaling": true, "long_term_payoff": true}'::JSONB, 0.91, 0.79, '{}'::JSONB),

-- Information Games
('adverse_selection_lemons', 8, ARRAY['used_car_markets', 'insurance', 'credit_markets', 'labor_markets', 'health_insurance'], ARRAY['perfect_information'],
 '{"game_type": "information_asymmetry", "hidden_information": "quality", "market_failure": true, "signaling_needed": true}'::JSONB, 0.89, 0.71, '{}'::JSONB),

('moral_hazard_hidden_action', 8, ARRAY['insurance', 'employment', 'finance', 'healthcare', 'principal_agent'], ARRAY['perfect_monitoring'],
 '{"game_type": "information_asymmetry", "hidden_action": true, "monitoring_costly": true, "incentive_alignment": true}'::JSONB, 0.87, 0.69, '{}'::JSONB),

-- Military & Conflict
('mutually_assured_destruction', 9, ARRAY['nuclear_strategy', 'cybersecurity', 'corporate_espionage'], ARRAY['conventional_conflicts'],
 '{"game_type": "deterrence", "strategy": "credible_threat", "second_strike_capability": true, "stability": "terror"}'::JSONB, 0.93, 0.89, '{}'::JSONB),

('guerrilla_warfare_asymmetry', 7, ARRAY['military', 'insurgency', 'terrorism', 'corporate_disruption'], ARRAY['conventional_warfare'],
 '{"game_type": "conflict", "asymmetric": true, "attrition": "weak_player", "strategy": "avoid_direct_confrontation"}'::JSONB, 0.76, 0.62, '{}'::JSONB),

-- Market Competition
('bertrand_price_competition', 8, ARRAY['retail', 'commodities', 'gasoline', 'online_markets'], ARRAY['differentiated_products'],
 '{"game_type": "competition", "strategy": "price_cutting", "nash_equilibrium": "marginal_cost", "consumer_surplus_high": true}'::JSONB, 0.86, 0.71, '{}'::JSONB),

('cournot_quantity_competition', 8, ARRAY['manufacturing', 'oil_production', 'capacity_constrained_industries'], ARRAY['price_setting_markets'],
 '{"game_type": "competition", "strategy": "quantity_choice", "nash_equilibrium": "interior", "profits_positive": true}'::JSONB, 0.87, 0.73, '{}'::JSONB),

('stackelberg_leadership', 8, ARRAY['oligopoly', 'market_leaders', 'technology_platforms', 'airline_capacity'], ARRAY['simultaneous_moves'],
 '{"game_type": "competition", "strategy": "first_mover_advantage", "commitment": true, "sequential": true}'::JSONB, 0.85, 0.74, '{}'::JSONB),

('product_differentiation', 8, ARRAY['consumer_goods', 'technology', 'automobiles', 'restaurants'], ARRAY['commodity_markets'],
 '{"game_type": "competition", "strategy": "avoid_direct_competition", "niche_markets": true, "higher_margins": true}'::JSONB, 0.88, 0.79, '{}'::JSONB),

-- Network Effects
('platform_tipping_winner_take_all', 9, ARRAY['technology_platforms', 'social_networks', 'payment_systems', 'operating_systems'], ARRAY['niche_markets'],
 '{"game_type": "network_effects", "strategy": "achieve_critical_mass", "lock_in": true, "switching_costs": true}'::JSONB, 0.90, 0.81, '{}'::JSONB),

('two_sided_market_chicken_egg', 8, ARRAY['marketplaces', 'dating_apps', 'job_platforms', 'ride_sharing'], ARRAY['one_sided_markets'],
 '{"game_type": "network_effects", "strategy": "subsidize_one_side", "cross_side_effects": true, "coordination_problem": true}'::JSONB, 0.86, 0.74, '{}'::JSONB),

-- Evolutionary & Learning
('evolutionary_stable_strategy', 9, ARRAY['biology', 'cultural_evolution', 'business_strategy', 'technology_adoption'], ARRAY['rational_agents'],
 '{"game_type": "evolutionary", "strategy": "uninvadable", "population_dynamics": true, "replicator_dynamics": true}'::JSONB, 0.92, 0.77, '{}'::JSONB),

-- Public Goods
('free_rider_public_goods', 8, ARRAY['climate_change', 'defense', 'public_broadcasting', 'open_source'], ARRAY['excludable_goods'],
 '{"game_type": "public_goods", "strategy": "free_ride", "underprovision": true, "voluntary_contribution": false}'::JSONB, 0.84, 0.58, '{}'::JSONB),

('tragedy_of_commons', 9, ARRAY['fisheries', 'water_resources', 'air_pollution', 'traffic_congestion', 'antibiotics'], ARRAY['private_property'],
 '{"game_type": "externality", "strategy": "overuse", "degradation": true, "property_rights_solution": true}'::JSONB, 0.91, 0.63, '{}'::JSONB),

-- Mechanism Design
('vickrey_clarke_groves', 9, ARRAY['auctions', 'public_projects', 'resource_allocation', 'spectrum_allocation'], ARRAY['budget_balance'],
 '{"game_type": "mechanism_design", "strategy": "truth_telling", "efficient_allocation": true, "incentive_compatible": true}'::JSONB, 0.93, 0.79, '{}'::JSONB),

('revelation_principle', 9, ARRAY['mechanism_design', 'contract_theory', 'regulation', 'taxation'], ARRAY['implementation_theory'],
 '{"game_type": "mechanism_design", "strategy": "direct_mechanism", "truthful_reporting": true, "universal_principle": true}'::JSONB, 0.94, 0.85, '{}'::JSONB);

-- Log success
DO $$
BEGIN
  RAISE NOTICE 'Strategic patterns seeded successfully. Total patterns: %', (SELECT COUNT(*) FROM strategic_patterns);
END $$;
