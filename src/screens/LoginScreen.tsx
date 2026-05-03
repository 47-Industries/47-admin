import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as WebBrowser from 'expo-web-browser'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Svg, { Path, G } from 'react-native-svg'
import { useAuthStore } from '../store/auth'
import { api } from '../services/api'
import { colors, portalColors, spacing, borderRadius, fontSize, fontWeight } from '../theme'
import { PortalType, PortalAccess } from '../types'

WebBrowser.maybeCompleteAuthSession()

type ScreenState = 'login' | 'portal_selection'

interface PortalInfo {
  type: PortalType
  title: string
  description: string
  icon: keyof typeof Ionicons.glyphMap
}

const portals: PortalInfo[] = [
  {
    type: 'admin',
    title: 'Admin Portal',
    description: 'Manage orders, products, and business operations',
    icon: 'shield-checkmark-outline',
  },
  {
    type: 'partner',
    title: 'Partner Portal',
    description: 'Track leads, commissions, and referrals',
    icon: 'people-outline',
  },
  {
    type: 'client',
    title: 'Client Portal',
    description: 'View projects, invoices, and contracts',
    icon: 'briefcase-outline',
  },
  {
    type: 'affiliate',
    title: 'Affiliate Portal',
    description: 'Earn points and rewards through referrals',
    icon: 'gift-outline',
  },
]

