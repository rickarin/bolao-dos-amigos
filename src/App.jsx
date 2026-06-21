import { useState } from 'react'
import { usePlayer } from './hooks/usePlayer'
import { useTheme } from './hooks/useTheme'
import Login from './components/Login'
import GamesList from './components/GamesList'
import Leaderboard from './components/Leaderboard'
import ScoringRulesView from './components/ScoringRulesView'
import AdminPage from './AdminPage'

function App() {
  const { player, isAdmin, loading, login, signup, logout } = usePlayer()
  const { theme, toggleTheme } = useTheme()
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  if (loading) return <p className="muted" style={{ padding: 24 }}>Carregando...</p>
  if (!player) return <Login onLogin={login} onSignup={signup} />

  // Rota simples sem biblioteca: /admin mostra a página de admin
  if (window.location.pathname === '/admin') {
    return <AdminPage player={player} isAdmin={isAdmin} onSynced={() => setRefreshTrigger((t) => t + 1)} />
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>🇧🇷 Bolão da Copa</h1>
        <div className="user-info">
          Olá, <strong>{player.nickname}</strong>{' '}
          <button className="theme-toggle" onClick={toggleTheme} title="Alternar tema">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          {isAdmin && (
            <a href="/admin" className="btn ghost" style={{ textDecoration: 'none' }}>
              ⚙️ Admin
            </a>
          )}
          <button className="btn ghost" onClick={logout}>Sair</button>
        </div>
      </header>

      <ScoringRulesView />

      <h2 className="section-title">🏆 Ranking</h2>
      <div className="card">
        <Leaderboard />
      </div>

      <h2 className="section-title">📅 Jogos</h2>
      <GamesList player={player} refreshTrigger={refreshTrigger} isAdmin={isAdmin} />
    </div>
  )
}

export default App
