import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useToast } from '../hooks/useToast.jsx'

const STAGE_LABELS = {
  GROUP_STAGE: 'Fase de Grupos',
  LAST_16: 'Oitavas de Final',
  QUARTER_FINALS: 'Quartas de Final',
  SEMI_FINALS: 'Semifinal',
  THIRD_PLACE: 'Disputa de 3º Lugar',
  FINAL: 'Final',
}

function dayKey(dateStr) {
  const d = new Date(dateStr)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function GamesList({ player, refreshTrigger }) {
  const showToast = useToast()
  const [games, setGames] = useState([])
  const [myGuesses, setMyGuesses] = useState({}) // game_id -> { home, away }
  const [othersBets, setOthersBets] = useState({}) // game_id -> [{ nickname, home, away }]
  const [loading, setLoading] = useState(true)
  const [dayIndex, setDayIndex] = useState(null)

  useEffect(() => {
    loadData()
  }, [refreshTrigger])

  async function loadData() {
    const [{ data: gamesData }, { data: betsData }, { data: playersData }] = await Promise.all([
      supabase.from('games').select('*').order('kickoff', { ascending: true }),
      supabase.from('bets').select('*'), // RLS já filtra o que cada um pode ver
      supabase.from('players').select('id, nickname'),
    ])

    const nicknameById = Object.fromEntries((playersData || []).map((p) => [p.id, p.nickname]))

    const mine = {}
    const others = {}

    betsData?.forEach((b) => {
      if (b.player_id === player.id) {
        mine[b.game_id] = { home: b.home_score_guess, away: b.away_score_guess }
      } else {
        if (!others[b.game_id]) others[b.game_id] = []
        others[b.game_id].push({
          nickname: nicknameById[b.player_id] || '???',
          home: b.home_score_guess,
          away: b.away_score_guess,
        })
      }
    })

    setGames(gamesData || [])
    setMyGuesses(mine)
    setOthersBets(others)
    setLoading(false)
  }

  function updateGuess(gameId, side, value) {
    setMyGuesses((prev) => ({ ...prev, [gameId]: { ...prev[gameId], [side]: value } }))
  }

  async function saveBet(gameId) {
    const guess = myGuesses[gameId]
    if (guess?.home === undefined || guess?.away === undefined) return

    const { error } = await supabase.from('bets').upsert(
      {
        player_id: player.id,
        game_id: gameId,
        home_score_guess: Number(guess.home),
        away_score_guess: Number(guess.away),
      },
      { onConflict: 'player_id,game_id' }
    )
    if (error) {
      alert('Erro ao salvar palpite: ' + error.message)
      showToast?.('Erro ao salvar palpite', 'error')
    } else {
      showToast?.('Palpite salvo!')
    }
  }

  if (loading) return <p className="muted">Carregando jogos...</p>
  if (games.length === 0) return <p className="muted">Nenhum jogo sincronizado ainda. Use o painel admin.</p>

  const days = [...new Set(games.map((g) => dayKey(g.kickoff)))].sort()
  const todayKey = dayKey(new Date())
  let initialIndex = days.indexOf(todayKey)
  if (initialIndex === -1) {
    initialIndex = days.findIndex((d) => d >= todayKey)
    if (initialIndex === -1) initialIndex = days.length - 1
  }
  const currentIndex = dayIndex ?? initialIndex
  const currentDay = days[currentIndex]
  const gamesOfDay = games.filter((g) => dayKey(g.kickoff) === currentDay)

  const grouped = {}
  gamesOfDay.forEach((g) => {
    const key = g.stage || 'Outros'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(g)
  })

  const dateLabel = new Date(currentDay + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })

  return (
    <div>
      <div className="day-nav">
        <button onClick={() => setDayIndex(currentIndex - 1)} disabled={currentIndex === 0}>←</button>
        <span className="day-label">
          {currentDay === todayKey ? '🔵 Hoje · ' : ''}
          {dateLabel}
        </span>
        <button onClick={() => setDayIndex(currentIndex + 1)} disabled={currentIndex === days.length - 1}>→</button>
      </div>

      {Object.entries(grouped).map(([stage, stageGames]) => (
        <div key={stage}>
          <span className="stage-tag">{STAGE_LABELS[stage] || stage}</span>
          {stageGames.map((g) => {
            const kickoffPassed = new Date(g.kickoff) < new Date()
            const guess = myGuesses[g.id] || {}
            const timeLabel = new Date(g.kickoff).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            const others = othersBets[g.id] || []

            return (
              <div key={g.id} className={`game-card ${g.status === 'FINISHED' ? 'finished' : ''}`}>
                <div className="muted">{timeLabel}</div>

                <div className="game-row">
                  <span className="team-name" style={{ textAlign: 'right' }}>
                    {g.home_team}{' '}
                    {g.home_team_crest && <img src={g.home_team_crest} alt="" width={18} style={{ verticalAlign: 'middle' }} />}
                  </span>
                  <input type="number" min="0" disabled={kickoffPassed} value={guess.home ?? ''} onChange={(e) => updateGuess(g.id, 'home', e.target.value)} />
                  <span>x</span>
                  <input type="number" min="0" disabled={kickoffPassed} value={guess.away ?? ''} onChange={(e) => updateGuess(g.id, 'away', e.target.value)} />
                  <span className="team-name" style={{ textAlign: 'left' }}>
                    {g.away_team_crest && <img src={g.away_team_crest} alt="" width={18} style={{ verticalAlign: 'middle' }} />}{' '}
                    {g.away_team}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {!kickoffPassed ? (
                    <button className="btn secondary" onClick={() => saveBet(g.id)}>Salvar palpite</button>
                  ) : (
                    <span className="muted">Palpites encerrados</span>
                  )}

                  {g.status === 'FINISHED' && (
                    <span className="result-badge">Resultado: {g.home_score} x {g.away_score}</span>
                  )}
                </div>

                {/* Palpites de todo mundo só aparecem depois que o jogo começa */}
                {kickoffPassed && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #e2e8f0' }}>
                    <span className="muted" style={{ fontWeight: 600 }}>Palpites da turma:</span>
                    {others.length === 0 ? (
                      <p className="muted" style={{ margin: '4px 0 0' }}>Ninguém mais palpitou esse jogo.</p>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                        {others.map((o, i) => (
                          <span key={i} className="stage-tag" style={{ background: '#f1f5f9', color: '#334155' }}>
                            {o.nickname}: {o.home} x {o.away}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
