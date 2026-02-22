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
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { api } from '../../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme'

interface PartnerLeadDetailScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void
    goBack: () => void
  }
  route: {
    params: { id: string }
  }
}

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'error' | 'primary'> = {
  NEW: 'primary',
  CONTACTED: 'warning',
  QUALIFIED: 'success',
  PROPOSAL: 'primary',
  NEGOTIATION: 'warning',
  WON: 'success',
  LOST: 'error',
  CONVERTED: 'success',
  STALE: 'default',
}

const LEAD_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST', 'STALE']

const LEAD_INTERESTS = [
  'WEB_DEVELOPMENT',
  'APP_DEVELOPMENT',
  'UI_UX_DESIGN',
  'ECOMMERCE',
  'BRANDING',
  'SEO',
  'MAINTENANCE',
  'CUSTOM_3D_PRINTING',
  'MASS_PRODUCED_3D',
  'CONSULTING',
]

interface EditFormData {
  businessName: string
  contactName: string
  email: string
  phone: string
  website: string
  description: string
  interests: string[]
  estimatedBudget: string
  timeline: string
  companySize: string
  currentSolution: string
  painPoints: string
  status: string
  notes: string
}

export function PartnerLeadDetailScreen({ navigation, route }: PartnerLeadDetailScreenProps) {
  const { id } = route.params
  const [lead, setLead] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState<EditFormData>({
    businessName: '',
    contactName: '',
    email: '',
    phone: '',
    website: '',
    description: '',
    interests: [],
    estimatedBudget: '',
    timeline: '',
    companySize: '',
    currentSolution: '',
    painPoints: '',
    status: 'NEW',
    notes: '',
  })

  const fetchLead = async () => {
    try {
      const data = await api.getAdminLead(id)
      setLead(data.lead)
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

  const openEditModal = () => {
    if (lead) {
      setEditForm({
        businessName: lead.businessName || '',
        contactName: lead.contactName || '',
        email: lead.email || '',
        phone: lead.phone || '',
        website: lead.website || '',
        description: lead.description || '',
        interests: lead.interests || [],
        estimatedBudget: lead.estimatedBudget || '',
        timeline: lead.timeline || '',
        companySize: lead.companySize || '',
        currentSolution: lead.currentSolution || '',
        painPoints: lead.painPoints || '',
        status: lead.status || 'NEW',
        notes: lead.notes || '',
      })
      setEditModalVisible(true)
    }
  }

  const handleSave = async () => {
    if (!editForm.businessName.trim() || !editForm.contactName.trim() || !editForm.email.trim()) {
      Alert.alert('Error', 'Business name, contact name, and email are required')
      return
    }

    setSaving(true)
    try {
      await api.updateAdminLead(id, {
        businessName: editForm.businessName.trim(),
        contactName: editForm.contactName.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim() || null,
        website: editForm.website.trim() || null,
        description: editForm.description.trim() || null,
        interests: editForm.interests.length > 0 ? editForm.interests : null,
        estimatedBudget: editForm.estimatedBudget.trim() || null,
        timeline: editForm.timeline.trim() || null,
        companySize: editForm.companySize.trim() || null,
        currentSolution: editForm.currentSolution.trim() || null,
        painPoints: editForm.painPoints.trim() || null,
        status: editForm.status,
        notes: editForm.notes.trim() || null,
      })
      setEditModalVisible(false)
      fetchLead()
      Alert.alert('Success', 'Lead updated successfully')
    } catch (error) {
      console.error('Failed to update lead:', error)
      Alert.alert('Error', 'Failed to update lead')
    } finally {
      setSaving(false)
    }
  }

  const toggleInterest = (interest: string) => {
    if (editForm.interests.includes(interest)) {
      setEditForm({
        ...editForm,
        interests: editForm.interests.filter((i) => i !== interest),
      })
    } else {
      setEditForm({
        ...editForm,
        interests: [...editForm.interests, interest],
      })
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

  const formatInterest = (interest: string) => {
    return interest.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase())
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  if (!lead) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={styles.errorText}>Lead not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backIcon} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Lead Details</Text>
          <TouchableOpacity style={styles.editButton} onPress={openEditModal}>
            <Ionicons name="pencil" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Business Info Card */}
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{lead.businessName}</Text>
              <Text style={styles.profileNumber}>#{lead.leadNumber}</Text>
            </View>
            <Badge text={lead.status} variant={statusColors[lead.status] || 'default'} />
          </View>

          <View style={styles.contactDetails}>
            <View style={styles.contactRow}>
              <Ionicons name="person-outline" size={16} color={colors.textMuted} />
              <Text style={styles.contactText}>{lead.contactName}</Text>
            </View>
            <View style={styles.contactRow}>
              <Ionicons name="mail-outline" size={16} color={colors.textMuted} />
              <Text style={styles.contactText}>{lead.email}</Text>
            </View>
            {lead.phone && (
              <View style={styles.contactRow}>
                <Ionicons name="call-outline" size={16} color={colors.textMuted} />
                <Text style={styles.contactText}>{lead.phone}</Text>
              </View>
            )}
            {lead.website && (
              <View style={styles.contactRow}>
                <Ionicons name="globe-outline" size={16} color={colors.textMuted} />
                <Text style={styles.contactText}>{lead.website}</Text>
              </View>
            )}
          </View>
        </Card>

        {/* Partner Info */}
        {lead.partner && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Referred By</Text>
            <TouchableOpacity
              style={styles.partnerCard}
              onPress={() => navigation.navigate('PartnerDetail', { id: lead.partner.id })}
            >
              <View style={styles.partnerInfo}>
                <Text style={styles.partnerName}>{lead.partner.name}</Text>
                <Text style={styles.partnerNumber}>#{lead.partner.partnerNumber}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
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

        {/* Details */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Lead Details</Text>
          {lead.estimatedBudget && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Estimated Budget</Text>
              <Text style={styles.detailValue}>{lead.estimatedBudget}</Text>
            </View>
          )}
          {lead.timeline && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Timeline</Text>
              <Text style={styles.detailValue}>{lead.timeline}</Text>
            </View>
          )}
          {lead.companySize && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Company Size</Text>
              <Text style={styles.detailValue}>{lead.companySize}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Created</Text>
            <Text style={styles.detailValue}>{formatDate(lead.createdAt)}</Text>
          </View>
          {lead.closedAt && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Closed</Text>
              <Text style={styles.detailValue}>{formatDate(lead.closedAt)}</Text>
            </View>
          )}
        </Card>

        {/* Description */}
        {lead.description && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>{lead.description}</Text>
          </Card>
        )}

        {/* Pain Points */}
        {lead.painPoints && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Pain Points</Text>
            <Text style={styles.descriptionText}>{lead.painPoints}</Text>
          </Card>
        )}

        {/* Current Solution */}
        {lead.currentSolution && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Current Solution</Text>
            <Text style={styles.descriptionText}>{lead.currentSolution}</Text>
          </Card>
        )}

        {/* Notes */}
        {lead.notes && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.descriptionText}>{lead.notes}</Text>
          </Card>
        )}

        {/* Commissions */}
        {lead.commissions && lead.commissions.length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Commissions</Text>
            {lead.commissions.map((commission: any) => (
              <View key={commission.id} style={styles.commissionRow}>
                <View style={styles.commissionInfo}>
                  <Text style={styles.commissionType}>{commission.type}</Text>
                  <Text style={styles.commissionAmount}>
                    ${Number(commission.amount).toFixed(2)}
                  </Text>
                </View>
                <Badge text={commission.status} variant={commission.status === 'PAID' ? 'success' : 'warning'} />
              </View>
            ))}
          </Card>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Lead</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={styles.modalSave}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Status */}
            <Text style={styles.formSectionTitle}>Status</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.statusRow}>
                {LEAD_STATUSES.map((status) => (
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
                        styles.statusText,
                        editForm.status === status && styles.statusTextActive,
                      ]}
                    >
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Basic Info */}
            <Text style={styles.formSectionTitle}>Business Information</Text>

            <Text style={styles.inputLabel}>Business Name *</Text>
            <TextInput
              style={styles.input}
              value={editForm.businessName}
              onChangeText={(text) => setEditForm({ ...editForm, businessName: text })}
              placeholder="Business name"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.inputLabel}>Contact Name *</Text>
            <TextInput
              style={styles.input}
              value={editForm.contactName}
              onChangeText={(text) => setEditForm({ ...editForm, contactName: text })}
              placeholder="Contact person name"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.inputLabel}>Email *</Text>
            <TextInput
              style={styles.input}
              value={editForm.email}
              onChangeText={(text) => setEditForm({ ...editForm, email: text })}
              placeholder="Email address"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Phone</Text>
            <TextInput
              style={styles.input}
              value={editForm.phone}
              onChangeText={(text) => setEditForm({ ...editForm, phone: text })}
              placeholder="Phone number"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>Website</Text>
            <TextInput
              style={styles.input}
              value={editForm.website}
              onChangeText={(text) => setEditForm({ ...editForm, website: text })}
              placeholder="Website URL"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="url"
            />

            {/* Interests */}
            <Text style={styles.formSectionTitle}>Interests</Text>
            <View style={styles.interestsEditGrid}>
              {LEAD_INTERESTS.map((interest) => (
                <TouchableOpacity
                  key={interest}
                  style={[
                    styles.interestOption,
                    editForm.interests.includes(interest) && styles.interestOptionActive,
                  ]}
                  onPress={() => toggleInterest(interest)}
                >
                  <Text
                    style={[
                      styles.interestOptionText,
                      editForm.interests.includes(interest) && styles.interestOptionTextActive,
                    ]}
                  >
                    {formatInterest(interest)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Project Details */}
            <Text style={styles.formSectionTitle}>Project Details</Text>

            <Text style={styles.inputLabel}>Estimated Budget</Text>
            <TextInput
              style={styles.input}
              value={editForm.estimatedBudget}
              onChangeText={(text) => setEditForm({ ...editForm, estimatedBudget: text })}
              placeholder="e.g., $5,000 - $10,000"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.inputLabel}>Timeline</Text>
            <TextInput
              style={styles.input}
              value={editForm.timeline}
              onChangeText={(text) => setEditForm({ ...editForm, timeline: text })}
              placeholder="e.g., 2-3 months"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.inputLabel}>Company Size</Text>
            <TextInput
              style={styles.input}
              value={editForm.companySize}
              onChangeText={(text) => setEditForm({ ...editForm, companySize: text })}
              placeholder="e.g., 10-50 employees"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={editForm.description}
              onChangeText={(text) => setEditForm({ ...editForm, description: text })}
              placeholder="Project description"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
            />

            <Text style={styles.inputLabel}>Current Solution</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={editForm.currentSolution}
              onChangeText={(text) => setEditForm({ ...editForm, currentSolution: text })}
              placeholder="What they're currently using"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.inputLabel}>Pain Points</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={editForm.painPoints}
              onChangeText={(text) => setEditForm({ ...editForm, painPoints: text })}
              placeholder="Problems they're facing"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.inputLabel}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={editForm.notes}
              onChangeText={(text) => setEditForm({ ...editForm, notes: text })}
              placeholder="Internal notes"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
            />

            <View style={{ height: spacing.xxxl }} />
          </ScrollView>
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
  backButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
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
  contactDetails: {
    gap: spacing.sm,
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
  partnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  partnerInfo: {},
  partnerName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  partnerNumber: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  interestTag: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  interestText: {
    fontSize: fontSize.sm,
    color: colors.primary,
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
  descriptionText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  commissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  commissionInfo: {},
  commissionType: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  commissionAmount: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.success,
    marginTop: spacing.xs,
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
    color: colors.primary,
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },
  formSectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  statusOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  statusTextActive: {
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  interestsEditGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  interestOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  interestOptionActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  interestOptionText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  interestOptionTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
})
