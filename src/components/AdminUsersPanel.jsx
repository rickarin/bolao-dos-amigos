import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useToast } from '../hooks/useToast.jsx'

export default function AdminUsersPanel() {
  const showToast = useToast()
  const [players, setPlayers] = useState([])

  useEffect(() => {
    loadPlayers()
  }, [])

  async function loadPlayers() {
    const { data } = await supabase.from('players').select('*').order('nickname')
    setPlayers(data || [])
  }

  async function rename(id, newNickname) {
    const { error } = await supabase.from('players').update({ nickname: newNickname }).eq('id', id)
    if (error) showToast?.('Erro ao renomear', 'error')
    else {
      showToast?.('Nome atualizado!')
      loadPlayers()
    }
  }

  async function remove(id, nickname) {
    if (!confirm(`Remover ${nickname} do bolão? Isso apaga os palpites dele também.`)) return
    const { error } = await supabase.from('players').delete().eq('id', id)
    if (error) showToast?.('Erro ao remover', 'error')
    else {
      showToast?.('Jogador removido')
      loadPlayers()
    }
  }

  return (
    <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px dashed #cbd5e1' }}>
      <h4 style={{ marginBottom: 8 }}>👥 Gerenciar jogadores</h4>

      {players.map((p) => (
        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <input
            defaultValue={p.nickname}
            id={`nick-${p.id}`}
            style={{ flex: 1, padding: 4 }}
          />
          <button
            className="btn secondary"
            onClick={() => rename(p.id, document.getElementById(`nick-${p.id}`).value)}
          >
            Salvar
          </button>
          <button
            onClick={() => remove(p.id, p.nickname)}
            style={{ background: '#dc2626', color: 'white', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}
          >
            Remover
          </button>
        </div>
      ))}

      <p className="muted" style={{ marginTop: 10 }}>
        ⚠️ "Remover" apaga o perfil e os palpites do bolão, mas não exclui a conta de login dela —
        isso só pode ser feito direto no painel do Supabase (Authentication &gt; Users) por questão de segurança.
      </p>
    </div>
  )
}
