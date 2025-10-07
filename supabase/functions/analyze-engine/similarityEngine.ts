// Similarity Calculation Engine
// Implements proper cosine similarity for pattern matching
// Gap Fix #5: Replace hardcoded 66.7% with actual computed similarity

/**
 * Simple text vectorization using TF-IDF approach
 */
export function vectorizeText(text: string): Map<string, number> {
  if (!text) return new Map()
  
  // Tokenize and normalize
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3) // Filter short words
  
  // Count term frequencies
  const termFreq = new Map<string, number>()
  words.forEach(word => {
    termFreq.set(word, (termFreq.get(word) || 0) + 1)
  })
  
  // Normalize by document length
  const magnitude = Math.sqrt(words.length)
  termFreq.forEach((count, term) => {
    termFreq.set(term, count / magnitude)
  })
  
  return termFreq
}

/**
 * Compute cosine similarity between two text vectors
 */
export function cosineSimilarity(vecA: Map<string, number>, vecB: Map<string, number>): number {
  if (vecA.size === 0 || vecB.size === 0) return 0
  
  let dotProduct = 0
  let magnitudeA = 0
  let magnitudeB = 0
  
  // Compute dot product and magnitudes
  const allTerms = new Set([...vecA.keys(), ...vecB.keys()])
  
  allTerms.forEach(term => {
    const valA = vecA.get(term) || 0
    const valB = vecB.get(term) || 0
    
    dotProduct += valA * valB
    magnitudeA += valA * valA
    magnitudeB += valB * valB
  })
  
  magnitudeA = Math.sqrt(magnitudeA)
  magnitudeB = Math.sqrt(magnitudeB)
  
  if (magnitudeA === 0 || magnitudeB === 0) return 0
  
  const similarity = dotProduct / (magnitudeA * magnitudeB)
  return Math.max(0, Math.min(1, similarity)) // Clamp to [0, 1]
}

/**
 * Compute similarity between scenario text and pattern description
 */
export function computePatternSimilarity(
  scenarioText: string,
  patternDescription: string,
  patternSignature?: string
): number {
  // Vectorize both texts
  const scenarioVec = vectorizeText(scenarioText)
  const patternVec = vectorizeText(patternDescription)
  
  // Also include pattern signature if available
  if (patternSignature) {
    const signatureVec = vectorizeText(patternSignature)
    // Merge signature into pattern vector with higher weight
    signatureVec.forEach((value, term) => {
      patternVec.set(term, (patternVec.get(term) || 0) + value * 1.5)
    })
  }
  
  // Compute cosine similarity
  const similarity = cosineSimilarity(scenarioVec, patternVec)
  
  // Convert to percentage
  return Math.round(similarity * 1000) / 10 // Round to 1 decimal place
}

/**
 * Compute structural similarity based on game theory features
 */
export function computeStructuralSimilarity(
  scenarioFeatures: {
    playerCount?: number
    hasCooperation?: boolean
    hasConflict?: boolean
    hasInformationAsymmetry?: boolean
    hasSequentialMoves?: boolean
    hasRepeatedInteraction?: boolean
  },
  patternFeatures: {
    playerCount?: number
    hasCooperation?: boolean
    hasConflict?: boolean
    hasInformationAsymmetry?: boolean
    hasSequentialMoves?: boolean
    hasRepeatedInteraction?: boolean
  }
): number {
  let matchCount = 0
  let totalFeatures = 0
  
  // Player count similarity (exact match or close)
  if (scenarioFeatures.playerCount && patternFeatures.playerCount) {
    totalFeatures++
    const diff = Math.abs(scenarioFeatures.playerCount - patternFeatures.playerCount)
    if (diff === 0) matchCount += 1
    else if (diff === 1) matchCount += 0.7
    else if (diff === 2) matchCount += 0.4
  }
  
  // Boolean features
  const booleanFeatures: Array<keyof typeof scenarioFeatures> = [
    'hasCooperation',
    'hasConflict',
    'hasInformationAsymmetry',
    'hasSequentialMoves',
    'hasRepeatedInteraction'
  ]
  
  booleanFeatures.forEach(feature => {
    if (scenarioFeatures[feature] !== undefined && patternFeatures[feature] !== undefined) {
      totalFeatures++
      if (scenarioFeatures[feature] === patternFeatures[feature]) {
        matchCount++
      }
    }
  })
  
  if (totalFeatures === 0) return 0
  
  const structuralSimilarity = matchCount / totalFeatures
  return Math.round(structuralSimilarity * 1000) / 10 // Round to 1 decimal place
}

/**
 * Combined similarity: weighted average of text and structural similarity
 */
export function computeCombinedSimilarity(
  scenarioText: string,
  patternDescription: string,
  scenarioFeatures: any,
  patternFeatures: any,
  patternSignature?: string
): number {
  const textSimilarity = computePatternSimilarity(scenarioText, patternDescription, patternSignature)
  const structuralSimilarity = computeStructuralSimilarity(scenarioFeatures, patternFeatures)
  
  // Weighted average: 60% text, 40% structural
  const combined = (textSimilarity * 0.6) + (structuralSimilarity * 0.4)
  
  return Math.round(combined * 10) / 10 // Round to 1 decimal place
}

/**
 * Extract game theory features from scenario text
 */
export function extractScenarioFeatures(scenarioText: string, players?: any[]): any {
  const text = scenarioText.toLowerCase()
  
  return {
    playerCount: players?.length || (text.match(/\b(player|party|country|company|actor)\b/gi)?.length || 2),
    hasCooperation: /\b(cooperat|alliance|partnership|collaborate|joint)\b/i.test(text),
    hasConflict: /\b(conflict|compete|rival|oppose|fight|war)\b/i.test(text),
    hasInformationAsymmetry: /\b(secret|hidden|unknown|asymmetric|information|private)\b/i.test(text),
    hasSequentialMoves: /\b(first|then|after|sequential|turn|move)\b/i.test(text),
    hasRepeatedInteraction: /\b(repeated|ongoing|continuous|long-term|iterative)\b/i.test(text)
  }
}
