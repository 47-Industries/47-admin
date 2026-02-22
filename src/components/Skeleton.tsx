import React, { useEffect, useRef } from 'react'
import { Animated, StyleSheet, View, ViewStyle } from 'react-native'
import { colors, borderRadius, spacing } from '../theme'

interface SkeletonProps {
  width?: number | string
  height?: number
  borderRadius?: number
  style?: ViewStyle
}

export function Skeleton({ width = '100%', height = 16, borderRadius: br = borderRadius.sm, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    )
    animation.start()
    return () => animation.stop()
  }, [opacity])

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius: br,
          backgroundColor: colors.surfaceHover,
          opacity,
        },
        style,
      ]}
    />
  )
}

// Pre-built skeleton row for list items
export function SkeletonRow({ showAvatar = false }: { showAvatar?: boolean }) {
  return (
    <View style={skeletonStyles.row}>
      {showAvatar && (
        <Skeleton width={40} height={40} borderRadius={borderRadius.md} style={{ flexShrink: 0 }} />
      )}
      <View style={skeletonStyles.rowContent}>
        <Skeleton width="60%" height={14} />
        <View style={{ height: spacing.xs }} />
        <Skeleton width="40%" height={11} />
      </View>
      <Skeleton width={48} height={11} style={{ flexShrink: 0 }} />
    </View>
  )
}

// Pre-built skeleton card for stat/metric cards
export function SkeletonCard() {
  return (
    <View style={skeletonStyles.card}>
      <Skeleton width="50%" height={11} />
      <View style={{ height: spacing.sm }} />
      <Skeleton width="70%" height={28} />
      <View style={{ height: spacing.xs }} />
      <Skeleton width="40%" height={11} />
    </View>
  )
}

// Pre-built skeleton list: renders N skeleton rows
export function SkeletonList({ count = 5, showAvatar = false }: { count?: number; showAvatar?: boolean }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} showAvatar={showAvatar} />
      ))}
    </View>
  )
}

const skeletonStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowContent: {
    flex: 1,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
})
