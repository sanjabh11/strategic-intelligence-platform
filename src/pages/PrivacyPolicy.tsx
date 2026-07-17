import React from 'react'

const PrivacyPolicy: React.FC = () => (
  <div className="min-h-screen bg-slate-900 p-6">
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-6">Privacy Policy</h1>
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 space-y-4 text-slate-300">
        <p className="text-sm text-slate-400">Last updated: July 5, 2026</p>

        <section>
          <h2 className="text-xl font-semibold text-white mb-2">1. Information We Collect</h2>
          <p>We collect: (a) account information (email, user ID) when you sign up; (b) analysis inputs you submit (scenario text, evidence context); (c) usage data (API calls, timestamps, feature usage); (d) authentication tokens for Supabase session management.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-2">2. How We Use Your Information</h2>
          <p>We use your information to: (a) provide and improve the Service; (b) enforce rate limits and tier-based access; (c) persist your analysis history and forecasts; (d) monitor for abuse and security threats; (e) aggregate anonymized usage metrics for product improvement.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-2">3. Data Storage</h2>
          <p>Your data is stored in Supabase (PostgreSQL) with Row-Level Security policies that restrict access to your own records. Authentication is handled via Supabase Auth. All data is stored in compliance with applicable data protection regulations.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-2">4. AI Processing</h2>
          <p>Your analysis inputs are processed by third-party LLM providers (Google Gemini, OpenAI) to generate strategic analysis. These providers may temporarily process your inputs according to their own privacy policies. We do not sell or share your data with third parties beyond what is necessary to provide the Service.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-2">5. Cookies and Authentication</h2>
          <p>We use authentication tokens (JWT) stored in browser local storage to maintain your session. We do not use third-party tracking cookies or advertising cookies.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-2">6. Your Rights</h2>
          <p>You have the right to: (a) access your personal data; (b) request deletion of your account and associated data; (c) request export of your analysis history; (d) opt out of anonymized usage aggregation. Contact us to exercise these rights.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-2">7. Data Retention</h2>
          <p>Analysis runs and forecast data are retained for the lifetime of your account. API usage logs are retained for 90 days for rate limiting and abuse prevention. You may request earlier deletion at any time.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-2">8. Children's Privacy</h2>
          <p>The Service is not directed to children under 13. We do not knowingly collect personal information from children under 13. If you believe we have collected such information, please contact us for deletion.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-2">9. Changes to This Policy</h2>
          <p>We may update this Privacy Policy at any time. Continued use of the Service after changes constitutes acceptance of the updated policy.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-2">10. Contact</h2>
          <p>For privacy questions or data requests, contact <a href="mailto:privacy@strategicintelligence.com" className="text-purple-400 hover:text-purple-300">privacy@strategicintelligence.com</a>.</p>
        </section>
      </div>
    </div>
  </div>
)

export default PrivacyPolicy
