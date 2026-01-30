import React, { useState, useEffect, useCallback } from 'react'
import { View, StyleSheet, Dimensions } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import * as SplashScreen from 'expo-splash-screen'
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av'
import { Navigation } from './src/navigation'

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync()

const { width, height } = Dimensions.get('window')

export default function App() {
  const [showSplashVideo, setShowSplashVideo] = useState(true)
  const [appIsReady, setAppIsReady] = useState(false)

  useEffect(() => {
    // Hide the native splash screen once our component mounts
    SplashScreen.hideAsync()
  }, [])

  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (status.isLoaded && status.didJustFinish) {
      setShowSplashVideo(false)
      setAppIsReady(true)
    }
  }, [])

  const onVideoError = useCallback(() => {
    // If video fails to load, just show the app
    setShowSplashVideo(false)
    setAppIsReady(true)
  }, [])

  if (showSplashVideo) {
    return (
      <View style={styles.splashContainer}>
        <StatusBar style="light" />
        <Video
          source={require('./assets/splash-video.mp4')}
          style={styles.video}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping={false}
          onPlaybackStatusUpdate={onPlaybackStatusUpdate}
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
  },
  video: {
    width: width,
    height: height,
    position: 'absolute',
    top: 0,
    left: 0,
  },
})
