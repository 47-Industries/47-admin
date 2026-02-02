import React, { useRef } from 'react'
import { Animated, StyleSheet, ViewStyle } from 'react-native'
import {
  PinchGestureHandler,
  PanGestureHandler,
  State,
  PinchGestureHandlerGestureEvent,
  PanGestureHandlerGestureEvent,
  GestureHandlerRootView,
} from 'react-native-gesture-handler'

interface ZoomableViewProps {
  children: React.ReactNode
  style?: ViewStyle
  minScale?: number
  maxScale?: number
}

export function ZoomableView({
  children,
  style,
  minScale = 1,
  maxScale = 4,
}: ZoomableViewProps) {
  // Scale
  const baseScale = useRef(new Animated.Value(1)).current
  const pinchScale = useRef(new Animated.Value(1)).current
  const scale = Animated.multiply(baseScale, pinchScale)
  const lastScale = useRef(1)

  // Translation
  const translateX = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(0)).current
  const lastTranslateX = useRef(0)
  const lastTranslateY = useRef(0)

  // Focal point offset for pinch
  const focalX = useRef(new Animated.Value(0)).current
  const focalY = useRef(new Animated.Value(0)).current

  const panRef = useRef(null)
  const pinchRef = useRef(null)

  const onPinchEvent = Animated.event<PinchGestureHandlerGestureEvent>(
    [{ nativeEvent: { scale: pinchScale, focalX: focalX, focalY: focalY } }],
    { useNativeDriver: true }
  )

  const onPinchStateChange = (event: PinchGestureHandlerGestureEvent) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      // Update base scale when gesture ends
      let newScale = lastScale.current * event.nativeEvent.scale
      newScale = Math.min(Math.max(newScale, minScale), maxScale)
      lastScale.current = newScale

      baseScale.setValue(newScale)
      pinchScale.setValue(1)

      // Reset to default position if scale is at minimum
      if (newScale <= minScale) {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start()
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start()
        lastTranslateX.current = 0
        lastTranslateY.current = 0
      }
    }
  }

  const onPanEvent = Animated.event<PanGestureHandlerGestureEvent>(
    [{ nativeEvent: { translationX: translateX, translationY: translateY } }],
    { useNativeDriver: true }
  )

  const onPanStateChange = (event: PanGestureHandlerGestureEvent) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      // Only allow panning when zoomed in
      if (lastScale.current > minScale) {
        lastTranslateX.current += event.nativeEvent.translationX
        lastTranslateY.current += event.nativeEvent.translationY
      }
      translateX.setOffset(lastTranslateX.current)
      translateX.setValue(0)
      translateY.setOffset(lastTranslateY.current)
      translateY.setValue(0)
    }
  }

  // Double tap to reset
  const handleDoubleTap = () => {
    if (lastScale.current > minScale) {
      // Reset to original scale
      Animated.parallel([
        Animated.spring(baseScale, {
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }),
      ]).start()
      lastScale.current = 1
      lastTranslateX.current = 0
      lastTranslateY.current = 0
      translateX.setOffset(0)
      translateY.setOffset(0)
    }
  }

  return (
    <GestureHandlerRootView style={[styles.container, style]}>
      <PanGestureHandler
        ref={panRef}
        simultaneousHandlers={pinchRef}
        onGestureEvent={onPanEvent}
        onHandlerStateChange={onPanStateChange}
        minPointers={1}
        maxPointers={2}
      >
        <Animated.View style={styles.wrapper}>
          <PinchGestureHandler
            ref={pinchRef}
            simultaneousHandlers={panRef}
            onGestureEvent={onPinchEvent}
            onHandlerStateChange={onPinchStateChange}
          >
            <Animated.View
              style={[
                styles.content,
                {
                  transform: [
                    { translateX },
                    { translateY },
                    { scale },
                  ],
                },
              ]}
            >
              {children}
            </Animated.View>
          </PinchGestureHandler>
        </Animated.View>
      </PanGestureHandler>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  wrapper: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
})
