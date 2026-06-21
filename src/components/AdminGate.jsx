import { useState, useEffect } from 'react'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD

export default function AdminGate({ children, onUnlock }) {
        const [unlocked, setUnlocked] = useState(localStorage.getItem('is_admin') === 'true')
        const [input, setInput] = useState('')
        const [error, setError] = useState('')

        useEffect(() => {
                if (unlocked) onUnlock?.()
        }, [unlocked])

        function handleSubmit(e) {
                e.preventDefault()
                if (input === ADMIN_PASSWORD) {
                        localStorage.setItem('is_admin', 'true')
                        setUnlocked(true)
                } else {
                        setError('Senha incorreta')
                }
        }

        if (unlocked) return children

        return (
                <form
                        onSubmit={handleSubmit}
                        style={{ marginTop: 24, paddingTop: 12, borderTop: '1px solid #eee', maxWidth: 260 }}
                >
                        <details>
                                <summary style={{ cursor: 'pointer', color: '#888', fontSize: 13 }}>Sou admin</summary>
                                <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                                        <input
                                                type="password"
                                                placeholder="senha de admin"
                                                value={input}
                                                onChange={(e) => setInput(e.target.value)}
                                                style={{ flex: 1 }}
                                        />
                                        <button type="submit">Entrar</button>
                                </div>
                                {error && <p style={{ color: 'red', fontSize: 12 }}>{error}</p>}
                        </details>
                </form>
        )
}
