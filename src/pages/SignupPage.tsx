import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowRight, CheckCircle2, Loader2, Mail } from 'lucide-react';
import { isLocalMode, supabase } from '../lib/supabase';
import { track, AnalyticsEvents } from '../lib/analytics';

function sanitizeNextPath(input: string | null): string {
  if (!input) return '/console';
  if (!input.startsWith('/')) return '/console';
  if (input.startsWith('//')) return '/console';
  return input;
}

const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const nextPath = useMemo(() => sanitizeNextPath(searchParams.get('next')), [searchParams]);
  const authUnavailable = !supabase || isLocalMode;

  useEffect(() => {
    if (authUnavailable) {
      setCheckingSession(false);
      setError('Supabase auth is not configured in this environment. Configure auth before sending users to sign up.');
      return;
    }

    let active = true;

    const loadSession = async () => {
      const { data, error: userError } = await supabase.auth.getUser();
      if (!active) return;

      if (userError) {
        setError(userError.message);
      } else if (data.user) {
        navigate(nextPath, { replace: true });
        return;
      }

      setCheckingSession(false);
    };

    void loadSession();

    return () => {
      active = false;
    };
  }, [authUnavailable, navigate, nextPath]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (authUnavailable) {
      setError('Supabase auth is not configured in this environment.');
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('Email is required.');
      return;
    }

    setLoading(true);
    setError(null);

    track(AnalyticsEvents.SIGNUP_START, { next_path: nextPath });

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}${nextPath}`,
      },
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    track(AnalyticsEvents.SIGNUP_COMPLETE, { next_path: nextPath });
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 w-full max-w-md text-center">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-300">Checking your account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-800 p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/15">
            <Mail className="h-7 w-7 text-cyan-400" />
          </div>
          <h1 className="text-2xl font-semibold text-white">Sign in to continue</h1>
          <p className="mt-2 text-sm text-slate-400">
            We send a magic link to your email and return you to the flow you started.
          </p>
        </div>

        {success ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-400" />
              <div>
                <div className="font-medium text-emerald-300">Check your email</div>
                <p className="mt-1 text-sm text-slate-300">
                  We sent a sign-in link to <span className="font-medium text-white">{email}</span>.
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  After you open it, you will land on <span className="text-slate-200">{nextPath}</span>.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="signup-email" className="mb-2 block text-sm font-medium text-slate-300">
                Email
              </label>
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                className="w-full rounded-xl border border-slate-600 bg-slate-900 px-4 py-3 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || authUnavailable}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 font-medium text-white transition-colors hover:bg-cyan-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending link...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-6 text-xs text-slate-500">
          Redirect target: <span className="text-slate-300">{nextPath}</span>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
