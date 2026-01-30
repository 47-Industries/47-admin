import React, { useState, useEffect } from 'react'
import { View, StyleSheet, Dimensions } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Video, ResizeMode } from 'expo-av'
import { Navigation } from './src/navigation'

const { width, height } = Dimensions.get('window')

export default function App() {
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    // Video is 4 seconds, hide splash after it finishes
    const timer = setTimeout(() => {
      setShowSplash(false)
    }, 4200)

    return () => clearTimeout(timer)
  }, [])

  if (showSplash) {
    return (
      <View style={styles.splashContainer}>
        <StatusBar style="light" hidden />
        <Video
          source={require('./assets/splash-video.mp4')}
          style={styles.video}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping={false}
          isMuted
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
    flex: 1,
    width: width,
    height: height,
  },
})
