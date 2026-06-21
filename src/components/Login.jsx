import { useState } from 'react'

export default function Login({ onLogin, onSignup }) {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setSubmitting(true)
    try {
      if (mode === 'signup') {
        await onSignup(email, password, nickname, inviteCode)
        setInfo('Conta criada! Se for pedido, confirma seu email antes de entrar.')
      } else {
        await onLogin(email, password)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 320, margin: '80px auto', textAlign: 'center' }}>
      <h2>⚽ Bolão da Copa</h2>

      <div style={{ display: 'flex', marginBottom: 16, borderRadius: 8, overflow: 'hidden', border: '1px solid #cbd5e1' }}>
        <button
          type="button"
          onClick={() => setMode('login')}
          style={{ flex: 1, padding: 8, background: mode === 'login' ? '#1d4ed8' : '#fff', color: mode === 'login' ? '#fff' : '#1d4ed8', border: 'none' }}
        >
          Entrar
        </button>
        <button
          type="button"
          onClick={() => setMode('signup')}
          style={{ flex: 1, padding: 8, background: mode === 'signup' ? '#1d4ed8' : '#fff', color: mode === 'signup' ? '#fff' : '#1d4ed8', border: 'none' }}
        >
          Criar conta
        </button>
      </div>

      {mode === 'signup' && (
        <>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="seu nome (nickname)"
            required
            style={{ padding: 8, width: '100%', marginBottom: 10 }}
          />
          <input
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder="código de convite"
            required
            style={{ padding: 8, width: '100%', marginBottom: 10 }}
          />
        </>
      )}

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="seu@email.com"
        required
        style={{ padding: 8, width: '100%', marginBottom: 10 }}
      />

      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="senha (mínimo 6 caracteres)"
        required
        minLength={6}
        style={{ padding: 8, width: '100%', marginBottom: 12 }}
      />

      <button type="submit" disabled={submitting} style={{ padding: '8px 16px', width: '100%' }}>
        {submitting ? 'Aguarda...' : mode === 'signup' ? 'Criar conta' : 'Entrar'}
      </button>

      {error && <p style={{ color: 'red', fontSize: 13 }}>{error}</p>}
      {info && <p style={{ color: '#16a34a', fontSize: 13 }}>{info}</p>}
    </form>
  )
}
