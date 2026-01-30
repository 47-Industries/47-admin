import React, { useState, useEffect, useRef } from 'react'
import { View, StyleSheet, Animated, Dimensions } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import * as SplashScreen from 'expo-splash-screen'
import { useVideoPlayer, VideoView, AudioMixingMode } from 'expo-video'
import { Navigation } from './src/navigation'

// Keep native splash hidden - we control everything
SplashScreen.preventAutoHideAsync().catch(() => {})

const { width, height } = Dimensions.get('window')
const videoSource = require('./assets/splash-video.mp4')

export default function App() {
  const [appReady, setAppReady] = useState(false)
  const [showSplash, setShowSplash] = useState(true)
  const fadeAnim = useRef(new Animated.Value(1)).current

  const player = useVideoPlayer(videoSource, player => {
    player.loop = false
    player.muted = true
    player.audioMixingMode = AudioMixingMode.MixWithOthers
    player.play()
  })

  useEffect(() => {
    // Hide native splash immediately
    SplashScreen.hideAsync().catch(() => {})

    // Mark app as ready after a short delay (simulating preload)
    const readyTimer = setTimeout(() => {
      setAppReady(true)
    }, 1000)

    // After video duration, fade out and show app
    const splashTimer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        setShowSplash(false)
      })
    }, 4000)

    return () => {
      clearTimeout(readyTimer)
      clearTimeout(splashTimer)
    }
  }, [])

  return (
    <View style={styles.container}>
      <StatusBar style="light" hidden={showSplash} />

      {/* App content - always mounted for preloading */}
      <View style={[styles.appContainer, { opacity: appReady ? 1 : 0 }]}>
        <SafeAreaProvider>
          <Navigation />
        </SafeAreaProvider>
      </View>

      {/* Splash overlay with fade */}
      {showSplash && (
        <Animated.View style={[styles.splashContainer, { opacity: fadeAnim }]}>
          <VideoView
            style={styles.video}
            player={player}
            nativeControls={false}
            contentFit="cover"
          />
        </Animated.View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  appContainer: {
    flex: 1,
  },
  splashContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0a0a0a',
    zIndex: 10,
  },
  video: {
    flex: 1,
    width: width,
    height: height,
  },
})
