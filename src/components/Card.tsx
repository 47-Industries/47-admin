import React from 'react'
import { View, StyleSheet, ViewStyle } from 'react-native'
import { colors, borderRadius, spacing } from '../theme'

interface CardProps {
  children: React.ReactNode
  style?: ViewStyle
  borderColor?: string
}

export function Card({ children, style, borderColor }: CardProps) {
  return (
    <View style={[styles.card, borderColor && { borderColor, borderWidth: 2 }, style]}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
  },
})
