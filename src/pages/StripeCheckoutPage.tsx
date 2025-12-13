// Stripe Checkout Page
// Fallback checkout for academic (.edu) users
// Handles Stripe payment flow with automatic .edu verification

import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { GraduationCap, Loader2, AlertCircle, CheckCircle, CreditCard } from 'lucide-react';
import { ACADEMIC_TIER, isAcademicEmail } from '../lib/whop-config';
import { supabase } from '../lib/supabase';

const StripeCheckoutPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(false);

    const email = searchParams.get('email') || '';
    const tier = searchParams.get('tier') || 'academic';
    const success = searchParams.get('success') === 'true';
    const sessionId = searchParams.get('session_id');

    // Handle success callback
    useEffect(() => {
        if (success && sessionId) {
            handleSuccess(sessionId);
        }
    }, [success, sessionId]);

    // Verify email and create checkout session
    useEffect(() => {
        if (!success && email) {
            verifyAndCreateSession();
        } else if (!email && !success) {
            setError('Email is required for academic checkout');
            setLoading(false);
        }
    }, [email]);

    const verifyAndCreateSession = async () => {
        setLoading(true);
        setError(null);

        // Verify .edu email
        if (!isAcademicEmail(email)) {
            setError('Academic checkout is only available for .edu email addresses');
            setLoading(false);
            return;
        }

        try {
            // Create Stripe checkout session via Edge Function
            const { data, error: fnError } = await supabase.functions.invoke('stripe-checkout', {
                body: {
                    email,
                    tier,
                    successUrl: `${window.location.origin}/checkout/stripe?success=true&session_id={CHECKOUT_SESSION_ID}`,
                    cancelUrl: `${window.location.origin}/pricing`
                }
            });

            if (fnError) throw fnError;

            if (data?.url) {
                // Redirect to Stripe Checkout URL (preferred method)
                window.location.href = data.url;
            } else {
                throw new Error('Failed to create checkout session');
            }
        } catch (err) {
            console.error('Checkout error:', err);
            setError(err instanceof Error ? err.message : 'Failed to initialize checkout');
            setLoading(false);
        }
    };

    const handleSuccess = async (checkoutSessionId: string) => {
        setVerifying(true);

        try {
            // Verify payment and activate subscription
            const { data, error: fnError } = await supabase.functions.invoke('stripe-verify', {
                body: { sessionId: checkoutSessionId }
            });

            if (fnError) throw fnError;

            // Success! Redirect to dashboard
            setTimeout(() => {
                navigate('/console?welcome=true');
            }, 2000);
        } catch (err) {
            console.error('Verification error:', err);
            setError('Payment received but verification failed. Please contact support.');
        } finally {
            setVerifying(false);
        }
    };

    // Success view
    if (success) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full text-center border border-green-500/30">
                    {verifying ? (
                        <>
                            <Loader2 className="w-16 h-16 text-green-400 animate-spin mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-white mb-2">Activating Your Subscription</h2>
                            <p className="text-slate-400">Please wait while we set up your account...</p>
                        </>
                    ) : (
                        <>
                            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-white mb-2">Welcome to the Elite!</h2>
                            <p className="text-slate-400 mb-4">
                                Your academic subscription is now active. Enjoy 30% off Elite features.
                            </p>
                            <p className="text-green-400 text-sm">Redirecting to console...</p>
                        </>
                    )}
                </div>
            </div>
        );
    }

    // Error view
    if (error) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full text-center border border-red-500/30">
                    <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Checkout Error</h2>
                    <p className="text-slate-400 mb-6">{error}</p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => navigate('/pricing')}
                            className="flex-1 py-3 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700"
                        >
                            Back to Pricing
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Loading view
    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full text-center border border-slate-700">
                <div className="flex items-center justify-center gap-3 mb-6">
                    <GraduationCap className="w-8 h-8 text-green-400" />
                    <CreditCard className="w-8 h-8 text-blue-400" />
                </div>

                <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />

                <h2 className="text-xl font-bold text-white mb-2">Preparing Academic Checkout</h2>
                <p className="text-slate-400 mb-4">
                    Verifying your .edu email and initializing secure payment...
                </p>

                <div className="bg-slate-700/50 rounded-lg p-4 text-left">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-400">Plan</span>
                        <span className="text-white font-medium">{ACADEMIC_TIER.name}</span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-400">Email</span>
                        <span className="text-white font-medium truncate ml-4">{email}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-slate-400">Price</span>
                        <div>
                            <span className="text-white font-medium">${ACADEMIC_TIER.priceMonthly}/mo</span>
                            <span className="text-green-400 text-sm ml-2">30% off</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StripeCheckoutPage;
