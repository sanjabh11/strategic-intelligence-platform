// Main App Component - Strategy Console with React Router
// Aligned with Whop Monetization Strategy: /console, /insights, /labs, /system
import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import StrategyConsole from './components/StrategyConsole';
import StrategySimulator from './components/StrategySimulator';
import Labs from './components/Labs';
import SystemStatus from './components/SystemStatus';
import { GeopoliticalDashboard } from './components/GeopoliticalDashboard';
import GoldGameModule from './components/GoldGameModule';
import ScenarioTemplateLibrary from './components/ScenarioTemplateLibrary';
import ClassroomManager from './components/ClassroomManager';
import ForecastRegistry from './components/ForecastRegistry';
import PricingPage from './components/PricingPage';
import { Brain, BarChart3, Settings, Sparkles, Globe, Coins, BookOpen, GraduationCap, TrendingUp, CreditCard } from 'lucide-react';
import { LearningModeProvider, WelcomeMessage, LearningModeBadge, useLearningMode } from './components/explanations';
import { useSubscription } from './hooks/useSubscription';

// NavLink component for router-based navigation
const NavButton: React.FC<{ to: string; icon: React.ElementType; label: string }> = ({ to, icon: Icon, label }) => {
  return (
    <NavLink
      to={to}
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
  );
};

// Navigation component that uses learning mode context
const AppContent: React.FC = () => {
  const { isLearningMode, toggleLearningMode } = useLearningMode();
  const { currentTier } = useSubscription();
  const navigate = useNavigate();
  
  // Check if user is admin (enterprise tier)
  const isAdmin = currentTier === 'enterprise';

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Navigation */}
      <nav className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <NavLink to="/console" className="flex items-center">
                <Brain className="w-8 h-8 text-cyan-400 mr-3" />
                <span className="text-xl font-bold text-white">Strategy Console</span>
              </NavLink>
              <LearningModeBadge isActive={isLearningMode} onClick={toggleLearningMode} />
            </div>
            
            <div className="flex space-x-2 overflow-x-auto">
              <NavButton to="/console" icon={BarChart3} label="Console" />
              <NavButton to="/insights" icon={Globe} label="Insights" />
              <NavButton to="/labs" icon={Sparkles} label="Labs" />
              <NavButton to="/templates" icon={BookOpen} label="Templates" />
              <NavButton to="/forecasts" icon={TrendingUp} label="Forecasts" />
              <NavButton to="/pricing" icon={CreditCard} label="Pricing" />
              {isAdmin && (
                <NavButton to="/system" icon={Settings} label="System" />
              )}
            </div>
          </div>
        </div>
      </nav>
      
      {/* Main Content */}
      <main className="flex-1">
        <Routes>
          {/* Default redirect to /console */}
          <Route path="/" element={<Navigate to="/console" replace />} />
          
          {/* Core routes per Whop strategy */}
          <Route path="/console" element={<StrategyConsole />} />
          <Route path="/insights" element={<GeopoliticalDashboard />} />
          <Route path="/labs" element={<Labs />} />
          
          {/* Supporting routes */}
          <Route path="/templates" element={
            <div className="min-h-screen bg-slate-900 p-6">
              <div className="max-w-7xl mx-auto">
                <ScenarioTemplateLibrary 
                  onSelectTemplate={(template) => {
                    console.log('Selected template:', template.title);
                    navigate('/console');
                  }}
                />
              </div>
            </div>
          } />
          <Route path="/classrooms" element={
            <div className="min-h-screen bg-slate-900 p-6">
              <div className="max-w-7xl mx-auto">
                <ClassroomManager userId="demo-user-id" />
              </div>
            </div>
          } />
          <Route path="/forecasts" element={
            <div className="min-h-screen bg-slate-900 p-6">
              <div className="max-w-7xl mx-auto">
                <ForecastRegistry userId="demo-user-id" />
              </div>
            </div>
          } />
          <Route path="/gold" element={
            <div className="min-h-screen bg-slate-900 p-6">
              <div className="max-w-7xl mx-auto">
                <GoldGameModule isLearningMode={isLearningMode} />
              </div>
            </div>
          } />
          <Route path="/pricing" element={<PricingPage />} />
          
          {/* Admin-only system route */}
          <Route path="/system" element={
            isAdmin ? (
              <div className="min-h-screen bg-slate-900 p-6">
                <div className="max-w-4xl mx-auto">
                  <h1 className="text-3xl font-bold text-white mb-8">System Status</h1>
                  <SystemStatus />
                </div>
              </div>
            ) : (
              <Navigate to="/console" replace />
            )
          } />
          
          {/* Legacy analysis route redirect */}
          <Route path="/analysis" element={<Navigate to="/console" replace />} />
          
          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/console" replace />} />
        </Routes>
      </main>
      
      {/* Footer */}
      <footer className="bg-slate-800 border-t border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="text-center text-slate-400 text-sm">
            <p>Strategy Console - Evidence-Backed Strategic Analysis</p>
            <p className="mt-1">Real citations. Real simulations. Real clarity.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Main App component wrapped with providers
function App() {
  return (
    <BrowserRouter>
      <LearningModeProvider>
        <AppContent />
        <WelcomeMessage />
      </LearningModeProvider>
    </BrowserRouter>
  );
}

export default App;
