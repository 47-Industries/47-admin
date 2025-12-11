import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput, Image, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { api } from '../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme'

const ORDER_STATUSES = ['PENDING', 'PROCESSING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED']
const PAYMENT_STATUSES = ['PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'REFUNDED']

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'error' | 'primary'> = {
  PENDING: 'warning',
  PROCESSING: 'primary',
  PAID: 'success',
  SHIPPED: 'primary',
  DELIVERED: 'success',
  CANCELLED: 'error',
  REFUNDED: 'error',
  SUCCEEDED: 'success',
  FAILED: 'error',
}

export default function OrderDetailScreen({ navigation, route }: any) {
  const { id } = route.params
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showRefundModal, setShowRefundModal] = useState(false)
  const [showTrackingModal, setShowTrackingModal] = useState(false)
  const [refundAmount, setRefundAmount] = useState('')
  const [refundReason, setRefundReason] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [carrier, setCarrier] = useState('USPS')

  useEffect(() => {
    fetchOrder()
  }, [id])

  const fetchOrder = async () => {
    try {
      const data = await api.getOrder(id)
      setOrder(data.order)
      setRefundAmount(data.order?.total?.toString() || '')
    } catch (error) {
      console.error('Failed to fetch order:', error)
      Alert.alert('Error', 'Failed to load order details')
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (status: string) => {
    setUpdating(true)
    try {
      await api.updateOrder(id, { status })
      setOrder({ ...order, status })
      setShowStatusModal(false)
      Alert.alert('Success', 'Order status updated')
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  const processRefund = async () => {
    if (!refundAmount || parseFloat(refundAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid refund amount')
      return
    }
    setUpdating(true)
    try {
      await api.refundOrder(id, {
        amount: parseFloat(refundAmount),
        reason: refundReason,
      })
      await fetchOrder()
      setShowRefundModal(false)
      Alert.alert('Success', 'Refund processed successfully')
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to process refund')
    } finally {
      setUpdating(false)
    }
  }

  const addTracking = async () => {
    if (!trackingNumber) {
      Alert.alert('Error', 'Please enter a tracking number')
      return
    }
    setUpdating(true)
    try {
      await api.updateOrder(id, {
        trackingNumber,
        carrier,
        status: 'SHIPPED',
      })
      await fetchOrder()
      setShowTrackingModal(false)
      Alert.alert('Success', 'Tracking information added')
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add tracking')
    } finally {
      setUpdating(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Order not found</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
          <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
        </View>
        <Badge text={order.status} variant={statusColors[order.status] || 'default'} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Status & Payment */}
        <View style={styles.statusRow}>
          <Card style={styles.statusCard}>
            <Text style={styles.statusLabel}>Order Status</Text>
            <Badge text={order.status} variant={statusColors[order.status] || 'default'} />
          </Card>
          <Card style={styles.statusCard}>
            <Text style={styles.statusLabel}>Payment</Text>
            <Badge text={order.paymentStatus} variant={statusColors[order.paymentStatus] || 'default'} />
          </Card>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionButton} onPress={() => setShowStatusModal(true)}>
            <Ionicons name="sync-outline" size={20} color={colors.primary} />
            <Text style={styles.actionText}>Update Status</Text>
          </TouchableOpacity>
          {order.status !== 'SHIPPED' && order.status !== 'DELIVERED' && (
            <TouchableOpacity style={styles.actionButton} onPress={() => setShowTrackingModal(true)}>
              <Ionicons name="locate-outline" size={20} color={colors.primary} />
              <Text style={styles.actionText}>Add Tracking</Text>
            </TouchableOpacity>
          )}
          {order.paymentStatus === 'SUCCEEDED' && order.status !== 'REFUNDED' && (
            <TouchableOpacity style={styles.actionButton} onPress={() => setShowRefundModal(true)}>
              <Ionicons name="card-outline" size={20} color={colors.error} />
              <Text style={[styles.actionText, { color: colors.error }]}>Refund</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tracking Info */}
        {order.trackingNumber && (
          <Card style={styles.trackingCard}>
            <View style={styles.trackingHeader}>
              <Ionicons name="locate" size={20} color={colors.success} />
              <Text style={styles.trackingTitle}>Tracking Information</Text>
            </View>
            <View style={styles.trackingDetails}>
              <Text style={styles.trackingLabel}>Carrier</Text>
              <Text style={styles.trackingValue}>{order.carrier || 'N/A'}</Text>
            </View>
            <View style={styles.trackingDetails}>
              <Text style={styles.trackingLabel}>Tracking #</Text>
              <TouchableOpacity onPress={() => Linking.openURL(`https://google.com/search?q=${order.trackingNumber}`)}>
                <Text style={[styles.trackingValue, { color: colors.primary }]}>{order.trackingNumber}</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* Order Items */}
        <Text style={styles.sectionTitle}>Items ({order.items?.length || 0})</Text>
        <Card style={styles.itemsCard}>
          {order.items?.map((item: any, index: number) => (
            <View key={item.id} style={[styles.item, index > 0 && styles.itemBorder]}>
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.itemImage} />
              ) : (
                <View style={styles.itemImagePlaceholder}>
                  <Ionicons name="cube-outline" size={24} color={colors.textMuted} />
                </View>
              )}
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.itemMeta}>Qty: {item.quantity} × {formatCurrency(Number(item.price))}</Text>
              </View>
              <Text style={styles.itemTotal}>{formatCurrency(Number(item.total))}</Text>
            </View>
          ))}
        </Card>

        {/* Order Totals */}
        <Text style={styles.sectionTitle}>Order Summary</Text>
        <Card style={styles.totalsCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatCurrency(Number(order.subtotal))}</Text>
          </View>
          {Number(order.discount) > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount</Text>
              <Text style={[styles.totalValue, { color: colors.success }]}>-{formatCurrency(Number(order.discount))}</Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Shipping</Text>
            <Text style={styles.totalValue}>{formatCurrency(Number(order.shipping))}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax</Text>
            <Text style={styles.totalValue}>{formatCurrency(Number(order.tax))}</Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(Number(order.total))}</Text>
          </View>
        </Card>

        {/* Customer Info */}
        <Text style={styles.sectionTitle}>Customer</Text>
        <Card style={styles.customerCard}>
          <View style={styles.customerRow}>
            <Ionicons name="person-outline" size={18} color={colors.textMuted} />
            <Text style={styles.customerText}>{order.customerName}</Text>
          </View>
          <View style={styles.customerRow}>
            <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
            <TouchableOpacity onPress={() => Linking.openURL(`mailto:${order.customerEmail}`)}>
              <Text style={[styles.customerText, { color: colors.primary }]}>{order.customerEmail}</Text>
            </TouchableOpacity>
          </View>
          {order.customerPhone && (
            <View style={styles.customerRow}>
              <Ionicons name="call-outline" size={18} color={colors.textMuted} />
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${order.customerPhone}`)}>
                <Text style={[styles.customerText, { color: colors.primary }]}>{order.customerPhone}</Text>
              </TouchableOpacity>
            </View>
          )}
        </Card>

        {/* Shipping Address */}
        {order.shippingAddress && (
          <>
            <Text style={styles.sectionTitle}>Shipping Address</Text>
            <Card style={styles.addressCard}>
              <Text style={styles.addressText}>{order.shippingAddress.name}</Text>
              <Text style={styles.addressText}>{order.shippingAddress.line1}</Text>
              {order.shippingAddress.line2 && <Text style={styles.addressText}>{order.shippingAddress.line2}</Text>}
              <Text style={styles.addressText}>
                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
              </Text>
              <Text style={styles.addressText}>{order.shippingAddress.country}</Text>
            </Card>
          </>
        )}

        {/* Admin Notes */}
        {order.adminNotes && (
          <>
            <Text style={styles.sectionTitle}>Admin Notes</Text>
            <Card style={styles.notesCard}>
              <Text style={styles.notesText}>{order.adminNotes}</Text>
            </Card>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Status Update Modal */}
      <Modal visible={showStatusModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Order Status</Text>
            <View style={styles.statusOptions}>
              {ORDER_STATUSES.map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[styles.statusOption, order.status === status && styles.statusOptionActive]}
                  onPress={() => updateStatus(status)}
                  disabled={updating}
                >
                  <Text style={[styles.statusOptionText, order.status === status && styles.statusOptionTextActive]}>
                    {status}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Button title="Cancel" variant="outline" onPress={() => setShowStatusModal(false)} style={{ marginTop: spacing.lg }} />
          </View>
        </View>
      </Modal>

      {/* Refund Modal */}
      <Modal visible={showRefundModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Process Refund</Text>
            <Text style={styles.inputLabel}>Refund Amount</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              value={refundAmount}
              onChangeText={setRefundAmount}
              keyboardType="decimal-pad"
            />
            <Text style={styles.inputLabel}>Reason (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Customer request, damaged item, etc."
              placeholderTextColor={colors.textMuted}
              value={refundReason}
              onChangeText={setRefundReason}
              multiline
            />
            <View style={styles.modalButtons}>
              <Button title="Cancel" variant="outline" onPress={() => setShowRefundModal(false)} style={{ flex: 1 }} />
              <Button
                title="Process Refund"
                onPress={processRefund}
                loading={updating}
                style={{ flex: 1, marginLeft: spacing.md, backgroundColor: colors.error }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Tracking Modal */}
      <Modal visible={showTrackingModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Tracking</Text>
            <Text style={styles.inputLabel}>Carrier</Text>
            <View style={styles.carrierOptions}>
              {['USPS', 'UPS', 'FedEx', 'DHL'].map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.carrierOption, carrier === c && styles.carrierOptionActive]}
                  onPress={() => setCarrier(c)}
                >
                  <Text style={[styles.carrierOptionText, carrier === c && styles.carrierOptionTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.inputLabel}>Tracking Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter tracking number"
              placeholderTextColor={colors.textMuted}
              value={trackingNumber}
              onChangeText={setTrackingNumber}
              autoCapitalize="characters"
            />
            <View style={styles.modalButtons}>
              <Button title="Cancel" variant="outline" onPress={() => setShowTrackingModal(false)} style={{ flex: 1 }} />
              <Button title="Add Tracking" onPress={addTracking} loading={updating} style={{ flex: 1, marginLeft: spacing.md }} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: fontSize.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
    marginRight: spacing.sm,
  },
  headerContent: {
    flex: 1,
  },
  orderNumber: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  orderDate: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  statusRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  statusCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.lg,
  },
  statusLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  actionText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  trackingCard: {
    marginBottom: spacing.lg,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: colors.success,
  },
  trackingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  trackingTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.success,
    marginLeft: spacing.sm,
  },
  trackingDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  trackingLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  trackingValue: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  itemsCard: {
    padding: 0,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    padding: spacing.lg,
    alignItems: 'center',
  },
  itemBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  itemImage: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceHover,
  },
  itemImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceHover,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  itemName: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  itemMeta: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  itemTotal: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  totalsCard: {
    padding: spacing.lg,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  totalLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  totalValue: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  grandTotalRow: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginBottom: 0,
  },
  grandTotalLabel: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  grandTotalValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  customerCard: {
    padding: spacing.lg,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  customerText: {
    fontSize: fontSize.md,
    color: colors.text,
    marginLeft: spacing.md,
  },
  addressCard: {
    padding: spacing.lg,
  },
  addressText: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 22,
  },
  notesCard: {
    padding: spacing.lg,
    backgroundColor: colors.warningBg,
    borderColor: colors.warning,
  },
  notesText: {
    fontSize: fontSize.md,
    color: colors.text,
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
    padding: spacing.xxl,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xl,
  },
  statusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statusOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceHover,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusOptionText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  statusOptionTextActive: {
    color: colors.text,
    fontWeight: fontWeight.semibold,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: fontSize.md,
    marginBottom: spacing.lg,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  carrierOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  carrierOption: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceHover,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  carrierOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  carrierOptionText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  carrierOptionTextActive: {
    fontWeight: fontWeight.semibold,
  },
})
