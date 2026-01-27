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
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../store/auth'
import { PortalCard } from '../components/PortalCard'
import { colors, portalColors, spacing, borderRadius, fontSize, fontWeight } from '../theme'
import { PortalType } from '../types'

type ScreenState = 'portal_selection' | 'login'

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
  const [screenState, setScreenState] = useState<ScreenState>('portal_selection')
  const [selectedPortal, setSelectedPortal] = useState<PortalType | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const login = useAuthStore((state) => state.login)

  const handlePortalSelect = (portalType: PortalType) => {
    setSelectedPortal(portalType)
    setScreenState('login')
  }

  const handleBack = () => {
    setScreenState('portal_selection')
    setSelectedPortal(null)
    setEmail('')
    setPassword('')
  }

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password')
      return
    }

    if (!selectedPortal) {
      Alert.alert('Error', 'Please select a portal')
      return
    }

    setLoading(true)
    try {
      await login(email, password, selectedPortal)
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  const getPortalInfo = () => portals.find((p) => p.type === selectedPortal)
  const portalInfo = getPortalInfo()
  const accentColor = selectedPortal ? portalColors[selectedPortal] : colors.primary

  if (screenState === 'portal_selection') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.welcomeTitle}>Welcome to 47 Industries</Text>
            <Text style={styles.welcomeSubtitle}>Select your portal to continue</Text>
          </View>

          <View style={styles.portalList}>
            {portals.map((portal) => (
              <PortalCard
                key={portal.type}
                type={portal.type}
                title={portal.title}
                description={portal.description}
                icon={portal.icon}
                onPress={() => handlePortalSelect(portal.type)}
              />
            ))}
          </View>

          <Text style={styles.footer}>47 Industries</Text>
        </ScrollView>
      </SafeAreaView>
    )
  }

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
          {/* Back Button */}
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.loginHeader}>
            <View style={[styles.portalIcon, { backgroundColor: `${accentColor}20` }]}>
              <Ionicons
                name={portalInfo?.icon || 'log-in-outline'}
                size={32}
                color={accentColor}
              />
            </View>
            <Text style={styles.loginTitle}>{portalInfo?.title || 'Sign In'}</Text>
            <Text style={styles.loginSubtitle}>
              Enter your credentials to access your account
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
                { backgroundColor: accentColor },
                loading && styles.buttonDisabled,
              ]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <Text style={styles.buttonText}>Signing in...</Text>
              ) : (
                <>
                  <Ionicons name="log-in-outline" size={20} color={colors.text} />
                  <Text style={styles.buttonText}>Sign In</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.footer}>47 Industries</Text>
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
    padding: spacing.xxl,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
    marginTop: spacing.xl,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: spacing.lg,
  },
  welcomeTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  welcomeSubtitle: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  portalList: {
    marginBottom: spacing.xxxl,
  },
  footer: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: 'auto',
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    marginLeft: -spacing.sm,
  },
  loginHeader: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  portalIcon: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  loginTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  loginSubtitle: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: 'center',
  },
  form: {
    marginBottom: spacing.xxxl,
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
    marginTop: spacing.lg,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
})
