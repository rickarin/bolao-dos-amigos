import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useToast } from '../hooks/useToast.jsx'

export default function PublicBetsToggle({ player, onUpdated }) {
        const showToast = useToast()
        const [checked, setChecked] = useState(player.bets_public || false)
        const [saving, setSaving] = useState(false)

        async function toggle() {
                const newValue = !checked
                setSaving(true)
                const { error } = await supabase.from('players').update({ bets_public: newValue }).eq('id', player.id)
                setSaving(false)

                if (error) {
                        showToast?.('Erro ao salvar preferência', 'error')
                        return
                }

                setChecked(newValue)
                showToast?.(newValue ? 'Seus palpites agora são públicos!' : 'Seus palpites estão escondidos de novo')
                onUpdated?.(newValue)
        }

        return (
                <label
                        style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                fontSize: 13,
                                cursor: 'pointer',
                                userSelect: 'none',
                        }}
                >
                        <input type="checkbox" checked={checked} onChange={toggle} disabled={saving} />
                        Deixar meus palpites visíveis pra todo mundo (antes do jogo começar)
                </label>
        )
}
