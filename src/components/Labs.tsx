import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Crown, Factory, GraduationCap, Lock, Sparkles } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import { canAccessLabModule, mapSubscriptionToLabTier, SURFACED_LAB_MODULES } from '../lib/labsCatalog';
import { isLabsAndGoldBypassEnabled } from '../lib/accessOverrides';

interface LabsProps {
  userId?: string;
}

const Labs: React.FC<LabsProps> = ({ userId }) => {
  const navigate = useNavigate();
  const { currentTier } = useSubscription(userId);
  const labTier = mapSubscriptionToLabTier(currentTier);
  const bypassEnabled = isLabsAndGoldBypassEnabled;

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-10 rounded-2xl border border-slate-700 bg-slate-800/80 p-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-purple-500/15 px-4 py-2 text-sm font-medium text-purple-300">
            <Sparkles className="h-4 w-4" />
            Guided Practice Surface
          </div>
          <h1 className="mt-4 text-4xl font-bold text-white">Strategy Labs</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            The console remains the main strategist surface. Labs now exposes the first two premium practice modules
            that are already credible in the current codebase: guided negotiation and sequential-game modeling.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
            <div className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 ${
              labTier === 'elite'
                ? 'bg-amber-500/15 text-amber-300'
                : labTier === 'pro'
                  ? 'bg-purple-500/15 text-purple-300'
                  : 'bg-slate-700 text-slate-300'
            }`}>
              {labTier === 'elite' ? <Crown className="h-4 w-4" /> : labTier === 'pro' ? <Sparkles className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              {labTier.toUpperCase()} access
            </div>
            <Link to="/console" className="text-cyan-400 transition-colors hover:text-cyan-300">
              Return to Strategy Console
            </Link>
            {bypassEnabled && (
              <div className="inline-flex items-center gap-2 rounded-lg bg-amber-500/10 px-4 py-2 text-amber-200">
                <Sparkles className="h-4 w-4" />
                Testing override active
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-6 md:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Connected Product Surfaces</div>
                <h2 className="mt-2 text-2xl font-semibold text-white">Move from guided practice into live workflows</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                  Labs is now part of a broader product path. Jump into the live commodity workspace or instructional delivery surfaces without losing the current strategist context.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => navigate('/commodities')}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100 transition-colors hover:bg-slate-950"
                >
                  <Factory className="h-4 w-4" />
                  Open commodities
                </button>
                <button
                  onClick={() => navigate('/classrooms')}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-slate-500 hover:text-white"
                >
                  <GraduationCap className="h-4 w-4" />
                  Open classrooms
                </button>
              </div>
            </div>
          </div>
          {SURFACED_LAB_MODULES.map((module) => {
            const Icon = module.icon;
            const tierAllowed = canAccessLabModule(currentTier, module);
            const usingOverride = bypassEnabled && !tierAllowed;
            const allowed = tierAllowed || usingOverride;

            return (
              <div
                key={module.id}
                className={`rounded-xl border p-6 transition-colors ${
                  allowed
                    ? 'border-slate-700 bg-slate-800 hover:border-cyan-500'
                    : 'border-slate-700/70 bg-slate-800/70'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="inline-flex rounded-xl bg-cyan-500/10 p-3 text-cyan-300">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className={`rounded-md px-2 py-1 text-xs font-semibold ${
                    module.minTier === 'elite'
                      ? 'bg-amber-500/15 text-amber-300'
                      : 'bg-purple-500/15 text-purple-300'
                  }`}>
                    {module.minTier.toUpperCase()}
                  </div>
                </div>

                <div className="mt-5">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{module.focus}</div>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{module.name}</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{module.description}</p>
                  <p className="mt-4 rounded-lg border border-slate-700 bg-slate-900/70 p-3 text-xs leading-5 text-slate-400">
                    {module.statusNote}
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    {usingOverride
                      ? 'Testing override active for this module'
                      : allowed
                        ? 'Available on your current tier'
                        : `Upgrade to ${module.minTier} to unlock`}
                  </div>
                  <button
                    onClick={() => navigate(allowed ? module.href : '/pricing')}
                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      allowed
                        ? 'bg-cyan-600 text-white hover:bg-cyan-500'
                        : 'border border-slate-600 text-slate-200 hover:border-slate-500 hover:text-white'
                    }`}
                  >
                    {allowed ? 'Open module' : 'View pricing'}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Labs;
