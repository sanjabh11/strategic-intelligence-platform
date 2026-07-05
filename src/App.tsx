// Main App Component - Strategy Console with React Router
// Aligned with Whop Monetization Strategy: /console, /insights, /labs, /system
import React, { Suspense } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import {
  BarChart3,
  BookOpen,
  Brain,
  CreditCard,
  Factory,
  Globe,
  GraduationCap,
  MessageSquare,
  Settings,
  Shield,
  Sparkles,
  TrendingUp,
  Users
} from 'lucide-react'
import LabAccessGate from './components/LabAccessGate'
import { LearningModeProvider, WelcomeMessage, LearningModeBadge, useLearningMode } from './components/explanations'
import { useSubscription } from './hooks/useSubscription'
import { useWhopAuth } from './hooks/useWhopAuth'
import { canAccessLabModule, getSurfacedLabModule } from './lib/labsCatalog'
import { isLabsAndGoldBypassEnabled } from './lib/accessOverrides'
import { isPublicAnalysisOnlyBeta, publicCommoditiesEnabled, publicInsightsEnabled } from './lib/publicBeta'

const StrategyConsole = React.lazy(() => import('./components/StrategyConsole'))
const Labs = React.lazy(() => import('./components/Labs'))
const SystemStatus = React.lazy(() => import('./components/SystemStatus'))
const GeopoliticalDashboard = React.lazy(() => import('./components/GeopoliticalDashboard').then((module) => ({ default: module.GeopoliticalDashboard })))
const GoldGameModule = React.lazy(() => import('./components/GoldGameModule'))
const ScenarioTemplateLibrary = React.lazy(() => import('./components/ScenarioTemplateLibrary'))
const ClassroomManager = React.lazy(() => import('./components/ClassroomManager'))
const ForecastRegistry = React.lazy(() => import('./components/ForecastRegistry'))
const HumanReview = React.lazy(() => import('./components/HumanReview'))
const WhopPricingPage = React.lazy(() => import('./components/WhopPricingPage'))
const NegotiationDojo = React.lazy(() => import('./components/NegotiationDojo'))
const GameTreeBuilder = React.lazy(() => import('./components/GameTreeBuilder'))
const CorporateWarRoom = React.lazy(() => import('./components/CorporateWarRoom'))
const StripeCheckoutPage = React.lazy(() => import('./pages/StripeCheckoutPage'))
const SignupPage = React.lazy(() => import('./pages/SignupPage'))
const TermsOfService = React.lazy(() => import('./pages/TermsOfService'))
const PrivacyPolicy = React.lazy(() => import('./pages/PrivacyPolicy'))
const DemoRequestPage = React.lazy(() => import('./pages/DemoRequest'))

const NavButton: React.FC<{ to: string; icon: React.ElementType; label: string }> = ({ to, icon: Icon, label }) => (
  <NavLink
    to={to}
    aria-label={label}
    className={({ isActive }) =>
      `flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
        isActive
          ? 'bg-cyan-600 text-white shadow-lg'
          : 'text-slate-400 hover:text-cyan-400 hover:bg-slate-700'
      }`
    }
  >
    <Icon className="w-4 h-4 mr-2" />
    {label}
  </NavLink>
)

const RouteFallback: React.FC<{ label?: string }> = ({ label = 'Loading workspace…' }) => (
  <div className="min-h-screen bg-slate-900 p-6">
    <div className="mx-auto max-w-6xl rounded-xl border border-slate-700 bg-slate-800 p-8">
      <div className="flex items-center justify-center py-16">
        <div className="mr-3 h-8 w-8 animate-spin rounded-full border-b-2 border-cyan-400"></div>
        <span className="text-slate-300">{label}</span>
      </div>
    </div>
  </div>
)

const AuthRequiredSurface: React.FC<{ title: string; detail: string; ctaLabel?: string; ctaTo?: string }> = ({
  title,
  detail,
  ctaLabel = 'Sign in to continue',
  ctaTo = '/signup'
}) => (
  <div className="min-h-screen bg-slate-900 p-6">
    <div className="mx-auto max-w-3xl rounded-xl border border-slate-700 bg-slate-800 p-8">
      <div className="flex items-start gap-3">
        <Shield className="mt-0.5 h-6 w-6 text-cyan-400" />
        <div>
          <h1 className="text-2xl font-semibold text-white">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">{detail}</p>
          <div className="mt-5">
            <NavLink to={ctaTo} className="inline-flex items-center rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-500">
              {ctaLabel}
            </NavLink>
          </div>
        </div>
      </div>
    </div>
  </div>
)

