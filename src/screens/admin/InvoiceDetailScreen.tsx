import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Linking,
  Platform,
  Share,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { api } from '../../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme'

interface InvoiceDetailScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void
    goBack: () => void
  }
  route: {
    params: { id: string }
  }
}

interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  total: number
}

interface InvoicePayment {
  id: string
  amount: number
  method: string
  reference?: string
  notes?: string
  paidAt: string
  recordedBy?: string
}

interface Invoice {
  id: string
  invoiceNumber: string
  customerName: string
  customerEmail: string
  customerCompany?: string
  customerPhone?: string
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number
  amountPaid: number
  status: string
  dueDate?: string
  paidAt?: string
  sentAt?: string
  notes?: string
  internalNotes?: string
  stripePaymentId?: string
  paymentMethod?: string
  createdAt: string
  items: InvoiceItem[]
  payments?: InvoicePayment[]
  client?: {
    id: string
    name: string
    clientNumber: string
    email?: string
    company?: string
  }
}

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'error' | 'primary'> = {
  DRAFT: 'default',
  SENT: 'primary',
  VIEWED: 'primary',
  PAID: 'success',
  OVERDUE: 'error',
  CANCELLED: 'default',
  REFUNDED: 'warning',
  PARTIAL: 'warning',
}

const STATUS_OPTIONS = ['DRAFT', 'SENT', 'VIEWED', 'PAID', 'OVERDUE', 'CANCELLED']

