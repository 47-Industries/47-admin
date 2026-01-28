import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { api } from '../../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme'

// Status configuration
const statusColors: Record<string, 'default' | 'success' | 'warning' | 'error' | 'primary'> = {
  REQUESTED: 'warning',
  PENDING: 'warning',
  APPROVED: 'primary',
  REJECTED: 'error',
  RECEIVED: 'primary',
  REFUNDED: 'success',
  COMPLETED: 'success',
}

const STATUS_FILTERS = [
  { value: null, label: 'All' },
  { value: 'REQUESTED', label: 'Requested' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'RECEIVED', label: 'Received' },
  { value: 'REFUNDED', label: 'Refunded' },
  { value: 'COMPLETED', label: 'Completed' },
]

const REASON_LABELS: Record<string, string> = {
  DEFECTIVE: 'Defective Product',
  WRONG_ITEM: 'Wrong Item Received',
  NOT_AS_DESCRIBED: 'Not as Described',
  CHANGED_MIND: 'Changed Mind',
  DAMAGED: 'Damaged in Shipping',
  OTHER: 'Other',
}

interface ReturnItem {
  productId: string
  productName: string
  quantity: number
  reason?: string
  price?: number
}

interface OrderItem {
  id: string
  productId: string
  name: string
  price: number
  quantity: number
  product?: {
    name: string
    images: string[]
  }
}

interface Return {
  id: string
  orderId: string
  order?: {
    id: string
    orderNumber?: string
    total?: number
    user?: { name: string | null; email: string } | null
    items?: OrderItem[]
    customerName?: string
    customerEmail?: string
  }
  items: ReturnItem[]
  reason: string
  status: string
  refundAmount?: number | null
  notes?: string | null
  adminNotes?: string | null
  createdAt: string
  updatedAt: string
}

interface Stats {
  totalReturns: number
  pendingCount: number
  approvedCount: number
  completedCount: number
  totalRefunded: number
}

