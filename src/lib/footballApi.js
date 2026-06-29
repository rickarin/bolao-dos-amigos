import { supabase } from './supabaseClient'

const API_BASE = '/api/football' // passa pelo proxy do Vite (configurado em vite.config.js) pra evitar erro de CORS
const API_KEY = import.meta.env.VITE_FOOTBALL_API_KEY
// Código da competição: 'WC' = Copa do Mundo FIFA
const COMPETITION = 'WC'

/**
 * Busca os jogos da Copa na API e insere/atualiza no Supabase.
 * Chame isso a partir de um botão "Sincronizar jogos" (admin).
 */
export async function syncGamesFromApi() {
  const rows = await fetchAndMapMatches()
  const { error } = await supabase.from('games').upsert(rows, { onConflict: 'id' })
  if (error) throw error
  return rows.length
}

/**
 * Atualiza só placar/status dos jogos já existentes — mesma chamada de API,
 * mas pensada pra rodar com mais frequência sem comer sua cota (free tier ~10 req/min).
 */
export async function updateResultsOnly() {
  const rows = await fetchAndMapMatches()
  const updates = rows.filter((r) => r.status === 'FINISHED' || r.status === 'LIVE')

  for (const r of updates) {
    const { error } = await supabase
      .from('games')
      .update({ home_score: r.home_score, away_score: r.away_score, status: r.status, updated_at: r.updated_at })
      .eq('id', r.id)
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
    home_score: m.score?.regularTime?.home ?? m.score?.fullTime?.home ?? null,
    away_score: m.score?.regularTime?.away ?? m.score?.fullTime?.away ?? null,
    updated_at: new Date().toISOString(),
  }))
}
