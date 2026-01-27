import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { api } from '../services/api'
import { User, AuthState, PortalType, PortalAccess, Partner, Client, AffiliateStats } from '../types'

const TOKEN_KEY = 'auth_token'
const PORTAL_KEY = 'portal_type'

interface AuthStore extends AuthState {
  login: (email: string, password: string, portalType: PortalType) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  setUser: (user: User | null) => void
  setPortalType: (portalType: PortalType | null) => void
  switchPortal: (portalType: PortalType) => Promise<void>
  setPartnerData: (partner: Partner | null) => void
  setClientData: (client: Client | null) => void
  setAffiliateData: (affiliate: AffiliateStats | null) => void
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  portalType: null,
  portalAccess: null,
  partner: null,
  client: null,
  affiliate: null,

  login: async (email: string, password: string, portalType: PortalType) => {
    try {
      const response = await api.login(email, password, portalType)
      await api.setToken(response.token)
      await AsyncStorage.setItem(PORTAL_KEY, portalType)

      const user = response.user

      // Derive portal access from user associations (not role)
      const access: PortalAccess = response.portalAccess || {
        admin: user.role === 'ADMIN' || user.role === 'SUPER_ADMIN',
        partner: !!user.partnerId,
        client: !!user.clientId,
        affiliate: !!user.affiliateId,
      }

      // Validate portal access
      if (!access[portalType]) {
        throw new Error(`You don't have access to the ${portalType} portal`)
      }

      set({
        user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
        portalType,
        portalAccess: access,
        partner: response.partner || null,
        client: response.client || null,
        affiliate: response.affiliate || null,
      })
    } catch (error) {
      throw error
    }
  },

  logout: async () => {
    await api.setToken(null)
    await AsyncStorage.removeItem(TOKEN_KEY)
    await AsyncStorage.removeItem(PORTAL_KEY)
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      portalType: null,
      portalAccess: null,
      partner: null,
      client: null,
      affiliate: null,
    })
  },

  checkAuth: async () => {
    try {
      set({ isLoading: true })

      let token: string | null = null
      let savedPortalType: PortalType | null = null

      try {
        token = await AsyncStorage.getItem(TOKEN_KEY)
        const savedPortal = await AsyncStorage.getItem(PORTAL_KEY)
        if (savedPortal && ['admin', 'partner', 'client', 'affiliate'].includes(savedPortal)) {
          savedPortalType = savedPortal as PortalType
        }
      } catch (e) {
        console.warn('AsyncStorage error:', e)
      }

      if (!token || !savedPortalType) {
        set({ isLoading: false, isAuthenticated: false })
        return
      }

      await api.setToken(token)
      const response = await api.getMe()
      const user = response.user

      // Derive portal access from user associations (not role)
      const access: PortalAccess = response.portalAccess || {
        admin: user.role === 'ADMIN' || user.role === 'SUPER_ADMIN',
        partner: !!user.partnerId,
        client: !!user.clientId,
        affiliate: !!user.affiliateId,
      }

      // Verify user still has access to saved portal
      if (!access[savedPortalType]) {
        await api.setToken(null)
        await AsyncStorage.removeItem(TOKEN_KEY)
        await AsyncStorage.removeItem(PORTAL_KEY)
        set({ isLoading: false, isAuthenticated: false })
        throw new Error('Access denied. Portal access revoked.')
      }

      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        portalType: savedPortalType,
        portalAccess: access,
        partner: response.partner || null,
        client: response.client || null,
        affiliate: response.affiliate || null,
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
        portalType: null,
        portalAccess: null,
        partner: null,
        client: null,
        affiliate: null,
      })
    }
  },

  setUser: (user: User | null) => {
    set({ user })
  },

  setPortalType: (portalType: PortalType | null) => {
    if (portalType) {
      AsyncStorage.setItem(PORTAL_KEY, portalType)
    } else {
      AsyncStorage.removeItem(PORTAL_KEY)
    }
    set({ portalType })
  },

  switchPortal: async (portalType: PortalType) => {
    const { portalAccess } = get()
    if (!portalAccess || !portalAccess[portalType]) {
      throw new Error(`You don't have access to the ${portalType} portal`)
    }

    await AsyncStorage.setItem(PORTAL_KEY, portalType)

    // Fetch fresh portal-specific data
    try {
      const response = await api.getMe()
      set({
        portalType,
        partner: response.partner || null,
        client: response.client || null,
        affiliate: response.affiliate || null,
      })
    } catch (error) {
      // Just switch portal type even if data fetch fails
      set({ portalType })
    }
  },

  setPartnerData: (partner: Partner | null) => {
    set({ partner })
  },

  setClientData: (client: Client | null) => {
    set({ client })
  },

  setAffiliateData: (affiliate: AffiliateStats | null) => {
    set({ affiliate })
  },
}))