export default function ReturnsScreen({ navigation, hideHeader }: { navigation: any; hideHeader?: boolean }) {
  const [returns, setReturns] = useState<Return[]>([])
  const [filteredReturns, setFilteredReturns] = useState<Return[]>([])
  const [stats, setStats] = useState<Stats>({
    totalReturns: 0,
    pendingCount: 0,
    approvedCount: 0,
    completedCount: 0,
    totalRefunded: 0,
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [refundAmount, setRefundAmount] = useState('')
  const [adminNotes, setAdminNotes] = useState('')

  const fetchReturns = useCallback(async () => {
    try {
      const params: { status?: string } = {}
      if (statusFilter) {
        params.status = statusFilter
      }
      const data = await api.getReturns(params)
      const returnsList = data.returns || []
      setReturns(returnsList)

      // Calculate stats from the full list (or use server-provided stats)
      if (data.stats) {
        setStats({
          totalReturns: data.stats.totalReturns || returnsList.length,
          pendingCount: data.stats.pendingCount || returnsList.filter((r: Return) => r.status === 'PENDING' || r.status === 'REQUESTED').length,
          approvedCount: data.stats.approvedCount || returnsList.filter((r: Return) => r.status === 'APPROVED').length,
          completedCount: data.stats.completedCount || returnsList.filter((r: Return) => r.status === 'COMPLETED' || r.status === 'REFUNDED').length,
          totalRefunded: data.stats.totalRefunded || returnsList.reduce((sum: number, r: Return) => sum + (r.refundAmount || 0), 0),
        })
      } else {
        // Calculate from list
        const allReturns = statusFilter ? returnsList : returnsList
        setStats({
          totalReturns: allReturns.length,
          pendingCount: allReturns.filter((r: Return) => r.status === 'PENDING' || r.status === 'REQUESTED').length,
          approvedCount: allReturns.filter((r: Return) => r.status === 'APPROVED').length,
          completedCount: allReturns.filter((r: Return) => r.status === 'COMPLETED' || r.status === 'REFUNDED').length,
          totalRefunded: allReturns.filter((r: Return) => r.status === 'REFUNDED' || r.status === 'COMPLETED').reduce((sum: number, r: Return) => sum + (r.refundAmount || 0), 0),
        })
      }
    } catch (error) {
      console.error('Failed to fetch returns:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [statusFilter])

  useEffect(() => {
    setLoading(true)
    fetchReturns()
  }, [fetchReturns])

  // Filter returns based on search
  useEffect(() => {
    if (!search.trim()) {
      setFilteredReturns(returns)
    } else {
      const searchLower = search.toLowerCase()
      setFilteredReturns(
        returns.filter((r) => {
          const customerName = r.order?.user?.name || r.order?.customerName || ''
          const customerEmail = r.order?.user?.email || r.order?.customerEmail || ''
          const orderId = r.orderId.toLowerCase()
          const returnId = r.id.toLowerCase()
          const orderNumber = r.order?.orderNumber?.toLowerCase() || ''

          return (
            customerName.toLowerCase().includes(searchLower) ||
            customerEmail.toLowerCase().includes(searchLower) ||
            orderId.includes(searchLower) ||
            returnId.includes(searchLower) ||
            orderNumber.includes(searchLower)
          )
        })
      )
    }
  }, [search, returns])

  const onRefresh = () => {
    setRefreshing(true)
    fetchReturns()
  }

  const openDetail = async (item: Return) => {
    setSelectedReturn(item)
    setRefundAmount(item.refundAmount?.toString() || '')
    setAdminNotes(item.adminNotes || item.notes || '')
    setShowDetailModal(true)
  }

  const updateStatus = async (status: string) => {
    if (!selectedReturn) return

    setUpdating(true)
    try {
      await api.updateReturn(selectedReturn.id, {
        status,
        refundAmount: refundAmount ? parseFloat(refundAmount) : undefined,
        notes: adminNotes,
      })
      await fetchReturns()
      Alert.alert('Success', `Return status updated to ${status}`)
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update return')
    } finally {
      setUpdating(false)
    }
  }

  const handleApprove = () => {
    Alert.alert(
      'Approve Return',
      'Are you sure you want to approve this return request?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve', onPress: () => updateStatus('APPROVED') },
      ]
    )
  }

  const handleReject = () => {
    Alert.alert(
      'Reject Return',
      'Are you sure you want to reject this return request? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reject', style: 'destructive', onPress: () => updateStatus('REJECTED') },
      ]
    )
  }

  const handleIssueRefund = async () => {
    if (!selectedReturn) return

    const amount = parseFloat(refundAmount)
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid refund amount')
      return
    }

    Alert.alert(
      'Issue Refund',
      `Are you sure you want to issue a refund of $${amount.toFixed(2)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Issue Refund',
          onPress: async () => {
            setUpdating(true)
            try {
              // First update the return with refund amount
              await api.updateReturn(selectedReturn.id, {
                status: 'REFUNDED',
                refundAmount: amount,
                notes: adminNotes,
              })
              // Then process the actual refund via the order
              if (selectedReturn.orderId) {
                try {
                  await api.issueRefund(selectedReturn.orderId, { amount, reason: 'Return request' })
                } catch (refundError: any) {
                  // Log but don't fail - return status is already updated
                  console.warn('Stripe refund may have failed:', refundError.message)
                }
              }
              await fetchReturns()
              setShowDetailModal(false)
              Alert.alert('Success', 'Refund has been issued')
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to issue refund')
            } finally {
              setUpdating(false)
            }
          },
        },
      ]
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getReturnNumber = (returnItem: Return) => {
    return `RMA-${returnItem.id.slice(-8).toUpperCase()}`
  }

  const getOrderNumber = (returnItem: Return) => {
    if (returnItem.order?.orderNumber) {
      return returnItem.order.orderNumber
    }
    return `#${returnItem.orderId.slice(-8).toUpperCase()}`
  }

  const getCustomerName = (returnItem: Return) => {
    return returnItem.order?.user?.name || returnItem.order?.customerName || 'Guest'
  }

  const getCustomerEmail = (returnItem: Return) => {
    return returnItem.order?.user?.email || returnItem.order?.customerEmail || ''
  }

  const renderReturn = ({ item }: { item: Return }) => (
    <TouchableOpacity onPress={() => openDetail(item)} activeOpacity={0.7}>
      <Card style={styles.returnCard}>
        <View style={styles.returnHeader}>
          <View style={styles.returnIds}>
            <Text style={styles.returnNumber}>{getReturnNumber(item)}</Text>
            <Text style={styles.orderNumber}>Order: {getOrderNumber(item)}</Text>
          </View>
          <Badge text={item.status} variant={statusColors[item.status] || 'default'} />
        </View>

        <View style={styles.customerInfo}>
          <Ionicons name="person-outline" size={16} color={colors.textMuted} />
          <Text style={styles.customerName}>{getCustomerName(item)}</Text>
        </View>

        <View style={styles.reasonContainer}>
          <Text style={styles.reasonLabel}>Reason:</Text>
          <Text style={styles.reasonText} numberOfLines={1}>
            {REASON_LABELS[item.reason] || item.reason?.replace(/_/g, ' ') || 'Not specified'}
          </Text>
        </View>

        <View style={styles.returnFooter}>
          <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
          {item.refundAmount && item.refundAmount > 0 && (
            <Text style={styles.refundAmount}>{formatCurrency(item.refundAmount)}</Text>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  )

  const renderDetailModal = () => {
    if (!selectedReturn) return null

    const canApprove = selectedReturn.status === 'REQUESTED' || selectedReturn.status === 'PENDING'
    const canReject = selectedReturn.status === 'REQUESTED' || selectedReturn.status === 'PENDING'
    const canRefund = selectedReturn.status === 'APPROVED' || selectedReturn.status === 'RECEIVED'
    const canMarkReceived = selectedReturn.status === 'APPROVED'
    const canComplete = selectedReturn.status === 'REFUNDED'

    return (
      <Modal visible={showDetailModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>{getReturnNumber(selectedReturn)}</Text>
                  <Badge
                    text={selectedReturn.status}
                    variant={statusColors[selectedReturn.status] || 'default'}
                  />
                </View>
                <TouchableOpacity onPress={() => setShowDetailModal(false)} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Order Info */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Order Information</Text>
                <TouchableOpacity
                  style={styles.orderLink}
                  onPress={() => {
                    setShowDetailModal(false)
                    navigation.navigate('OrderDetail', { id: selectedReturn.orderId })
                  }}
                >
                  <View style={styles.orderLinkContent}>
                    <Ionicons name="receipt-outline" size={20} color={colors.primary} />
                    <View style={styles.orderLinkText}>
                      <Text style={styles.orderLinkTitle}>Order {getOrderNumber(selectedReturn)}</Text>
                      {selectedReturn.order?.total && (
                        <Text style={styles.orderLinkSubtitle}>
                          Total: {formatCurrency(Number(selectedReturn.order.total))}
                        </Text>
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Customer Info */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Customer</Text>
                <View style={styles.customerDetail}>
                  <Text style={styles.customerDetailName}>{getCustomerName(selectedReturn)}</Text>
                  <Text style={styles.customerDetailEmail}>{getCustomerEmail(selectedReturn)}</Text>
                </View>
              </View>

              {/* Return Reason */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Return Reason</Text>
                <Text style={styles.reasonDetail}>
                  {REASON_LABELS[selectedReturn.reason] || selectedReturn.reason?.replace(/_/g, ' ') || 'Not specified'}
                </Text>
              </View>

              {/* Items Being Returned */}
              {selectedReturn.items && selectedReturn.items.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Items Being Returned</Text>
                  {selectedReturn.items.map((item, index) => (
                    <View key={index} style={styles.itemRow}>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{item.productName}</Text>
                        {item.reason && <Text style={styles.itemReason}>{item.reason}</Text>}
                      </View>
                      <Text style={styles.itemQuantity}>x{item.quantity}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Date Requested */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Date Requested</Text>
                <Text style={styles.dateDetail}>{formatDate(selectedReturn.createdAt)}</Text>
              </View>

              {/* Refund Amount Input */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Refund Amount</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.currencyPrefix}>$</Text>
                  <TextInput
                    style={styles.refundInput}
                    value={refundAmount}
                    onChangeText={setRefundAmount}
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                    editable={!updating}
                  />
                </View>
              </View>

              {/* Admin Notes */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Admin Notes</Text>
                <TextInput
                  style={styles.notesInput}
                  value={adminNotes}
                  onChangeText={setAdminNotes}
                  placeholder="Add internal notes about this return..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={3}
                  editable={!updating}
                />
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                {canApprove && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.approveButton]}
                    onPress={handleApprove}
                    disabled={updating}
                  >
                    {updating ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                        <Text style={styles.actionButtonText}>Approve</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {canReject && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={handleReject}
                    disabled={updating}
                  >
                    {updating ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="close-circle-outline" size={20} color="#fff" />
                        <Text style={styles.actionButtonText}>Reject</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {canMarkReceived && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.receivedButton]}
                    onPress={() => updateStatus('RECEIVED')}
                    disabled={updating}
                  >
                    {updating ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="cube-outline" size={20} color="#fff" />
                        <Text style={styles.actionButtonText}>Mark Received</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {canRefund && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.refundButton]}
                    onPress={handleIssueRefund}
                    disabled={updating}
                  >
                    {updating ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="cash-outline" size={20} color="#fff" />
                        <Text style={styles.actionButtonText}>Issue Refund</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {canComplete && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.completeButton]}
                    onPress={() => updateStatus('COMPLETED')}
                    disabled={updating}
                  >
                    {updating ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-done-outline" size={20} color="#fff" />
                        <Text style={styles.actionButtonText}>Complete</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {/* Save Notes Button */}
              <TouchableOpacity
                style={styles.saveNotesButton}
                onPress={() => updateStatus(selectedReturn.status)}
                disabled={updating}
              >
                <Text style={styles.saveNotesButtonText}>Save Notes</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    )
  }

  return (
    <View style={styles.container}>
      {!hideHeader && (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Returns & RMA</Text>
        </View>
      )}

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalReturns}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.warning }]}>{stats.pendingCount}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.approvedCount}</Text>
            <Text style={styles.statLabel}>Approved</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.success }]}>{stats.completedCount}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by ID, order #, or customer..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Status Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScrollView}
        contentContainerStyle={styles.filtersContainer}
      >
        {STATUS_FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter.label}
            style={[styles.filterChip, statusFilter === filter.value && styles.filterChipActive]}
            onPress={() => setStatusFilter(filter.value)}
          >
            <Text style={[styles.filterChipText, statusFilter === filter.value && styles.filterChipTextActive]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Returns List */}
      <FlatList
        data={filteredReturns}
        renderItem={renderReturn}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name="return-down-back-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>No returns found</Text>
              <Text style={styles.emptySubtext}>
                {search || statusFilter ? 'Try adjusting your filters' : 'Return requests will appear here'}
              </Text>
            </View>
          ) : (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )
        }
      />

      {/* Detail Modal */}
      {renderDetailModal()}
    </View>
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    padding: spacing.sm,
    marginRight: spacing.sm,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statsContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    color: colors.text,
    fontSize: fontSize.md,
  },
  filtersScrollView: {
    maxHeight: 44,
    marginBottom: spacing.md,
  },
  filtersContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  filterChipTextActive: {
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  returnCard: {
    marginBottom: spacing.md,
  },
  returnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  returnIds: {
    flex: 1,
  },
  returnNumber: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  orderNumber: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  customerName: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  reasonContainer: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  reasonLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginRight: spacing.sm,
  },
  reasonText: {
    fontSize: fontSize.sm,
    color: colors.text,
    flex: 1,
    textTransform: 'capitalize',
  },
  returnFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  refundAmount: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.success,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  loadingContainer: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  closeButton: {
    padding: spacing.xs,
  },
  detailSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  orderLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderLinkContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderLinkText: {
    marginLeft: spacing.md,
  },
  orderLinkTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },
  orderLinkSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  customerDetail: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  customerDetailName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  customerDetailEmail: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  reasonDetail: {
    fontSize: fontSize.md,
    color: colors.text,
    textTransform: 'capitalize',
  },
  dateDetail: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  itemReason: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  itemQuantity: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginLeft: spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  currencyPrefix: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
    marginRight: spacing.xs,
  },
  refundInput: {
    flex: 1,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
  },
  notesInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    color: colors.text,
    fontSize: fontSize.md,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    minWidth: '48%',
    flex: 1,
  },
  actionButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: '#fff',
  },
  approveButton: {
    backgroundColor: colors.success,
  },
  rejectButton: {
    backgroundColor: colors.error,
  },
  receivedButton: {
    backgroundColor: colors.purple,
  },
  refundButton: {
    backgroundColor: colors.primary,
  },
  completeButton: {
    backgroundColor: colors.success,
  },
  saveNotesButton: {
    backgroundColor: colors.surfaceHover,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  saveNotesButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
})
