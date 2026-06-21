import { useState } from 'react'
import { syncGamesFromApi, updateResultsOnly } from '../lib/footballApi'
import { supabase } from '../lib/supabaseClient'

export default function AdminPanel({ onSynced }) {
  const [status, setStatus] = useState('')
  const [rules, setRules] = useState({ exact_score_points: 3, correct_winner_points: 1, wrong_points: 0 })

  async function handleSync() {
    setStatus('Sincronizando...')
    try {
      const count = await syncGamesFromApi()
      setStatus(`✅ ${count} jogos sincronizados!`)
      onSynced?.()
    } catch (err) {
      setStatus('❌ Erro: ' + err.message)
    }
  }

  async function handleUpdateResults() {
    setStatus('Atualizando resultados...')
    try {
      const count = await updateResultsOnly()
      setStatus(`✅ ${count} resultados atualizados!`)
      onSynced?.()
    } catch (err) {
      setStatus('❌ Erro: ' + err.message)
    }
  }

  async function saveRules() {
    const { error } = await supabase.from('scoring_rules').update(rules).eq('id', 1)
    setStatus(error ? '❌ Erro ao salvar regra' : '✅ Regra salva!')
  }

  return (
    <div style={{ border: '1px dashed #999', padding: 12, marginTop: 24 }}>
      <h4>⚙️ Painel Admin</h4>
      <button onClick={handleSync}>Sincronizar jogos da Copa</button>{' '}
      <button onClick={handleUpdateResults} className="btn secondary">
        🔄 Atualizar só resultados
      </button>

      <div style={{ marginTop: 12 }}>
        <label>Pontos por placar exato: </label>
        <input
          type="number"
          value={rules.exact_score_points}
          onChange={(e) => setRules({ ...rules, exact_score_points: Number(e.target.value) })}
        />
        <br />
        <label>Pontos por acertar só o vencedor: </label>
        <input
          type="number"
          value={rules.correct_winner_points}
          onChange={(e) => setRules({ ...rules, correct_winner_points: Number(e.target.value) })}
        />
        <br />
        <button onClick={saveRules} style={{ marginTop: 8 }}>
          Salvar regra de pontuação
        </button>
      </div>

      {status && <p>{status}</p>}
    </div>
  )
}
