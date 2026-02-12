import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { api } from '../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme'

const STATUSES = ['PENDING', 'REVIEWING', 'QUOTED', 'APPROVED', 'IN_PRODUCTION', 'COMPLETED', 'CANCELLED']

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'error' | 'primary'> = {
  PENDING: 'warning',
  REVIEWING: 'primary',
  QUOTED: 'primary',
  APPROVED: 'success',
  IN_PRODUCTION: 'primary',
  COMPLETED: 'success',
  CANCELLED: 'error',
}

export default function CustomRequestDetailScreen({ navigation, route }: any) {
  const { id } = route.params
  const [request, setRequest] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showQuoteModal, setShowQuoteModal] = useState(false)
  const [quotePrice, setQuotePrice] = useState('')
  const [quoteDays, setQuoteDays] = useState('')
  const [quoteNotes, setQuoteNotes] = useState('')

  useEffect(() => {
    fetchRequest()
  }, [id])

  const fetchRequest = async () => {
    try {
      const data = await api.getCustomRequest(id)
      // Handle both { request: ... } wrapper and direct request object
      const requestData = data.request || (data.id ? data : null)
      setRequest(requestData)
      if (requestData?.estimatedPrice) {
        setQuotePrice(requestData.estimatedPrice.toString())
      }
      if (requestData?.estimatedDays) {
        setQuoteDays(requestData.estimatedDays.toString())
      }
    } catch (error) {
      console.error('Failed to fetch request:', error)
      Alert.alert('Error', 'Failed to load request details')
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (status: string) => {
    setUpdating(true)
    try {
      await api.updateCustomRequest(id, { status })
      setRequest({ ...request, status })
      setShowStatusModal(false)
      Alert.alert('Success', 'Status updated')
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  const sendQuote = async () => {
    if (!quotePrice || parseFloat(quotePrice) <= 0) {
      Alert.alert('Error', 'Please enter a valid price')
      return
    }

    setUpdating(true)
    try {
      await api.sendQuote(id, {
        estimatedPrice: parseFloat(quotePrice),
        estimatedDays: quoteDays ? parseInt(quoteDays) : undefined,
        quoteNotes,
      })
      await fetchRequest()
      setShowQuoteModal(false)
      Alert.alert('Success', 'Quote sent to customer')
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send quote')
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

  if (!request) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.requestNumber}>3D Print Request</Text>
          </View>
        </View>
        <View style={styles.loading}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
          <Text style={styles.loadingText}>Request not found</Text>
          <Text style={[styles.loadingText, { fontSize: fontSize.sm, marginTop: spacing.xs }]}>
            This request may have been deleted
          </Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ marginTop: spacing.lg, padding: spacing.md }}
          >
            <Text style={{ color: colors.primary, fontSize: fontSize.md }}>Go Back</Text>
          </TouchableOpacity>
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
          <Text style={styles.requestNumber}>#{request.requestNumber}</Text>
          <Text style={styles.requestDate}>{formatDate(request.createdAt)}</Text>
        </View>
        <Badge text={request.status.replace('_', ' ')} variant={statusColors[request.status] || 'default'} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionButton} onPress={() => setShowStatusModal(true)}>
            <Ionicons name="sync-outline" size={20} color={colors.primary} />
            <Text style={styles.actionText}>Update Status</Text>
          </TouchableOpacity>
          {request.status !== 'QUOTED' && request.status !== 'COMPLETED' && request.status !== 'CANCELLED' && (
            <TouchableOpacity style={styles.actionButton} onPress={() => setShowQuoteModal(true)}>
              <Ionicons name="pricetag-outline" size={20} color={colors.success} />
              <Text style={[styles.actionText, { color: colors.success }]}>Send Quote</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Quote Info (if exists) */}
        {request.estimatedPrice && (
          <Card style={styles.quoteCard}>
            <View style={styles.quoteHeader}>
              <Ionicons name="pricetag" size={20} color={colors.success} />
              <Text style={styles.quoteTitle}>Quote Details</Text>
            </View>
            <View style={styles.quoteDetails}>
              <View style={styles.quoteItem}>
                <Text style={styles.quoteLabel}>Price</Text>
                <Text style={styles.quoteValue}>{formatCurrency(Number(request.estimatedPrice))}</Text>
              </View>
              {request.estimatedDays && (
                <View style={styles.quoteItem}>
                  <Text style={styles.quoteLabel}>Est. Days</Text>
                  <Text style={styles.quoteValue}>{request.estimatedDays}</Text>
                </View>
              )}
            </View>
            {request.quoteNotes && (
              <Text style={styles.quoteNotes}>{request.quoteNotes}</Text>
            )}
            {request.quotedAt && (
              <Text style={styles.quoteDate}>Quoted: {formatDate(request.quotedAt)}</Text>
            )}
          </Card>
        )}

        {/* Customer Info */}
        <Text style={styles.sectionTitle}>Customer</Text>
        <Card style={styles.customerCard}>
          <View style={styles.customerRow}>
            <Ionicons name="person-outline" size={18} color={colors.textMuted} />
            <Text style={styles.customerText}>{request.name}</Text>
          </View>
          <View style={styles.customerRow}>
            <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
            <TouchableOpacity onPress={() => Linking.openURL(`mailto:${request.email}`)}>
              <Text style={[styles.customerText, { color: colors.primary }]}>{request.email}</Text>
            </TouchableOpacity>
          </View>
          {request.phone && (
            <View style={styles.customerRow}>
              <Ionicons name="call-outline" size={18} color={colors.textMuted} />
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${request.phone}`)}>
                <Text style={[styles.customerText, { color: colors.primary }]}>{request.phone}</Text>
              </TouchableOpacity>
            </View>
          )}
          {request.company && (
            <View style={styles.customerRow}>
              <Ionicons name="business-outline" size={18} color={colors.textMuted} />
              <Text style={styles.customerText}>{request.company}</Text>
            </View>
          )}
        </Card>

        {/* File Info */}
        {request.fileName && (
          <>
            <Text style={styles.sectionTitle}>Uploaded File</Text>
            <Card style={styles.fileCard}>
              <TouchableOpacity
                style={styles.fileContent}
                onPress={() => request.fileUrl && Linking.openURL(request.fileUrl)}
              >
                <View style={styles.fileIcon}>
                  <Ionicons name="document" size={24} color={colors.primary} />
                </View>
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName}>{request.fileName}</Text>
                  {request.fileSize && (
                    <Text style={styles.fileSize}>{(request.fileSize / 1024 / 1024).toFixed(2)} MB</Text>
                  )}
                </View>
                <Ionicons name="download-outline" size={24} color={colors.primary} />
              </TouchableOpacity>
            </Card>
          </>
        )}

        {/* Print Specifications */}
        <Text style={styles.sectionTitle}>Print Specifications</Text>
        <Card style={styles.specsCard}>
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Material</Text>
            <Text style={styles.specValue}>{request.material}</Text>
          </View>
          {request.finish && (
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Finish</Text>
              <Text style={styles.specValue}>{request.finish}</Text>
            </View>
          )}
          {request.color && (
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Color</Text>
              <Text style={styles.specValue}>{request.color}</Text>
            </View>
          )}
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Quantity</Text>
            <Text style={styles.specValue}>{request.quantity}</Text>
          </View>
          {request.dimensions && (
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Dimensions</Text>
              <Text style={styles.specValue}>{request.dimensions}</Text>
            </View>
          )}
          {request.detailLevel && (
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Design Complexity</Text>
              <Text style={styles.specValue}>{request.detailLevel}</Text>
            </View>
          )}
          {request.scale && (
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Scale</Text>
              <Text style={styles.specValue}>{request.scale}%</Text>
            </View>
          )}
        </Card>

        {/* Customer Notes */}
        {request.notes && (
          <>
            <Text style={styles.sectionTitle}>Customer Notes</Text>
            <Card style={styles.notesCard}>
              <Text style={styles.notesText}>{request.notes}</Text>
            </Card>
          </>
        )}

        {/* Deadline */}
        {request.deadline && (
          <>
            <Text style={styles.sectionTitle}>Deadline</Text>
            <Card style={styles.deadlineCard}>
              <Ionicons name="calendar" size={20} color={colors.warning} />
              <Text style={styles.deadlineText}>{formatDate(request.deadline)}</Text>
            </Card>
          </>
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
                  style={[styles.statusOption, request.status === status && styles.statusOptionActive]}
                  onPress={() => updateStatus(status)}
                  disabled={updating}
                >
                  <Text style={[styles.statusOptionText, request.status === status && styles.statusOptionTextActive]}>
                    {status.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Button title="Cancel" variant="outline" onPress={() => setShowStatusModal(false)} style={{ marginTop: spacing.lg }} />
          </View>
        </View>
      </Modal>

      {/* Quote Modal */}
      <Modal visible={showQuoteModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Send Quote</Text>

            <Text style={styles.inputLabel}>Price *</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              value={quotePrice}
              onChangeText={setQuotePrice}
              keyboardType="decimal-pad"
            />

            <Text style={styles.inputLabel}>Estimated Production Days</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 5"
              placeholderTextColor={colors.textMuted}
              value={quoteDays}
              onChangeText={setQuoteDays}
              keyboardType="number-pad"
            />

            <Text style={styles.inputLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Additional details for the customer..."
              placeholderTextColor={colors.textMuted}
              value={quoteNotes}
              onChangeText={setQuoteNotes}
              multiline
            />

            <View style={styles.modalButtons}>
              <Button title="Cancel" variant="outline" onPress={() => setShowQuoteModal(false)} style={{ flex: 1 }} />
              <Button
                title="Send Quote"
                onPress={sendQuote}
                loading={updating}
                style={{ flex: 1, marginLeft: spacing.md }}
              />
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
  requestNumber: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  requestDate: {
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
  quoteCard: {
    marginBottom: spacing.lg,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: colors.success,
  },
  quoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  quoteTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.success,
    marginLeft: spacing.sm,
  },
  quoteDetails: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginBottom: spacing.sm,
  },
  quoteItem: {},
  quoteLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  quoteValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  quoteNotes: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  quoteDate: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
    marginTop: spacing.md,
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
  fileCard: {
    padding: 0,
    overflow: 'hidden',
  },
  fileContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  fileIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  fileName: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  fileSize: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  specsCard: {
    padding: spacing.lg,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  specLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  specValue: {
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
  deadlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.warningBg,
    borderColor: colors.warning,
  },
  deadlineText: {
    fontSize: fontSize.md,
    color: colors.warning,
    fontWeight: fontWeight.medium,
    marginLeft: spacing.md,
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
})
