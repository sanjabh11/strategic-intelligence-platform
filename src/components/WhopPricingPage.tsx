// Updated Pricing Page Component
// Supports Whop checkout with Stripe fallback for .edu emails
// Pricing: Free ($0) / Pro ($19) / Elite ($49) / Enterprise ($199)

import React, { useState } from 'react';
import {
    Check, X, Zap, Crown, Sparkles, Lock, ArrowRight,
    GraduationCap, CreditCard, Shield, Users, BarChart3
} from 'lucide-react';
import {
    PRICING_TIERS,
    ACADEMIC_TIER,
    isAcademicEmail,
    getCheckoutUrl,
    type WhopPricingTier
} from '../lib/whop-config';
import { useWhopAuth } from '../hooks/useWhopAuth';

const TIER_ICONS: Record<string, React.ElementType> = {
    free: Lock,
    pro: Zap,
    elite: Sparkles,
    enterprise: Crown,
    academic: GraduationCap
};

const WhopPricingPage: React.FC = () => {
    const { currentTier, isAuthenticated, session } = useWhopAuth();
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [email, setEmail] = useState('');
    const [showAcademicModal, setShowAcademicModal] = useState(false);

    const handleSelectTier = (tier: WhopPricingTier) => {
        // If free, just sign up
        if (tier.priceMonthly === 0) {
            window.location.href = '/signup';
            return;
        }

        // If user has .edu email, use Stripe
        if (session?.isAcademic || (email && isAcademicEmail(email))) {
            setShowAcademicModal(true);
            return;
        }

        // Otherwise, use Whop checkout
        window.location.href = getCheckoutUrl(tier.id);
    };

    const handleAcademicCheckout = () => {
        if (!email || !isAcademicEmail(email)) {
            alert('Please enter a valid .edu email address');
            return;
        }
        window.location.href = `/checkout/stripe?tier=academic&email=${encodeURIComponent(email)}`;
    };

    const getPrice = (tier: WhopPricingTier): number => {
        if (billingCycle === 'yearly') {
            return Math.round(tier.priceYearly / 12);
        }
        return tier.priceMonthly;
    };

    const getSavings = (tier: WhopPricingTier): number => {
        if (tier.priceMonthly === 0) return 0;
        const yearlyMonthly = tier.priceYearly / 12;
        return Math.round(((tier.priceMonthly - yearlyMonthly) / tier.priceMonthly) * 100);
    };

    return (
        <div className="min-h-screen bg-slate-900 py-12 px-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-white mb-4">
                        Choose Your Strategic Edge
                    </h1>
                    <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                        From free exploration to enterprise intelligence.
                        All plans include core game theory tools.
                    </p>

                    {/* Billing toggle */}
                    <div className="flex items-center justify-center gap-4 mt-8">
                        <span className={`text-sm ${billingCycle === 'monthly' ? 'text-white' : 'text-slate-400'}`}>
                            Monthly
                        </span>
                        <button
                            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                            className={`relative w-14 h-7 rounded-full transition-colors ${billingCycle === 'yearly' ? 'bg-green-500' : 'bg-slate-600'
                                }`}
                        >
                            <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${billingCycle === 'yearly' ? 'left-8' : 'left-1'
                                }`} />
                        </button>
                        <span className={`text-sm ${billingCycle === 'yearly' ? 'text-white' : 'text-slate-400'}`}>
                            Yearly
                            <span className="ml-2 px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">
                                Save 17%
                            </span>
                        </span>
                    </div>
                </div>

                {/* Pricing Cards */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    {PRICING_TIERS.map((tier) => {
                        const TierIcon = TIER_ICONS[tier.id];
                        const isCurrentTier = currentTier.id === tier.id;
                        const isPopular = tier.id === 'elite';

                        return (
                            <div
                                key={tier.id}
                                className={`relative bg-slate-800 rounded-2xl p-6 border-2 transition-all ${isCurrentTier
                                        ? 'border-green-500 ring-2 ring-green-500/20'
                                        : isPopular
                                            ? 'border-purple-500'
                                            : 'border-slate-700 hover:border-slate-600'
                                    }`}
                            >
                                {/* Popular badge */}
                                {isPopular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                        <span className="px-3 py-1 bg-purple-500 text-white text-xs font-bold rounded-full">
                                            MOST POPULAR
                                        </span>
                                    </div>
                                )}

                                {/* Current plan badge */}
                                {isCurrentTier && (
                                    <div className="absolute -top-3 right-4">
                                        <span className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
                                            CURRENT
                                        </span>
                                    </div>
                                )}

                                {/* Header */}
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`p-2 rounded-lg bg-gradient-to-r ${tier.badge.gradient}`}>
                                        <TierIcon className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white">{tier.name}</h3>
                                    </div>
                                </div>

                                {/* Price */}
                                <div className="mb-6">
                                    <div className="flex items-baseline">
                                        <span className="text-4xl font-bold text-white">${getPrice(tier)}</span>
                                        <span className="text-slate-400 ml-1">/mo</span>
                                    </div>
                                    {billingCycle === 'yearly' && tier.priceMonthly > 0 && (
                                        <div className="text-sm text-green-400 mt-1">
                                            Save {getSavings(tier)}% with yearly billing
                                        </div>
                                    )}
                                    {tier.priceMonthly === 0 && (
                                        <div className="text-sm text-slate-400 mt-1">
                                            Free forever
                                        </div>
                                    )}
                                </div>

                                {/* Features */}
                                <ul className="space-y-3 mb-6 min-h-[200px]">
                                    {tier.features.slice(0, 6).map((feature, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                                            <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                                            {feature}
                                        </li>
                                    ))}
                                    {tier.features.length > 6 && (
                                        <li className="text-sm text-slate-400 italic">
                                            + {tier.features.length - 6} more features
                                        </li>
                                    )}
                                </ul>

                                {/* CTA */}
                                <button
                                    onClick={() => handleSelectTier(tier)}
                                    disabled={isCurrentTier}
                                    className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${isCurrentTier
                                            ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                            : `bg-gradient-to-r ${tier.badge.gradient} text-white hover:opacity-90`
                                        }`}
                                >
                                    {isCurrentTier ? (
                                        'Current Plan'
                                    ) : tier.priceMonthly === 0 ? (
                                        'Get Started'
                                    ) : (
                                        <>
                                            Upgrade to {tier.name}
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* Academic Section */}
                <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/30 rounded-2xl p-8 mb-12">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-500/20 rounded-xl">
                                <GraduationCap className="w-8 h-8 text-green-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Academic Discount</h3>
                                <p className="text-green-300">
                                    30% off Elite tier for students and educators with .edu email
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <div className="text-3xl font-bold text-white">$34<span className="text-lg text-slate-400">/mo</span></div>
                                <div className="text-sm text-slate-400 line-through">$49/mo</div>
                            </div>
                            <button
                                onClick={() => setShowAcademicModal(true)}
                                className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold flex items-center gap-2"
                            >
                                <CreditCard className="w-5 h-5" />
                                Get Academic Pricing
                            </button>
                        </div>
                    </div>
                </div>

                {/* Trust badges */}
                <div className="flex flex-wrap items-center justify-center gap-8 text-slate-400 text-sm">
                    <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5" />
                        Secure payments via Whop
                    </div>
                    <div className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        10,000+ strategists
                    </div>
                    <div className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Cancel anytime
                    </div>
                </div>

                {/* Academic Modal */}
                {showAcademicModal && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full border border-slate-700">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-green-500/20 rounded-lg">
                                    <GraduationCap className="w-6 h-6 text-green-400" />
                                </div>
                                <h3 className="text-xl font-bold text-white">Academic Checkout</h3>
                            </div>

                            <p className="text-slate-400 mb-6">
                                Enter your .edu email to get Elite access at 30% off via Stripe.
                            </p>

                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="your.email@university.edu"
                                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 mb-4 focus:outline-none focus:border-green-500"
                            />

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowAcademicModal(false)}
                                    className="flex-1 py-3 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAcademicCheckout}
                                    disabled={!email || !isAcademicEmail(email)}
                                    className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Continue to Stripe
                                </button>
                            </div>

                            {email && !isAcademicEmail(email) && (
                                <p className="text-red-400 text-sm mt-3">
                                    Please enter a valid .edu email address
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WhopPricingPage;
