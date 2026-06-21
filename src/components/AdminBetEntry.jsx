import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useToast } from '../hooks/useToast.jsx'

export default function AdminBetEntry() {
        const showToast = useToast()
        const [players, setPlayers] = useState([])
        const [games, setGames] = useState([])
        const [playerId, setPlayerId] = useState('')
        const [guesses, setGuesses] = useState({}) // game_id -> { home, away }
        const [status, setStatus] = useState('')
        const [saving, setSaving] = useState(false)

        useEffect(() => {
                supabase.from('players').select('*').order('nickname').then(({ data }) => setPlayers(data || []))
                supabase
                        .from('games')
                        .select('*')
                        .order('kickoff', { ascending: true })
                        .then(({ data }) => setGames(data || []))
        }, [])

        useEffect(() => {
                if (!playerId) {
                        setGuesses({})
                        return
                }
                supabase
                        .from('bets')
                        .select('*')
                        .eq('player_id', playerId)
                        .then(({ data }) => {
                                const map = {}
                                data?.forEach((b) => {
                                        map[b.game_id] = { home: b.home_score_guess, away: b.away_score_guess }
                                })
                                setGuesses(map)
                        })
        }, [playerId])

        function updateGuess(gameId, side, value) {
                setGuesses((prev) => ({ ...prev, [gameId]: { ...prev[gameId], [side]: value } }))
        }

        async function saveAll() {
                if (!playerId) {
                        setStatus('Selecione um jogador primeiro')
                        return
                }

                const rows = Object.entries(guesses)
                        .filter(([, g]) => g?.home !== undefined && g?.home !== '' && g?.away !== undefined && g?.away !== '')
                        .map(([gameId, g]) => ({
                                player_id: playerId,
                                game_id: Number(gameId),
                                home_score_guess: Number(g.home),
                                away_score_guess: Number(g.away),
                        }))

                if (rows.length === 0) {
                        setStatus('Nenhum palpite preenchido')
                        return
                }

                setSaving(true)
                const { error } = await supabase.from('bets').upsert(rows, { onConflict: 'player_id,game_id' })
                setSaving(false)

                setStatus(error ? '❌ Erro: ' + error.message : `✅ ${rows.length} palpites salvos!`)
                showToast?.(error ? 'Erro ao salvar palpites' : `${rows.length} palpites salvos!`, error ? 'error' : 'success')
        }

        return (
                <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px dashed #cbd5e1' }}>
                        <h4 style={{ marginBottom: 8 }}>📝 Lançar palpites de um jogador (em lote)</h4>

                        <select value={playerId} onChange={(e) => setPlayerId(e.target.value)} style={{ marginBottom: 12, width: '100%', maxWidth: 280 }}>
                                <option value="">Selecione o jogador</option>
                                {players.map((p) => (
                                        <option key={p.id} value={p.id}>
                                                {p.nickname}
                                        </option>
                                ))}
                        </select>

                        {playerId && (
                                <>
                                        <div style={{ maxHeight: 400, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                                                        <thead style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                                                                <tr>
                                                                        <th style={{ textAlign: 'left', padding: 8 }}>Data</th>
                                                                        <th style={{ textAlign: 'left', padding: 8 }}>Jogo</th>
                                                                        <th style={{ padding: 8 }}>Placar</th>
                                                                </tr>
                                                        </thead>
                                                        <tbody>
                                                                {games.map((g) => {
                                                                        const guess = guesses[g.id] || {}
                                                                        return (
                                                                                <tr key={g.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                                                                                        <td style={{ padding: 8, whiteSpace: 'nowrap' }}>
                                                                                                {new Date(g.kickoff).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                                                                        </td>
                                                                                        <td style={{ padding: 8 }}>
                                                                                                {g.home_team} x {g.away_team}
                                                                                        </td>
                                                                                        <td style={{ padding: 8 }}>
                                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                                                                                                        <input
                                                                                                                type="number"
                                                                                                                min="0"
                                                                                                                value={guess.home ?? ''}
                                                                                                                onChange={(e) => updateGuess(g.id, 'home', e.target.value)}
                                                                                                                style={{ width: 36, textAlign: 'center' }}
                                                                                                        />
                                                                                                        <span>x</span>
                                                                                                        <input
                                                                                                                type="number"
                                                                                                                min="0"
                                                                                                                value={guess.away ?? ''}
                                                                                                                onChange={(e) => updateGuess(g.id, 'away', e.target.value)}
                                                                                                                style={{ width: 36, textAlign: 'center' }}
                                                                                                        />
                                                                                                </div>
                                                                                        </td>
                                                                                </tr>
                                                                        )
                                                                })}
                                                        </tbody>
                                                </table>
                                        </div>

                                        <button className="btn secondary" onClick={saveAll} disabled={saving} style={{ marginTop: 12 }}>
                                                {saving ? 'Salvando...' : 'Salvar tudo'}
                                        </button>
                                </>
                        )}

                        {status && <p className="muted">{status}</p>}
                </div>
        )
}
