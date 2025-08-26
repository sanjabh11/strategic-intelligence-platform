// Main App Component
import React, { useState } from 'react';
import StrategySimulator from './components/StrategySimulator';
import SystemStatus from './components/SystemStatus';
import { Brain, BarChart3, Settings, Info } from 'lucide-react';
import { LearningModeProvider, WelcomeMessage, LearningModeBadge, useLearningMode } from './components/explanations';

type TabType = 'simulator' | 'status' | 'about';

// Navigation component that uses learning mode context
const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('simulator');
  const { isLearningMode, toggleLearningMode } = useLearningMode();
  
  const TabButton: React.FC<{ tab: TabType; icon: React.ComponentType<any>; label: string }> = ({ tab, icon: Icon, label }) => {
    const handleClick = () => {
      setActiveTab(tab);
    };
    
    return (
      <button
        onClick={handleClick}
        className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
          activeTab === tab
            ? 'bg-cyan-600 text-white shadow-lg'
            : 'text-slate-400 hover:text-cyan-400 hover:bg-slate-700'
        }`}
      >
        <Icon className="w-4 h-4 mr-2" />
        {label}
      </button>
    );
  };
  
  const AboutSection = () => (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-slate-800 rounded-xl p-8 border border-slate-700">
          <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            Strategic Intelligence Platform
          </h2>
          
          <div className="space-y-6 text-slate-300">
            <section>
              <h3 className="text-xl font-semibold text-white mb-3">Overview</h3>
              <p className="leading-relaxed">
                This platform provides advanced strategic analysis using quantum-inspired game theory algorithms. 
                It combines recursive Nash equilibrium computation, quantum strategy state modeling, and pattern 
                mining to provide deep insights into complex strategic scenarios.
              </p>
            </section>
            
            <section>
              <h3 className="text-xl font-semibold text-white mb-3">Core Capabilities</h3>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span><strong className="text-cyan-400">Quantum Strategy Analysis:</strong> Models strategic choices as quantum superpositions with coherence and decoherence effects</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span><strong className="text-emerald-400">Recursive Nash Equilibria:</strong> Computes equilibria with belief depth modeling ("I think you think...")</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span><strong className="text-blue-400">Strategic Pattern Mining:</strong> Identifies similar scenarios from historical strategic patterns</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span><strong className="text-yellow-400">Evidence-Backed Analysis:</strong> Integrates real-world data and research for grounded insights</span>
                </li>
              </ul>
            </section>
            
            <section>
              <h3 className="text-xl font-semibold text-white mb-3">Analysis Modes</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
                  <h4 className="font-semibold text-cyan-400 mb-2">Standard Mode</h4>
                  <p className="text-sm">Full computational analysis with quantum entanglement, recursive belief modeling, and comprehensive pattern matching. Processing time: 10-60 seconds.</p>
                </div>
                <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
                  <h4 className="font-semibold text-emerald-400 mb-2">Education Quick</h4>
                  <p className="text-sm">Simplified analysis optimized for learning and rapid insights. Immediate results with core equilibrium computation.</p>
                </div>
              </div>
            </section>
            
            <section>
              <h3 className="text-xl font-semibold text-white mb-3">Use Cases</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-slate-200 mb-2">Business Strategy</h4>
                  <ul className="text-sm space-y-1 text-slate-400">
                    <li>• Market entry decisions</li>
                    <li>• Competitive response analysis</li>
                    <li>• Partnership negotiations</li>
                    <li>• Industry consolidation scenarios</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-slate-200 mb-2">Policy Analysis</h4>
                  <ul className="text-sm space-y-1 text-slate-400">
                    <li>• International cooperation</li>
                    <li>• Regulatory coordination</li>
                    <li>• Trade negotiations</li>
                    <li>• Climate policy alignment</li>
                  </ul>
                </div>
              </div>
            </section>
            
            <section>
              <h3 className="text-xl font-semibold text-white mb-3">Technical Architecture</h3>
              <p className="leading-relaxed mb-4">
                Built on modern cloud infrastructure with Supabase backend, PostgreSQL with pgvector for pattern storage, 
                and edge functions for scalable computation. The frontend uses React with TypeScript and Tailwind CSS 
                for a responsive, professional interface.
              </p>
              <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
                <h4 className="font-medium text-slate-200 mb-2">Key Technologies</h4>
                <div className="flex flex-wrap gap-2">
                  {['React', 'TypeScript', 'Supabase', 'PostgreSQL', 'pgvector', 'Tailwind CSS', 'Recharts'].map(tech => (
                    <span key={tech} className="bg-slate-600 px-2 py-1 rounded text-xs text-slate-300">{tech}</span>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
  
  return (
    <div className="min-h-screen bg-slate-900">
      {/* Navigation */}
      <nav className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <Brain className="w-8 h-8 text-cyan-400 mr-3" />
                <span className="text-xl font-bold text-white">Strategic Intelligence</span>
              </div>
              <LearningModeBadge isActive={isLearningMode} onClick={toggleLearningMode} />
            </div>
            
            <div className="flex space-x-2">
              <TabButton tab="simulator" icon={BarChart3} label="Analysis" />
              <TabButton tab="status" icon={Settings} label="System" />
              <TabButton tab="about" icon={Info} label="About" />
            </div>
          </div>
        </div>
      </nav>
      
      {/* Main Content */}
      <main>
        {activeTab === 'simulator' && <StrategySimulator />}
        {activeTab === 'status' && (
          <div className="min-h-screen bg-slate-900 p-6">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-3xl font-bold text-white mb-8">System Status</h1>
              <SystemStatus />
            </div>
          </div>
        )}
        {activeTab === 'about' && <AboutSection />}
      </main>
      
      {/* Footer */}
      <footer className="bg-slate-800 border-t border-slate-700 mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="text-center text-slate-400 text-sm">
            <p>Strategic Intelligence Platform - Advanced Game-Theoretic Analysis</p>
            <p className="mt-1">Powered by quantum-inspired algorithms and evidence-backed research</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Main App component wrapped with learning mode provider
function App() {
  return (
    <LearningModeProvider>
      <AppContent />
      <WelcomeMessage />
    </LearningModeProvider>
  );
}

export default App;
