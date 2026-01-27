import React, { useEffect, useState, Suspense } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { LoginScreen } from '../screens'
import { useAuthStore } from '../store/auth'
import { colors } from '../theme'

// Lazy load portal navigators to avoid react-native-screens bug
const AdminNavigator = React.lazy(() => import('./AdminNavigator'))
const PartnerNavigator = React.lazy(() => import('./PartnerNavigator'))
const ClientNavigator = React.lazy(() => import('./ClientNavigator'))
const AffiliateNavigator = React.lazy(() => import('./AffiliateNavigator'))

function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  )
}

export function Navigation() {
  const [isLoading, setIsLoading] = useState(true)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const portalType = useAuthStore((state) => state.portalType)
  const checkAuth = useAuthStore((state) => state.checkAuth)

  useEffect(() => {
    const init = async () => {
      try {
        await checkAuth()
      } catch (e) {
        console.warn('checkAuth error:', e)
      }
      setIsLoading(false)
    }
    init()
  }, [])

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!isAuthenticated || !portalType) {
    return <LoginScreen />
  }

  const renderPortal = () => {
    switch (portalType) {
      case 'admin':
        return <AdminNavigator />
      case 'partner':
        return <PartnerNavigator />
      case 'client':
        return <ClientNavigator />
      case 'affiliate':
        return <AffiliateNavigator />
      default:
        return <LoginScreen />
    }
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      {renderPortal()}
    </Suspense>
  )
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    color: colors.text,
    fontSize: 16,
  },
})
