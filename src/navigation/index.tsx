import React, { useEffect, useState, Suspense } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { LoginScreen } from '../screens'
import { useAuthStore } from '../store/auth'

// Lazy load navigation to avoid react-native-screens bug
const AuthenticatedApp = React.lazy(() => import('./AuthenticatedApp'))

export function Navigation() {
  const [isLoading, setIsLoading] = useState(true)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
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
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    )
  }

  if (!isAuthenticated) {
    return <LoginScreen />
  }

  return (
    <Suspense fallback={
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading app...</Text>
      </View>
    }>
      <AuthenticatedApp />
    </Suspense>
  )
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a0a0a',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
  },
})
