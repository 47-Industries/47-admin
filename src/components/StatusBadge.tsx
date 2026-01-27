import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme'

type StatusType = 'success' | 'warning' | 'error' | 'info' | 'neutral'

interface StatusBadgeProps {
  status: StatusType
  label: string
  size?: 'sm' | 'md'
}

const statusStyles: Record<StatusType, { bg: string; text: string }> = {
  success: { bg: colors.successBg, text: colors.success },
  warning: { bg: colors.warningBg, text: colors.warning },
  error: { bg: colors.errorBg, text: colors.error },
  info: { bg: 'rgba(59, 130, 246, 0.1)', text: colors.primary },
  neutral: { bg: colors.surfaceHover, text: colors.textSecondary },
}

export function StatusBadge({ status, label, size = 'md' }: StatusBadgeProps) {
  const style = statusStyles[status]

  return (
    <View style={[
      styles.badge,
      { backgroundColor: style.bg },
      size === 'sm' && styles.badgeSm,
    ]}>
      <Text style={[
        styles.text,
        { color: style.text },
        size === 'sm' && styles.textSm,
      ]}>
        {label}
      </Text>
    </View>
  )
}

// Helper function to map common statuses to types
export function getStatusType(status: string): StatusType {
  const successStatuses = ['PAID', 'COMPLETED', 'ACTIVE', 'SIGNED', 'APPROVED', 'DELIVERED', 'WON']
  const warningStatuses = ['PENDING', 'PROCESSING', 'IN_PROGRESS', 'VIEWED', 'SENT', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION']
  const errorStatuses = ['OVERDUE', 'FAILED', 'CANCELLED', 'SUSPENDED', 'LOST', 'EXPIRED', 'REFUNDED']
  const infoStatuses = ['NEW', 'DRAFT', 'CONTACTED']

  const upperStatus = status.toUpperCase().replace(/_/g, ' ')

  if (successStatuses.some(s => upperStatus.includes(s))) return 'success'
  if (warningStatuses.some(s => upperStatus.includes(s))) return 'warning'
  if (errorStatuses.some(s => upperStatus.includes(s))) return 'error'
  if (infoStatuses.some(s => upperStatus.includes(s))) return 'info'
  return 'neutral'
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    textTransform: 'capitalize',
  },
  textSm: {
    fontSize: 10,
  },
})
