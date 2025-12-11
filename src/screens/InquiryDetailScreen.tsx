import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { api } from '../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme'

const STATUSES = ['PENDING', 'CONTACTED', 'QUOTED', 'PROPOSAL_SENT', 'NEGOTIATING', 'ACCEPTED', 'DECLINED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'error' | 'primary'> = {
  PENDING: 'warning',
  CONTACTED: 'primary',
  QUOTED: 'primary',
  PROPOSAL_SENT: 'primary',
  NEGOTIATING: 'warning',
  ACCEPTED: 'success',
  DECLINED: 'error',
  IN_PROGRESS: 'primary',
  COMPLETED: 'success',
  CANCELLED: 'error',
}

const serviceTypeIcons: Record<string, string> = {
  WEB_DEVELOPMENT: 'globe-outline',
  APP_DEVELOPMENT: 'phone-portrait-outline',
  AI_SOLUTIONS: 'hardware-chip-outline',
  CONSULTATION: 'chatbubble-outline',
  CUSTOM_PC: 'desktop-outline',
  REPAIR: 'construct-outline',
  OTHER: 'ellipsis-horizontal-outline',
}

export default function InquiryDetailScreen({ navigation, route }: any) {
  const { id } = route.params
  const [inquiry, setInquiry] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [adminNotes, setAdminNotes] = useState('')

  useEffect(() => {
    fetchInquiry()
  }, [id])

  const fetchInquiry = async () => {
    try {
      const data = await api.getInquiry(id)
      // Handle both { inquiry: ... } wrapper and direct inquiry object
      const inquiryData = data.inquiry || (data.id ? data : null)
      if (inquiryData) {
        setInquiry(inquiryData)
        setAdminNotes(inquiryData?.adminNotes || '')
      } else {
        Alert.alert('Error', 'Inquiry not found')
      }
    } catch (error: any) {
      console.error('Failed to fetch inquiry:', error)
      Alert.alert('Error', error.message || 'Failed to load inquiry details')
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (status: string) => {
    setUpdating(true)
    try {
      await api.updateInquiryStatus(id, status)
      setInquiry({ ...inquiry, status })
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
      await api.updateInquiry(id, { adminNotes })
      setInquiry({ ...inquiry, adminNotes })
      setShowNotesModal(false)
      Alert.alert('Success', 'Notes saved')
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save notes')
    } finally {
      setUpdating(false)
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

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    if (isNaN(num)) return amount
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num)
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

  if (!inquiry) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.inquiryNumber}>Inquiry</Text>
          </View>
        </View>
        <View style={styles.loading}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
          <Text style={styles.loadingText}>Inquiry not found</Text>
          <Text style={[styles.loadingText, { fontSize: fontSize.sm, marginTop: spacing.xs }]}>
            This inquiry may have been deleted
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
          <Text style={styles.inquiryNumber}>#{inquiry.inquiryNumber}</Text>
          <Text style={styles.inquiryDate}>{formatDate(inquiry.createdAt)}</Text>
        </View>
        <Badge text={inquiry.status.replace('_', ' ')} variant={statusColors[inquiry.status] || 'default'} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Service Type */}
        <Card style={styles.serviceCard}>
          <View style={styles.serviceIcon}>
            <Ionicons
              name={(serviceTypeIcons[inquiry.serviceType] || 'help-outline') as any}
              size={32}
              color={colors.primary}
            />
          </View>
          <Text style={styles.serviceType}>{inquiry.serviceType?.replace('_', ' ') || 'Service'}</Text>
          {inquiry.budget && (
            <View style={styles.budgetBadge}>
              <Ionicons name="cash-outline" size={16} color={colors.success} />
              <Text style={styles.budgetText}>
                Budget: {typeof inquiry.budget === 'number' ? formatCurrency(inquiry.budget) : inquiry.budget}
              </Text>
            </View>
          )}
        </Card>

        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionButton} onPress={() => setShowStatusModal(true)}>
            <Ionicons name="sync-outline" size={20} color={colors.primary} />
            <Text style={styles.actionText}>Update Status</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => setShowNotesModal(true)}>
            <Ionicons name="create-outline" size={20} color={colors.primary} />
            <Text style={styles.actionText}>Add Notes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => Linking.openURL(`mailto:${inquiry.email}?subject=Re: Service Inquiry #${inquiry.inquiryNumber}`)}
          >
            <Ionicons name="mail-outline" size={20} color={colors.success} />
            <Text style={[styles.actionText, { color: colors.success }]}>Reply</Text>
          </TouchableOpacity>
        </View>

        {/* Customer Info */}
        <Text style={styles.sectionTitle}>Customer</Text>
        <Card style={styles.customerCard}>
          <View style={styles.customerRow}>
            <Ionicons name="person-outline" size={18} color={colors.textMuted} />
            <Text style={styles.customerText}>{inquiry.name}</Text>
          </View>
          <View style={styles.customerRow}>
            <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
            <TouchableOpacity onPress={() => Linking.openURL(`mailto:${inquiry.email}`)}>
              <Text style={[styles.customerText, { color: colors.primary }]}>{inquiry.email}</Text>
            </TouchableOpacity>
          </View>
          {inquiry.phone && (
            <View style={styles.customerRow}>
              <Ionicons name="call-outline" size={18} color={colors.textMuted} />
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${inquiry.phone}`)}>
                <Text style={[styles.customerText, { color: colors.primary }]}>{inquiry.phone}</Text>
              </TouchableOpacity>
            </View>
          )}
          {inquiry.company && (
            <View style={styles.customerRow}>
              <Ionicons name="business-outline" size={18} color={colors.textMuted} />
              <Text style={styles.customerText}>{inquiry.company}</Text>
            </View>
          )}
          {inquiry.website && (
            <View style={styles.customerRow}>
              <Ionicons name="globe-outline" size={18} color={colors.textMuted} />
              <TouchableOpacity onPress={() => Linking.openURL(inquiry.website.startsWith('http') ? inquiry.website : `https://${inquiry.website}`)}>
                <Text style={[styles.customerText, { color: colors.primary }]}>{inquiry.website}</Text>
              </TouchableOpacity>
            </View>
          )}
        </Card>

        {/* Project Details */}
        <Text style={styles.sectionTitle}>Project Details</Text>
        <Card style={styles.detailsCard}>
          {inquiry.timeline && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Timeline</Text>
              <Text style={styles.detailValue}>{inquiry.timeline}</Text>
            </View>
          )}
          {inquiry.budget && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Budget</Text>
              <Text style={[styles.detailValue, { color: colors.success }]}>
                {typeof inquiry.budget === 'number' ? formatCurrency(inquiry.budget) : inquiry.budget}
              </Text>
            </View>
          )}
        </Card>

        {/* Message/Description */}
        {(inquiry.message || inquiry.description) && (
          <>
            <Text style={styles.sectionTitle}>Message</Text>
            <Card style={styles.messageCard}>
              <Text style={styles.messageText}>{inquiry.message || inquiry.description}</Text>
            </Card>
          </>
        )}

        {/* Admin Notes */}
        {inquiry.adminNotes && (
          <>
            <Text style={styles.sectionTitle}>Admin Notes</Text>
            <Card style={styles.notesCard}>
              <Text style={styles.notesText}>{inquiry.adminNotes}</Text>
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
            <ScrollView style={styles.statusScrollView}>
              <View style={styles.statusOptions}>
                {STATUSES.map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[styles.statusOption, inquiry.status === status && styles.statusOptionActive]}
                    onPress={() => updateStatus(status)}
                    disabled={updating}
                  >
                    <Text style={[styles.statusOptionText, inquiry.status === status && styles.statusOptionTextActive]}>
                      {status.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
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
              placeholder="Add internal notes about this inquiry..."
              placeholderTextColor={colors.textMuted}
              value={adminNotes}
              onChangeText={setAdminNotes}
              multiline
            />
            <View style={styles.modalButtons}>
              <Button title="Cancel" variant="outline" onPress={() => setShowNotesModal(false)} style={{ flex: 1 }} />
              <Button title="Save Notes" onPress={saveNotes} loading={updating} style={{ flex: 1, marginLeft: spacing.md }} />
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
  inquiryNumber: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  inquiryDate: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  serviceCard: {
    alignItems: 'center',
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  serviceIcon: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  serviceType: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textTransform: 'capitalize',
  },
  budgetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: borderRadius.full,
  },
  budgetText: {
    fontSize: fontSize.md,
    color: colors.success,
    fontWeight: fontWeight.semibold,
    marginLeft: spacing.xs,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  actionButton: {
    flex: 1,
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
    fontSize: fontSize.xs,
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
  detailsCard: {
    padding: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  detailValue: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  messageCard: {
    padding: spacing.lg,
  },
  messageText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
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
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xl,
  },
  statusScrollView: {
    maxHeight: 300,
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
  },
})
