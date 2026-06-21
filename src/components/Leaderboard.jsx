import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { calculatePoints } from '../lib/scoring'

export default function Leaderboard() {
  const [ranking, setRanking] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRanking()
  }, [])

  async function loadRanking() {
    const [{ data: players }, { data: games }, { data: bets }, { data: rules }] = await Promise.all([
      supabase.from('players').select('*'),
      supabase.from('games').select('*'),
      supabase.from('bets').select('*'),
      supabase.from('scoring_rules').select('*').single(),
    ])

    const gamesById = Object.fromEntries((games || []).map((g) => [g.id, g]))

    const scores = {}
    players?.forEach((p) => (scores[p.id] = { nickname: p.nickname, points: 0 }))

    bets?.forEach((bet) => {
      const game = gamesById[bet.game_id]
      if (!game) return
      const pts = calculatePoints(bet, game, rules)
      if (pts != null && scores[bet.player_id]) {
        scores[bet.player_id].points += pts
      }
    })

    const sorted = Object.values(scores).sort((a, b) => b.points - a.points)
    setRanking(sorted)
    setLoading(false)
  }

  if (loading) return <p className="muted">Calculando ranking...</p>

  return (
    <div>
      <ol className="ranking-list" style={{ listStyle: 'decimal', paddingLeft: 20 }}>
        {ranking.map((r, i) => (
          <li key={i} style={{ display: 'list-item' }}>
            <strong>{r.nickname}</strong> — {r.points} pts
          </li>
        ))}
      </ol>
      <button className="btn secondary" onClick={loadRanking}>Atualizar ranking</button>
    </div>
  )
}
