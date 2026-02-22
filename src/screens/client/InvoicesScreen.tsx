import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { api } from '../../services/api'
import { StatusBadge, getStatusType } from '../../components/StatusBadge'
import { EmptyState } from '../../components/EmptyState'
import { colors, portalColors, spacing, borderRadius, fontSize, fontWeight } from '../../theme'
import { Invoice } from '../../types'

interface InvoicesScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void
    goBack: () => void
  }
  hideHeader?: boolean
}

const statusFilters = ['ALL', 'PENDING', 'SENT', 'OVERDUE', 'PAID']

export function InvoicesScreen({ navigation, hideHeader }: InvoicesScreenProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [totals, setTotals] = useState({ outstanding: 0, paid: 0 })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeFilter, setActiveFilter] = useState('ALL')

  const fetchInvoices = async () => {
    try {
      const params = activeFilter === 'ALL' ? {} : { status: activeFilter }
      const data = await api.getClientInvoices(params)
      setInvoices(data.invoices)
      setTotals(data.totals || { outstanding: 0, paid: 0 })
    } catch (error) {
      console.error('Failed to fetch invoices:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchInvoices()
  }, [activeFilter])

  const onRefresh = () => {
    setRefreshing(true)
    fetchInvoices()
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

  const isOverdue = (invoice: Invoice) => {
    return invoice.status !== 'PAID' && new Date(invoice.dueDate) < new Date()
  }

  const renderInvoice = ({ item }: { item: Invoice }) => (
    <TouchableOpacity
      style={[styles.invoiceCard, isOverdue(item) && styles.invoiceCardOverdue]}
      onPress={() => navigation.navigate('InvoiceDetail', { id: item.id })}
    >
      <View style={styles.invoiceHeader}>
        <Text style={styles.invoiceNumber}>#{item.invoiceNumber}</Text>
        <StatusBadge
          status={getStatusType(isOverdue(item) ? 'OVERDUE' : item.status)}
          label={isOverdue(item) ? 'OVERDUE' : item.status}
          size="sm"
        />
      </View>
      <View style={styles.invoiceBody}>
        <View style={styles.invoiceInfo}>
          <Text style={styles.invoiceDueLabel}>Due Date</Text>
          <Text style={[styles.invoiceDue, isOverdue(item) && styles.invoiceDueOverdue]}>
            {formatDate(item.dueDate)}
          </Text>
        </View>
        <View style={styles.invoiceAmountContainer}>
          <Text style={styles.invoiceAmountLabel}>Amount</Text>
          <Text style={styles.invoiceAmount}>{formatCurrency(item.total)}</Text>
        </View>
      </View>
      {item.status !== 'PAID' && (
        <TouchableOpacity
          style={styles.payButton}
          onPress={() => navigation.navigate('InvoiceDetail', { id: item.id, payNow: true })}
        >
          <Ionicons name="card-outline" size={16} color={colors.text} />
          <Text style={styles.payButtonText}>Pay Now</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container} edges={hideHeader ? [] : ['top']}>
      {!hideHeader && (
        <View style={styles.header}>
          <TouchableOpacity onPress={navigation.goBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Invoices</Text>
          <View style={styles.placeholder} />
        </View>
      )}

      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Outstanding</Text>
          <Text style={[styles.summaryValue, { color: colors.warning }]}>
            {formatCurrency(totals.outstanding)}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Paid</Text>
          <Text style={[styles.summaryValue, { color: colors.success }]}>
            {formatCurrency(totals.paid)}
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
        data={invoices}
        renderItem={renderInvoice}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={portalColors.client} />
        }
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="receipt-outline"
              title="No invoices found"
              description="Your invoices will appear here"
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
    backgroundColor: portalColors.client,
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
  invoiceCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  invoiceCardOverdue: {
    borderWidth: 1,
    borderColor: colors.error,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  invoiceNumber: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  invoiceBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  invoiceInfo: {},
  invoiceDueLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  invoiceDue: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  invoiceDueOverdue: {
    color: colors.error,
  },
  invoiceAmountContainer: {
    alignItems: 'flex-end',
  },
  invoiceAmountLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  invoiceAmount: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: portalColors.client,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  payButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
})
