import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Modal, TextInput, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { api } from '../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme'

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'error' | 'primary'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  RECEIVED: 'primary',
  REFUNDED: 'success',
  COMPLETED: 'success',
  REJECTED: 'error',
}

const STATUSES = ['PENDING', 'APPROVED', 'RECEIVED', 'REFUNDED', 'COMPLETED', 'REJECTED']

interface Return {
  id: string
  returnNumber: string
  orderNumber: string
  orderId: string
  customerName: string
  customerEmail: string
  reason: string
  status: string
  refundAmount?: number
  items: any[]
  adminNotes?: string
  createdAt: string
}

export default function ReturnsScreen({ navigation, hideHeader }: { navigation: any; hideHeader?: boolean }) {
  const [returns, setReturns] = useState<Return[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [refundAmount, setRefundAmount] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [updating, setUpdating] = useState(false)

  const fetchReturns = async () => {
    try {
      const data = await api.getReturns()
      setReturns(data.returns || [])
      setStats(data.stats || null)
    } catch (error) {
      console.error('Failed to fetch returns:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchReturns()
  }, [])

  const onRefresh = () => {
    setRefreshing(true)
    fetchReturns()
  }

  const openDetail = (item: Return) => {
    setSelectedReturn(item)
    setRefundAmount(item.refundAmount?.toString() || '')
    setAdminNotes(item.adminNotes || '')
    setShowDetailModal(true)
  }

  const updateStatus = async (status: string) => {
    if (!selectedReturn) return

    setUpdating(true)
    try {
      await api.updateReturn(selectedReturn.id, {
        status,
        refundAmount: refundAmount ? parseFloat(refundAmount) : undefined,
        adminNotes,
      })
      await fetchReturns()
      setShowStatusModal(false)
      setShowDetailModal(false)
      Alert.alert('Success', 'Return updated')
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update return')
    } finally {
      setUpdating(false)
    }
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

  const renderReturn = ({ item }: { item: Return }) => (
    <TouchableOpacity onPress={() => openDetail(item)} activeOpacity={0.7}>
      <Card style={styles.returnCard}>
        <View style={styles.returnHeader}>
          <View>
            <Text style={styles.returnNumber}>RMA #{item.returnNumber}</Text>
            <Text style={styles.orderNumber}>Order #{item.orderNumber}</Text>
          </View>
          <Badge text={item.status} variant={statusColors[item.status] || 'default'} />
        </View>

        <View style={styles.customerInfo}>
          <Ionicons name="person-outline" size={16} color={colors.textMuted} />
          <Text style={styles.customerName}>{item.customerName}</Text>
        </View>

        <View style={styles.reasonContainer}>
          <Text style={styles.reasonLabel}>Reason:</Text>
          <Text style={styles.reasonText}>{item.reason?.replace('_', ' ')}</Text>
        </View>

        <View style={styles.returnFooter}>
          <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
          {item.refundAmount && (
            <Text style={styles.refundAmount}>{formatCurrency(item.refundAmount)}</Text>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  )

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

      {/* Stats */}
      {stats && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalReturns || 0}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.warning }]}>{stats.pendingCount || 0}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.success }]}>{stats.completedCount || 0}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.success }]}>{formatCurrency(stats.totalRefunded || 0)}</Text>
            <Text style={styles.statLabel}>Refunded</Text>
          </View>
        </View>
      )}

      <FlatList
        data={returns}
        renderItem={renderReturn}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name="return-down-back-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>No returns yet</Text>
            </View>
          ) : null
        }
      />

      {/* Detail Modal */}
      <Modal visible={showDetailModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>RMA #{selectedReturn?.returnNumber}</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Order</Text>
              <TouchableOpacity onPress={() => {
                setShowDetailModal(false)
                navigation.navigate('OrderDetail', { id: selectedReturn?.orderId })
              }}>
                <Text style={[styles.detailValue, { color: colors.primary }]}>#{selectedReturn?.orderNumber}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Customer</Text>
              <Text style={styles.detailValue}>{selectedReturn?.customerName}</Text>
              <Text style={styles.detailSubvalue}>{selectedReturn?.customerEmail}</Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Reason</Text>
              <Text style={styles.detailValue}>{selectedReturn?.reason?.replace('_', ' ')}</Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Items</Text>
              {selectedReturn?.items?.map((item: any, index: number) => (
                <Text key={index} style={styles.itemText}>• {item.name} (x{item.quantity})</Text>
              ))}
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Refund Amount</Text>
              <TextInput
                style={styles.input}
                value={refundAmount}
                onChangeText={setRefundAmount}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Admin Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={adminNotes}
                onChangeText={setAdminNotes}
                placeholder="Internal notes..."
                placeholderTextColor={colors.textMuted}
                multiline
              />
            </View>

            <View style={styles.statusButtons}>
              <Text style={styles.detailLabel}>Update Status</Text>
              <View style={styles.statusGrid}>
                {STATUSES.map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusButton,
                      selectedReturn?.status === status && styles.statusButtonActive,
                    ]}
                    onPress={() => updateStatus(status)}
                    disabled={updating}
                  >
                    <Text style={[
                      styles.statusButtonText,
                      selectedReturn?.status === status && styles.statusButtonTextActive,
                    ]}>
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>
      </Modal>
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
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  statItem: {
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
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  detailSection: {
    marginBottom: spacing.lg,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  detailValue: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  detailSubvalue: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  itemText: {
    fontSize: fontSize.sm,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: fontSize.md,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  statusButtons: {
    marginTop: spacing.md,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statusButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceHover,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusButtonText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  statusButtonTextActive: {
    fontWeight: fontWeight.semibold,
  },
})
