import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { api } from '../services/api'
import { User, AuthState } from '../types'

const TOKEN_KEY = 'auth_token'

interface AuthStore extends AuthState {
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  setUser: (user: User | null) => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email: string, password: string) => {
    try {
      const response = await api.login(email, password)
      await api.setToken(response.token)
      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (error) {
      throw error
    }
  },

  logout: async () => {
    await api.setToken(null)
    await AsyncStorage.removeItem(TOKEN_KEY)
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    })
  },

  checkAuth: async () => {
    try {
      set({ isLoading: true })

      let token: string | null = null
      try {
        token = await AsyncStorage.getItem(TOKEN_KEY)
      } catch (e) {
        console.warn('AsyncStorage error:', e)
      }

      if (!token) {
        set({ isLoading: false, isAuthenticated: false })
        return
      }

      await api.setToken(token)
      const response = await api.getMe()

      // Check if user has admin access
      const user = response.user
      if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
        await api.setToken(null)
        set({ isLoading: false, isAuthenticated: false })
        throw new Error('Access denied. Admin privileges required.')
      }

      set({
        user: response.user,
        token,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (error) {
      console.warn('Auth check error:', error)
      try {
        await api.setToken(null)
      } catch (e) {
        // ignore
      }
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      })
    }
  },

  setUser: (user: User | null) => {
    set({ user })
  },
}))
