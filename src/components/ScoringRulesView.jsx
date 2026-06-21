import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function ScoringRulesView() {
  const [rules, setRules] = useState(null)

  useEffect(() => {
    supabase
      .from('scoring_rules')
      .select('*')
      .single()
      .then(({ data }) => setRules(data))
  }, [])

  if (!rules) return null

  return (
    <details className="rules-box">
      <summary style={{ cursor: 'pointer', fontWeight: 600 }}>📋 Regras de pontuação</summary>
      <ul style={{ marginTop: 8, marginBottom: 0 }}>
        <li>Placar exato: <strong>{rules.exact_score_points} pts</strong></li>
        <li>Acertou só o vencedor (ou empate): <strong>{rules.correct_winner_points} pts</strong></li>
        <li>Errou: <strong>{rules.wrong_points} pts</strong></li>
      </ul>
    </details>
  )
}
