import AdminPanel from './components/AdminPanel'
import AdminBetEntry from './components/AdminBetEntry'
import AdminUsersPanel from './components/AdminUsersPanel'

export default function AdminPage({ player, isAdmin, onSynced }) {
        if (!isAdmin) {
                return (
                        <div className="app-shell" style={{ textAlign: 'center', marginTop: 80 }}>
                                <h2>🔒 Acesso restrito</h2>
                                <p className="muted">Essa página é só para administradores do bolão.</p>
                                <a href="/">Voltar pro bolão</a>
                        </div>
                )
        }

        return (
                <div className="app-shell">
                        <header className="app-header">
                                <h1>⚙️ Painel Admin</h1>
                                <a href="/" className="btn ghost" style={{ textDecoration: 'none' }}>
                                        ← Voltar pro bolão
                                </a>
                        </header>

                        <div className="card">
                                <AdminPanel onSynced={onSynced} />
                        </div>
                        <div className="card">
                                <AdminBetEntry />
                        </div>
                        <div className="card">
                                <AdminUsersPanel currentPlayerId={player.id} />
                        </div>
                </div>
        )
}
