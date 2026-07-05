// Updated Pricing Page Component
// Supports Whop checkout with Stripe fallback for .edu emails
// Pricing: Free ($0) / Pro ($19) / Elite ($49) / Enterprise ($199)

import React, { useState, useEffect } from 'react';
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
import { track, AnalyticsEvents } from '../lib/analytics';

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

    useEffect(() => {
        track(AnalyticsEvents.PRICING_VIEW);
    }, []);

    const signupRedirect = (nextPath: string, signupEmail?: string) => {
        const params = new URLSearchParams({ next: nextPath });
        if (signupEmail) {
            params.set('email', signupEmail);
        }
        return `/signup?${params.toString()}`;
    };

    const handleSelectTier = (tier: WhopPricingTier) => {
        // If free, just sign up
        if (tier.priceMonthly === 0) {
            window.location.href = signupRedirect('/console', email || session?.email);
            return;
        }

        // If user has .edu email, use academic modal
        if (session?.isAcademic || (email && isAcademicEmail(email))) {
            setShowAcademicModal(true);
            return;
        }

        // Pilot phase: route paid tier requests to demo page instead of checkout
        track(AnalyticsEvents.PRICING_PILOT_REQUEST, { tier: tier.id });
        window.location.href = '/demo';
    };

    const handleAcademicCheckout = () => {
        if (!email || !isAcademicEmail(email)) {
            alert('Please enter a valid .edu email address');
            return;
        }

        const checkoutPath = `/checkout/stripe?tier=academic&email=${encodeURIComponent(email)}`;
        if (!isAuthenticated) {
            window.location.href = signupRedirect(checkoutPath, email);
            return;
        }

        window.location.href = checkoutPath;
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
                {/* Pilot Preview Banner */}
                <div className="mb-8 bg-blue-900/30 border border-blue-500/30 rounded-xl p-4 text-center">
                    <p className="text-blue-200 text-sm">
                        <strong>Pilot Preview:</strong> We're in a guided pilot phase. The Free tier is fully active — no payment required.
                        Paid tiers are available by request. <a href="/demo" className="underline hover:text-blue-100">Request a demo →</a>
                    </p>
                </div>

                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-white mb-4">
                        Strategic Intelligence Plans
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
                                        'Get Started Free'
                                    ) : (
                                        <>
                                            Request Pilot Access
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* Feature Comparison Table */}
                <div className="mb-12 overflow-x-auto">
                    <h2 className="text-2xl font-bold text-white mb-6 text-center">Compare Plans</h2>
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="border-b border-slate-700">
                                <th className="text-left py-3 px-4 text-slate-400 font-medium">Feature</th>
                                <th className="text-center py-3 px-4 text-slate-300 font-medium">Free</th>
                                <th className="text-center py-3 px-4 text-slate-300 font-medium">Pro</th>
                                <th className="text-center py-3 px-4 text-purple-400 font-bold">Elite</th>
                                <th className="text-center py-3 px-4 text-slate-300 font-medium">Enterprise</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            <tr><td className="py-2.5 px-4 text-slate-300">Analyses per day</td><td className="text-center text-slate-400">5</td><td className="text-center text-slate-400">50</td><td className="text-center text-slate-400">Unlimited</td><td className="text-center text-slate-400">Unlimited</td></tr>
                            <tr><td className="py-2.5 px-4 text-slate-300">Max matrix size</td><td className="text-center text-slate-400">2×2</td><td className="text-center text-slate-400">5×5</td><td className="text-center text-slate-400">10×10</td><td className="text-center text-slate-400">Unlimited</td></tr>
                            <tr><td className="py-2.5 px-4 text-slate-300">Evidence sources per analysis</td><td className="text-center text-slate-400">2</td><td className="text-center text-slate-400">5</td><td className="text-center text-slate-400">10</td><td className="text-center text-slate-400">Unlimited</td></tr>
                            <tr><td className="py-2.5 px-4 text-slate-300">Saved scenarios</td><td className="text-center text-slate-400">3</td><td className="text-center text-slate-400">25</td><td className="text-center text-slate-400">100</td><td className="text-center text-slate-400">Unlimited</td></tr>
                            <tr><td className="py-2.5 px-4 text-slate-300">Labs (Game Tree, Negotiation)</td><td className="text-center text-red-400">—</td><td className="text-center text-green-400">✓</td><td className="text-center text-green-400">✓</td><td className="text-center text-green-400">✓</td></tr>
                            <tr><td className="py-2.5 px-4 text-slate-300">Bias Profile Dashboard</td><td className="text-center text-red-400">—</td><td className="text-center text-green-400">✓</td><td className="text-center text-green-400">✓</td><td className="text-center text-green-400">✓</td></tr>
                            <tr><td className="py-2.5 px-4 text-slate-300">PDF Export</td><td className="text-center text-red-400">—</td><td className="text-center text-green-400">✓</td><td className="text-center text-green-400">✓</td><td className="text-center text-green-400">✓</td></tr>
                            <tr><td className="py-2.5 px-4 text-slate-300">Live Intel Dashboard</td><td className="text-center text-red-400">—</td><td className="text-center text-red-400">—</td><td className="text-center text-green-400">✓</td><td className="text-center text-green-400">✓</td></tr>
                            <tr><td className="py-2.5 px-4 text-slate-300">Forecasting Engine</td><td className="text-center text-red-400">—</td><td className="text-center text-red-400">—</td><td className="text-center text-green-400">✓</td><td className="text-center text-green-400">✓</td></tr>
                            <tr><td className="py-2.5 px-4 text-slate-300">War Room</td><td className="text-center text-red-400">—</td><td className="text-center text-red-400">—</td><td className="text-center text-green-400">✓</td><td className="text-center text-green-400">✓</td></tr>
                            <tr><td className="py-2.5 px-4 text-slate-300">API Access</td><td className="text-center text-red-400">—</td><td className="text-center text-red-400">—</td><td className="text-center text-green-400">✓</td><td className="text-center text-green-400">✓</td></tr>
                            <tr><td className="py-2.5 px-4 text-slate-300">Team Collaboration</td><td className="text-center text-red-400">—</td><td className="text-center text-red-400">—</td><td className="text-center text-green-400">✓</td><td className="text-center text-green-400">✓</td></tr>
                            <tr><td className="py-2.5 px-4 text-slate-300">White-Label</td><td className="text-center text-red-400">—</td><td className="text-center text-red-400">—</td><td className="text-center text-red-400">—</td><td className="text-center text-green-400">✓</td></tr>
                        </tbody>
                    </table>
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
                        Pilot phase — no payment required yet
                    </div>
                    <div className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Evidence-gated workflows
                    </div>
                    <div className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Free tier active now
                    </div>
                </div>

                {/* FAQ Section */}
                <div className="max-w-3xl mx-auto mt-16">
                    <h2 className="text-2xl font-bold text-white mb-6 text-center">Frequently Asked Questions</h2>
                    <div className="space-y-4">
                        <div className="bg-slate-800 rounded-lg p-5 border border-slate-700">
                            <h3 className="font-semibold text-white mb-2">What is the pilot phase?</h3>
                            <p className="text-slate-400 text-sm">We're currently in a guided pilot phase. The Free tier is fully active with no payment required. Paid tiers (Pro, Elite, Enterprise) are available by request — we'll work with you to set up access based on your needs.</p>
                        </div>
                        <div className="bg-slate-800 rounded-lg p-5 border border-slate-700">
                            <h3 className="font-semibold text-white mb-2">What can I do on the Free tier?</h3>
                            <p className="text-slate-400 text-sm">The Free tier includes 5 analyses per day, 4x4 matrix size, access to the Strategy Console, geopolitical radar, and evidence-backed analysis with real citations. It's designed to give you a real sense of the platform's value.</p>
                        </div>
                        <div className="bg-slate-800 rounded-lg p-5 border border-slate-700">
                            <h3 className="font-semibold text-white mb-2">How do I get access to paid features?</h3>
                            <p className="text-slate-400 text-sm">Click "Request Pilot Access" on any paid tier or <a href="/demo" className="text-blue-400 underline">request a demo</a>. We'll schedule a brief call to understand your use case and set up access. No payment is required during the pilot phase.</p>
                        </div>
                        <div className="bg-slate-800 rounded-lg p-5 border border-slate-700">
                            <h3 className="font-semibold text-white mb-2">Is there an academic discount?</h3>
                            <p className="text-slate-400 text-sm">Yes — students and educators with a .edu email get 30% off the Elite tier. During the pilot phase, academic users can request full access at no cost. Use the academic discount section above to apply.</p>
                        </div>
                        <div className="bg-slate-800 rounded-lg p-5 border border-slate-700">
                            <h3 className="font-semibold text-white mb-2">What happens to my data if I stop using the platform?</h3>
                            <p className="text-slate-400 text-sm">Your analysis runs and forecasts are stored in your account. You can export your data at any time. If you close your account, your data is deleted per our <a href="/privacy" className="text-blue-400 underline">Privacy Policy</a>.</p>
                        </div>
                        <div className="bg-slate-800 rounded-lg p-5 border border-slate-700">
                            <h3 className="font-semibold text-white mb-2">Can I switch tiers later?</h3>
                            <p className="text-slate-400 text-sm">Yes — you can upgrade or downgrade at any time. During the pilot phase, tier changes are handled by our team and processed within 1 business day.</p>
                        </div>
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
