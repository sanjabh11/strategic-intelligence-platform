import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2, Mail, Briefcase, Target } from 'lucide-react';
import { track, AnalyticsEvents } from '../lib/analytics';

const DemoRequestPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('');
  const [useCase, setUseCase] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    track(AnalyticsEvents.DEMO_REQUEST, {
      has_name: !!name,
      organization,
      use_case: useCase,
    });

    const mailtoSubject = encodeURIComponent('Demo Request — Strategic Intelligence Platform');
    const mailtoBody = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\nOrganization: ${organization}\nUse Case: ${useCase}\n\nPlease schedule a 15-minute demo at your convenience.`
    );
    window.location.href = `mailto:contact@igniteitserve.com?subject=${mailtoSubject}&body=${mailtoBody}`;

    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1000);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-slate-800 rounded-2xl border border-slate-700 p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Request Received</h1>
          <p className="text-slate-400 mb-6">
            Your email client should have opened with a pre-filled message. If not, please email us directly at{' '}
            <a href="mailto:contact@igniteitserve.com" className="text-blue-400 underline">contact@igniteitserve.com</a>.
          </p>
          <p className="text-slate-500 text-sm mb-6">
            We'll respond within 1 business day to schedule your 15-minute demo.
          </p>
          <a href="/pricing" className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-semibold transition-colors">
            Back to Pricing
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-3">Request a Demo</h1>
          <p className="text-slate-400">
            See the Strategic Intelligence Platform in action. We'll schedule a 15-minute walkthrough tailored to your use case.
          </p>
        </div>

        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="text-center">
              <div className="p-3 bg-cyan-500/10 rounded-lg w-fit mx-auto mb-2">
                <Target className="w-6 h-6 text-cyan-400" />
              </div>
              <p className="text-slate-300 text-sm font-medium">Tailored to your use case</p>
            </div>
            <div className="text-center">
              <div className="p-3 bg-cyan-500/10 rounded-lg w-fit mx-auto mb-2">
                <Briefcase className="w-6 h-6 text-cyan-400" />
              </div>
              <p className="text-slate-300 text-sm font-medium">15-minute guided walkthrough</p>
            </div>
            <div className="text-center">
              <div className="p-3 bg-cyan-500/10 rounded-lg w-fit mx-auto mb-2">
                <Mail className="w-6 h-6 text-cyan-400" />
              </div>
              <p className="text-slate-300 text-sm font-medium">No payment required</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5" htmlFor="name">Name</label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5" htmlFor="email">Work Email</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5" htmlFor="org">Organization</label>
              <input
                id="org"
                type="text"
                required
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                placeholder="Your organization"
              />
            </div>
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5" htmlFor="usecase">What strategic question are you exploring?</label>
              <textarea
                id="usecase"
                required
                value={useCase}
                onChange={(e) => setUseCase(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
                placeholder="e.g., We need to assess geopolitical risk scenarios for our treasury team..."
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Preparing your request...
                </>
              ) : (
                <>
                  Request Demo
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-slate-500 text-xs mt-4 text-center">
            By submitting, you agree to be contacted by Ignite IT Serve about the Strategic Intelligence Platform pilot program.
            You can opt out at any time by emailing contact@igniteitserve.com.
          </p>
        </div>

        <div className="mt-8 text-center">
          <p className="text-slate-400 text-sm">
            Prefer to explore on your own?{' '}
            <a href="/signup" className="text-cyan-400 underline">Sign up for the free tier →</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default DemoRequestPage;
