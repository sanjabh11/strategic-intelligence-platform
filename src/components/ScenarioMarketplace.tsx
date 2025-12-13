// Scenario Marketplace Component
// Monetization Feature F8: Creator economy for simulation scenarios
// Platform for buying/selling game theory scenarios with revenue share

import React, { useState, useCallback, useEffect } from 'react';
import {
    Store, Upload, Search, Star, Download, DollarSign,
    Filter, TrendingUp, Eye, User, Tag, Plus, Check, X
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface MarketplaceScenario {
    id: string;
    title: string;
    description: string;
    category: string;
    price: number;
    previewImage?: string;
    creatorId: string;
    creatorName: string;
    rating: number;
    ratingCount: number;
    downloadCount: number;
    tags: string[];
    createdAt: string;
    isPurchased?: boolean;
    players: number;
    complexity: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

interface CreatorStats {
    totalEarnings: number;
    totalDownloads: number;
    averageRating: number;
    scenarioCount: number;
}

const CATEGORIES = [
    'All', 'Business Strategy', 'Negotiations', 'Geopolitics',
    'Personal Finance', 'Game Theory', 'Economics', 'Education'
];

const COMPLEXITY_COLORS = {
    beginner: 'bg-green-900/50 text-green-400',
    intermediate: 'bg-blue-900/50 text-blue-400',
    advanced: 'bg-purple-900/50 text-purple-400',
    expert: 'bg-red-900/50 text-red-400'
};

interface ScenarioMarketplaceProps {
    userId?: string;
}

const ScenarioMarketplace: React.FC<ScenarioMarketplaceProps> = ({ userId }) => {
    const [scenarios, setScenarios] = useState<MarketplaceScenario[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'browse' | 'create' | 'my-scenarios'>('browse');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'popular' | 'newest' | 'rating' | 'price'>('popular');
    const [creatorStats, setCreatorStats] = useState<CreatorStats | null>(null);

    // New scenario form
    const [newScenario, setNewScenario] = useState({
        title: '',
        description: '',
        category: 'Business Strategy',
        price: 4.99,
        players: 2,
        complexity: 'intermediate' as const,
        tags: '',
        scenarioData: ''
    });

    // Fetch marketplace scenarios
    const fetchScenarios = useCallback(async () => {
        setLoading(true);
        try {
            // Mock data for now - would fetch from Supabase
            const mockScenarios: MarketplaceScenario[] = [
                {
                    id: '1',
                    title: 'Silicon Valley Startup Pitch',
                    description: 'Navigate the high-stakes world of VC funding. Pitch your startup to investors while competitors vie for the same capital.',
                    category: 'Business Strategy',
                    price: 9.99,
                    creatorId: 'creator1',
                    creatorName: 'StrategyMaster',
                    rating: 4.8,
                    ratingCount: 124,
                    downloadCount: 892,
                    tags: ['startups', 'funding', 'competition'],
                    createdAt: new Date().toISOString(),
                    players: 4,
                    complexity: 'advanced'
                },
                {
                    id: '2',
                    title: 'Trade War Simulation',
                    description: 'Model tariff negotiations between major economies. Explore the prisoner\'s dilemma of international trade.',
                    category: 'Geopolitics',
                    price: 14.99,
                    creatorId: 'creator2',
                    creatorName: 'GlobalStrategist',
                    rating: 4.9,
                    ratingCount: 89,
                    downloadCount: 567,
                    tags: ['trade', 'international', 'tariffs'],
                    createdAt: new Date().toISOString(),
                    players: 3,
                    complexity: 'expert'
                },
                {
                    id: '3',
                    title: 'Salary Negotiation Training',
                    description: 'Practice job offer negotiations with realistic AI opponents. Perfect for interview prep.',
                    category: 'Negotiations',
                    price: 4.99,
                    creatorId: 'creator3',
                    creatorName: 'CareerCoach',
                    rating: 4.6,
                    ratingCount: 256,
                    downloadCount: 2340,
                    tags: ['career', 'salary', 'interviews'],
                    createdAt: new Date().toISOString(),
                    players: 2,
                    complexity: 'beginner'
                },
                {
                    id: '4',
                    title: 'Real Estate Auction',
                    description: 'Competitive bidding simulation for property acquisition. Learn optimal auction strategies.',
                    category: 'Personal Finance',
                    price: 7.99,
                    creatorId: 'creator4',
                    creatorName: 'RealEstateGuru',
                    rating: 4.5,
                    ratingCount: 78,
                    downloadCount: 445,
                    tags: ['real estate', 'auctions', 'bidding'],
                    createdAt: new Date().toISOString(),
                    players: 5,
                    complexity: 'intermediate'
                },
                {
                    id: '5',
                    title: 'Classic Prisoner\'s Dilemma',
                    description: 'The foundational game theory scenario. Perfect for learning Nash Equilibrium concepts.',
                    category: 'Game Theory',
                    price: 0,
                    creatorId: 'creator5',
                    creatorName: 'ProfGameTheory',
                    rating: 4.7,
                    ratingCount: 512,
                    downloadCount: 8901,
                    tags: ['classic', 'free', 'educational'],
                    createdAt: new Date().toISOString(),
                    players: 2,
                    complexity: 'beginner'
                }
            ];

            setScenarios(mockScenarios);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchScenarios();
    }, [fetchScenarios]);

    // Filter and sort scenarios
    const filteredScenarios = scenarios
        .filter(s => selectedCategory === 'All' || s.category === selectedCategory)
        .filter(s => !searchQuery ||
            s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        .sort((a, b) => {
            switch (sortBy) {
                case 'popular': return b.downloadCount - a.downloadCount;
                case 'newest': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                case 'rating': return b.rating - a.rating;
                case 'price': return a.price - b.price;
                default: return 0;
            }
        });

    // Handle scenario purchase
    const handlePurchase = useCallback(async (scenarioId: string) => {
        // Would integrate with Stripe
        console.log('Purchasing scenario:', scenarioId);
    }, []);

    // Handle scenario creation
    const handleCreateScenario = useCallback(async () => {
        if (!newScenario.title || !newScenario.description) return;

        // Would upload to Supabase
        console.log('Creating scenario:', newScenario);
        setView('browse');
        setNewScenario({
            title: '',
            description: '',
            category: 'Business Strategy',
            price: 4.99,
            players: 2,
            complexity: 'intermediate',
            tags: '',
            scenarioData: ''
        });
    }, [newScenario]);

    // Render scenario card
    const renderScenarioCard = (scenario: MarketplaceScenario) => (
        <div
            key={scenario.id}
            className="bg-slate-800 rounded-xl border border-slate-700 hover:border-teal-500 transition-all overflow-hidden"
        >
            <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                    <span className={`px-2 py-1 rounded text-xs ${COMPLEXITY_COLORS[scenario.complexity]}`}>
                        {scenario.complexity}
                    </span>
                    {scenario.price === 0 ? (
                        <span className="px-2 py-1 bg-green-900/50 text-green-400 rounded text-xs">FREE</span>
                    ) : (
                        <span className="text-teal-400 font-bold">${scenario.price.toFixed(2)}</span>
                    )}
                </div>

                <h3 className="font-semibold text-white mb-2">{scenario.title}</h3>
                <p className="text-sm text-slate-400 mb-3 line-clamp-2">{scenario.description}</p>

                <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                    <span className="flex items-center gap-1">
                        <User className="w-3 h-3" /> {scenario.players} players
                    </span>
                    <span className="flex items-center gap-1">
                        <Download className="w-3 h-3" /> {scenario.downloadCount}
                    </span>
                    <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-400" /> {scenario.rating}
                    </span>
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                    {scenario.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-400">
                            {tag}
                        </span>
                    ))}
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">by {scenario.creatorName}</span>
                    <button
                        onClick={() => handlePurchase(scenario.id)}
                        className={`px-3 py-1 rounded text-sm font-medium ${scenario.price === 0
                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                : 'bg-teal-500 hover:bg-teal-600 text-white'
                            }`}
                    >
                        {scenario.price === 0 ? 'Download' : 'Purchase'}
                    </button>
                </div>
            </div>
        </div>
    );

    // Render create form
    const renderCreateForm = () => (
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 max-w-2xl mx-auto">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Upload className="w-5 h-5 text-teal-400" />
                Create New Scenario
            </h3>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm text-slate-400 mb-1">Title *</label>
                    <input
                        type="text"
                        value={newScenario.title}
                        onChange={(e) => setNewScenario(p => ({ ...p, title: e.target.value }))}
                        placeholder="Compelling scenario title"
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    />
                </div>

                <div>
                    <label className="block text-sm text-slate-400 mb-1">Description *</label>
                    <textarea
                        value={newScenario.description}
                        onChange={(e) => setNewScenario(p => ({ ...p, description: e.target.value }))}
                        placeholder="Describe what users will learn and experience..."
                        rows={4}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Category</label>
                        <select
                            value={newScenario.category}
                            onChange={(e) => setNewScenario(p => ({ ...p, category: e.target.value }))}
                            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                        >
                            {CATEGORIES.filter(c => c !== 'All').map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Price ($)</label>
                        <input
                            type="number"
                            min="0"
                            step="0.99"
                            value={newScenario.price}
                            onChange={(e) => setNewScenario(p => ({ ...p, price: parseFloat(e.target.value) }))}
                            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Number of Players</label>
                        <input
                            type="number"
                            min="2"
                            max="10"
                            value={newScenario.players}
                            onChange={(e) => setNewScenario(p => ({ ...p, players: parseInt(e.target.value) }))}
                            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Complexity</label>
                        <select
                            value={newScenario.complexity}
                            onChange={(e) => setNewScenario(p => ({ ...p, complexity: e.target.value as any }))}
                            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                        >
                            <option value="beginner">Beginner</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="advanced">Advanced</option>
                            <option value="expert">Expert</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm text-slate-400 mb-1">Tags (comma-separated)</label>
                    <input
                        type="text"
                        value={newScenario.tags}
                        onChange={(e) => setNewScenario(p => ({ ...p, tags: e.target.value }))}
                        placeholder="negotiation, business, advanced"
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    />
                </div>

                <div className="bg-teal-900/30 border border-teal-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-teal-300 mb-2">
                        <DollarSign className="w-5 h-5" />
                        <span className="font-medium">Revenue Share</span>
                    </div>
                    <p className="text-sm text-slate-300">
                        You earn <strong className="text-teal-400">70%</strong> of each sale.
                        Platform retains 30% for hosting, payment processing, and marketing.
                    </p>
                </div>

                <div className="flex gap-3 pt-4">
                    <button
                        onClick={handleCreateScenario}
                        disabled={!newScenario.title || !newScenario.description}
                        className="px-6 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium"
                    >
                        Publish Scenario
                    </button>
                    <button
                        onClick={() => setView('browse')}
                        className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-6 rounded-xl text-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-lg">
                            <Store className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">Scenario Marketplace</h2>
                            <p className="text-teal-200">Buy, sell, and share game theory scenarios</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setView('browse')}
                            className={`px-4 py-2 rounded-lg ${view === 'browse' ? 'bg-white/20' : 'bg-white/10 hover:bg-white/15'}`}
                        >
                            Browse
                        </button>
                        {userId && (
                            <>
                                <button
                                    onClick={() => setView('my-scenarios')}
                                    className={`px-4 py-2 rounded-lg ${view === 'my-scenarios' ? 'bg-white/20' : 'bg-white/10 hover:bg-white/15'}`}
                                >
                                    My Scenarios
                                </button>
                                <button
                                    onClick={() => setView('create')}
                                    className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Create
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            {view === 'create' ? renderCreateForm() : (
                <>
                    {/* Search and Filters */}
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search scenarios..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                            />
                        </div>

                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                        >
                            {CATEGORIES.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>

                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                        >
                            <option value="popular">Most Popular</option>
                            <option value="newest">Newest</option>
                            <option value="rating">Highest Rated</option>
                            <option value="price">Lowest Price</option>
                        </select>
                    </div>

                    {/* Grid */}
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-teal-500" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredScenarios.map(renderScenarioCard)}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ScenarioMarketplace;
