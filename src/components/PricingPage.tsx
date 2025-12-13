// Pricing Page Component
// Displays subscription tiers with feature comparison
// Part of Monetization Strategy - Key conversion page

import React, { useState } from 'react';
import {
  Check, X, Zap, Crown, Sparkles, GraduationCap, 
  ArrowRight, Shield, Clock, Users, BarChart3, 
  Download, Globe, Brain, Target
} from 'lucide-react';
import { useSubscription, SubscriptionTier } from '../hooks/useSubscription';

interface PricingTier {
  id: SubscriptionTier;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  icon: React.ElementType;
  color: string;
  popular?: boolean;
  features: {
    name: string;
    included: boolean | string;
    highlight?: boolean;
  }[];
  cta: string;
  ctaLink?: string;
}

const PRICING_TIERS: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Perfect for learning game theory basics',
    priceMonthly: 0,
    priceYearly: 0,
    icon: Brain,
    color: 'slate',
    features: [
      { name: '5 analyses per day', included: true },
      { name: '2x2 matrix games only', included: true },
      { name: 'Basic Nash equilibrium', included: true },
      { name: '5 scenario templates', included: true },
      { name: 'Community support', included: true },
      { name: 'Gold Game Module', included: false },
      { name: 'Sequential games', included: false },
      { name: 'Export to CSV/PDF', included: false },
      { name: 'API access', included: false },
      { name: 'Real-time data feeds', included: false },
    ],
    cta: 'Get Started Free'
  },
  {
    id: 'analyst',
    name: 'Analyst',
    description: 'For retail investors and financial analysts',
    priceMonthly: 29,
    priceYearly: 290,
    icon: Zap,
    color: 'blue',
    features: [
      { name: '50 analyses per day', included: true },
      { name: 'Up to 4x4 matrices', included: true },
      { name: 'Advanced equilibrium computation', included: true },
      { name: '20 scenario templates', included: true },
      { name: 'Email support', included: true },
      { name: 'Gold Game Module', included: true, highlight: true },
      { name: 'Monte Carlo simulations', included: true, highlight: true },
      { name: 'Real-time gold/market data', included: true, highlight: true },
      { name: 'Export to CSV', included: true },
      { name: 'API access', included: false },
    ],
    cta: 'Start Analyst Trial'
  },
  {
    id: 'pro',
    name: 'Professional',
    description: 'For consultants and researchers',
    priceMonthly: 79,
    priceYearly: 790,
    icon: Sparkles,
    color: 'purple',
    popular: true,
    features: [
      { name: '200 analyses per day', included: true },
      { name: 'Up to 10x10 matrices', included: true },
      { name: 'All equilibrium methods', included: true },
      { name: '100 scenario templates', included: true },
      { name: 'Priority support', included: true },
      { name: 'Gold Game Module', included: true },
      { name: 'Sequential game trees', included: true, highlight: true },
      { name: 'PDF report generation', included: true, highlight: true },
      { name: 'Export to Python/R', included: true, highlight: true },
      { name: 'API access (1000 calls/mo)', included: true, highlight: true },
    ],
    cta: 'Start Pro Trial'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For organizations and institutions',
    priceMonthly: 500,
    priceYearly: 5000,
    icon: Crown,
    color: 'amber',
    features: [
      { name: 'Unlimited analyses', included: true },
      { name: 'Unlimited matrix size', included: true },
      { name: 'Custom equilibrium solvers', included: true },
      { name: 'All templates + custom', included: true },
      { name: 'Dedicated support', included: true },
      { name: 'All modules included', included: true },
      { name: 'White-label reports', included: true, highlight: true },
      { name: 'SSO integration', included: true, highlight: true },
      { name: 'Private deployment option', included: true, highlight: true },
      { name: 'Unlimited API access', included: true, highlight: true },
    ],
    cta: 'Contact Sales'
  },
  {
    id: 'academic',
    name: 'Academic',
    description: 'Special pricing for educators & students',
    priceMonthly: 0,
    priceYearly: 0,
    icon: GraduationCap,
    color: 'green',
    features: [
      { name: '100 analyses per day', included: true },
      { name: 'Up to 6x6 matrices', included: true },
      { name: 'Educational equilibrium modes', included: true },
      { name: '50 scenario templates', included: true },
      { name: 'Email support', included: true },
      { name: 'Gold Game Module', included: true },
      { name: 'Sequential games', included: true },
      { name: 'PDF report generation', included: true },
      { name: 'Classroom collaboration', included: true, highlight: true },
      { name: 'Requires .edu verification', included: 'Required' },
    ],
    cta: 'Apply for Academic'
  }
];

