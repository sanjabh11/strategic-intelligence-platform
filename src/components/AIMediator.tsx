import { useState } from 'react'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Card } from './ui/card'
import { Scale, Users, DollarSign, CheckCircle } from 'lucide-react'

export function AIMediator() {
  const [category, setCategory] = useState('other')
  const [descriptionA, setDescriptionA] = useState('')
  const [descriptionB, setDescriptionB] = useState('')
  const [monetaryValue, setMonetaryValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const mediate = async () => {
    setLoading(true)
    try {
      const response = await fetch('/functions/v1/ai-mediator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          description_a: descriptionA,
          description_b: descriptionB,
          monetary_value: monetaryValue ? parseFloat(monetaryValue) : undefined
        })
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Mediation failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">AI Conflict Mediator</h1>
        <p className="text-gray-600">Fair dispute resolution using game-theoretic mechanisms</p>
      </div>

      <Card className="p-6 mb-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Dispute Category</label>
            <select 
              className="w-full border rounded p-2"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="landlord_tenant">Landlord-Tenant</option>
              <option value="workplace">Workplace</option>
              <option value="family">Family</option>
              <option value="neighbor">Neighbor</option>
              <option value="business">Business</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Party A's Perspective</label>
            <Textarea 
              placeholder="Describe the dispute from Party A's point of view..."
              value={descriptionA}
              onChange={(e) => setDescriptionA(e.target.value)}
              rows={4}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Party B's Perspective</label>
            <Textarea 
              placeholder="Describe the dispute from Party B's point of view..."
              value={descriptionB}
              onChange={(e) => setDescriptionB(e.target.value)}
              rows={4}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Monetary Value (if applicable)</label>
            <div className="flex items-center gap-2">
              <DollarSign className="text-gray-400" />
              <input 
                type="number"
                className="flex-1 border rounded p-2"
                placeholder="e.g., 5000"
                value={monetaryValue}
                onChange={(e) => setMonetaryValue(e.target.value)}
              />
            </div>
          </div>

          <Button 
            onClick={mediate}
            disabled={loading || !descriptionA || !descriptionB}
            className="w-full"
          >
            {loading ? 'Analyzing Dispute...' : 'Find Fair Solution'}
          </Button>
        </div>
      </Card>

      {result?.mediation_analysis && (
        <div className="space-y-4">
          {/* Cost Comparison */}
          <Card className="p-6 border-green-500">
            <div className="flex items-start gap-3">
              <DollarSign className="text-green-500 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold mb-2">💰 Cost Savings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Estimated Litigation Cost</p>
                    <p className="text-2xl font-bold text-red-500">
                      ${result.mediation_analysis.cost_comparison.estimated_litigation_cost.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">AI Mediation Cost</p>
                    <p className="text-2xl font-bold text-green-500">$0</p>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-green-50 rounded">
                  <p className="font-medium text-green-700">
                    Potential Savings: ${result.mediation_analysis.cost_comparison.potential_savings.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Recommended Solution */}
          <Card className="p-6 border-blue-500">
            <div className="flex items-start gap-3">
              <Scale className="text-blue-500 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold mb-2">⚖️ Fair Solution (Nash Bargaining)</h3>
                <div className="space-y-3">
                  <div className="p-4 bg-blue-50 rounded">
                    <p className="font-medium mb-2">{result.recommended_solution.name}</p>
                    <p className="text-sm text-gray-700">{result.recommended_solution.description}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm">Fairness Score:</span>
                      <span className="font-bold">{(result.recommended_solution.fairness_score * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm">Acceptance Probability:</span>
                      <span className="font-bold">{(result.recommended_solution.predicted_acceptance_prob * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-700 whitespace-pre-line">
                    {result.explanation}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Alternative Solutions */}
          {result.mediation_analysis.fair_solutions.length > 1 && (
            <Card className="p-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="text-purple-500 mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">🔄 Alternative Fair Solutions</h3>
                  <div className="space-y-2">
                    {result.mediation_analysis.fair_solutions.slice(1).map((solution: any, i: number) => (
                      <div key={i} className="p-3 bg-gray-50 rounded">
                        <p className="font-medium">{solution.name}</p>
                        <p className="text-sm text-gray-600">{solution.description}</p>
                        <p className="text-sm mt-1">Fairness: {(solution.fairness_score * 100).toFixed(0)}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
