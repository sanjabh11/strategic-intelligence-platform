// Negotiation Dojo Component
// Monetization Feature F3: Asynchronous Negotiation Training Arena
// Practice negotiation against Game Theoretic AI opponents using Nash Equilibrium logic

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    MessageSquare, Target, Zap, DollarSign, TrendingUp, TrendingDown,
    Send, RefreshCw, Award, BarChart3, Info, ChevronRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface NegotiationTurn {
    id: string;
    role: 'user' | 'ai';
    message: string;
    offer?: number;
    timestamp: Date;
}

interface NegotiationScenario {
    id: string;
    title: string;
    description: string;
    userRole: string;
    aiRole: string;
    initialOffer: number;
    reservationPrice: number;
    aiReservationPrice: number;
    targetPrice: number;
    difficulty: 'easy' | 'medium' | 'hard';
    category: 'salary' | 'b2b' | 'rental' | 'purchase' | 'freelance';
}

interface NegotiationResult {
    outcome: 'deal' | 'no_deal' | 'ongoing';
    finalPrice?: number;
    zopaUtilization: number;
    moneyLeftOnTable: number;
    aiAssessment: string;
    strategicRating: 'excellent' | 'good' | 'fair' | 'poor';
}

const SCENARIOS: NegotiationScenario[] = [
    {
        id: 'salary-1',
        title: 'Salary Negotiation',
        description: 'You received a job offer for $75,000. You know the market rate is $80-90K and the company has shown strong interest.',
        userRole: 'Candidate',
        aiRole: 'Hiring Manager',
        initialOffer: 75000,
        reservationPrice: 72000,
        aiReservationPrice: 92000,
        targetPrice: 87000,
        difficulty: 'medium',
        category: 'salary'
    },
    {
        id: 'b2b-1',
        title: 'Enterprise Software Deal',
        description: 'Your company wants to buy 100 licenses of a SaaS tool. List price is $50/user/month, but you have budget constraints.',
        userRole: 'Procurement Manager',
        aiRole: 'Sales Representative',
        initialOffer: 5000,
        reservationPrice: 4000,
        aiReservationPrice: 4500,
        targetPrice: 3500,
        difficulty: 'hard',
        category: 'b2b'
    },
    {
        id: 'rental-1',
        title: 'Apartment Lease Negotiation',
        description: 'You found an apartment listed at $2,200/month. The unit has been on market for 6 weeks.',
        userRole: 'Prospective Tenant',
        aiRole: 'Landlord',
        initialOffer: 2200,
        reservationPrice: 2000,
        aiReservationPrice: 1900,
        targetPrice: 1950,
        difficulty: 'easy',
        category: 'rental'
    },
    {
        id: 'freelance-1',
        title: 'Freelance Project Rate',
        description: 'A client wants to hire you for a 3-month project. They offered $80/hour, but you typically charge $120/hour.',
        userRole: 'Freelancer',
        aiRole: 'Client',
        initialOffer: 80,
        reservationPrice: 75,
        aiReservationPrice: 110,
        targetPrice: 100,
        difficulty: 'medium',
        category: 'freelance'
    }
];

interface NegotiationDojoProps {
    userId?: string;
}