const FEATURE_CATEGORIES = [
  {
    name: 'Analysis Capabilities',
    icon: BarChart3,
    features: ['analyses per day', 'matrix', 'equilibrium']
  },
  {
    name: 'Premium Modules',
    icon: Target,
    features: ['Gold Game', 'Sequential', 'Monte Carlo']
  },
  {
    name: 'Export & Integration',
    icon: Download,
    features: ['Export', 'API', 'Python', 'PDF']
  },
  {
    name: 'Support & Security',
    icon: Shield,
    features: ['support', 'SSO', 'White-label']
  }
];

const PricingPage: React.FC = () => {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly');
  const { currentTier, loading } = useSubscription();

  const getColorClasses = (color: string, type: 'bg' | 'text' | 'border' | 'gradient') => {
    const colors: Record<string, Record<string, string>> = {
      slate: { bg: 'bg-slate-500', text: 'text-slate-400', border: 'border-slate-500', gradient: 'from-slate-500 to-slate-600' },
      blue: { bg: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500', gradient: 'from-blue-500 to-blue-600' },
      purple: { bg: 'bg-purple-500', text: 'text-purple-400', border: 'border-purple-500', gradient: 'from-purple-500 to-purple-600' },
      amber: { bg: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-500', gradient: 'from-amber-500 to-amber-600' },
      green: { bg: 'bg-green-500', text: 'text-green-400', border: 'border-green-500', gradient: 'from-green-500 to-green-600' },
    };
    return colors[color]?.[type] || colors.slate[type];
  };

  const handleSubscribe = (tier: PricingTier) => {
    if (tier.id === 'enterprise') {
      window.open('mailto:sales@strategicintelligence.com?subject=Enterprise Inquiry', '_blank');
    } else if (tier.id === 'academic') {
      window.open('/academic-application', '_blank');
    } else {
      // In production, redirect to Stripe Checkout
      const priceId = billingPeriod === 'yearly' 
        ? `price_${tier.id}_yearly`
        : `price_${tier.id}_monthly`;
      console.log(`Initiating checkout for ${priceId}`);
      // window.location.href = `/api/checkout?price_id=${priceId}`;
      alert(`Checkout for ${tier.name} (${billingPeriod}) - Integration pending`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 py-12 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Choose Your Strategic Advantage
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            From learning game theory to enterprise-grade strategic intelligence.
            Pick the plan that fits your needs.
          </p>

          {/* Billing Toggle */}
          <div className="mt-8 inline-flex items-center bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingPeriod === 'monthly'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingPeriod === 'yearly'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Yearly
              <span className="ml-2 text-xs text-green-400">Save 17%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-16">
          {PRICING_TIERS.map((tier) => {
            const Icon = tier.icon;
            const isCurrentTier = currentTier === tier.id;
            const price = billingPeriod === 'yearly' ? tier.priceYearly : tier.priceMonthly;
            const monthlyEquivalent = billingPeriod === 'yearly' && tier.priceYearly > 0
              ? Math.round(tier.priceYearly / 12)
              : tier.priceMonthly;

            return (
              <div
                key={tier.id}
                className={`relative bg-slate-800 rounded-xl border transition-all ${
                  tier.popular
                    ? `border-${tier.color}-500 ring-2 ring-${tier.color}-500/20`
                    : 'border-slate-700 hover:border-slate-600'
                } ${isCurrentTier ? 'ring-2 ring-green-500/50' : ''}`}
              >
                {tier.popular && (
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r ${getColorClasses(tier.color, 'gradient')} text-white text-xs font-bold rounded-full`}>
                    Most Popular
                  </div>
                )}

                {isCurrentTier && (
                  <div className="absolute -top-3 right-4 px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
                    Current Plan
                  </div>
                )}

                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-lg ${getColorClasses(tier.color, 'bg')}/20`}>
                      <Icon className={`w-6 h-6 ${getColorClasses(tier.color, 'text')}`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{tier.name}</h3>
                    </div>
                  </div>

                  <p className="text-sm text-slate-400 mb-4 h-10">{tier.description}</p>

                  {/* Price */}
                  <div className="mb-6">
                    {tier.id === 'academic' ? (
                      <div className="text-3xl font-bold text-white">Free*</div>
                    ) : tier.id === 'enterprise' ? (
                      <div className="text-3xl font-bold text-white">Custom</div>
                    ) : (
                      <>
                        <div className="text-3xl font-bold text-white">
                          ${monthlyEquivalent}
                          <span className="text-sm text-slate-400 font-normal">/mo</span>
                        </div>
                        {billingPeriod === 'yearly' && price > 0 && (
                          <div className="text-xs text-slate-500">
                            ${price} billed annually
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleSubscribe(tier)}
                    disabled={isCurrentTier}
                    className={`w-full py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                      isCurrentTier
                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                        : tier.popular
                          ? `bg-gradient-to-r ${getColorClasses(tier.color, 'gradient')} text-white hover:opacity-90`
                          : 'bg-slate-700 text-white hover:bg-slate-600'
                    }`}
                  >
                    {isCurrentTier ? 'Current Plan' : tier.cta}
                    {!isCurrentTier && <ArrowRight className="w-4 h-4" />}
                  </button>

                  {/* Features List */}
                  <div className="mt-6 space-y-3">
                    {tier.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        {feature.included === true ? (
                          <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                            feature.highlight ? getColorClasses(tier.color, 'text') : 'text-green-400'
                          }`} />
                        ) : feature.included === false ? (
                          <X className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-600" />
                        ) : (
                          <Shield className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-400" />
                        )}
                        <span className={`text-sm ${
                          feature.included === false ? 'text-slate-600' :
                          feature.highlight ? 'text-white font-medium' : 'text-slate-300'
                        }`}>
                          {feature.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="bg-slate-800 rounded-xl p-8 border border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            Frequently Asked Questions
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-white mb-2">Can I change plans later?</h3>
              <p className="text-sm text-slate-400">
                Yes, you can upgrade or downgrade at any time. When upgrading, you'll be prorated.
                When downgrading, changes take effect at the next billing cycle.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">What payment methods do you accept?</h3>
              <p className="text-sm text-slate-400">
                We accept all major credit cards (Visa, Mastercard, Amex) and PayPal.
                Enterprise clients can also pay by invoice.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">Is there a free trial?</h3>
              <p className="text-sm text-slate-400">
                Yes! Analyst and Pro plans include a 14-day free trial. No credit card required.
                Cancel anytime during the trial.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">How does academic pricing work?</h3>
              <p className="text-sm text-slate-400">
                Students and educators with a valid .edu email get free access to Pro-level features.
                Apply with your institutional email for verification.
              </p>
            </div>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="mt-12 text-center">
          <div className="flex items-center justify-center gap-8 text-slate-500">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              <span className="text-sm">SSL Encrypted</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              <span className="text-sm">Cancel Anytime</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <span className="text-sm">10,000+ Users</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
