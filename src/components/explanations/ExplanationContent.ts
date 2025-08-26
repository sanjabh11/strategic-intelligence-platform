// Explanation content for different chart sections
export interface ExplanationSection {
  title: string;
  quickTip: string;
  detailed: string;
  analogy?: string;
  keyPoints: string[];
}

export const explanationContent: Record<string, ExplanationSection> = {
  nashEquilibrium: {
    title: "Nash Equilibrium Profile",
    quickTip: "Shows the best strategy mix when everyone knows what others might do.",
    detailed: "A Nash Equilibrium represents a stable situation where no player wants to change their strategy, given what everyone else is doing. Think of it like finding the perfect balance point in a strategic situation.",
    analogy: "Imagine choosing a restaurant when your friends are also choosing. A Nash Equilibrium is when everyone picks their best option, knowing what others will likely pick - and nobody wants to change their choice.",
    keyPoints: [
      "Higher bars mean more likely strategies for each player",
      "Stability score shows how 'locked-in' this strategic balance is",
      "100% stability means this outcome is very predictable",
      "Lower stability suggests the situation could change easily"
    ]
  },
  
  quantumStrategy: {
    title: "Quantum Strategy Collapse",
    quickTip: "Shows all possible outcomes and how likely each one is to happen.",
    detailed: "This represents how strategic uncertainty 'collapses' into specific outcomes. Before decisions are made, multiple possibilities exist simultaneously - like quantum particles that can be in multiple states until observed.",
    analogy: "Like shaking a dice in a cup - before you look, it could be any number (quantum state). Once you peek, it 'collapses' to one specific number. This chart shows all the possible 'dice rolls' for your strategic situation.",
    keyPoints: [
      "Larger pie slices = more likely outcomes",
      "Percentages show the probability of each strategic outcome",
      "Multiple outcomes can coexist until decisions force one to emerge",
      "Helps you prepare for the most likely scenarios"
    ]
  },
  
  patternMatches: {
    title: "Similar Strategic Patterns",
    quickTip: "Finds historical situations that look like your current scenario.",
    detailed: "This identifies similar strategic patterns from history, business, or game theory. By finding analogous situations, you can learn from past outcomes and apply proven strategic insights.",
    analogy: "Like a doctor diagnosing symptoms by comparing to similar cases they've seen before. Higher match percentages mean the historical situation is more similar to yours.",
    keyPoints: [
      "Higher percentages = more similar to your situation",
      "Historical patterns can predict likely outcomes",
      "Learn from how similar situations played out",
      "Use past wisdom to inform your current strategy"
    ]
  },
  
  analysisMetadata: {
    title: "Analysis Metadata",
    quickTip: "Shows technical details about how your analysis was performed.",
    detailed: "This provides transparency about the analysis process, including processing time, data sources used, and whether the insights are backed by real evidence or theoretical models.",
    keyPoints: [
      "Processing time shows computational complexity",
      "Evidence sources indicate how much real-world data was used", 
      "Evidence-backed analyses are more reliable than purely theoretical ones",
      "Analysis engine shows which AI model performed the calculations"
    ]
  }
};

// Learning mode tips for different user levels
export const learningModeTips = {
  beginner: {
    welcome: "Welcome to Strategic Intelligence! Turn on Learning Mode to see explanations for all charts and concepts.",
    chartTip: "Click the help icons (?) next to chart titles for detailed explanations.",
    modeTip: "Try 'Education Quick' mode first - it's faster and includes helpful context."
  },
  intermediate: {
    welcome: "Ready for deeper analysis? Advanced options let you fine-tune the strategic calculations.",
    chartTip: "Compare results between Standard and Education Quick modes to see the difference.",
    modeTip: "Higher stability scores indicate more predictable strategic outcomes."
  }
};
