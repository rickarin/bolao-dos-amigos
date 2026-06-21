import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export function usePlayer() {
  const [player, setPlayer] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) loadProfile(session.user)
      else setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) loadProfile(session.user)
      else {
        setPlayer(null)
        setIsAdmin(false)
        setLoading(false)
      }
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  async function loadProfile(user) {
    const { data: profile } = await supabase.from('players').select('*').eq('id', user.id).maybeSingle()
    setPlayer(profile || null)

    const { data: adminRow } = await supabase.from('admins').select('id').eq('id', user.id).maybeSingle()
    setIsAdmin(!!adminRow)

    setLoading(false)
  }

  async function signup(email, password, nickname, inviteCode) {
    // 1. valida o convite antes de qualquer coisa
    const { data: invite, error: inviteError } = await supabase
      .from('invite_codes')
      .select('*')
      .eq('code', inviteCode.trim())
      .eq('used', false)
      .maybeSingle()

    if (inviteError || !invite) {
      throw new Error('Código de convite inválido ou já utilizado.')
    }

    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error

    if (data.user) {
      const { error: profileError } = await supabase
        .from('players')
        .insert({ id: data.user.id, nickname })
      if (profileError) throw profileError

      // marca o convite como usado
      await supabase.from('invite_codes').update({ used: true, used_by: data.user.id }).eq('code', invite.code)
    }

    if (data.session) await loadProfile(data.user)
  }

  async function login(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function logout() {
    await supabase.auth.signOut()
    setPlayer(null)
    setIsAdmin(false)
  }

  return { player, isAdmin, loading, login, signup, logout }
}
