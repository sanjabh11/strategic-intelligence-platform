// Lab Access Gate
// Gates access to lab modules based on tier or bypass override

import React from 'react';
import { Lock, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

interface LabAccessGateProps {
  allowed: boolean;
  title: string;
  description: string;
  children: React.ReactNode;
  overrideActive?: boolean;
  requiredTier?: 'free' | 'pro' | 'elite' | 'enterprise';
}

const LabAccessGate: React.FC<LabAccessGateProps> = ({
  allowed,
  title,
  description,
  children,
  overrideActive = false,
}) => {
  if (allowed || overrideActive) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="mx-auto max-w-3xl rounded-xl border border-slate-700 bg-slate-800 p-8">
        <div className="flex items-start gap-3">
          <Lock className="mt-0.5 h-6 w-6 text-amber-400" />
          <div>
            <h1 className="text-2xl font-semibold text-white">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
            <p className="mt-3 text-xs text-slate-500">
              This lab requires a Pro or higher subscription.
            </p>
            <div className="mt-5">
              <Link
                to="/pricing"
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-500"
              >
                <Sparkles className="h-4 w-4" />
                Upgrade to access
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabAccessGate;
