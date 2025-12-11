import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors, borderRadius, spacing, fontSize, fontWeight } from '../theme'

interface BadgeProps {
  text: string
  variant?: 'default' | 'success' | 'warning' | 'error' | 'primary'
}

export function Badge({ text, variant = 'default' }: BadgeProps) {
  const containerStyle = [styles.container, styles[`container_${variant}`]]
  const textStyle = [styles.text, styles[`text_${variant}`]]

  return (
    <View style={containerStyle}>
      <Text style={textStyle}>{text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  container_default: {
    backgroundColor: colors.surfaceHover,
  },
  container_success: {
    backgroundColor: colors.successBg,
  },
  container_warning: {
    backgroundColor: colors.warningBg,
  },
  container_error: {
    backgroundColor: colors.errorBg,
  },
  container_primary: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  text_default: {
    color: colors.textSecondary,
  },
  text_success: {
    color: colors.success,
  },
  text_warning: {
    color: colors.warning,
  },
  text_error: {
    color: colors.error,
  },
  text_primary: {
    color: colors.primary,
  },
})