const NegotiationDojo: React.FC<NegotiationDojoProps> = ({ userId }) => {
    const [scenario, setScenario] = useState<NegotiationScenario | null>(null);
    const [turns, setTurns] = useState<NegotiationTurn[]>([]);
    const [userInput, setUserInput] = useState('');
    const [currentOffer, setCurrentOffer] = useState<number | null>(null);
    const [result, setResult] = useState<NegotiationResult | null>(null);
    const [isAiThinking, setIsAiThinking] = useState(false);
    const [showTips, setShowTips] = useState(true);
    const chatRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom of chat
    useEffect(() => {
        if (chatRef.current) {
            chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
    }, [turns]);

    // Start a negotiation
    const startNegotiation = useCallback((selectedScenario: NegotiationScenario) => {
        setScenario(selectedScenario);
        setTurns([]);
        setResult(null);
        setCurrentOffer(selectedScenario.initialOffer);

        // AI opens with initial offer
        const openingMessage: NegotiationTurn = {
            id: crypto.randomUUID(),
            role: 'ai',
            message: getOpeningMessage(selectedScenario),
            offer: selectedScenario.initialOffer,
            timestamp: new Date()
        };
        setTurns([openingMessage]);
    }, []);

    // Generate AI opening message
    const getOpeningMessage = (s: NegotiationScenario): string => {
        switch (s.category) {
            case 'salary':
                return `Thank you for your interest in the position! We're excited to offer you the role at $${s.initialOffer.toLocaleString()}. This is a competitive offer based on our internal pay bands. What are your thoughts?`;
            case 'b2b':
                return `Thanks for considering our solution! The standard enterprise pricing is $${s.initialOffer.toLocaleString()}/month for 100 licenses. This includes full support and onboarding. Shall we proceed with this?`;
            case 'rental':
                return `The apartment is available at $${s.initialOffer.toLocaleString()}/month. It's a great unit, recently renovated. Are you interested in signing the lease?`;
            case 'freelance':
                return `We have a great project for you! Our budget is $${s.initialOffer}/hour for this 3-month engagement. It's a fantastic opportunity. What do you think?`;
            default:
                return `Our initial offer is $${s.initialOffer.toLocaleString()}. What do you think?`;
        }
    };

    // Process user message and generate AI response
    const handleSendMessage = useCallback(async () => {
        if (!userInput.trim() || !scenario || isAiThinking) return;

        const userMessage: NegotiationTurn = {
            id: crypto.randomUUID(),
            role: 'user',
            message: userInput,
            offer: extractOfferFromMessage(userInput, scenario),
            timestamp: new Date()
        };

        setTurns(prev => [...prev, userMessage]);
        setUserInput('');
        setIsAiThinking(true);

        // Simulate AI thinking time
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1500));

        // Generate AI response using game theory logic
        const aiResponse = generateAiResponse(userMessage, [...turns, userMessage], scenario);

        setTurns(prev => [...prev, aiResponse.turn]);

        if (aiResponse.offer !== null) {
            setCurrentOffer(aiResponse.offer);
        }

        if (aiResponse.isDeal || aiResponse.isNoDeal) {
            const finalResult = calculateResult(aiResponse, scenario, turns.length + 2);
            setResult(finalResult);
        }

        setIsAiThinking(false);
    }, [userInput, scenario, turns, isAiThinking]);

    // Extract offer amount from user message
    const extractOfferFromMessage = (message: string, s: NegotiationScenario): number | undefined => {
        const patterns = [
            /\$([0-9,]+)/,
            /([0-9,]+)\s*dollars?/i,
            /([0-9,]+)\s*k\b/i,
            /\b([0-9,]+)\b/
        ];

        for (const pattern of patterns) {
            const match = message.match(pattern);
            if (match) {
                let amount = parseFloat(match[1].replace(/,/g, ''));
                if (message.toLowerCase().includes('k')) {
                    amount *= 1000;
                }
                // Sanity check - should be within reasonable range of scenario
                if (amount > 0 && amount < s.initialOffer * 3) {
                    return amount;
                }
            }
        }
        return undefined;
    };

    // Generate AI response based on game theory
    const generateAiResponse = (
        userMsg: NegotiationTurn,
        allTurns: NegotiationTurn[],
        s: NegotiationScenario
    ): { turn: NegotiationTurn; offer: number | null; isDeal: boolean; isNoDeal: boolean } => {
        const turnCount = allTurns.length;
        const userOffer = userMsg.offer;
        const zopa = { min: s.aiReservationPrice, max: s.reservationPrice };

        let message: string;
        let newOffer: number | null = null;
        let isDeal = false;
        let isNoDeal = false;

        // Check if message indicates acceptance
        const acceptanceWords = ['accept', 'deal', 'agree', 'sounds good', 'works for me', 'let\'s do it'];
        const isUserAccepting = acceptanceWords.some(w => userMsg.message.toLowerCase().includes(w));

        // Check if message is walking away
        const walkawayWords = ['no deal', 'walk away', 'can\'t accept', 'impossible', 'forget it'];
        const isUserWalkingAway = walkawayWords.some(w => userMsg.message.toLowerCase().includes(w));

        if (isUserWalkingAway) {
            message = "I'm sorry we couldn't reach an agreement. Perhaps we can revisit this in the future.";
            isNoDeal = true;
        } else if (isUserAccepting && currentOffer !== null) {
            message = `Excellent! We have a deal at $${currentOffer.toLocaleString()}. I'm glad we could work this out.`;
            isDeal = true;
            newOffer = currentOffer;
        } else if (userOffer !== undefined) {
            // User made a counter-offer - evaluate using Nash Bargaining logic
            const midpoint = (zopa.min + zopa.max) / 2;
            const userPosition = userOffer;
            const currentPosition = currentOffer || s.initialOffer;

            // Calculate concession
            const potentialConcession = (currentPosition - midpoint) * 0.3;
            newOffer = Math.round(currentPosition - potentialConcession);

            // Clamp to reservation price
            newOffer = Math.max(newOffer, s.aiReservationPrice);

            if (userOffer >= s.aiReservationPrice) {
                // User offer is within AI's acceptable range
                if (turnCount > 4 || Math.abs(userOffer - newOffer) < (s.initialOffer * 0.02)) {
                    isDeal = true;
                    newOffer = userOffer;
                    message = `You drive a hard bargain! I can accept $${userOffer.toLocaleString()}. We have a deal.`;
                } else {
                    message = generateCounterOfferMessage(userOffer, newOffer, s, turnCount);
                }
            } else {
                // User offer is below AI's reservation price
                message = `I appreciate the offer, but $${userOffer.toLocaleString()} is below what we can accept. The best I can do is $${newOffer.toLocaleString()}. Can you come up a bit?`;
            }
        } else {
            // No clear offer - prompt for one
            message = "I understand your position. Can you give me a specific number you'd be comfortable with?";
        }

        return {
            turn: {
                id: crypto.randomUUID(),
                role: 'ai',
                message,
                offer: newOffer || undefined,
                timestamp: new Date()
            },
            offer: newOffer,
            isDeal,
            isNoDeal
        };
    };

    // Generate counter-offer message
    const generateCounterOfferMessage = (
        userOffer: number,
        aiOffer: number,
        s: NegotiationScenario,
        turnCount: number
    ): string => {
        const messages = [
            `I appreciate the offer of $${userOffer.toLocaleString()}, but I can't go that low. How about $${aiOffer.toLocaleString()}?`,
            `We're getting closer. I can come down to $${aiOffer.toLocaleString()}, but that's about as far as I can stretch.`,
            `Let me see what I can do... I could potentially accept $${aiOffer.toLocaleString()}. Would that work for you?`,
            `I've discussed with my team, and $${aiOffer.toLocaleString()} is the best we can offer. This is a fair middle ground.`
        ];

        return messages[Math.min(turnCount - 1, messages.length - 1)];
    };

    // Calculate final result
    const calculateResult = (
        finalResponse: { offer: number | null; isDeal: boolean; isNoDeal: boolean },
        s: NegotiationScenario,
        totalTurns: number
    ): NegotiationResult => {
        if (finalResponse.isNoDeal) {
            return {
                outcome: 'no_deal',
                zopaUtilization: 0,
                moneyLeftOnTable: s.targetPrice - s.reservationPrice,
                aiAssessment: "The negotiation failed. Consider whether your reservation price was realistic.",
                strategicRating: 'poor'
            };
        }

        const finalPrice = finalResponse.offer || s.initialOffer;
        const zopaSize = Math.abs(s.aiReservationPrice - s.reservationPrice);

        // Calculate ZOPA utilization (how much of the ZOPA did user capture)
        const userGain = Math.abs(finalPrice - s.initialOffer);
        const potentialGain = Math.abs(s.targetPrice - s.initialOffer);
        const zopaUtilization = Math.min(1, Math.max(0, userGain / Math.max(potentialGain, 1)));

        // Calculate money left on table
        const moneyLeftOnTable = Math.max(0, Math.abs(finalPrice - s.aiReservationPrice));

        // Determine strategic rating
        let strategicRating: 'excellent' | 'good' | 'fair' | 'poor';
        let aiAssessment: string;

        if (zopaUtilization >= 0.8) {
            strategicRating = 'excellent';
            aiAssessment = `Outstanding negotiation! You captured ${Math.round(zopaUtilization * 100)}% of the value available. You used effective anchoring and strategic concessions.`;
        } else if (zopaUtilization >= 0.5) {
            strategicRating = 'good';
            aiAssessment = `Good negotiation! You achieved a solid outcome. Consider using more strategic pauses and BATNA references next time.`;
        } else if (zopaUtilization >= 0.2) {
            strategicRating = 'fair';
            aiAssessment = `Acceptable result, but you left money on the table. Try making smaller concessions and using "what if" questions.`;
        } else {
            strategicRating = 'poor';
            aiAssessment = `You accepted close to the initial offer. Tip: Always counter-offer, anchor high, and don't reveal your reservation price.`;
        }

        return {
            outcome: 'deal',
            finalPrice,
            zopaUtilization,
            moneyLeftOnTable,
            aiAssessment,
            strategicRating
        };
    };

    // Render scenario selection
    const renderScenarioSelection = () => (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-orange-600 to-red-600 p-6 rounded-xl text-white">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-lg">
                        <MessageSquare className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">Negotiation Dojo</h2>
                        <p className="text-orange-200">Practice against AI opponents using game theory</p>
                    </div>
                </div>
            </div>

            <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-400 mt-0.5" />
                    <div>
                        <h4 className="font-medium text-blue-300 mb-1">How it works</h4>
                        <p className="text-sm text-slate-300">
                            The AI opponent uses Nash Bargaining strategies to negotiate realistically.
                            After each session, you'll see your ZOPA utilization and how much money you left on the table.
                        </p>
                    </div>
                </div>
            </div>

            <h3 className="font-semibold text-slate-200">Choose a Scenario</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SCENARIOS.map(s => (
                    <div
                        key={s.id}
                        onClick={() => startNegotiation(s)}
                        className="bg-slate-800 rounded-xl p-5 border border-slate-700 hover:border-orange-500 cursor-pointer transition-all"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="font-medium text-white">{s.title}</span>
                            <span className={`px-2 py-1 rounded-full text-xs ${s.difficulty === 'easy' ? 'bg-green-900/50 text-green-400' :
                                    s.difficulty === 'medium' ? 'bg-yellow-900/50 text-yellow-400' :
                                        'bg-red-900/50 text-red-400'
                                }`}>
                                {s.difficulty}
                            </span>
                        </div>
                        <p className="text-sm text-slate-400 mb-3">{s.description}</p>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500">You: {s.userRole}</span>
                            <span className="text-slate-500">AI: {s.aiRole}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    // Render active negotiation
    const renderNegotiation = () => (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-white">{scenario!.title}</h3>
                        <p className="text-sm text-slate-400">
                            You: {scenario!.userRole} | AI: {scenario!.aiRole}
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-slate-400">Current Offer</div>
                        <div className="text-xl font-bold text-orange-400">
                            ${currentOffer?.toLocaleString() || '—'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tips */}
            {showTips && (
                <div className="bg-amber-900/30 border border-amber-500/30 rounded-lg p-3 text-sm">
                    <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-amber-300">💡 Tip</span>
                        <button onClick={() => setShowTips(false)} className="text-amber-400 text-xs">Hide</button>
                    </div>
                    <p className="text-slate-300">
                        Try anchoring with a strong first offer. Don't accept too quickly - make them work for the deal!
                    </p>
                </div>
            )}

            {/* Chat */}
            <div
                ref={chatRef}
                className="bg-slate-800 rounded-xl p-4 border border-slate-700 h-96 overflow-y-auto space-y-4"
            >
                {turns.map(turn => (
                    <div
                        key={turn.id}
                        className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`max-w-[80%] rounded-lg p-3 ${turn.role === 'user'
                                ? 'bg-orange-600 text-white'
                                : 'bg-slate-700 text-slate-200'
                            }`}>
                            <p>{turn.message}</p>
                            {turn.offer && (
                                <div className="mt-2 text-xs opacity-75">
                                    Offer: ${turn.offer.toLocaleString()}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {isAiThinking && (
                    <div className="flex justify-start">
                        <div className="bg-slate-700 rounded-lg p-3 text-slate-400">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            {!result && (
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Type your response... (include a $ amount to make an offer)"
                        className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white"
                        disabled={isAiThinking}
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={!userInput.trim() || isAiThinking}
                        className="px-4 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-700 text-white rounded-lg"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            )}

            {/* Result */}
            {result && (
                <div className={`rounded-xl p-6 border ${result.outcome === 'deal' ? 'bg-green-900/30 border-green-500/30' : 'bg-red-900/30 border-red-500/30'
                    }`}>
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Award className="w-6 h-6 text-yellow-400" />
                        {result.outcome === 'deal' ? 'Deal Reached!' : 'No Deal'}
                    </h3>

                    {result.finalPrice && (
                        <div className="grid grid-cols-3 gap-4 mb-4">
                            <div className="bg-slate-800 rounded-lg p-3 text-center">
                                <div className="text-sm text-slate-400">Final Price</div>
                                <div className="text-xl font-bold text-green-400">${result.finalPrice.toLocaleString()}</div>
                            </div>
                            <div className="bg-slate-800 rounded-lg p-3 text-center">
                                <div className="text-sm text-slate-400">Value Captured</div>
                                <div className="text-xl font-bold text-cyan-400">{Math.round(result.zopaUtilization * 100)}%</div>
                            </div>
                            <div className="bg-slate-800 rounded-lg p-3 text-center">
                                <div className="text-sm text-slate-400">Left on Table</div>
                                <div className="text-xl font-bold text-amber-400">${result.moneyLeftOnTable.toLocaleString()}</div>
                            </div>
                        </div>
                    )}

                    <div className={`p-4 rounded-lg ${result.strategicRating === 'excellent' ? 'bg-green-800/50' :
                            result.strategicRating === 'good' ? 'bg-blue-800/50' :
                                result.strategicRating === 'fair' ? 'bg-yellow-800/50' :
                                    'bg-red-800/50'
                        }`}>
                        <div className="flex items-center gap-2 mb-2">
                            <BarChart3 className="w-5 h-5" />
                            <span className="font-medium capitalize">{result.strategicRating} Performance</span>
                        </div>
                        <p className="text-sm text-slate-300">{result.aiAssessment}</p>
                    </div>

                    <button
                        onClick={() => { setScenario(null); setResult(null); }}
                        className="mt-4 w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium"
                    >
                        Try Another Scenario
                    </button>
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-6">
            {scenario ? renderNegotiation() : renderScenarioSelection()}
        </div>
    );
};

export default NegotiationDojo;
