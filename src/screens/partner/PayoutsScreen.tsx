import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { api } from '../../services/api'
import { StatusBadge, getStatusType } from '../../components/StatusBadge'
import { EmptyState } from '../../components/EmptyState'
import { SkeletonList } from '../../components/Skeleton'
import { colors, portalColors, spacing, borderRadius, fontSize, fontWeight } from '../../theme'
import { Payout } from '../../types'

interface PayoutsScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void
    goBack: () => void
  }
  hideHeader?: boolean
}

interface PayoutStats {
  totalEarned: number
  totalPending: number
  totalPaid: number
}

export function PayoutsScreen({ navigation, hideHeader }: PayoutsScreenProps) {
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [stats, setStats] = useState<PayoutStats>({ totalEarned: 0, totalPending: 0, totalPaid: 0 })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeFilter, setActiveFilter] = useState('ALL')

  const fetchPayouts = async () => {
    try {
      const params = activeFilter === 'ALL' ? {} : { status: activeFilter }
      const data = await api.getPartnerPayouts(params)
      setPayouts(data.payouts)

      // Calculate stats from payouts
      const paidPayouts = data.payouts.filter((p: Payout) => p.status === 'COMPLETED')
      const pendingPayouts = data.payouts.filter((p: Payout) => p.status === 'PENDING' || p.status === 'PROCESSING')

      const totalPaid = paidPayouts.reduce((sum: number, p: Payout) => sum + p.amount, 0)
      const totalPending = pendingPayouts.reduce((sum: number, p: Payout) => sum + p.amount, 0)

      setStats({
        totalEarned: totalPaid + totalPending,
        totalPending,
        totalPaid,
      })
    } catch (error) {
      console.error('Failed to fetch payouts:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchPayouts()
  }, [activeFilter])

  const onRefresh = () => {
    setRefreshing(true)
    fetchPayouts()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getPaymentMethodIcon = (method: string): keyof typeof Ionicons.glyphMap => {
    switch (method) {
      case 'STRIPE':
        return 'card-outline'
      case 'CHECK':
        return 'document-text-outline'
      case 'MANUAL':
        return 'cash-outline'
      default:
        return 'wallet-outline'
    }
  }

  const getPaymentMethodLabel = (method: string): string => {
    switch (method) {
      case 'STRIPE':
        return 'Bank Transfer'
      case 'CHECK':
        return 'Check'
      case 'MANUAL':
        return 'Manual Payment'
      default:
        return method
    }
  }

  const renderPayout = ({ item }: { item: Payout }) => (
    <View style={styles.payoutCard}>
      <View style={styles.payoutHeader}>
        <View style={styles.methodIcon}>
          <Ionicons
            name={getPaymentMethodIcon(item.method)}
            size={20}
            color={portalColors.partner}
          />
        </View>
        <View style={styles.payoutInfo}>
          <Text style={styles.payoutNumber}>{item.payoutNumber}</Text>
          <Text style={styles.payoutMethod}>{getPaymentMethodLabel(item.method)}</Text>
        </View>
        <View style={styles.payoutRight}>
          <Text style={styles.payoutAmount}>{formatCurrency(item.amount)}</Text>
          <StatusBadge status={getStatusType(item.status)} label={item.status} size="sm" />
        </View>
      </View>
      <View style={styles.payoutFooter}>
        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
          <Text style={styles.dateText}>
            {item.status === 'COMPLETED' && item.paidAt
              ? `Paid on ${formatDate(item.paidAt)}`
              : item.status === 'PROCESSING' && item.processedAt
              ? `Processing since ${formatDate(item.processedAt)}`
              : `Created on ${formatDate(item.createdAt)}`}
          </Text>
        </View>
        {item.notes && (
          <Text style={styles.payoutNotes}>{item.notes}</Text>
        )}
      </View>
    </View>
  )

  const statusFilters = ['ALL', 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']

  if (loading && payouts.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={hideHeader ? [] : ['top']}>
        <SkeletonList count={8} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={hideHeader ? [] : ['top']}>
      {!hideHeader && (
        <View style={styles.header}>
          <TouchableOpacity onPress={navigation.goBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payouts</Text>
          <View style={styles.placeholder} />
        </View>
      )}

      {/* Stats Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Earned</Text>
          <Text style={[styles.summaryValue, { color: portalColors.partner }]}>
            {formatCurrency(stats.totalEarned)}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Pending</Text>
          <Text style={[styles.summaryValue, { color: colors.warning }]}>
            {formatCurrency(stats.totalPending)}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Paid</Text>
          <Text style={[styles.summaryValue, { color: colors.success }]}>
            {formatCurrency(stats.totalPaid)}
          </Text>
        </View>
      </View>

      {/* Filter */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          data={statusFilters}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterChip, activeFilter === item && styles.filterChipActive]}
              onPress={() => setActiveFilter(item)}
            >
              <Text style={[styles.filterText, activeFilter === item && styles.filterTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item}
        />
      </View>

      {/* Payouts List */}
      <FlatList
        data={payouts}
        renderItem={renderPayout}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={portalColors.partner} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="wallet-outline"
            title="No payouts yet"
            description="Your payouts will appear here once you receive them"
          />
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },
  summary: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  summaryValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  filterContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterList: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: portalColors.partner,
  },
  filterText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.text,
  },
  list: {
    padding: spacing.lg,
    flexGrow: 1,
  },
  payoutCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  payoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${portalColors.partner}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  payoutInfo: {
    flex: 1,
  },
  payoutNumber: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  payoutMethod: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  payoutRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  payoutAmount: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.success,
  },
  payoutFooter: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dateText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  payoutNotes: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
})
