import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { api } from '../../services/api'
import { StatusBadge, getStatusType } from '../../components/StatusBadge'
import { EmptyState } from '../../components/EmptyState'
import { colors, portalColors, spacing, borderRadius, fontSize, fontWeight } from '../../theme'
import { Commission } from '../../types'

interface CommissionsScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void
    goBack: () => void
  }
  hideHeader?: boolean
}

export function CommissionsScreen({ navigation, hideHeader }: CommissionsScreenProps) {
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [totals, setTotals] = useState({ pending: 0, paid: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeFilter, setActiveFilter] = useState('ALL')

  const fetchCommissions = async () => {
    try {
      const params = activeFilter === 'ALL' ? {} : { status: activeFilter }
      const data = await api.getPartnerCommissions(params)
      setCommissions(data.commissions)
      setTotals(data.totals || { pending: 0, paid: 0, total: 0 })
    } catch (error) {
      console.error('Failed to fetch commissions:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchCommissions()
  }, [activeFilter])

  const onRefresh = () => {
    setRefreshing(true)
    fetchCommissions()
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

  const renderCommission = ({ item }: { item: Commission }) => (
    <View style={styles.commissionCard}>
      <View style={styles.commissionHeader}>
        <View style={styles.typeIcon}>
          <Ionicons
            name={
              item.type === 'FIRST_SALE'
                ? 'star-outline'
                : item.type === 'RECURRING'
                ? 'refresh-outline'
                : item.type === 'SHOP_PURCHASE'
                ? 'cart-outline'
                : 'gift-outline'
            }
            size={20}
            color={portalColors.partner}
          />
        </View>
        <View style={styles.commissionInfo}>
          <Text style={styles.commissionType}>{item.type.replace(/_/g, ' ')}</Text>
          <Text style={styles.commissionDate}>{formatDate(item.createdAt)}</Text>
        </View>
        <View style={styles.commissionRight}>
          <Text style={styles.commissionAmount}>{formatCurrency(item.amount)}</Text>
          <StatusBadge status={getStatusType(item.status)} label={item.status} size="sm" />
        </View>
      </View>
      {item.description && (
        <Text style={styles.commissionDescription}>{item.description}</Text>
      )}
    </View>
  )

  const statusFilters = ['ALL', 'PENDING', 'APPROVED', 'PAID']

  return (
    <SafeAreaView style={styles.container} edges={hideHeader ? [] : ['top']}>
      {!hideHeader && (
        <View style={styles.header}>
          <TouchableOpacity onPress={navigation.goBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Commissions</Text>
          <View style={styles.placeholder} />
        </View>
      )}

      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Pending</Text>
          <Text style={[styles.summaryValue, { color: colors.warning }]}>
            {formatCurrency(totals.pending)}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Earned</Text>
          <Text style={[styles.summaryValue, { color: colors.success }]}>
            {formatCurrency(totals.total)}
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

      <FlatList
        data={commissions}
        renderItem={renderCommission}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={portalColors.partner} />
        }
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="cash-outline"
              title="No commissions yet"
              description="Your commissions will appear here once you earn them"
            />
          ) : null
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
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  summaryValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
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
  commissionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  commissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${portalColors.partner}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  commissionInfo: {
    flex: 1,
  },
  commissionType: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
    textTransform: 'capitalize',
  },
  commissionDate: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  commissionRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  commissionAmount: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.success,
  },
  commissionDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    paddingLeft: 52,
  },
})