const ExternalBetaHoldSurface: React.FC<{ title: string; detail: string; ctaLabel?: string; ctaTo?: string }> = ({
  title,
  detail,
  ctaLabel = 'Return to Console',
  ctaTo = '/console'
}) => (
  <div className="min-h-screen bg-slate-900 p-6">
    <div className="mx-auto max-w-3xl rounded-xl border border-slate-700 bg-slate-800 p-8">
      <div className="flex items-start gap-3">
        <Shield className="mt-0.5 h-6 w-6 text-cyan-400" />
        <div>
          <h1 className="text-2xl font-semibold text-white">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">{detail}</p>
          <div className="mt-5">
            <NavLink to={ctaTo} className="inline-flex items-center rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-500">
              {ctaLabel}
            </NavLink>
          </div>
        </div>
      </div>
    </div>
  </div>
)

const AppContent: React.FC = () => {
  const { isLearningMode, toggleLearningMode } = useLearningMode()
  const { session, loading: authLoading } = useWhopAuth()
  const { currentTier, hasFeature } = useSubscription(session?.userId)
  const navigate = useNavigate()

  const hasAuthenticatedSession = Boolean(session?.userId)
  const publicAnalysisOnlyBeta = isPublicAnalysisOnlyBeta
  const isAdmin = currentTier === 'enterprise'
  const canAccessReviews = Boolean(session?.userId)
  const labsAndGoldBypassEnabled = isLabsAndGoldBypassEnabled
  const negotiationLab = getSurfacedLabModule('negotiation')
  const gameTreeLab = getSurfacedLabModule('game-tree')
  const negotiationLabAllowedByTier = canAccessLabModule(currentTier, negotiationLab)
  const gameTreeLabAllowedByTier = canAccessLabModule(currentTier, gameTreeLab)
  const canAccessNegotiationLab = negotiationLabAllowedByTier || labsAndGoldBypassEnabled
  const canAccessGameTreeLab = gameTreeLabAllowedByTier || labsAndGoldBypassEnabled
  const canAccessClassrooms = Boolean(session?.userId) && (currentTier === 'academic' || currentTier === 'enterprise' || hasFeature('canCreatePrivateRooms'))
  const canAccessWarRoom = Boolean(session?.userId) && (currentTier === 'enterprise' || hasFeature('canCollaborate'))
  const publicBetaAnonymous = publicAnalysisOnlyBeta && !hasAuthenticatedSession
  const showInsightsNav = publicInsightsEnabled || hasAuthenticatedSession
  const showCommoditiesNav = publicCommoditiesEnabled || hasAuthenticatedSession
  const showLabsNav = !publicAnalysisOnlyBeta || hasAuthenticatedSession
  const hideExternalCommercialRoutes = publicAnalysisOnlyBeta

  const renderExternalBetaHold = (title: string, detail: string, ctaLabel?: string, ctaTo?: string) => (
    <ExternalBetaHoldSurface title={title} detail={detail} ctaLabel={ctaLabel} ctaTo={ctaTo} />
  )

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:bg-cyan-600 focus:text-white focus:px-4 focus:py-2 focus:rounded">
        Skip to main content
      </a>
      <nav className="bg-slate-800 border-b border-slate-700 relative z-40" role="navigation" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 z-50">
              <NavLink to="/console" className="flex items-center">
                <Brain className="w-8 h-8 text-cyan-400 mr-3" />
                <span className="text-xl font-bold text-white">Strategy Console</span>
              </NavLink>
              <div className="relative z-50">
                <LearningModeBadge isActive={isLearningMode} onClick={toggleLearningMode} />
              </div>
            </div>

            <div className="flex space-x-2 overflow-x-auto">
              <NavButton to="/console" icon={BarChart3} label="Console" />
              {showInsightsNav && <NavButton to="/insights" icon={Globe} label="Insights" />}
              {showCommoditiesNav && <NavButton to="/commodities" icon={Factory} label="Commodities" />}
              {showLabsNav && <NavButton to="/labs" icon={Sparkles} label="Labs" />}
              <NavButton to="/templates" icon={BookOpen} label="Templates" />
              <NavButton to="/forecasts" icon={TrendingUp} label="Forecasts" />
              {canAccessClassrooms && <NavButton to="/classrooms" icon={GraduationCap} label="Classrooms" />}
              {canAccessWarRoom && <NavButton to="/war-room" icon={Users} label="War Room" />}
              {!hideExternalCommercialRoutes && <NavButton to="/pricing" icon={CreditCard} label="Pricing" />}
              {canAccessReviews && (
                <>
                  <NavButton to="/reviews" icon={MessageSquare} label="Reviews" />
                  {isAdmin && <NavButton to="/system" icon={Settings} label="System" />}
                </>
              )}
              {!canAccessReviews && isAdmin && <NavButton to="/system" icon={Settings} label="System" />}
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1" role="main" id="main-content">
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Navigate to="/console" replace />} />

            <Route path="/console" element={<ErrorBoundary><StrategyConsole /></ErrorBoundary>} />
            <Route path="/insights" element={
              publicBetaAnonymous && !publicInsightsEnabled
                ? renderExternalBetaHold(
                    'Insights are not in the external beta yet',
                    'This surface still depends on a live geopolitical feed that is being stabilized. The broad beta stays focused on evidence-backed console analysis until that feed passes repeated hosted checks.',
                    'Open the Strategy Console',
                    '/console'
                  )
                : <ErrorBoundary><GeopoliticalDashboard /></ErrorBoundary>
            } />
            <Route path="/labs" element={
              publicBetaAnonymous
                ? renderExternalBetaHold(
                    'Labs are private during this beta',
                    'Practice modules and specialist workspaces remain internal while the broad beta focuses on the core public analysis experience.',
                    'Browse Templates',
                    '/templates'
                  )
                : <ErrorBoundary><Labs userId={session?.userId} /></ErrorBoundary>
            } />
            <Route path="/labs/negotiation" element={
              publicBetaAnonymous
                ? renderExternalBetaHold(
                    'Labs are private during this beta',
                    'Negotiation training remains an internal-only workspace during the first public beta.',
                    'Open the Strategy Console',
                    '/console'
                  )
                : (
                  <LabAccessGate
                    allowed={canAccessNegotiationLab}
                    title={negotiationLab.name}
                    description={negotiationLab.description}
                    requiredTier={negotiationLab.minTier}
                    overrideActive={labsAndGoldBypassEnabled && !negotiationLabAllowedByTier}
                  >
                    <NegotiationDojo userId={session?.userId} />
                  </LabAccessGate>
                )
            } />
            <Route path="/labs/game-tree" element={
              publicBetaAnonymous
                ? renderExternalBetaHold(
                    'Labs are private during this beta',
                    'Advanced game-tree tooling remains internal while the public beta focuses on curated analysis and published forecasts.',
                    'Open Forecasts',
                    '/forecasts'
                  )
                : (
                  <LabAccessGate
                    allowed={canAccessGameTreeLab}
                    title={gameTreeLab.name}
                    description={gameTreeLab.description}
                    requiredTier={gameTreeLab.minTier}
                    overrideActive={labsAndGoldBypassEnabled && !gameTreeLabAllowedByTier}
                  >
                    <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                      <GameTreeBuilder userId={session?.userId} />
                    </div>
                  </LabAccessGate>
                )
            } />

            <Route path="/templates" element={
              <div className="min-h-screen bg-slate-900 p-6">
                <div className="max-w-7xl mx-auto">
                  <ScenarioTemplateLibrary
                    onSelectTemplate={(template) => {
                      navigate('/console', { state: { scenarioText: template.scenarioText } })
                    }}
                  />
                </div>
              </div>
            } />
            <Route path="/classrooms" element={
              publicBetaAnonymous ? (
                renderExternalBetaHold(
                  'Classrooms are private during this beta',
                  'Instructional delivery, course assignments, and grading workflows remain private while the external beta stays focused on public analysis and forecast consumption.',
                  'Open Forecasts',
                  '/forecasts'
                )
              ) : authLoading ? (
                <RouteFallback label="Loading classrooms…" />
              ) : !session?.userId ? (
                <AuthRequiredSurface
                  title="Classrooms require sign-in"
                  detail="Use classrooms for course assignments, private group work, and grading-aware scenario delivery. Sign in with an academic or eligible paid account to continue."
                />
              ) : !canAccessClassrooms ? (
                <AuthRequiredSurface
                  title="Classrooms require Academic or Enterprise access"
                  detail="This surface is reserved for instructional delivery, private rooms, and assignment management. Upgrade or use an academic account to unlock it."
                  ctaLabel="View pricing"
                  ctaTo="/pricing"
                />
              ) : (
                <div className="min-h-screen bg-slate-900 p-6">
                  <div className="max-w-7xl mx-auto">
                    <ClassroomManager userId={session.userId} />
                  </div>
                </div>
              )
            } />
            <Route path="/forecasts" element={
              <div className="min-h-screen bg-slate-900 p-6">
                <div className="max-w-7xl mx-auto">
                  <ErrorBoundary><ForecastRegistry userId={session?.userId} /></ErrorBoundary>
                </div>
              </div>
            } />
            <Route path="/forecasts/new" element={
              publicBetaAnonymous
                ? renderExternalBetaHold(
                    'Forecast authoring is private during this beta',
                    'The public registry is curated by internal analyst accounts during the first broad beta. Browse published forecasts or use the strategy console for anonymous evidence-backed analysis.',
                    'Browse forecasts',
                    '/forecasts'
                  )
                : (
                  <div className="min-h-screen bg-slate-900 p-6">
                    <div className="max-w-7xl mx-auto">
                      <ForecastRegistry userId={session?.userId} />
                    </div>
                  </div>
                )
            } />
            <Route path="/commodities" element={
              publicBetaAnonymous && !publicCommoditiesEnabled
                ? renderExternalBetaHold(
                    'Commodities are not in the external beta yet',
                    'The live market-feed and simulation path is still being hardened. The broad beta stays centered on evidence-backed strategic analysis until those checks pass repeatedly.',
                    'Open the Strategy Console',
                    '/console'
                  )
                : (
                  <div className="min-h-screen bg-slate-900 p-6">
                    <div className="max-w-7xl mx-auto">
                      <GoldGameModule userId={session?.userId} isLearningMode={isLearningMode} testingAccessOverride={labsAndGoldBypassEnabled} />
                    </div>
                  </div>
                )
            } />
            <Route path="/gold" element={
              publicBetaAnonymous && !publicCommoditiesEnabled
                ? renderExternalBetaHold(
                    'Commodities are not in the external beta yet',
                    'This live-market workspace remains private until feed freshness and simulation health are fully proven in production.',
                    'Open the Strategy Console',
                    '/console'
                  )
                : (
                  <div className="min-h-screen bg-slate-900 p-6">
                    <div className="max-w-7xl mx-auto">
                      <GoldGameModule userId={session?.userId} isLearningMode={isLearningMode} testingAccessOverride={labsAndGoldBypassEnabled} />
                    </div>
                  </div>
                )
            } />
            <Route path="/war-room" element={
              publicBetaAnonymous ? (
                renderExternalBetaHold(
                  'War Room is private during this beta',
                  'Shared scenario memory, strategist persistence, and team collaboration remain internal while the broad beta focuses on the public analysis surface.',
                  'Open the Strategy Console',
                  '/console'
                )
              ) : authLoading ? (
                <RouteFallback label="Loading war room…" />
              ) : !session?.userId ? (
                <AuthRequiredSurface
                  title="War Room requires sign-in"
                  detail="Use the war room to preserve strategist briefs, linked forecasts, assumptions, and scenario versions as shared team memory."
                />
              ) : !canAccessWarRoom ? (
                <AuthRequiredSurface
                  title="War Room requires collaboration access"
                  detail="This surface is intended for team-based strategic work. Use an Enterprise tier or a collaboration-enabled account to continue."
                  ctaLabel="View pricing"
                  ctaTo="/pricing"
                />
              ) : (
                <div className="min-h-screen bg-slate-900 p-6">
                  <div className="max-w-7xl mx-auto">
                    <CorporateWarRoom userId={session.userId} isEnterprise={currentTier === 'enterprise'} />
                  </div>
                </div>
              )
            } />
            <Route path="/pricing" element={
              hideExternalCommercialRoutes
                ? renderExternalBetaHold(
                    'Pricing is not part of the external beta',
                    'Commercial signup and checkout stay offline for this milestone while the public beta proves the evidence-backed analysis experience first.',
                    'Open the Strategy Console',
                    '/console'
                  )
                : <ErrorBoundary><WhopPricingPage /></ErrorBoundary>
            } />
            <Route path="/signup" element={
              hideExternalCommercialRoutes
                ? renderExternalBetaHold(
                    'Analyst access is private during this beta',
                    'Self-serve sign-in is disabled for the first broad beta. Internal analyst accounts are provisioned separately while the public launch stays focused on anonymous analysis and curated forecasts.',
                    'Open the Strategy Console',
                    '/console'
                  )
                : <SignupPage />
            } />
            <Route path="/checkout/stripe" element={
              hideExternalCommercialRoutes
                ? renderExternalBetaHold(
                    'Checkout is not in the external beta',
                    'Subscription and billing flows are intentionally disabled until the hosted commercial runtime is fully restored.',
                    'Open Forecasts',
                    '/forecasts'
                  )
                : <StripeCheckoutPage />
            } />
            <Route path="/reviews" element={
              publicBetaAnonymous ? (
                renderExternalBetaHold(
                  'Review operations are private during this beta',
                  'Human-review workflows remain internal while the public beta stays focused on anonymous analysis and curated forecast reading.',
                  'Open the Strategy Console',
                  '/console'
                )
              ) : authLoading ? (
                <RouteFallback label="Loading reviews…" />
              ) : (
                <div className="min-h-screen bg-slate-900 p-6">
                  <div className="max-w-6xl mx-auto">
                    <ErrorBoundary><HumanReview /></ErrorBoundary>
                  </div>
                </div>
              )
            } />

            <Route path="/academic-application" element={
              hideExternalCommercialRoutes
                ? renderExternalBetaHold(
                    'Academic access is not open during this beta',
                    'The broad external beta does not include self-serve academic onboarding. Academic and internal analyst accounts are being curated separately for now.',
                    'Open Templates',
                    '/templates'
                  )
                : (
                  <div className="min-h-screen bg-slate-900 p-6">
                    <div className="max-w-2xl mx-auto">
                      <h1 className="text-3xl font-bold text-white mb-6">Academic Application</h1>
                      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                        <p className="text-slate-300 mb-4">
                          Apply for free academic access to the Strategy Console for research and educational purposes.
                        </p>
                        <a
                          href="mailto:academic@strategicintelligence.com?subject=Academic Access Application"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-400 text-white rounded-lg font-medium transition-colors"
                        >
                          <GraduationCap className="w-5 h-5" />
                          Apply via Email
                        </a>
                      </div>
                    </div>
                  </div>
                )
            } />

            <Route path="/system" element={
              isAdmin ? (
                <div className="min-h-screen bg-slate-900 p-6">
                  <div className="max-w-4xl mx-auto">
                    <h1 className="text-3xl font-bold text-white mb-8">System Status</h1>
                    <ErrorBoundary><SystemStatus /></ErrorBoundary>
                  </div>
                </div>
              ) : (
                <Navigate to="/console" replace />
              )
            } />

            <Route path="/analysis" element={<Navigate to="/console" replace />} />
            <Route path="/demo" element={<DemoRequestPage />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="*" element={<Navigate to="/console" replace />} />
          </Routes>
        </Suspense>
      </main>

      <footer className="bg-slate-800 border-t border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="text-center text-slate-400 text-sm">
            <p>Strategic Intelligence Platform — Evidence-Backed Strategic Analysis</p>
            <p className="mt-1">Real citations. Real simulations. Real clarity.</p>
            <p className="mt-2 text-xs text-slate-500">
              AI-generated analysis for research and educational purposes. Verify all outputs before making decisions.
            </p>
            <div className="mt-2 flex items-center justify-center gap-4 text-xs text-slate-500">
              <a href="/demo" className="hover:text-slate-300 transition-colors">Request Demo</a>
              <span>·</span>
              <a href="/terms" className="hover:text-slate-300 transition-colors">Terms of Service</a>
              <span>·</span>
              <a href="/privacy" className="hover:text-slate-300 transition-colors">Privacy Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <LearningModeProvider>
        <AppContent />
        <WelcomeMessage />
      </LearningModeProvider>
    </BrowserRouter>
  )
}

export default App
