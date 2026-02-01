import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, Image, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { api } from '../../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme'

interface ExternalOrderItem {
  id: string
  name: string
  price: number
  quantity: number
  total: number
  image?: string
  sku?: string
  customization?: {
    businessName?: string
    contactName?: string
    phone?: string
    email?: string
    website?: string
    socialMedia?: string
    logoUrl?: string
    designNotes?: string
    [key: string]: any
  }
}

interface ExternalOrder {
  id: string
  orderNumber: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  source: string
  sourceOrderId?: string
  sourceData?: {
    shippingAddress?: {
      fullName?: string
      address1?: string
      address2?: string
      city?: string
      state?: string
      zipCode?: string
      country?: string
      phone?: string
    }
    barberId?: string
    barberName?: string
    customization?: any
    prepaidVia?: string
  }
  items: ExternalOrderItem[]
  subtotal: number
  tax: number
  shipping: number
  discount: number
  total: number
  status: string
  paymentStatus: string
  trackingNumber?: string
  carrier?: string
  customerNotes?: string
  adminNotes?: string
  createdAt: string
  updatedAt: string
}

const ORDER_STATUSES = ['PENDING', 'PROCESSING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED']

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

export function ExternalOrderDetailScreen({ navigation, route }: any) {
  const { id } = route.params
  const [order, setOrder] = useState<ExternalOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)

  useEffect(() => {
    fetchOrder()
  }, [id])

  const fetchOrder = async () => {
    try {
      const data = await api.getExternalOrder(id)
      setOrder(data.order)
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
      await api.updateExternalOrderStatus(id, status)
      setOrder({ ...order!, status })
      setShowStatusModal(false)
      Alert.alert('Success', 'Order status updated')
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update status')
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

  const getSourceLabel = (source: string) => {
    switch (source?.toLowerCase()) {
      case 'bookfade':
        return 'BookFade'
      default:
        return source || 'Unknown'
    }
  }

  const renderCustomization = (customization: any) => {
    if (!customization) return null

    const fields = [
      { key: 'businessName', label: 'Business Name' },
      { key: 'contactName', label: 'Contact Name' },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
      { key: 'website', label: 'Website' },
      { key: 'socialMedia', label: 'Social Media' },
      { key: 'designNotes', label: 'Design Notes' },
    ]

    const displayFields = fields.filter(f => customization[f.key])

    if (displayFields.length === 0 && !customization.logoUrl) return null

    return (
      <Card style={styles.customizationCard}>
        <Text style={styles.customizationTitle}>Customization Details</Text>
        {customization.logoUrl && (
          <View style={styles.logoContainer}>
            <Text style={styles.customizationLabel}>Logo</Text>
            <Image source={{ uri: customization.logoUrl }} style={styles.logoImage} resizeMode="contain" />
          </View>
        )}
        {displayFields.map(field => (
          <View key={field.key} style={styles.customizationRow}>
            <Text style={styles.customizationLabel}>{field.label}</Text>
            <Text style={styles.customizationValue}>{customization[field.key]}</Text>
          </View>
        ))}
      </Card>
    )
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

  const shippingAddress = order.sourceData?.shippingAddress

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
            <View style={styles.sourceBadge}>
              <Text style={styles.sourceText}>{getSourceLabel(order.source)}</Text>
            </View>
          </View>
          <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
        </View>
        <Badge text={order.status} variant={statusColors[order.status] || 'default'} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Status & Payment */}
        <View style={styles.statusRow}>
          <Card style={styles.statusCard}>
            <Text style={styles.statusLabel}>Fulfillment Status</Text>
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
        </View>

        {/* External Source Info */}
        {order.sourceOrderId && (
          <Card style={styles.sourceCard}>
            <View style={styles.sourceHeader}>
              <Ionicons name="link" size={20} color={colors.warning} />
              <Text style={styles.sourceTitle}>External Order</Text>
            </View>
            <View style={styles.sourceDetails}>
              <Text style={styles.sourceDetailLabel}>Source Order ID</Text>
              <Text style={styles.sourceDetailValue}>{order.sourceOrderId}</Text>
            </View>
            {order.sourceData?.barberId && (
              <View style={styles.sourceDetails}>
                <Text style={styles.sourceDetailLabel}>Barber ID</Text>
                <Text style={styles.sourceDetailValue}>{order.sourceData.barberId}</Text>
              </View>
            )}
            {order.sourceData?.barberName && (
              <View style={styles.sourceDetails}>
                <Text style={styles.sourceDetailLabel}>Barber</Text>
                <Text style={styles.sourceDetailValue}>{order.sourceData.barberName}</Text>
              </View>
            )}
            {order.sourceData?.prepaidVia && (
              <View style={styles.sourceDetails}>
                <Text style={styles.sourceDetailLabel}>Payment Via</Text>
                <Text style={styles.sourceDetailValue}>{order.sourceData.prepaidVia}</Text>
              </View>
            )}
          </Card>
        )}

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
          {order.items?.map((item, index) => (
            <View key={item.id}>
              <View style={[styles.item, index > 0 && styles.itemBorder]}>
                {item.image ? (
                  <Image source={{ uri: item.image }} style={styles.itemImage} />
                ) : (
                  <View style={styles.itemImagePlaceholder}>
                    <Ionicons name="cube-outline" size={24} color={colors.textMuted} />
                  </View>
                )}
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.itemMeta}>Qty: {item.quantity} x {formatCurrency(Number(item.price))}</Text>
                  {item.sku && <Text style={styles.itemSku}>SKU: {item.sku}</Text>}
                </View>
                <Text style={styles.itemTotal}>{formatCurrency(Number(item.total))}</Text>
              </View>
              {renderCustomization(item.customization)}
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
        {shippingAddress && (
          <>
            <Text style={styles.sectionTitle}>Shipping Address</Text>
            <Card style={styles.addressCard}>
              <Text style={styles.addressText}>{shippingAddress.fullName || order.customerName}</Text>
              <Text style={styles.addressText}>{shippingAddress.address1}</Text>
              {shippingAddress.address2 && <Text style={styles.addressText}>{shippingAddress.address2}</Text>}
              <Text style={styles.addressText}>
                {shippingAddress.city}, {shippingAddress.state} {shippingAddress.zipCode}
              </Text>
              <Text style={styles.addressText}>{shippingAddress.country || 'US'}</Text>
              {shippingAddress.phone && <Text style={styles.addressText}>{shippingAddress.phone}</Text>}
            </Card>
          </>
        )}

        {/* Customer Notes */}
        {order.customerNotes && (
          <>
            <Text style={styles.sectionTitle}>Customer Notes</Text>
            <Card style={styles.notesCard}>
              <Text style={styles.notesText}>{order.customerNotes}</Text>
            </Card>
          </>
        )}

        {/* Admin Notes */}
        {order.adminNotes && (
          <>
            <Text style={styles.sectionTitle}>Admin Notes</Text>
            <Card style={styles.adminNotesCard}>
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
            <Text style={styles.modalTitle}>Update Fulfillment Status</Text>
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  orderNumber: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  sourceBadge: {
    backgroundColor: colors.warningBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  sourceText: {
    fontSize: fontSize.xs,
    color: colors.warning,
    fontWeight: fontWeight.medium,
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
  sourceCard: {
    marginBottom: spacing.lg,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: colors.warning,
  },
  sourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sourceTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.warning,
    marginLeft: spacing.sm,
  },
  sourceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  sourceDetailLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  sourceDetailValue: {
    fontSize: fontSize.sm,
    color: colors.text,
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
  itemSku: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  itemTotal: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  customizationCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceHover,
    borderColor: colors.border,
  },
  customizationTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  customizationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  customizationLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  customizationValue: {
    fontSize: fontSize.sm,
    color: colors.text,
    flex: 1,
    textAlign: 'right',
    marginLeft: spacing.md,
  },
  logoContainer: {
    marginBottom: spacing.md,
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    marginTop: spacing.sm,
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
    backgroundColor: colors.surfaceHover,
    borderColor: colors.border,
  },
  adminNotesCard: {
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
})