export function LoginScreen() {
  const [screenState, setScreenState] = useState<ScreenState>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Temporary storage for login response before portal selection
  const [pendingLoginData, setPendingLoginData] = useState<{
    token: string
    user: any
    portalAccess: PortalAccess
  } | null>(null)

  const login = useAuthStore((state) => state.login)
  const setUserDirectly = useAuthStore((state) => state.setUser)

  const handleOAuthSignIn = async () => {
    const redirectUri = 'fortysevenadmin://oauth/callback'
    const handoffUrl =
      'https://47industries.com/api/auth/mobile-oauth-handoff?next=' + encodeURIComponent(redirectUri)
    const startUrl =
      'https://47industries.com/login?callbackUrl=' + encodeURIComponent(handoffUrl)

    setLoading(true)
    try {
      const result = await WebBrowser.openAuthSessionAsync(startUrl, redirectUri)
      if (result.type !== 'success' || !result.url) {
        // user backed out
        return
      }
      const fragment = result.url.split('#')[1] || ''
      const params = new URLSearchParams(fragment)
      const token = params.get('token')
      if (!token) {
        Alert.alert('Sign-in failed', 'No token returned from 47 Industries.')
        return
      }
      const access: PortalAccess = {
        admin: params.get('portal_admin') === '1',
        partner: params.get('portal_partner') === '1',
        client: params.get('portal_client') === '1',
        affiliate: params.get('portal_affiliate') === '1',
      }

      // Persist the token and fetch the full user record
      await api.setToken(token)
      const me = await api.getMe()
      const user = me.user

      const availablePortals = (Object.keys(access) as PortalType[]).filter((k) => access[k])
      if (availablePortals.length === 0) {
        Alert.alert('Access Denied', 'You do not have access to any portals.')
        await api.setToken(null)
        return
      }

      if (availablePortals.length === 1) {
        const portal = availablePortals[0]
        await AsyncStorage.setItem('portal_type', portal)
        useAuthStore.setState({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
          portalType: portal,
          portalAccess: access,
          partner: me.partner || null,
          client: me.client || null,
          affiliate: me.affiliate || null,
        })
      } else {
        setPendingLoginData({ token, user, portalAccess: access })
        setScreenState('portal_selection')
      }
    } catch (err: any) {
      Alert.alert('Sign-in failed', err?.message || 'Could not complete sign-in')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password')
      return
    }

    setLoading(true)
    try {
      // First, authenticate and get user data to check portal access
      const response = await api.login(email, password)
      const user = response.user

      // Derive portal access from user associations
      const access: PortalAccess = response.portalAccess || {
        admin: user.role === 'ADMIN' || user.role === 'SUPER_ADMIN',
        partner: !!user.partnerId,
        client: !!user.clientId,
        affiliate: !!user.affiliateId,
      }

      // Count available portals
      const availablePortals = (Object.keys(access) as PortalType[]).filter(
        (key) => access[key]
      )

      if (availablePortals.length === 0) {
        Alert.alert('Access Denied', 'You do not have access to any portals.')
        return
      }

      if (availablePortals.length === 1) {
        // Only one portal - go directly to it
        await login(email, password, availablePortals[0])
      } else {
        // Multiple portals - show selection screen
        setPendingLoginData({
          token: response.token,
          user,
          portalAccess: access,
        })
        setScreenState('portal_selection')
      }
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  const handlePortalSelect = async (portalType: PortalType) => {
    if (!pendingLoginData) return

    setLoading(true)
    try {
      // Complete login with selected portal
      await login(email, password, portalType)
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to access portal')
    } finally {
      setLoading(false)
    }
  }

  const getAvailablePortals = () => {
    if (!pendingLoginData) return []
    return portals.filter((p) => pendingLoginData.portalAccess[p.type])
  }

  // Portal Selection Screen
  if (screenState === 'portal_selection') {
    const availablePortals = getAvailablePortals()

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={32} color={colors.success} />
            </View>
            <Text style={styles.welcomeTitle}>Welcome back!</Text>
            <Text style={styles.welcomeSubtitle}>
              {pendingLoginData?.user?.name || 'User'}
            </Text>
            <Text style={styles.selectText}>Select a portal to continue</Text>
          </View>

          <View style={styles.portalList}>
            {availablePortals.map((portal) => (
              <TouchableOpacity
                key={portal.type}
                style={styles.portalCard}
                onPress={() => handlePortalSelect(portal.type)}
                activeOpacity={0.7}
                disabled={loading}
              >
                <View style={[styles.portalIconContainer, { backgroundColor: `${portalColors[portal.type]}20` }]}>
                  <Ionicons
                    name={portal.icon}
                    size={28}
                    color={portalColors[portal.type]}
                  />
                </View>
                <View style={styles.portalInfo}>
                  <Text style={styles.portalTitle}>{portal.title}</Text>
                  <Text style={styles.portalDescription}>{portal.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>

          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}

          <TouchableOpacity
            style={styles.signOutLink}
            onPress={() => {
              setPendingLoginData(null)
              setScreenState('login')
              setEmail('')
              setPassword('')
            }}
          >
            <Ionicons name="arrow-back" size={16} color={colors.textMuted} />
            <Text style={styles.signOutText}>Sign in with different account</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // Login Screen
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.loginHeader}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.appName}>47 Industries</Text>
            <Text style={styles.tagline}>Business Management Platform</Text>
          </View>

          <View style={styles.descriptionBox}>
            <Text style={styles.descriptionText}>
              Access your admin dashboard, partner portal, client projects, or affiliate program - all in one place.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email or Username</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.passwordToggle}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.loginButton,
                loading && styles.buttonDisabled,
              ]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <>
                  <ActivityIndicator size="small" color={colors.text} />
                  <Text style={styles.buttonText}>Signing in...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="log-in-outline" size={20} color={colors.text} />
                  <Text style={styles.buttonText}>Sign In</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={[styles.ssoButton, loading && styles.buttonDisabled]}
              onPress={handleOAuthSignIn}
              disabled={loading}
            >
              <Svg width={22} height={22} viewBox="0 0 512 512">
                <G transform="translate(56, 56)">
                  <Path
                    d="M0 320 L0 224 L112 112 L112 192 L56 248 L56 320 L168 320 L168 192 L112 192 L224 80 L224 400 L168 400 L168 376 L0 376 L0 320Z"
                    fill="#ffffff"
                  />
                  <Path
                    d="M184 80 L400 80 L400 136 L304 136 L192 320 L192 400 L136 400 L136 320 L232 152 L184 152 L184 80Z"
                    fill="#ffffff"
                  />
                </G>
              </Svg>
              <Text style={styles.ssoButtonText}>Continue with 47 Industries</Text>
            </TouchableOpacity>
            <Text style={styles.ssoHint}>Sign in with Google, Apple, or MotoRev</Text>
          </View>

          <View style={styles.footerInfo}>
            <View style={styles.featureRow}>
              <Ionicons name="shield-checkmark" size={16} color={colors.textMuted} />
              <Text style={styles.featureText}>Admin</Text>
              <Ionicons name="people" size={16} color={colors.textMuted} />
              <Text style={styles.featureText}>Partner</Text>
              <Ionicons name="briefcase" size={16} color={colors.textMuted} />
              <Text style={styles.featureText}>Client</Text>
              <Ionicons name="gift" size={16} color={colors.textMuted} />
              <Text style={styles.featureText}>Affiliate</Text>
            </View>
          </View>

          <Text style={styles.footer}>47 Industries v1.0.0</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.xl,
  },
  keyboardView: {
    flex: 1,
  },
  loginHeader: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: spacing.md,
  },
  appName: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  tagline: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  descriptionBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  descriptionText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    marginBottom: spacing.xl,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
  },
  inputIcon: {
    marginLeft: spacing.md,
  },
  input: {
    flex: 1,
    padding: spacing.md,
    color: colors.text,
    fontSize: fontSize.md,
  },
  passwordToggle: {
    padding: spacing.md,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    backgroundColor: colors.primary,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  ssoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  ssoButtonText: {
    color: '#ffffff',
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  ssoHint: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  footerInfo: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginRight: spacing.sm,
  },
  footer: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: 'auto',
  },
  // Portal Selection Screen Styles
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
    marginTop: spacing.xl,
  },
  checkCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${colors.success}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  welcomeTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  welcomeSubtitle: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  selectText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  portalList: {
    marginBottom: spacing.xl,
  },
  portalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  portalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  portalInfo: {
    flex: 1,
  },
  portalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  portalDescription: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
  },
  signOutLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  signOutText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
})
