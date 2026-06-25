/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  fullName: string | null
  avatarUrl: string | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  fullName: null,
  avatarUrl: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
})

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name || null
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)
        setUser(session?.user ?? null)

        if (window.location.hash.includes('access_token')) {
          window.history.replaceState(null, '', window.location.pathname)
        }
      } catch (error) {
        console.error('Error fetching session:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    })

    if (error) {
      console.error('Error during Google sign-in:', error)
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setSession(null)
    } catch (error) {
      console.error('Error during sign-out:', error)
    }
  }

  return (
    <AuthContext.Provider value={{ user, session, fullName, avatarUrl, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
