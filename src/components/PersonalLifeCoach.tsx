import { useState } from 'react'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Input } from './ui/input'
import { Card } from './ui/card'
import { AlertCircle, Brain, TrendingUp, Shield } from 'lucide-react'
import { supabase, API_BASE, getAuthHeaders } from '../lib/supabase'

export function PersonalLifeCoach() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('other')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const analyzeDecision = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/personal-life-coach`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ title, description, category })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Analysis failed:', error)
      setResult({ error: 'Failed to analyze decision. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Personal Strategic Life Coach</h1>
        <p className="text-gray-600">AI-powered decision assistant using game theory and bias detection</p>
      </div>

      <Card className="p-6 mb-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Decision Title</label>
            <Input 
              placeholder="e.g., Should I accept this job offer?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Category</label>
            <select 
              className="w-full border rounded p-2"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="career">Career</option>
              <option value="financial">Financial</option>
              <option value="relationship">Relationship</option>
              <option value="purchase">Major Purchase</option>
              <option value="conflict">Conflict Resolution</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Describe Your Situation</label>
            <Textarea 
              placeholder="Include: what the decision is, who else is involved, what your options are, what you're worried about..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
            />
          </div>

          <Button 
            onClick={analyzeDecision}
            disabled={loading || !title || !description}
            className="w-full"
          >
            {loading ? 'Analyzing...' : 'Get Strategic Advice'}
          </Button>
        </div>
      </Card>

      {result && (
        <div className="space-y-4">
          {/* Biases Detected */}
          {result.biases_detected?.length > 0 && (
            <Card className="p-6 border-yellow-500">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-yellow-500 mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">⚠️ Cognitive Biases Detected</h3>
                  {result.biases_detected.map((bias: any, i: number) => (
                    <div key={i} className="mb-2 p-3 bg-yellow-50 rounded">
                      <p className="font-medium capitalize">{bias.type.replace('_', ' ')}</p>
                      <p className="text-sm text-gray-700">{bias.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Strategic Recommendation */}
          <Card className="p-6 border-green-500">
            <div className="flex items-start gap-3">
              <Brain className="text-green-500 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold mb-2">🎯 Strategic Recommendation</h3>
                <div className="space-y-3">
                  <div>
                    <p className="font-medium">Primary Action: {result.recommendation?.recommendation?.primary_action}</p>
                    <p className="text-sm text-gray-700 mt-1">{result.recommendation?.recommendation?.rationale}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Confidence: {(result.recommendation?.confidence * 100).toFixed(0)}%</p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${result.recommendation?.confidence * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Key Insights */}
          {result.recommendation?.recommendation?.key_insights && (
            <Card className="p-6">
              <div className="flex items-start gap-3">
                <TrendingUp className="text-blue-500 mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">💡 Key Insights</h3>
                  <ul className="space-y-2">
                    {result.recommendation.recommendation.key_insights.map((insight: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-blue-500">•</span>
                        <span className="text-sm">{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          )}

          {/* Alternatives */}
          {result.recommendation?.recommendation?.alternatives && (
            <Card className="p-6">
              <div className="flex items-start gap-3">
                <Shield className="text-purple-500 mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">🔀 Alternative Strategies</h3>
                  <div className="space-y-2">
                    {result.recommendation.recommendation.alternatives.map((alt: any, i: number) => (
                      <div key={i} className="p-3 bg-gray-50 rounded">
                        <p className="font-medium capitalize">{alt.action}</p>
                        <p className="text-sm text-gray-600">Expected Value: {alt.expected_value} | Risk: {alt.risk_level}</p>
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
