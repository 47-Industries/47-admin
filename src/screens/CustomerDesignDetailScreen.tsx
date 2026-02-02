import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput, Linking } from 'react-native'
import { CachedImage } from '../components/CachedImage'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { api } from '../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme'

const STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED']

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'error' | 'primary'> = {
  PENDING: 'warning',
  IN_PROGRESS: 'primary',
  COMPLETED: 'success',
  ARCHIVED: 'default',
}

interface CustomerDesign {
  id: string
  customerEmail: string
  source: string | null
  sourceCustomerId: string | null
  productId: string
  variantId: string | null
  designName: string
  designNotes: string | null
  gcodePath: string | null
  designFile: string | null
  previewImage: string | null
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED'
  customization: any
  originalOrderId: string | null
  createdAt: string
  updatedAt: string
  completedAt: string | null
  product?: {
    id: string
    name: string
    slug: string
    images?: string[]
  }
  variant?: {
    id: string
    name: string
    sku: string | null
    options?: any
  }
  order?: {
    id: string
    orderNumber: string
    status?: string
    customerName?: string
  }
}

interface RelatedOrder {
  id: string
  orderNumber: string
  status: string
  total: number
  createdAt: string
  items: { quantity: number; price: number; total: number }[]
}

export default function CustomerDesignDetailScreen({ navigation, route }: any) {
  const { id } = route.params
  const [design, setDesign] = useState<CustomerDesign | null>(null)
  const [relatedOrders, setRelatedOrders] = useState<RelatedOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [adminNotes, setAdminNotes] = useState('')

  useEffect(() => {
    fetchDesign()
  }, [id])

  const fetchDesign = async () => {
    try {
      const data = await api.getCustomerDesign(id)
      setDesign(data.design)
      setRelatedOrders(data.relatedOrders || [])
      setAdminNotes(data.design?.designNotes || '')
    } catch (error) {
      console.error('Failed to fetch design:', error)
      Alert.alert('Error', 'Failed to load design details')
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (status: string) => {
    setUpdating(true)
    try {
      await api.updateCustomerDesign(id, { status })
      setDesign((prev) => prev ? { ...prev, status: status as any } : null)
      setShowStatusModal(false)
      Alert.alert('Success', 'Status updated')
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  const saveNotes = async () => {
    setUpdating(true)
    try {
      await api.updateCustomerDesign(id, { designNotes: adminNotes })
      setDesign((prev) => prev ? { ...prev, designNotes: adminNotes } : null)
      setShowNotesModal(false)
      Alert.alert('Success', 'Notes saved')
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save notes')
    } finally {
      setUpdating(false)
    }
  }

  const approveDesign = async () => {
    Alert.alert(
      'Approve Design',
      'Mark this design as ready for production?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: () => updateStatus('IN_PROGRESS'),
        },
      ]
    )
  }

  const rejectDesign = async () => {
    Alert.alert(
      'Reject Design',
      'Archive this design? The customer will need to resubmit.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: () => updateStatus('ARCHIVED'),
        },
      ]
    )
  }

  const openFile = (url: string | null) => {
    if (url) {
      Linking.openURL(url)
    }
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0)
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    )
  }

  if (!design) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Customer Design</Text>
          </View>
        </View>
        <View style={styles.loading}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
          <Text style={styles.loadingText}>Design not found</Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ marginTop: spacing.lg, padding: spacing.md }}
          >
            <Text style={{ color: colors.primary, fontSize: fontSize.md }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle} numberOfLines={1}>{design.designName}</Text>
          <Text style={styles.headerSubtitle}>{formatDate(design.createdAt)}</Text>
        </View>
        <Badge text={design.status.replace('_', ' ')} variant={statusColors[design.status] || 'default'} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Quick Actions */}
        {design.status === 'PENDING' && (
          <View style={styles.actionsRow}>
            <TouchableOpacity style={[styles.actionButton, styles.approveButton]} onPress={approveDesign}>
              <Ionicons name="checkmark-circle-outline" size={20} color={colors.success} />
              <Text style={[styles.actionText, { color: colors.success }]}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.rejectButton]} onPress={rejectDesign}>
              <Ionicons name="close-circle-outline" size={20} color={colors.error} />
              <Text style={[styles.actionText, { color: colors.error }]}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionButton} onPress={() => setShowStatusModal(true)}>
            <Ionicons name="sync-outline" size={20} color={colors.primary} />
            <Text style={styles.actionText}>Update Status</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => setShowNotesModal(true)}>
            <Ionicons name="document-text-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.actionText, { color: colors.textSecondary }]}>Admin Notes</Text>
          </TouchableOpacity>
        </View>

        {/* Design Preview */}
        <Text style={styles.sectionTitle}>Design Preview</Text>
        <Card style={styles.previewCard}>
          {design.previewImage ? (
            <TouchableOpacity onPress={() => openFile(design.previewImage)}>
              <CachedImage source={{ uri: design.previewImage }} style={styles.previewImageLarge} resizeMode="contain" />
              <Text style={styles.tapToView}>Tap to view full size</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.previewPlaceholder}>
              <Ionicons name="image-outline" size={48} color={colors.textMuted} />
              <Text style={styles.previewPlaceholderText}>No preview image</Text>
            </View>
          )}
        </Card>

        {/* Files */}
        <Text style={styles.sectionTitle}>Files</Text>
        <Card style={styles.filesCard}>
          {/* G-code File */}
          <TouchableOpacity
            style={styles.fileRow}
            onPress={() => design.gcodePath && openFile(design.gcodePath)}
            disabled={!design.gcodePath}
          >
            <View style={[styles.fileIcon, { backgroundColor: design.gcodePath ? colors.successBg : colors.warningBg }]}>
              <Ionicons
                name={design.gcodePath ? 'checkmark-circle' : 'time-outline'}
                size={24}
                color={design.gcodePath ? colors.success : colors.warning}
              />
            </View>
            <View style={styles.fileInfo}>
              <Text style={styles.fileLabel}>G-code File</Text>
              <Text style={[styles.fileStatus, { color: design.gcodePath ? colors.success : colors.warning }]}>
                {design.gcodePath ? 'Ready for printing' : 'Needs slicing'}
              </Text>
            </View>
            {design.gcodePath && <Ionicons name="download-outline" size={24} color={colors.primary} />}
          </TouchableOpacity>

          {/* Design File */}
          {design.designFile && (
            <TouchableOpacity
              style={styles.fileRow}
              onPress={() => openFile(design.designFile)}
            >
              <View style={[styles.fileIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                <Ionicons name="document" size={24} color={colors.primary} />
              </View>
              <View style={styles.fileInfo}>
                <Text style={styles.fileLabel}>Design File (STL)</Text>
                <Text style={styles.fileStatus}>Tap to download</Text>
              </View>
              <Ionicons name="download-outline" size={24} color={colors.primary} />
            </TouchableOpacity>
          )}
        </Card>

        {/* Customer Info */}
        <Text style={styles.sectionTitle}>Customer</Text>
        <Card style={styles.customerCard}>
          <View style={styles.customerRow}>
            <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
            <TouchableOpacity onPress={() => Linking.openURL(`mailto:${design.customerEmail}`)}>
              <Text style={[styles.customerText, { color: colors.primary }]}>{design.customerEmail}</Text>
            </TouchableOpacity>
          </View>
          {design.sourceCustomerId && (
            <View style={styles.customerRow}>
              <Ionicons name="id-card-outline" size={18} color={colors.textMuted} />
              <Text style={styles.customerText}>Customer ID: {design.sourceCustomerId}</Text>
            </View>
          )}
          {design.source && (
            <View style={styles.customerRow}>
              <Ionicons name="globe-outline" size={18} color={colors.textMuted} />
              <Text style={styles.customerText}>Source: {design.source}</Text>
            </View>
          )}
        </Card>

        {/* Product Info */}
        <Text style={styles.sectionTitle}>Product</Text>
        <Card style={styles.productCard}>
          <Text style={styles.productName}>{design.product?.name || 'Unknown Product'}</Text>
          {design.variant && (
            <View style={styles.variantRow}>
              <Text style={styles.variantLabel}>Variant:</Text>
              <Text style={styles.variantValue}>{design.variant.name}</Text>
            </View>
          )}
          {design.variant?.sku && (
            <View style={styles.variantRow}>
              <Text style={styles.variantLabel}>SKU:</Text>
              <Text style={styles.variantValue}>{design.variant.sku}</Text>
            </View>
          )}
          {design.order && (
            <View style={styles.orderLink}>
              <Ionicons name="receipt-outline" size={16} color={colors.primary} />
              <Text style={styles.orderLinkText}>Original Order: #{design.order.orderNumber}</Text>
            </View>
          )}
        </Card>

        {/* Customization */}
        {design.customization && Object.keys(design.customization).length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Customization</Text>
            <Card style={styles.customizationCard}>
              {Object.entries(design.customization).map(([key, value]) => (
                <View key={key} style={styles.customizationRow}>
                  <Text style={styles.customizationLabel}>{key.replace(/([A-Z])/g, ' $1').trim()}</Text>
                  <Text style={styles.customizationValue}>{String(value)}</Text>
                </View>
              ))}
            </Card>
          </>
        )}

        {/* Admin Notes */}
        {design.designNotes && (
          <>
            <Text style={styles.sectionTitle}>Admin Notes</Text>
            <Card style={styles.notesCard}>
              <Text style={styles.notesText}>{design.designNotes}</Text>
            </Card>
          </>
        )}

        {/* Related Orders */}
        {relatedOrders.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Order History</Text>
            {relatedOrders.map((order) => (
              <Card key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
                  <Badge
                    text={order.status}
                    variant={order.status === 'DELIVERED' ? 'success' : order.status === 'CANCELLED' ? 'error' : 'primary'}
                  />
                </View>
                <View style={styles.orderDetails}>
                  <Text style={styles.orderTotal}>{formatCurrency(order.total)}</Text>
                  <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
                </View>
              </Card>
            ))}
          </>
        )}

        {/* Completion Date */}
        {design.completedAt && (
          <View style={styles.completedBanner}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.completedText}>Completed {formatDate(design.completedAt)}</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Status Modal */}
      <Modal visible={showStatusModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Status</Text>
            <View style={styles.statusOptions}>
              {STATUSES.map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[styles.statusOption, design.status === status && styles.statusOptionActive]}
                  onPress={() => updateStatus(status)}
                  disabled={updating}
                >
                  <Text style={[styles.statusOptionText, design.status === status && styles.statusOptionTextActive]}>
                    {status.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Button title="Cancel" variant="outline" onPress={() => setShowStatusModal(false)} style={{ marginTop: spacing.lg }} />
          </View>
        </View>
      </Modal>

      {/* Notes Modal */}
      <Modal visible={showNotesModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Admin Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add notes about this design..."
              placeholderTextColor={colors.textMuted}
              value={adminNotes}
              onChangeText={setAdminNotes}
              multiline
              numberOfLines={6}
            />
            <View style={styles.modalButtons}>
              <Button title="Cancel" variant="outline" onPress={() => setShowNotesModal(false)} style={{ flex: 1 }} />
              <Button
                title="Save Notes"
                onPress={saveNotes}
                loading={updating}
                style={{ flex: 1, marginLeft: spacing.md }}
              />
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
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    marginTop: spacing.md,
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
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
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
  approveButton: {
    borderColor: colors.success,
    backgroundColor: colors.successBg,
  },
  rejectButton: {
    borderColor: colors.error,
    backgroundColor: colors.errorBg,
  },
  actionText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  previewCard: {
    padding: 0,
    overflow: 'hidden',
  },
  previewImageLarge: {
    width: '100%',
    height: 250,
    backgroundColor: colors.surfaceHover,
  },
  tapToView: {
    textAlign: 'center',
    fontSize: fontSize.sm,
    color: colors.textMuted,
    padding: spacing.sm,
  },
  previewPlaceholder: {
    width: '100%',
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHover,
  },
  previewPlaceholderText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  filesCard: {
    padding: 0,
    overflow: 'hidden',
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  fileIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  fileLabel: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  fileStatus: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
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
  productCard: {
    padding: spacing.lg,
  },
  productName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  variantRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  variantLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginRight: spacing.sm,
  },
  variantValue: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  orderLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  orderLinkText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    marginLeft: spacing.sm,
  },
  customizationCard: {
    padding: spacing.lg,
  },
  customizationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  customizationLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
  customizationValue: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  notesCard: {
    padding: spacing.lg,
  },
  notesText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  orderCard: {
    marginBottom: spacing.sm,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  orderNumber: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  orderTotal: {
    fontSize: fontSize.md,
    color: colors.success,
    fontWeight: fontWeight.medium,
  },
  orderDate: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.successBg,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  completedText: {
    fontSize: fontSize.md,
    color: colors.success,
    fontWeight: fontWeight.medium,
    marginLeft: spacing.sm,
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
    fontWeight: fontWeight.semibold,
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
    height: 150,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
})
