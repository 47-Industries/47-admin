import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: keyof typeof Ionicons.glyphMap
  iconColor?: string
  color?: string
  trend?: {
    value: number
    isPositive: boolean
  }
  compact?: boolean
}

export function StatCard({ title, value, subtitle, icon, iconColor, color, trend, compact }: StatCardProps) {
  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {icon && (
          <Ionicons name={icon} size={18} color={iconColor || color || colors.textMuted} />
        )}
      </View>
      <Text style={[styles.value, compact && styles.valueCompact, color && { color }]}>{value}</Text>
      {(subtitle || trend) && (
        <View style={styles.footer}>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          {trend && (
            <View style={styles.trend}>
              <Ionicons
                name={trend.isPositive ? 'arrow-up' : 'arrow-down'}
                size={12}
                color={trend.isPositive ? colors.success : colors.error}
              />
              <Text style={[
                styles.trendValue,
                { color: trend.isPositive ? colors.success : colors.error }
              ]}>
                {Math.abs(trend.value)}%
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardCompact: {
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
  },
  value: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  valueCompact: {
    fontSize: fontSize.xl,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subtitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  trend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  trendValue: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
})
