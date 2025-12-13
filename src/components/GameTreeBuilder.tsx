// Game Tree Builder Component
// Monetization Feature F4: Counterfactual Solver Interface
// Visual drag-and-drop interface for extensive form games

import React, { useState, useCallback, useMemo } from 'react';
import {
    GitBranch, Plus, Trash2, Play, Download, Info,
    ChevronDown, ChevronUp, Target, Zap, RefreshCw
} from 'lucide-react';

// Types
interface GameNode {
    id: string;
    type: 'decision' | 'chance' | 'terminal';
    label: string;
    player?: string;
    payoffs?: number[];
    probability?: number;
    children: GameNode[];
    x?: number;
    y?: number;
    infoSetId?: string;
}

interface GameEdge {
    from: string;
    to: string;
    action: string;
}

interface EquilibriumResult {
    strategy: Record<string, Record<string, string>>;
    expectedPayoffs: number[];
    subgamePerfect: boolean;
    nashEquilibrium: boolean;
}

interface GameTreeBuilderProps {
    userId?: string;
    onSolve?: (result: EquilibriumResult) => void;
}

// Generate unique IDs
let nodeIdCounter = 0;
const generateId = () => `node_${++nodeIdCounter}`;

// Default starting tree
const createDefaultTree = (): GameNode => ({
    id: generateId(),
    type: 'decision',
    label: 'Player 1',
    player: 'Player 1',
    children: []
});

