import React, { useState, useEffect, useRef } from 'react'
import { View, StyleSheet, Dimensions } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import * as SplashScreen from 'expo-splash-screen'
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av'
import { Navigation } from './src/navigation'

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync().catch(() => {})

const { width, height } = Dimensions.get('window')

export default function App() {
  const [showSplashVideo, setShowSplashVideo] = useState(true)
  const videoRef = useRef<Video>(null)
  const hasFinished = useRef(false)

  const finishSplash = () => {
    if (hasFinished.current) return
    hasFinished.current = true
    setShowSplashVideo(false)
  }

  useEffect(() => {
    // Hide the native splash screen
    SplashScreen.hideAsync().catch(() => {})

    // Fallback timeout - if video doesn't finish in 6 seconds, show app anyway
    const timeout = setTimeout(() => {
      console.log('Splash timeout reached')
      finishSplash()
    }, 6000)

    return () => clearTimeout(timeout)
  }, [])

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded && status.didJustFinish) {
      console.log('Video finished')
      finishSplash()
    }
  }

  const onVideoLoad = () => {
    console.log('Video loaded')
  }

  const onVideoError = (error: string) => {
    console.log('Video error:', error)
    finishSplash()
  }

  if (showSplashVideo) {
    return (
      <View style={styles.splashContainer}>
        <StatusBar style="light" hidden />
        <Video
          ref={videoRef}
          source={require('./assets/splash-video.mp4')}
          style={styles.video}
          resizeMode={ResizeMode.COVER}
          shouldPlay={true}
          isLooping={false}
          isMuted={true}
          onPlaybackStatusUpdate={onPlaybackStatusUpdate}
          onLoad={onVideoLoad}
          onError={onVideoError}
        />
      </View>
    )
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Navigation />
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  video: {
    width: width,
    height: height,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
})
