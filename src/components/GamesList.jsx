import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useToast } from '../hooks/useToast.jsx'

function betOutcome(guess, game) {
  if (game.status !== 'FINISHED' || game.home_score == null) return null
  const exact = guess.home === game.home_score && guess.away === game.away_score
  if (exact) return 'exact'
  const guessedWinner = Math.sign(guess.home - guess.away)
  const actualWinner = Math.sign(game.home_score - game.away_score)
  return guessedWinner === actualWinner ? 'winner' : 'wrong'
}

const OUTCOME_STYLE = {
  exact: { background: '#dcfce7', color: '#15803d', border: '1px solid #86efac' },
  winner: { background: '#fef9c3', color: '#92400e', border: '1px solid #fde68a' },
  wrong: { background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' },
}

const STAGE_LABELS = {
  GROUP_STAGE: 'Fase de Grupos',
  LAST_16: 'Oitavas de Final',
  QUARTER_FINALS: 'Quartas de Final',
  SEMI_FINALS: 'Semifinal',
  THIRD_PLACE: 'Disputa de 3º Lugar',
  FINAL: 'Final',
}

function DaySummary({ gamesOfDay, myGuesses, othersBets, player, isAdmin }) {
  const [open, setOpen] = useState(false)

  // Monta a lista de jogadores únicos que aparecem em algum palpite visível do dia
  const playersSet = new Map()
  playersSet.set(player.id, player.nickname)
  gamesOfDay.forEach((g) => {
    const kickoffPassed = new Date(g.kickoff) < new Date()
    const visible = kickoffPassed || isAdmin ? othersBets[g.id] || [] : []
    visible.forEach((o) => playersSet.set(o.nickname, o.nickname))
  })
  const playerNames = [...new Set(playersSet.values())]

  if (gamesOfDay.length === 0) return null

  return (
    <details className="card" open={open} onToggle={(e) => setOpen(e.target.open)} style={{ marginBottom: 16 }}>
      <summary style={{ cursor: 'pointer', fontWeight: 600 }}>📊 Ver resumo dos palpites da turma nesse dia</summary>
      <div style={{ overflowX: 'auto', marginTop: 10 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: 6 }}>Jogo</th>
              {playerNames.map((name) => (
                <th key={name} style={{ padding: 6, textAlign: 'center' }}>{name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {gamesOfDay.map((g) => {
              const kickoffPassed = new Date(g.kickoff) < new Date()
              const visible = kickoffPassed || isAdmin ? othersBets[g.id] || [] : []
              const byName = Object.fromEntries(visible.map((o) => [o.nickname, o]))
              if (myGuesses[g.id]) byName[player.nickname] = myGuesses[g.id]

              return (
                <tr key={g.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: 6, whiteSpace: 'nowrap' }}>{g.home_team} x {g.away_team}</td>
                  {playerNames.map((name) => {
                    const guess = byName[name]
                    if (!guess) return <td key={name} style={{ textAlign: 'center', color: 'var(--muted)' }}>—</td>
                    const outcome = betOutcome(guess, g)
                    const style = outcome ? OUTCOME_STYLE[outcome] : {}
                    return (
                      <td key={name} style={{ textAlign: 'center', padding: 4 }}>
                        <span style={{ ...style, padding: '2px 6px', borderRadius: 6 }}>
                          {guess.home}x{guess.away}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </details>
  )
}

function dayKey(dateStr) {
  const d = new Date(dateStr)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function GamesList({ player, refreshTrigger, isAdmin }) {
  const showToast = useToast()
  const [games, setGames] = useState([])
  const [myGuesses, setMyGuesses] = useState({}) // game_id -> { home, away }
  const [othersBets, setOthersBets] = useState({}) // game_id -> [{ nickname, home, away }]
  const [loading, setLoading] = useState(true)
  const [dayIndex, setDayIndex] = useState(null)

  useEffect(() => {
    loadData()

    // Realtime: qualquer mudança em games ou bets atualiza a tela sozinha
    const channel = supabase
      .channel('games-and-bets-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, () => {
        loadData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bets' }, () => {
        loadData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
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

      <DaySummary gamesOfDay={gamesOfDay} myGuesses={myGuesses} othersBets={othersBets} player={player} isAdmin={isAdmin} />

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
                    <span
                      className="result-badge"
                      style={
                        guess.home !== undefined && guess.away !== undefined && betOutcome(guess, g)
                          ? { ...OUTCOME_STYLE[betOutcome(guess, g)], padding: '2px 8px', borderRadius: 6 }
                          : {}
                      }
                    >
                      Resultado: {g.home_score} x {g.away_score}
                    </span>
                  )}
                </div>

                {/* Palpites de todo mundo só aparecem depois que o jogo começa (admin sempre vê tudo) */}
                {(() => {
                  const visibleOthers = kickoffPassed || isAdmin ? others : []
                  if (visibleOthers.length === 0 && !kickoffPassed) return null

                  return (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #e2e8f0' }}>
                      <span className="muted" style={{ fontWeight: 600 }}>Palpites da turma:</span>
                      {visibleOthers.length === 0 ? (
                        <p className="muted" style={{ margin: '4px 0 0' }}>Ninguém mais palpitou esse jogo.</p>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                          {visibleOthers.map((o, i) => {
                            const outcome = betOutcome(o, g)
                            const style = outcome ? OUTCOME_STYLE[outcome] : { background: '#f1f5f9', color: '#334155' }
                            return (
                              <span key={i} className="stage-tag" style={style}>
                                {outcome === 'exact' && '🎯 '}
                                {o.nickname}: {o.home} x {o.away}
                              </span>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
