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
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../../components/Card'
import { StatusBadge, getStatusType } from '../../components/StatusBadge'
import { api } from '../../services/api'
import { colors, portalColors, spacing, fontSize, fontWeight, borderRadius } from '../../theme'

interface LeadDetailScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void
    goBack: () => void
  }
  route: {
    params: { id: string }
  }
}

const statusColors: Record<string, { bg: string; text: string }> = {
  NEW: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6' },
  CONTACTED: { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b' },
  QUALIFIED: { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981' },
  PROPOSAL: { bg: 'rgba(139, 92, 246, 0.15)', text: '#8b5cf6' },
  NEGOTIATION: { bg: 'rgba(236, 72, 153, 0.15)', text: '#ec4899' },
  WON: { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981' },
  LOST: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444' },
}

export function LeadDetailScreen({ navigation, route }: LeadDetailScreenProps) {
  const { id } = route.params
  const [lead, setLead] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [notesModalVisible, setNotesModalVisible] = useState(false)
  const [notesValue, setNotesValue] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchLead = async () => {
    try {
      const data = await api.getPartnerLead(id)
      setLead(data.lead)
      setNotesValue(data.lead?.notes || '')
    } catch (error) {
      console.error('Failed to fetch lead:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchLead()
  }, [id])

  const onRefresh = () => {
    setRefreshing(true)
    fetchLead()
  }

  const handleSaveNotes = async () => {
    setSaving(true)
    try {
      await api.updatePartnerLeadNotes(id, notesValue.trim())
      setLead({ ...lead, notes: notesValue.trim() })
      setNotesModalVisible(false)
      Alert.alert('Success', 'Notes updated successfully')
    } catch (error) {
      console.error('Failed to update notes:', error)
      Alert.alert('Error', 'Failed to update notes')
    } finally {
      setSaving(false)
    }
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
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const formatInterest = (interest: string) => {
    return interest.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '-'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const handleCallPhone = () => {
    if (lead?.phone) {
      Linking.openURL(`tel:${lead.phone}`)
    }
  }

  const handleSendEmail = () => {
    if (lead?.email) {
      Linking.openURL(`mailto:${lead.email}`)
    }
  }

  const getStatusStyle = (status: string) => {
    return statusColors[status] || { bg: colors.surfaceHover, text: colors.textSecondary }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={portalColors.partner} />
      </View>
    )
  }

  if (!lead) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={styles.errorText}>Lead not found</Text>
        <TouchableOpacity style={styles.backButtonError} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const statusStyle = getStatusStyle(lead.status)

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={portalColors.partner} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backIcon} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Lead Details</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Business Info Card */}
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{lead.businessName}</Text>
              <Text style={styles.profileNumber}>#{lead.leadNumber}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.statusText, { color: statusStyle.text }]}>
                {lead.status.replace(/_/g, ' ')}
              </Text>
            </View>
          </View>

          <View style={styles.contactDetails}>
            <View style={styles.contactRow}>
              <Ionicons name="person-outline" size={16} color={colors.textMuted} />
              <Text style={styles.contactText}>{lead.contactName}</Text>
            </View>
            <TouchableOpacity style={styles.contactRow} onPress={handleSendEmail}>
              <Ionicons name="mail-outline" size={16} color={colors.textMuted} />
              <Text style={[styles.contactText, styles.linkText]}>{lead.email}</Text>
            </TouchableOpacity>
            {lead.phone && (
              <TouchableOpacity style={styles.contactRow} onPress={handleCallPhone}>
                <Ionicons name="call-outline" size={16} color={colors.textMuted} />
                <Text style={[styles.contactText, styles.linkText]}>{lead.phone}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickAction} onPress={handleSendEmail}>
              <View style={[styles.quickActionIcon, { backgroundColor: portalColors.partner + '20' }]}>
                <Ionicons name="mail" size={18} color={portalColors.partner} />
              </View>
              <Text style={styles.quickActionText}>Email</Text>
            </TouchableOpacity>
            {lead.phone && (
              <TouchableOpacity style={styles.quickAction} onPress={handleCallPhone}>
                <View style={[styles.quickActionIcon, { backgroundColor: portalColors.partner + '20' }]}>
                  <Ionicons name="call" size={18} color={portalColors.partner} />
                </View>
                <Text style={styles.quickActionText}>Call</Text>
              </TouchableOpacity>
            )}
          </View>
        </Card>

        {/* Estimated Value */}
        {lead.estimatedValue !== null && lead.estimatedValue !== undefined && (
          <Card style={styles.section}>
            <View style={styles.valueRow}>
              <View style={styles.valueInfo}>
                <Text style={styles.valueLabel}>Estimated Value</Text>
                <Text style={styles.valueAmount}>{formatCurrency(lead.estimatedValue)}</Text>
              </View>
              <View style={styles.valueIcon}>
                <Ionicons name="cash" size={24} color={portalColors.partner} />
              </View>
            </View>
          </Card>
        )}

        {/* Interests */}
        {lead.interests && lead.interests.length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Interests</Text>
            <View style={styles.interestsGrid}>
              {lead.interests.map((interest: string, index: number) => (
                <View key={index} style={styles.interestTag}>
                  <Text style={styles.interestText}>{formatInterest(interest)}</Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Timeline/Details */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Submitted</Text>
            <Text style={styles.detailValue}>{formatDateTime(lead.createdAt)}</Text>
          </View>
          {lead.convertedAt && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Converted</Text>
              <Text style={[styles.detailValue, { color: colors.success }]}>
                {formatDateTime(lead.convertedAt)}
              </Text>
            </View>
          )}
          {lead.closedAt && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Closed</Text>
              <Text style={styles.detailValue}>{formatDateTime(lead.closedAt)}</Text>
            </View>
          )}
        </Card>

        {/* Conversion Tracking */}
        {(lead.status === 'WON' || lead.convertedAt) && (
          <Card style={[styles.section, { borderColor: colors.success, borderWidth: 1 }]}>
            <View style={styles.conversionHeader}>
              <View style={styles.conversionIcon}>
                <Ionicons name="checkmark-circle" size={24} color={colors.success} />
              </View>
              <View style={styles.conversionInfo}>
                <Text style={styles.conversionTitle}>Lead Converted</Text>
                <Text style={styles.conversionSubtitle}>
                  Converted on {formatDate(lead.convertedAt || lead.closedAt)}
                </Text>
              </View>
            </View>
            {lead.commissions && lead.commissions.length > 0 && (
              <View style={styles.commissionsPreview}>
                <Text style={styles.commissionsLabel}>Commissions Earned</Text>
                <Text style={styles.commissionsAmount}>
                  {formatCurrency(
                    lead.commissions.reduce((sum: number, c: any) => sum + Number(c.amount), 0)
                  )}
                </Text>
              </View>
            )}
          </Card>
        )}

        {/* Notes */}
        <Card style={styles.section}>
          <View style={styles.noteHeader}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <TouchableOpacity
              style={styles.editNotesButton}
              onPress={() => {
                setNotesValue(lead.notes || '')
                setNotesModalVisible(true)
              }}
            >
              <Ionicons name="pencil" size={16} color={portalColors.partner} />
              <Text style={styles.editNotesText}>Edit</Text>
            </TouchableOpacity>
          </View>
          {lead.notes ? (
            <Text style={styles.notesText}>{lead.notes}</Text>
          ) : (
            <Text style={styles.noNotesText}>No notes added yet. Tap Edit to add notes.</Text>
          )}
        </Card>

        {/* Description if exists */}
        {lead.description && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>{lead.description}</Text>
          </Card>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* Notes Edit Modal */}
      <Modal
        visible={notesModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setNotesModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setNotesModalVisible(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Notes</Text>
            <TouchableOpacity onPress={handleSaveNotes} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color={portalColors.partner} />
              ) : (
                <Text style={styles.modalSave}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.modalLabel}>Lead Notes</Text>
            <TextInput
              style={styles.notesInput}
              value={notesValue}
              onChangeText={setNotesValue}
              placeholder="Add notes about this lead..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
              autoFocus
            />
            <Text style={styles.notesHint}>
              Keep track of conversations, follow-ups, and important details about this lead.
            </Text>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
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
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  errorText: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  backButtonError: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: portalColors.partner,
    borderRadius: borderRadius.md,
  },
  backButtonText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  profileCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  profileNumber: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
  },
  contactDetails: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  contactText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  linkText: {
    color: portalColors.partner,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  quickAction: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  section: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  valueInfo: {},
  valueLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  valueAmount: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: portalColors.partner,
  },
  valueIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: portalColors.partner + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  interestTag: {
    backgroundColor: portalColors.partner + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  interestText: {
    fontSize: fontSize.sm,
    color: portalColors.partner,
    fontWeight: fontWeight.medium,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  conversionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  conversionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conversionInfo: {
    flex: 1,
  },
  conversionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.success,
  },
  conversionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  commissionsPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  commissionsLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  commissionsAmount: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  editNotesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  editNotesText: {
    fontSize: fontSize.sm,
    color: portalColors.partner,
    fontWeight: fontWeight.medium,
  },
  notesText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  noNotesText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  descriptionText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalCancel: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  modalSave: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: portalColors.partner,
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },
  modalLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  notesInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    minHeight: 200,
  },
  notesHint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
})
