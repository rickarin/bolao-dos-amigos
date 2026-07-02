import { supabase } from './supabaseClient'

const API_BASE = '/api/football'
const API_KEY = import.meta.env.VITE_FOOTBALL_API_KEY
const COMPETITION = 'WC'

export async function syncGamesFromApi() {
  const rows = await fetchAndMapMatches()

  const { data: lockedGames } = await supabase.from('games').select('id').eq('score_locked', true)
  const lockedIds = new Set((lockedGames || []).map((g) => g.id))

  for (const row of rows) {
    const updateData = { ...row }
    if (lockedIds.has(row.id)) {
      delete updateData.home_score
      delete updateData.away_score
    }
    const { error } = await supabase.from('games').upsert(updateData, { onConflict: 'id' })
    if (error) throw error
  }

  return rows.length
}

export async function updateResultsOnly() {
  const rows = await fetchAndMapMatches()
  const updates = rows.filter((r) => r.status === 'FINISHED' || r.status === 'LIVE')

  const { data: lockedGames } = await supabase.from('games').select('id').eq('score_locked', true)
  const lockedIds = new Set((lockedGames || []).map((g) => g.id))

  for (const r of updates) {
    const updateData = { status: r.status, updated_at: r.updated_at }
    if (!lockedIds.has(r.id)) {
      updateData.home_score = r.home_score
      updateData.away_score = r.away_score
    }
    const { error } = await supabase.from('games').update(updateData).eq('id', r.id)
    if (error) throw error
  }

  return updates.length
}

async function fetchAndMapMatches() {
  const res = await fetch(`${API_BASE}/competitions/${COMPETITION}/matches`, {
    headers: { 'X-Auth-Token': API_KEY },
  })
  if (!res.ok) throw new Error(`Erro na API de futebol: ${res.status}`)
  const data = await res.json()

  return data.matches.map((m) => ({
    id: m.id,
    home_team: m.homeTeam?.name || 'A definir',
    away_team: m.awayTeam?.name || 'A definir',
    home_team_crest: m.homeTeam?.crest || null,
    away_team_crest: m.awayTeam?.crest || null,
    kickoff: m.utcDate,
    stage: m.stage,
    status: m.status,
    home_score: m.score?.fullTime?.home ?? null,
    away_score: m.score?.fullTime?.away ?? null,
    updated_at: new Date().toISOString(),
  }))
}
