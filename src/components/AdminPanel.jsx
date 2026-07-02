import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { syncGamesFromApi, updateResultsOnly } from '../lib/footballApi'

export default function AdminPanel({ onSynced }) {
  const [status, setStatus] = useState('')
  const [rules, setRules] = useState({ exact_score_points: 3, correct_winner_points: 1, wrong_points: 0 })
  const [games, setGames] = useState([])
  const [showLock, setShowLock] = useState(false)

  useEffect(() => {
    supabase.from('scoring_rules').select('*').single().then(({ data }) => { if (data) setRules(data) })
    loadFinishedGames()
  }, [])

  async function loadFinishedGames() {
    const { data } = await supabase
      .from('games')
      .select('id, home_team, away_team, score_locked, home_score, away_score')
      .eq('status', 'FINISHED')
      .order('kickoff')
    setGames(data || [])
  }

  async function handleSync() {
    setStatus('Sincronizando...')
    try {
      const count = await syncGamesFromApi()
      setStatus(`✅ ${count} jogos sincronizados!`)
      onSynced?.()
      loadFinishedGames()
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

  async function toggleLock(game) {
    const newVal = !game.score_locked
    const { error } = await supabase.from('games').update({ score_locked: newVal }).eq('id', game.id)
    if (!error) {
      setGames((prev) => prev.map((g) => g.id === game.id ? { ...g, score_locked: newVal } : g))
    }
  }

  async function saveScore(game, home, away) {
    const { error } = await supabase
      .from('games')
      .update({ home_score: Number(home), away_score: Number(away), score_locked: true })
      .eq('id', game.id)
    if (!error) {
      setGames((prev) => prev.map((g) => g.id === game.id ? { ...g, home_score: Number(home), away_score: Number(away), score_locked: true } : g))
      onSynced?.()
    }
  }

  return (
    <div>
      <button onClick={handleSync}>Sincronizar jogos da Copa</button>{' '}
      <button onClick={handleUpdateResults} className="btn secondary">
        🔄 Atualizar só resultados
      </button>

      <div style={{ marginTop: 12 }}>
        <label>Pontos por placar exato: </label>
        <input type="number" value={rules.exact_score_points} onChange={(e) => setRules({ ...rules, exact_score_points: Number(e.target.value) })} />
        <br />
        <label>Pontos por acertar só o vencedor: </label>
        <input type="number" value={rules.correct_winner_points} onChange={(e) => setRules({ ...rules, correct_winner_points: Number(e.target.value) })} />
        <br />
        <button onClick={saveRules} style={{ marginTop: 8 }}>Salvar regra de pontuação</button>
      </div>

      <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px dashed #cbd5e1' }}>
        <button className="btn secondary" onClick={() => setShowLock(!showLock)}>
          🔒 {showLock ? 'Esconder' : 'Gerenciar placares travados'}
        </button>

        {showLock && (
          <div style={{ marginTop: 8 }}>
            <p className="muted">
              Placares travados não são sobrescritos pelo sincronizar — use pra corrigir jogos que foram pra prorrogação/pênaltis.
            </p>
            {games.map((g) => (
              <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontSize: 13, flexWrap: 'wrap' }}>
                <span style={{ flex: 1 }}>{g.home_team} x {g.away_team}</span>
                <input id={`sh-${g.id}`} type="number" defaultValue={g.home_score ?? ''} style={{ width: 36, textAlign: 'center' }} />
                <span>x</span>
                <input id={`sa-${g.id}`} type="number" defaultValue={g.away_score ?? ''} style={{ width: 36, textAlign: 'center' }} />
                <button
                  className="btn secondary"
                  onClick={() => saveScore(g, document.getElementById(`sh-${g.id}`).value, document.getElementById(`sa-${g.id}`).value)}
                  style={{ fontSize: 12 }}
                >
                  Salvar e travar
                </button>
                {g.score_locked && (
                  <button
                    onClick={() => toggleLock(g)}
                    style={{ background: '#dc2626', color: 'white', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 12 }}
                  >
                    🔓 Destravar
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {status && <p>{status}</p>}
    </div>
  )
}
