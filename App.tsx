import React, { useState, useEffect, useRef } from 'react'
import { View, StyleSheet, Dimensions } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useVideoPlayer, VideoView } from 'expo-video'
import { Navigation } from './src/navigation'

const { width, height } = Dimensions.get('window')

const videoSource = require('./assets/splash-video.mp4')

export default function App() {
  const [showSplash, setShowSplash] = useState(true)

  const player = useVideoPlayer(videoSource, player => {
    player.loop = false
    player.muted = true
    player.play()
  })

  useEffect(() => {
    // Hide splash after video duration (4 seconds + buffer)
    const timer = setTimeout(() => {
      setShowSplash(false)
    }, 4200)

    return () => clearTimeout(timer)
  }, [])

  if (showSplash) {
    return (
      <View style={styles.splashContainer}>
        <StatusBar style="light" hidden />
        <VideoView
          style={styles.video}
          player={player}
          nativeControls={false}
          contentFit="contain"
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: width,
    height: height,
  },
})
