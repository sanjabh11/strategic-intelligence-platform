import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle, CreditCard, GraduationCap, Loader2, LogIn } from 'lucide-react';
import { ACADEMIC_TIER, isAcademicEmail } from '../lib/whop-config';
import { isLocalMode, supabase } from '../lib/supabase';

function sanitizeNextPath(input: string): string {
    if (!input.startsWith('/')) return '/pricing';
    if (input.startsWith('//')) return '/pricing';
    return input;
}

const StripeCheckoutPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [authRequired, setAuthRequired] = useState(false);
    const [userEmail, setUserEmail] = useState('');

    const requestedEmail = searchParams.get('email') || '';
    const tier = searchParams.get('tier') || 'academic';
    const success = searchParams.get('success') === 'true';
    const sessionId = searchParams.get('session_id');
    const nextPath = useMemo(
        () => sanitizeNextPath(`/checkout/stripe?${searchParams.toString()}`),
        [searchParams],
    );

    const effectiveEmail = userEmail || requestedEmail;

    useEffect(() => {
        if (!supabase || isLocalMode) {
            setError('Local preview mode cannot initialize Supabase auth, so direct academic checkout is unavailable here. Verify the pricing-to-signup-to-checkout flow against the hosted environment instead.');
            setLoading(false);
            return;
        }

        let active = true;

        const initialize = async () => {
            const { data, error: authError } = await supabase.auth.getUser();
            if (!active) return;

            if (authError) {
                setError(authError.message);
                setLoading(false);
                return;
            }

            const user = data.user;
            if (!user) {
                setAuthRequired(true);
                setLoading(false);
                return;
            }

            const authenticatedEmail = user.email?.toLowerCase() || '';
            setUserEmail(authenticatedEmail);

            if (requestedEmail && authenticatedEmail && requestedEmail.toLowerCase() !== authenticatedEmail) {
                setError('The signed-in user does not match the academic email requested for checkout.');
                setLoading(false);
                return;
            }

            if (tier !== 'academic') {
                setError('Stripe checkout is currently limited to the academic tier.');
                setLoading(false);
                return;
            }

            if (!isAcademicEmail(authenticatedEmail)) {
                setError('Academic checkout requires a signed-in .edu email address.');
                setLoading(false);
                return;
            }

            if (success) {
                if (!sessionId) {
                    setError('Missing checkout session ID.');
                    setLoading(false);
                    return;
                }

                await handleSuccess(sessionId);
                return;
            }

            await createCheckoutSession(authenticatedEmail);
        };

        void initialize();

        return () => {
            active = false;
        };
    }, [requestedEmail, sessionId, success, tier]);

    const createCheckoutSession = async (email: string) => {
        setLoading(true);
        setError(null);

        try {
            const { data, error: fnError } = await supabase.functions.invoke('stripe-checkout', {
                body: {
                    tier,
                    successUrl: `${window.location.origin}/checkout/stripe?success=true&session_id={CHECKOUT_SESSION_ID}`,
                    cancelUrl: `${window.location.origin}/pricing`,
                },
            });

            if (fnError) {
                throw fnError;
            }

            if (data?.url) {
                window.location.href = data.url;
                return;
            }

            throw new Error(`Failed to create checkout session for ${email}`);
        } catch (err) {
            console.error('Checkout error:', err);
            setError(err instanceof Error ? err.message : 'Failed to initialize checkout');
            setLoading(false);
        }
    };

    const handleSuccess = async (checkoutSessionId: string) => {
        setVerifying(true);
        setLoading(false);
        setError(null);

        try {
            const { error: fnError } = await supabase.functions.invoke('stripe-verify', {
                body: { sessionId: checkoutSessionId },
            });

            if (fnError) {
                throw fnError;
            }

            window.dispatchEvent(new Event('subscription:refresh'));
            setTimeout(() => {
                window.location.assign('/console?welcome=true&subscription=updated');
            }, 1500);
        } catch (err) {
            console.error('Verification error:', err);
            setError('Payment received but verification failed. Please contact support.');
        } finally {
            setVerifying(false);
        }
    };

    if (authRequired) {
        const signupParams = new URLSearchParams({ next: nextPath });
        if (requestedEmail) {
            signupParams.set('email', requestedEmail);
        }

        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full text-center border border-slate-700">
                    <LogIn className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Sign in required</h2>
                    <p className="text-slate-400 mb-6">
                        Academic checkout is bound to an authenticated Supabase user so the subscription can be activated securely.
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => navigate('/pricing')}
                            className="flex-1 py-3 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700"
                        >
                            Back to Pricing
                        </button>
                        <button
                            onClick={() => navigate(`/signup?${signupParams.toString()}`)}
                            className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg"
                        >
                            Sign In
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full text-center border border-green-500/30">
                    {verifying ? (
                        <>
                            <Loader2 className="w-16 h-16 text-green-400 animate-spin mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-white mb-2">Activating Your Subscription</h2>
                            <p className="text-slate-400">Please wait while we finalize your academic entitlement.</p>
                        </>
                    ) : error ? (
                        <>
                            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-white mb-2">Verification Error</h2>
                            <p className="text-slate-400">{error}</p>
                        </>
                    ) : (
                        <>
                            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-white mb-2">Academic Access Activated</h2>
                            <p className="text-slate-400 mb-4">
                                Your academic subscription is active and your console access is being refreshed.
                            </p>
                            <p className="text-green-400 text-sm">Redirecting to console...</p>
                        </>
                    )}
                </div>
            </div>
        );
    }

    if (error) {
        const isLocalCheckoutUnavailable = error.includes('Local preview mode')
        const isAuthMissing = /auth session missing|not authenticated|sign[- ]in/i.test(error.toLowerCase())
        const isAcademicEligibilityIssue = /academic|\.edu|does not match/i.test(error.toLowerCase())
        const errorHeading = isLocalCheckoutUnavailable
            ? 'Hosted Verification Required'
            : isAuthMissing
                ? 'Sign In Required'
                : isAcademicEligibilityIssue
                    ? 'Academic Eligibility Required'
                    : 'Checkout Error'
        const errorDetail = isAuthMissing
            ? 'Sign in with the academic account that should receive access, then restart checkout from the pricing page.'
            : error

        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full text-center border border-red-500/30">
                    <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">{errorHeading}</h2>
                    <p className="text-slate-400 mb-4">{errorDetail}</p>
                    {isLocalCheckoutUnavailable && (
                        <p className="text-sm leading-6 text-slate-500 mb-6">
                            This does not block beta release by itself. The production gate is whether the hosted pricing, sign-in, and Stripe checkout journey works end to end.
                        </p>
                    )}
                    <div className="flex gap-3">
                        <button
                            onClick={() => navigate('/pricing')}
                            className="flex-1 py-3 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700"
                        >
                            Back to Pricing
                        </button>
                        {isAuthMissing ? (
                            <button
                                onClick={() => navigate(`/signup?${new URLSearchParams({ next: nextPath, ...(requestedEmail ? { email: requestedEmail } : {}) }).toString()}`)}
                                className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg"
                            >
                                Sign In
                            </button>
                        ) : (
                            <button
                                onClick={() => window.location.reload()}
                                className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
                            >
                                Try Again
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

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
                    Validating your authenticated academic account and creating a secure Stripe session...
                </p>

                <div className="bg-slate-700/50 rounded-lg p-4 text-left">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-400">Plan</span>
                        <span className="text-white font-medium">{ACADEMIC_TIER.name}</span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-400">Account</span>
                        <span className="text-white font-medium truncate ml-4">{effectiveEmail || 'Checking...'}</span>
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
