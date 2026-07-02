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

  for (const row of rows) {
    // Se o placar vier null (prorrogação sem regularTime na API), não sobrescreve o que está no banco
    const updateData = { ...row }
    if (row.home_score === null && row.away_score === null && row.status === 'FINISHED') {
      delete updateData.home_score
      delete updateData.away_score
    }

    const { error } = await supabase
      .from('games')
      .upsert(updateData, { onConflict: 'id' })
    if (error) throw error
  }

  return rows.length
}

export async function updateResultsOnly() {
  const rows = await fetchAndMapMatches()
  const updates = rows.filter((r) => r.status === 'FINISHED' || r.status === 'LIVE')

  for (const r of updates) {
    const updateData = {
      status: r.status,
      updated_at: r.updated_at,
    }

    // Só atualiza placar se não vier null (preserva correção manual pra jogos de prorrogação)
    if (r.home_score !== null) updateData.home_score = r.home_score
    if (r.away_score !== null) updateData.away_score = r.away_score

    const { error } = await supabase
      .from('games')
      .update(updateData)
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

  return data.matches.map((m) => {
    const duration = m.score?.duration // 'REGULAR', 'EXTRA_TIME', 'PENALTY_SHOOTOUT'
    const wentToExtra = duration === 'EXTRA_TIME' || duration === 'PENALTY_SHOOTOUT'

    // Se foi pra prorrogação/pênaltis, usa regularTime (90 min)
    // Se regularTime não existir nesses casos, usa null pra não sobrescrever o que está no banco
    const homeScore = wentToExtra
      ? (m.score?.regularTime?.home ?? null)
      : (m.score?.fullTime?.home ?? null)

    const awayScore = wentToExtra
      ? (m.score?.regularTime?.away ?? null)
      : (m.score?.fullTime?.away ?? null)

    return {
      id: m.id,
      home_team: m.homeTeam?.name || 'A definir',
      away_team: m.awayTeam?.name || 'A definir',
      home_team_crest: m.homeTeam?.crest || null,
      away_team_crest: m.awayTeam?.crest || null,
      kickoff: m.utcDate,
      stage: m.stage,
      status: m.status,
      home_score: homeScore,
      away_score: awayScore,
      updated_at: new Date().toISOString(),
    }
  })
}
