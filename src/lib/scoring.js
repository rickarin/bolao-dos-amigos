/**
 * Calcula os pontos de um palpite com base no resultado real e na regra configurada.
 * rule = { exact_score_points, correct_winner_points, wrong_points }
 */
export function calculatePoints(bet, game, rule) {
  if (game.home_score == null || game.away_score == null) return null // jogo ainda não aconteceu

  const guessedWinner = Math.sign(bet.home_score_guess - bet.away_score_guess)
  const actualWinner = Math.sign(game.home_score - game.away_score)

  const exactScore =
    bet.home_score_guess === game.home_score && bet.away_score_guess === game.away_score

  if (exactScore) return rule.exact_score_points
  if (guessedWinner === actualWinner) return rule.correct_winner_points
  return rule.wrong_points
}