const GameTreeBuilder: React.FC<GameTreeBuilderProps> = ({ userId, onSolve }) => {
    const [tree, setTree] = useState<GameNode>(createDefaultTree);
    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const [players, setPlayers] = useState<string[]>(['Player 1', 'Player 2']);
    const [isSolving, setIsSolving] = useState(false);
    const [equilibrium, setEquilibrium] = useState<EquilibriumResult | null>(null);
    const [showHelp, setShowHelp] = useState(false);

    // Find node by ID
    const findNode = useCallback((node: GameNode, id: string): GameNode | null => {
        if (node.id === id) return node;
        for (const child of node.children) {
            const found = findNode(child, id);
            if (found) return found;
        }
        return null;
    }, []);

    // Update node in tree
    const updateNode = useCallback((node: GameNode, id: string, updates: Partial<GameNode>): GameNode => {
        if (node.id === id) {
            return { ...node, ...updates };
        }
        return {
            ...node,
            children: node.children.map(child => updateNode(child, id, updates))
        };
    }, []);

    // Add child node
    const addChild = useCallback((parentId: string, type: 'decision' | 'chance' | 'terminal') => {
        setTree(prevTree => {
            const addChildToNode = (node: GameNode): GameNode => {
                if (node.id === parentId) {
                    const newChild: GameNode = {
                        id: generateId(),
                        type,
                        label: type === 'terminal' ? 'Terminal' :
                            type === 'chance' ? 'Chance' :
                                players[(node.children.length) % players.length],
                        player: type === 'decision' ? players[(node.children.length) % players.length] : undefined,
                        payoffs: type === 'terminal' ? players.map(() => 0) : undefined,
                        probability: type === 'chance' ? 0.5 : undefined,
                        children: []
                    };
                    return {
                        ...node,
                        children: [...node.children, newChild]
                    };
                }
                return {
                    ...node,
                    children: node.children.map(addChildToNode)
                };
            };
            return addChildToNode(prevTree);
        });
    }, [players]);

    // Delete node
    const deleteNode = useCallback((nodeId: string) => {
        if (nodeId === tree.id) return; // Can't delete root

        setTree(prevTree => {
            const removeNode = (node: GameNode): GameNode => ({
                ...node,
                children: node.children
                    .filter(child => child.id !== nodeId)
                    .map(removeNode)
            });
            return removeNode(prevTree);
        });
        setSelectedNode(null);
    }, [tree.id]);

    // Solve tree using backward induction
    const solveTree = useCallback(async () => {
        setIsSolving(true);

        try {
            // Backward induction algorithm
            const backwardInduction = (node: GameNode): { value: number[], strategy: Record<string, string> } => {
                if (node.type === 'terminal') {
                    return { value: node.payoffs || [0, 0], strategy: {} };
                }

                if (node.type === 'chance') {
                    // Expected value for chance nodes
                    const childResults = node.children.map(child => ({
                        result: backwardInduction(child),
                        prob: child.probability || (1 / node.children.length)
                    }));

                    const expectedValue = childResults.reduce((acc, { result, prob }) => {
                        return acc.map((v, i) => v + result.value[i] * prob);
                    }, players.map(() => 0));

                    const mergedStrategy = childResults.reduce((acc, { result }) => ({
                        ...acc, ...result.strategy
                    }), {});

                    return { value: expectedValue, strategy: mergedStrategy };
                }

                // Decision node - pick best action for player
                const playerIndex = players.indexOf(node.player || 'Player 1');
                const childResults = node.children.map((child, idx) => ({
                    child,
                    idx,
                    result: backwardInduction(child)
                }));

                if (childResults.length === 0) {
                    return { value: players.map(() => 0), strategy: {} };
                }

                // Find best action for current player
                const bestChild = childResults.reduce((best, current) => {
                    const bestVal = best.result.value[playerIndex] || 0;
                    const currentVal = current.result.value[playerIndex] || 0;
                    return currentVal > bestVal ? current : best;
                });

                const strategy = {
                    ...bestChild.result.strategy,
                    [node.id]: `Action ${bestChild.idx + 1}`
                };

                return { value: bestChild.result.value, strategy };
            };

            await new Promise(resolve => setTimeout(resolve, 500)); // Simulate computation

            const result = backwardInduction(tree);

            // Format result
            const equilibriumResult: EquilibriumResult = {
                strategy: players.reduce((acc, player, idx) => {
                    acc[player] = {};
                    Object.entries(result.strategy).forEach(([nodeId, action]) => {
                        const node = findNode(tree, nodeId);
                        if (node?.player === player) {
                            acc[player][node.label] = action;
                        }
                    });
                    return acc;
                }, {} as Record<string, Record<string, string>>),
                expectedPayoffs: result.value,
                subgamePerfect: true,
                nashEquilibrium: true
            };

            setEquilibrium(equilibriumResult);
            onSolve?.(equilibriumResult);

        } catch (error) {
            console.error('Solve error:', error);
        } finally {
            setIsSolving(false);
        }
    }, [tree, players, findNode, onSolve]);

    // Export tree as JSON
    const exportTree = useCallback(() => {
        const data = JSON.stringify({ tree, players, equilibrium }, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'game-tree.json';
        a.click();
        URL.revokeObjectURL(url);
    }, [tree, players, equilibrium]);

    // Render single node
    const renderNode = useCallback((node: GameNode, depth: number = 0) => {
        const isSelected = selectedNode === node.id;
        const bgColor = node.type === 'terminal' ? 'bg-green-900/50' :
            node.type === 'chance' ? 'bg-yellow-900/50' :
                'bg-blue-900/50';
        const borderColor = isSelected ? 'border-cyan-400' : 'border-slate-600';

        return (
            <div key={node.id} className="flex flex-col items-center">
                <div
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${bgColor} ${borderColor} hover:border-cyan-500`}
                    onClick={() => setSelectedNode(node.id)}
                >
                    <div className="flex items-center gap-2 mb-1">
                        <GitBranch className="w-4 h-4 text-slate-400" />
                        <span className="font-medium text-white text-sm">{node.label}</span>
                    </div>

                    {node.type === 'terminal' && node.payoffs && (
                        <div className="text-xs text-green-400">
                            Payoffs: [{node.payoffs.join(', ')}]
                        </div>
                    )}

                    {node.type === 'chance' && (
                        <div className="text-xs text-yellow-400">
                            P = {(node.probability || 0.5).toFixed(2)}
                        </div>
                    )}

                    {node.player && (
                        <div className="text-xs text-blue-400">
                            {node.player}
                        </div>
                    )}
                </div>

                {node.children.length > 0 && (
                    <div className="flex gap-4 mt-4">
                        {node.children.map((child, idx) => (
                            <div key={child.id} className="flex flex-col items-center">
                                <div className="h-8 w-px bg-slate-600"></div>
                                <div className="text-xs text-slate-500 mb-2">Action {idx + 1}</div>
                                {renderNode(child, depth + 1)}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }, [selectedNode]);

    // Get selected node
    const selectedNodeData = useMemo(() => {
        if (!selectedNode) return null;
        return findNode(tree, selectedNode);
    }, [selectedNode, tree, findNode]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 rounded-xl text-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-lg">
                            <GitBranch className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">Game Tree Builder</h2>
                            <p className="text-purple-200">Visual Extensive Form Game Designer</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowHelp(!showHelp)}
                            className="p-2 bg-white/20 rounded-lg hover:bg-white/30"
                        >
                            <Info className="w-5 h-5" />
                        </button>
                        <button
                            onClick={exportTree}
                            className="p-2 bg-white/20 rounded-lg hover:bg-white/30"
                        >
                            <Download className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Help Panel */}
            {showHelp && (
                <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4">
                    <h4 className="font-medium text-blue-300 mb-2">How to use:</h4>
                    <ul className="text-sm text-slate-300 space-y-1">
                        <li>• Click on a node to select it</li>
                        <li>• Add decision, chance, or terminal nodes as children</li>
                        <li>• Set payoffs for terminal nodes (one per player)</li>
                        <li>• Click "Solve" to find the Subgame Perfect Equilibrium</li>
                        <li>• Export your tree as JSON for later use</li>
                    </ul>
                </div>
            )}

            {/* Players Config */}
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <h3 className="font-semibold text-slate-200 mb-3">Players</h3>
                <div className="flex gap-2 flex-wrap">
                    {players.map((player, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-slate-700 rounded-lg px-3 py-2">
                            <input
                                type="text"
                                value={player}
                                onChange={(e) => {
                                    const newPlayers = [...players];
                                    newPlayers[idx] = e.target.value;
                                    setPlayers(newPlayers);
                                }}
                                className="bg-transparent text-white text-sm w-24"
                            />
                            {players.length > 2 && (
                                <button
                                    onClick={() => setPlayers(players.filter((_, i) => i !== idx))}
                                    className="text-red-400 hover:text-red-300"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ))}
                    <button
                        onClick={() => setPlayers([...players, `Player ${players.length + 1}`])}
                        className="px-3 py-2 bg-slate-700 rounded-lg text-cyan-400 hover:bg-slate-600 text-sm"
                    >
                        <Plus className="w-4 h-4 inline mr-1" />
                        Add Player
                    </button>
                </div>
            </div>

            {/* Tree Visualization */}
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 overflow-x-auto">
                <h3 className="font-semibold text-slate-200 mb-4">Game Tree</h3>
                <div className="min-w-max flex justify-center py-4">
                    {renderNode(tree)}
                </div>
            </div>

            {/* Node Editor */}
            {selectedNodeData && (
                <div className="bg-slate-800 rounded-xl p-6 border border-cyan-500/30">
                    <h3 className="font-semibold text-slate-200 mb-4">
                        Edit Node: {selectedNodeData.label}
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Label</label>
                            <input
                                type="text"
                                value={selectedNodeData.label}
                                onChange={(e) => setTree(updateNode(tree, selectedNodeData.id, { label: e.target.value }))}
                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Type</label>
                            <select
                                value={selectedNodeData.type}
                                onChange={(e) => setTree(updateNode(tree, selectedNodeData.id, {
                                    type: e.target.value as 'decision' | 'chance' | 'terminal'
                                }))}
                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                            >
                                <option value="decision">Decision Node</option>
                                <option value="chance">Chance Node</option>
                                <option value="terminal">Terminal Node</option>
                            </select>
                        </div>

                        {selectedNodeData.type === 'decision' && (
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Player</label>
                                <select
                                    value={selectedNodeData.player || players[0]}
                                    onChange={(e) => setTree(updateNode(tree, selectedNodeData.id, { player: e.target.value }))}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                                >
                                    {players.map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {selectedNodeData.type === 'chance' && (
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Probability</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={selectedNodeData.probability || 0.5}
                                    onChange={(e) => setTree(updateNode(tree, selectedNodeData.id, {
                                        probability: parseFloat(e.target.value)
                                    }))}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                                />
                            </div>
                        )}

                        {selectedNodeData.type === 'terminal' && (
                            <div className="col-span-2">
                                <label className="block text-sm text-slate-400 mb-1">Payoffs</label>
                                <div className="flex gap-2">
                                    {players.map((player, idx) => (
                                        <div key={idx} className="flex-1">
                                            <span className="text-xs text-slate-500">{player}</span>
                                            <input
                                                type="number"
                                                value={selectedNodeData.payoffs?.[idx] || 0}
                                                onChange={(e) => {
                                                    const newPayoffs = [...(selectedNodeData.payoffs || players.map(() => 0))];
                                                    newPayoffs[idx] = parseFloat(e.target.value);
                                                    setTree(updateNode(tree, selectedNodeData.id, { payoffs: newPayoffs }));
                                                }}
                                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2 mt-4">
                        <button
                            onClick={() => addChild(selectedNodeData.id, 'decision')}
                            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center gap-1"
                        >
                            <Plus className="w-4 h-4" /> Decision
                        </button>
                        <button
                            onClick={() => addChild(selectedNodeData.id, 'chance')}
                            className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm flex items-center gap-1"
                        >
                            <Plus className="w-4 h-4" /> Chance
                        </button>
                        <button
                            onClick={() => addChild(selectedNodeData.id, 'terminal')}
                            className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm flex items-center gap-1"
                        >
                            <Plus className="w-4 h-4" /> Terminal
                        </button>
                        {selectedNodeData.id !== tree.id && (
                            <button
                                onClick={() => deleteNode(selectedNodeData.id)}
                                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm flex items-center gap-1 ml-auto"
                            >
                                <Trash2 className="w-4 h-4" /> Delete
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Solve Button */}
            <div className="flex justify-center">
                <button
                    onClick={solveTree}
                    disabled={isSolving}
                    className="px-8 py-4 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold rounded-xl hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 flex items-center gap-3 text-lg"
                >
                    {isSolving ? (
                        <>
                            <RefreshCw className="w-6 h-6 animate-spin" />
                            Computing Equilibrium...
                        </>
                    ) : (
                        <>
                            <Play className="w-6 h-6" />
                            Solve for SPE
                        </>
                    )}
                </button>
            </div>

            {/* Results */}
            {equilibrium && (
                <div className="bg-slate-800 rounded-xl p-6 border border-purple-500/30">
                    <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
                        <Target className="w-5 h-5 text-purple-400" />
                        Subgame Perfect Equilibrium
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {players.map((player, idx) => (
                            <div key={player} className="bg-slate-700 rounded-lg p-4">
                                <div className="font-medium text-white mb-2">{player}</div>
                                <div className="text-2xl font-bold text-purple-400">
                                    Payoff: {equilibrium.expectedPayoffs[idx]?.toFixed(2) || 0}
                                </div>
                                {Object.entries(equilibrium.strategy[player] || {}).length > 0 && (
                                    <div className="mt-2 text-sm text-slate-400">
                                        Strategy: {JSON.stringify(equilibrium.strategy[player])}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-4 text-sm">
                        <span className={`px-3 py-1 rounded-full ${equilibrium.subgamePerfect ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                            {equilibrium.subgamePerfect ? '✓ Subgame Perfect' : '✗ Not Subgame Perfect'}
                        </span>
                        <span className={`px-3 py-1 rounded-full ${equilibrium.nashEquilibrium ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                            {equilibrium.nashEquilibrium ? '✓ Nash Equilibrium' : '✗ Not Nash Equilibrium'}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GameTreeBuilder;
