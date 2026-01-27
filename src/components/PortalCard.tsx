import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, portalColors, portalColorsBg, spacing, borderRadius, fontSize, fontWeight } from '../theme'
import { PortalType } from '../types'

interface PortalCardProps {
  type: PortalType
  title: string
  description: string
  icon: keyof typeof Ionicons.glyphMap
  onPress: () => void
  disabled?: boolean
}

export function PortalCard({ type, title, description, icon, onPress, disabled }: PortalCardProps) {
  const accentColor = portalColors[type]
  const bgColor = portalColorsBg[type]

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { borderColor: disabled ? colors.border : accentColor },
        disabled && styles.cardDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={24} color={disabled ? colors.textMuted : accentColor} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, disabled && styles.titleDisabled]}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={20}
        color={disabled ? colors.border : colors.textMuted}
      />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  titleDisabled: {
    color: colors.textMuted,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
})