export function InvoiceDetailScreen({ navigation, route }: InvoiceDetailScreenProps) {
  const { id } = route.params
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Edit form state
  const [editForm, setEditForm] = useState({
    customerName: '',
    customerEmail: '',
    customerCompany: '',
    customerPhone: '',
    dueDate: '',
    notes: '',
    internalNotes: '',
    status: '',
  })

  const fetchInvoice = async () => {
    try {
      const data = await api.getAdminInvoice(id)
      setInvoice(data.invoice)
      // Initialize edit form
      setEditForm({
        customerName: data.invoice.customerName || '',
        customerEmail: data.invoice.customerEmail || '',
        customerCompany: data.invoice.customerCompany || '',
        customerPhone: data.invoice.customerPhone || '',
        dueDate: data.invoice.dueDate ? data.invoice.dueDate.split('T')[0] : '',
        notes: data.invoice.notes || '',
        internalNotes: data.invoice.internalNotes || '',
        status: data.invoice.status || 'DRAFT',
      })
    } catch (error) {
      console.error('Failed to fetch invoice:', error)
      Alert.alert('Error', 'Failed to load invoice details')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchInvoice()
  }, [id])

  const onRefresh = () => {
    setRefreshing(true)
    fetchInvoice()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0)
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const getRemainingBalance = () => {
    if (!invoice) return 0
    return Number(invoice.total) - Number(invoice.amountPaid || 0)
  }

  const isOverdue = () => {
    if (!invoice || !invoice.dueDate) return false
    return (
      invoice.status !== 'PAID' &&
      invoice.status !== 'CANCELLED' &&
      new Date(invoice.dueDate) < new Date()
    )
  }

  // Actions
  const handleMarkAsSent = async () => {
    Alert.alert(
      'Mark as Sent',
      'Mark this invoice as sent to the customer?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Sent',
          onPress: async () => {
            setActionLoading(true)
            try {
              await api.updateAdminInvoice(id, { status: 'SENT' })
              Alert.alert('Success', 'Invoice marked as sent')
              fetchInvoice()
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to update invoice')
            } finally {
              setActionLoading(false)
            }
          },
        },
      ]
    )
  }

  const handleMarkAsPaid = async () => {
    Alert.alert(
      'Mark as Paid',
      'Mark this invoice as fully paid?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Paid',
          onPress: async () => {
            setActionLoading(true)
            try {
              await api.updateAdminInvoice(id, { status: 'PAID' })
              Alert.alert('Success', 'Invoice marked as paid')
              fetchInvoice()
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to update invoice')
            } finally {
              setActionLoading(false)
            }
          },
        },
      ]
    )
  }

  const handleSendReminder = async () => {
    Alert.alert(
      'Send Reminder',
      `Send payment reminder to ${invoice?.customerEmail}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            setActionLoading(true)
            try {
              await api.sendAdminInvoiceReminder(id)
              Alert.alert('Success', 'Reminder email sent')
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to send reminder')
            } finally {
              setActionLoading(false)
            }
          },
        },
      ]
    )
  }

  const handleSendInvoice = async () => {
    Alert.alert(
      'Send Invoice',
      `Send this invoice to ${invoice?.customerEmail}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            setActionLoading(true)
            try {
              await api.sendAdminInvoice(id)
              Alert.alert('Success', 'Invoice sent successfully')
              fetchInvoice()
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to send invoice')
            } finally {
              setActionLoading(false)
            }
          },
        },
      ]
    )
  }

  const handleViewPDF = async () => {
    if (!invoice) return
    const pdfUrl = `https://47industries.com/invoice/${invoice.invoiceNumber}`
    try {
      await Linking.openURL(pdfUrl)
    } catch (error) {
      Alert.alert('Error', 'Unable to open invoice')
    }
  }

  const handleSharePDF = async () => {
    if (!invoice) return
    const pdfUrl = `https://47industries.com/invoice/${invoice.invoiceNumber}`
    try {
      await Share.share({
        message: `Invoice ${invoice.invoiceNumber}: ${pdfUrl}`,
        url: pdfUrl,
      })
    } catch (error) {
      // User cancelled share
    }
  }

  const handleSaveEdit = async () => {
    setSaving(true)
    try {
      await api.updateAdminInvoice(id, {
        status: editForm.status,
        notes: editForm.notes || undefined,
        dueDate: editForm.dueDate || undefined,
      })
      Alert.alert('Success', 'Invoice updated')
      setShowEditModal(false)
      fetchInvoice()
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update invoice')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.deleteAdminInvoice(id)
      Alert.alert('Success', 'Invoice deleted')
      navigation.goBack()
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to delete invoice')
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '??'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  if (!invoice) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIcon}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Invoice</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.errorText}>Invoice not found</Text>
        </View>
      </View>
    )
  }

  const displayStatus = isOverdue() ? 'OVERDUE' : invoice.status
  const hasPartialPayment =
    Number(invoice.amountPaid || 0) > 0 && Number(invoice.amountPaid || 0) < Number(invoice.total)

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIcon}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Invoice Details</Text>
        <TouchableOpacity onPress={() => setShowEditModal(true)} style={styles.editButton}>
          <Ionicons name="create-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Invoice Header Card */}
        <Card style={styles.invoiceHeaderCard}>
          <View style={styles.invoiceHeaderTop}>
            <View style={styles.invoiceNumberContainer}>
              <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
              <Badge text={displayStatus} variant={statusColors[displayStatus] || 'default'} />
            </View>
            <Text style={styles.invoiceTotal}>{formatCurrency(Number(invoice.total))}</Text>
          </View>

          <View style={styles.invoiceDates}>
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>Created</Text>
              <Text style={styles.dateValue}>{formatDate(invoice.createdAt)}</Text>
            </View>
            {invoice.dueDate && (
              <View style={styles.dateItem}>
                <Text style={styles.dateLabel}>Due Date</Text>
                <Text style={[styles.dateValue, isOverdue() && styles.dateOverdue]}>
                  {formatDate(invoice.dueDate)}
                </Text>
              </View>
            )}
            {invoice.sentAt && (
              <View style={styles.dateItem}>
                <Text style={styles.dateLabel}>Sent</Text>
                <Text style={styles.dateValue}>{formatDate(invoice.sentAt)}</Text>
              </View>
            )}
            {invoice.paidAt && (
              <View style={styles.dateItem}>
                <Text style={styles.dateLabel}>Paid</Text>
                <Text style={[styles.dateValue, { color: colors.success }]}>
                  {formatDate(invoice.paidAt)}
                </Text>
              </View>
            )}
          </View>

          {hasPartialPayment && (
            <View style={styles.partialPaymentBanner}>
              <Ionicons name="information-circle" size={18} color={colors.warning} />
              <View style={styles.partialPaymentInfo}>
                <Text style={styles.partialPaymentText}>
                  Partial Payment: {formatCurrency(Number(invoice.amountPaid))} paid
                </Text>
                <Text style={styles.partialPaymentRemaining}>
                  Remaining: {formatCurrency(getRemainingBalance())}
                </Text>
              </View>
            </View>
          )}
        </Card>

        {/* Client Information */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Bill To</Text>
          <TouchableOpacity
            style={styles.clientCard}
            onPress={() => invoice.client && navigation.navigate('ClientDetail', { id: invoice.client.id })}
            disabled={!invoice.client}
          >
            <View style={styles.clientAvatar}>
              <Text style={styles.clientAvatarText}>{getInitials(invoice.customerName)}</Text>
            </View>
            <View style={styles.clientInfo}>
              <Text style={styles.clientName}>{invoice.customerName}</Text>
              {invoice.customerCompany && (
                <Text style={styles.clientCompany}>{invoice.customerCompany}</Text>
              )}
              <Text style={styles.clientEmail}>{invoice.customerEmail}</Text>
              {invoice.customerPhone && (
                <Text style={styles.clientPhone}>{invoice.customerPhone}</Text>
              )}
            </View>
            {invoice.client && (
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            )}
          </TouchableOpacity>
        </Card>

        {/* Line Items */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Line Items</Text>
          {invoice.items?.map((item, index) => (
            <View
              key={item.id || index}
              style={[styles.lineItem, index < (invoice.items?.length || 0) - 1 && styles.lineItemBorder]}
            >
              <View style={styles.lineItemLeft}>
                <Text style={styles.lineItemDescription}>{item.description}</Text>
                <Text style={styles.lineItemMeta}>
                  {item.quantity} x {formatCurrency(Number(item.unitPrice))}
                </Text>
              </View>
              <Text style={styles.lineItemTotal}>{formatCurrency(Number(item.total))}</Text>
            </View>
          ))}

          {/* Totals */}
          <View style={styles.totalsContainer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{formatCurrency(Number(invoice.subtotal))}</Text>
            </View>
            {Number(invoice.taxRate) > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tax ({invoice.taxRate}%)</Text>
                <Text style={styles.totalValue}>{formatCurrency(Number(invoice.taxAmount))}</Text>
              </View>
            )}
            <View style={[styles.totalRow, styles.grandTotalRow]}>
              <Text style={styles.grandTotalLabel}>Total</Text>
              <Text style={styles.grandTotalValue}>{formatCurrency(Number(invoice.total))}</Text>
            </View>
            {hasPartialPayment && (
              <>
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, { color: colors.success }]}>Amount Paid</Text>
                  <Text style={[styles.totalValue, { color: colors.success }]}>
                    -{formatCurrency(Number(invoice.amountPaid))}
                  </Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, { color: colors.error }]}>Balance Due</Text>
                  <Text style={[styles.totalValue, { color: colors.error, fontWeight: fontWeight.bold }]}>
                    {formatCurrency(getRemainingBalance())}
                  </Text>
                </View>
              </>
            )}
          </View>
        </Card>

        {/* Payment History */}
        {invoice.payments && invoice.payments.length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Payment History</Text>
            {invoice.payments.map((payment, index) => (
              <View
                key={payment.id || index}
                style={[styles.paymentItem, index < (invoice.payments?.length || 0) - 1 && styles.paymentItemBorder]}
              >
                <View style={styles.paymentItemLeft}>
                  <View style={styles.paymentMethodBadge}>
                    <Text style={styles.paymentMethodText}>
                      {payment.method?.replace('_', ' ') || 'Unknown'}
                    </Text>
                  </View>
                  <Text style={styles.paymentDate}>{formatDateTime(payment.paidAt)}</Text>
                  {payment.reference && (
                    <Text style={styles.paymentReference}>Ref: {payment.reference}</Text>
                  )}
                  {payment.notes && <Text style={styles.paymentNotes}>{payment.notes}</Text>}
                </View>
                <Text style={styles.paymentAmount}>{formatCurrency(Number(payment.amount))}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* Notes */}
        {(invoice.notes || invoice.internalNotes) && (
          <View style={styles.notesContainer}>
            {invoice.notes && (
              <Card style={styles.notesCard}>
                <Text style={styles.sectionTitle}>Notes</Text>
                <Text style={styles.notesText}>{invoice.notes}</Text>
              </Card>
            )}
            {invoice.internalNotes && (
              <Card borderColor={colors.warning}>
                <View style={styles.internalNotesHeader}>
                  <Ionicons name="lock-closed-outline" size={14} color={colors.warning} />
                  <Text style={[styles.sectionTitle, { color: colors.warning, marginLeft: spacing.xs }]}>
                    Internal Notes
                  </Text>
                </View>
                <Text style={styles.notesText}>{invoice.internalNotes}</Text>
              </Card>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsContainer}>
          {/* Primary Actions based on status */}
          {invoice.status === 'DRAFT' && (
            <Button
              title="Send Invoice"
              onPress={handleSendInvoice}
              loading={actionLoading}
              style={styles.actionButton}
            />
          )}

          {invoice.status === 'DRAFT' && (
            <Button
              title="Mark as Sent"
              variant="outline"
              onPress={handleMarkAsSent}
              loading={actionLoading}
              style={styles.actionButton}
            />
          )}

          {['SENT', 'VIEWED', 'OVERDUE'].includes(invoice.status) && (
            <>
              <Button
                title="Mark as Paid"
                onPress={handleMarkAsPaid}
                loading={actionLoading}
                style={styles.actionButton}
              />
              <Button
                title="Send Reminder"
                variant="outline"
                onPress={handleSendReminder}
                loading={actionLoading}
                style={styles.actionButton}
              />
            </>
          )}

          {/* View/Share Actions */}
          <View style={styles.actionRow}>
            <Button
              title="View PDF"
              variant="secondary"
              onPress={handleViewPDF}
              style={styles.actionButtonHalf}
            />
            <Button
              title="Share"
              variant="secondary"
              onPress={handleSharePDF}
              style={styles.actionButtonHalf}
            />
          </View>

          {/* Delete */}
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => setShowDeleteConfirm(true)}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
            <Text style={styles.deleteButtonText}>Delete Invoice</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Invoice</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.inputLabel}>Status</Text>
              <View style={styles.statusOptions}>
                {STATUS_OPTIONS.map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusOption,
                      editForm.status === status && styles.statusOptionActive,
                    ]}
                    onPress={() => setEditForm({ ...editForm, status })}
                  >
                    <Text
                      style={[
                        styles.statusOptionText,
                        editForm.status === status && styles.statusOptionTextActive,
                      ]}
                    >
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Due Date</Text>
              <TextInput
                style={styles.input}
                value={editForm.dueDate}
                onChangeText={(text) => setEditForm({ ...editForm, dueDate: text })}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.inputLabel}>Notes (visible to customer)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editForm.notes}
                onChangeText={(text) => setEditForm({ ...editForm, notes: text })}
                placeholder="Notes for the customer..."
                placeholderTextColor={colors.textMuted}
                multiline
              />

              <Text style={styles.inputLabel}>Internal Notes (not visible)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editForm.internalNotes}
                onChangeText={(text) => setEditForm({ ...editForm, internalNotes: text })}
                placeholder="Internal notes..."
                placeholderTextColor={colors.textMuted}
                multiline
              />
            </ScrollView>

            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setShowEditModal(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Save"
                onPress={handleSaveEdit}
                loading={saving}
                style={{ flex: 1, marginLeft: spacing.md }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={showDeleteConfirm} animationType="fade" transparent>
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteModalIcon}>
              <Ionicons name="warning" size={32} color={colors.error} />
            </View>
            <Text style={styles.deleteModalTitle}>Delete Invoice?</Text>
            <Text style={styles.deleteModalText}>
              Are you sure you want to delete invoice {invoice.invoiceNumber}? This action cannot be
              undone.
            </Text>
            <View style={styles.deleteModalButtons}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setShowDeleteConfirm(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Delete"
                variant="danger"
                onPress={handleDelete}
                loading={deleting}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
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
  backIcon: {
    marginRight: spacing.md,
  },
  title: {
    flex: 1,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  editButton: {
    padding: spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  // Invoice Header Card
  invoiceHeaderCard: {
    margin: spacing.lg,
    padding: spacing.lg,
  },
  invoiceHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  invoiceNumberContainer: {
    gap: spacing.sm,
  },
  invoiceNumber: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  invoiceTotal: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  invoiceDates: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  dateItem: {},
  dateLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: 2,
  },
  dateValue: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  dateOverdue: {
    color: colors.error,
  },
  partialPaymentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningBg,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  partialPaymentInfo: {
    flex: 1,
  },
  partialPaymentText: {
    fontSize: fontSize.sm,
    color: colors.warning,
    fontWeight: fontWeight.medium,
  },
  partialPaymentRemaining: {
    fontSize: fontSize.xs,
    color: colors.warning,
    marginTop: 2,
  },
  // Section
  section: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
  // Client Card
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientAvatar: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientAvatarText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  clientInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  clientName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  clientCompany: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  clientEmail: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  clientPhone: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  // Line Items
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  lineItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lineItemLeft: {
    flex: 1,
  },
  lineItemDescription: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  lineItemMeta: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  lineItemTotal: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  // Totals
  totalsContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  grandTotalLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  grandTotalValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  // Payments
  paymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
  },
  paymentItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  paymentItemLeft: {
    flex: 1,
  },
  paymentMethodBadge: {
    backgroundColor: colors.surfaceHover,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: spacing.xs,
  },
  paymentMethodText: {
    fontSize: fontSize.xs,
    color: colors.text,
    textTransform: 'uppercase',
  },
  paymentDate: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  paymentReference: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  paymentNotes: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
    fontStyle: 'italic',
  },
  paymentAmount: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.success,
  },
  // Notes
  notesContainer: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  notesCard: {},
  internalNotesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  notesText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  // Actions
  actionsContainer: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  actionButton: {
    width: '100%',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButtonHalf: {
    flex: 1,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  deleteButtonText: {
    fontSize: fontSize.sm,
    color: colors.error,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  modalScroll: {
    padding: spacing.xl,
    maxHeight: 400,
  },
  modalButtons: {
    flexDirection: 'row',
    padding: spacing.xl,
    paddingTop: spacing.md,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
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
    minHeight: 80,
    textAlignVertical: 'top',
  },
  statusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statusOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusOptionText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  statusOptionTextActive: {
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  // Delete Modal
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  deleteModalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  deleteModalIcon: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: colors.errorBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  deleteModalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  deleteModalText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    width: '100%',
  },
})
