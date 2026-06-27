import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { supabase } from '../lib/supabaseClient'
import { calculatePoints } from '../lib/scoring'
import { dayKey } from '../lib/daykey'

const COLORS = ['#009739', '#ffdf00', '#002776', '#dc2626', '#9333ea', '#0891b2', '#ea580c', '#65a30d']

export default function RankingChart() {
        const [chartData, setChartData] = useState([])
        const [playerNames, setPlayerNames] = useState([])
        const [loading, setLoading] = useState(true)

        useEffect(() => {
                loadChart()
        }, [])

        async function loadChart() {
                const [{ data: players }, { data: games }, { data: bets }, { data: rules }] = await Promise.all([
                        supabase.from('players').select('*'),
                        supabase.from('games').select('*'),
                        supabase.from('bets').select('*'),
                        supabase.from('scoring_rules').select('*').single(),
                ])

                if (!players || !games || !bets) {
                        setLoading(false)
                        return
                }

                const nicknameById = Object.fromEntries(players.map((p) => [p.id, p.nickname]))
                const gamesById = Object.fromEntries(games.map((g) => [g.id, g]))

                // Só rodadas (dias) que já tiveram pelo menos um jogo finalizado
                const finishedGames = games.filter((g) => g.status === 'FINISHED')
                const rounds = [...new Set(finishedGames.map((g) => dayKey(g.kickoff)))].sort()

                // pontos[jogador][rodada] = pontos ganhos NAQUELE dia
                const pointsByRound = {}
                players.forEach((p) => {
                        pointsByRound[p.id] = Object.fromEntries(rounds.map((r) => [r, 0]))
                })

                bets.forEach((b) => {
                        const game = gamesById[b.game_id]
                        if (!game || game.status !== 'FINISHED') return
                        const round = dayKey(game.kickoff)
                        const pts = calculatePoints(b, game, rules)
                        if (pts != null && pointsByRound[b.player_id]) {
                                pointsByRound[b.player_id][round] = (pointsByRound[b.player_id][round] || 0) + pts
                        }
                })

                // Acumula ao longo das rodadas
                const cumulative = {}
                players.forEach((p) => (cumulative[p.id] = 0))

                const data = rounds.map((round, i) => {
                        const row = { round: formatRoundLabel(round), roundKey: round }
                        players.forEach((p) => {
                                cumulative[p.id] += pointsByRound[p.id][round] || 0
                                row[nicknameById[p.id]] = cumulative[p.id]
                        })
                        return row
                })

                setChartData(data)
                setPlayerNames(players.map((p) => p.nickname))
                setLoading(false)
        }

        function formatRoundLabel(key) {
                const [, month, day] = key.split('-')
                return `${day}/${month}`
        }

        if (loading) return <p className="muted">Calculando gráfico...</p>
        if (chartData.length === 0) {
                return <p className="muted">Ainda não tem rodada finalizada pra montar o gráfico.</p>
        }

        return (
                <div style={{ width: '100%', height: 320 }}>
                        <ResponsiveContainer>
                                <LineChart data={chartData} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                        <XAxis dataKey="round" stroke="var(--muted)" fontSize={12} />
                                        <YAxis stroke="var(--muted)" fontSize={12} allowDecimals={false} />
                                        <Tooltip
                                                contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 13 }}
                                        />
                                        <Legend wrapperStyle={{ fontSize: 12 }} />
                                        {playerNames.map((name, i) => (
                                                <Line
                                                        key={name}
                                                        type="monotone"
                                                        dataKey={name}
                                                        stroke={COLORS[i % COLORS.length]}
                                                        strokeWidth={2}
                                                        dot={{ r: 3 }}
                                                        activeDot={{ r: 5 }}
                                                />
                                        ))}
                                </LineChart>
                        </ResponsiveContainer>
                </div>
        )
}
