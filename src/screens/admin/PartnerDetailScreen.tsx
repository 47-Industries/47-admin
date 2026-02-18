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

interface PartnerDetailScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void
    goBack: () => void
  }
  route: {
    params: { id: string }
  }
}

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'error' | 'primary'> = {
  ACTIVE: 'success',
  PENDING: 'warning',
  SUSPENDED: 'error',
  INACTIVE: 'default',
}

const typeLabels: Record<string, string> = {
  SERVICE_REFERRAL: 'Service Referral',
  PRODUCT_AFFILIATE: 'Product Affiliate',
  BOTH: 'Full Partner',
  FULL_PARTNER: 'Full Partner',
}

const PARTNER_STATUSES = ['ACTIVE', 'PENDING', 'SUSPENDED', 'INACTIVE']
const PARTNER_TYPES = ['SERVICE_REFERRAL', 'PRODUCT_AFFILIATE', 'BOTH']
const COMMISSION_TYPES = ['PERCENTAGE', 'FLAT']

interface EditFormData {
  name: string
  email: string
  phone: string
  company: string
  status: string
  partnerType: string
  commissionType: string
  firstSaleRate: string
  recurringRate: string
  shopCommissionRate: string
  affiliateCode: string
  zelleEmail: string
  zellePhone: string
  venmoUsername: string
  cashAppTag: string
  mailingAddress: string
}

export function PartnerDetailScreen({ navigation, route }: PartnerDetailScreenProps) {
  const { id } = route.params
  const [partner, setPartner] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editForm, setEditForm] = useState<EditFormData>({
    name: '',
    email: '',
    phone: '',
    company: '',
    status: 'ACTIVE',
    partnerType: 'SERVICE_REFERRAL',
    commissionType: 'PERCENTAGE',
    firstSaleRate: '10',
    recurringRate: '5',
    shopCommissionRate: '',
    affiliateCode: '',
    zelleEmail: '',
    zellePhone: '',
    venmoUsername: '',
    cashAppTag: '',
    mailingAddress: '',
  })

  const fetchPartner = async () => {
    try {
      const data = await api.getAdminPartner(id)
      setPartner(data.partner)
    } catch (error) {
      console.error('Failed to fetch partner:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchPartner()
  }, [id])

  const onRefresh = () => {
    setRefreshing(true)
    fetchPartner()
  }

  const openEditModal = () => {
    if (partner) {
      setEditForm({
        name: partner.name || '',
        email: partner.email || '',
        phone: partner.phone || '',
        company: partner.company || '',
        status: partner.status || 'ACTIVE',
        partnerType: partner.partnerType || 'SERVICE_REFERRAL',
        commissionType: partner.commissionType || 'PERCENTAGE',
        firstSaleRate: String(partner.firstSaleRate || 10),
        recurringRate: String(partner.recurringRate || 5),
        shopCommissionRate: partner.shopCommissionRate ? String(partner.shopCommissionRate) : '',
        affiliateCode: partner.affiliateCode || '',
        zelleEmail: partner.zelleEmail || '',
        zellePhone: partner.zellePhone || '',
        venmoUsername: partner.venmoUsername || '',
        cashAppTag: partner.cashAppTag || '',
        mailingAddress: partner.mailingAddress || '',
      })
      setEditModalVisible(true)
    }
  }

  const handleDeletePartner = () => {
    Alert.alert(
      'Delete Partner',
      `Are you sure you want to delete ${partner?.name}? This will also delete all associated leads, commissions, and payouts. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true)
            try {
              await api.deleteAdminPartner(id)
              Alert.alert('Success', 'Partner deleted successfully')
              navigation.goBack()
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete partner')
            } finally {
              setDeleting(false)
            }
          },
        },
      ]
    )
  }

  const handleSave = async () => {
    if (!editForm.name.trim() || !editForm.email.trim()) {
      Alert.alert('Error', 'Name and email are required')
      return
    }

    setSaving(true)
    try {
      await api.updateAdminPartner(id, {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim() || null,
        company: editForm.company.trim() || null,
        status: editForm.status,
        partnerType: editForm.partnerType,
        commissionType: editForm.commissionType,
        firstSaleRate: editForm.firstSaleRate,
        recurringRate: editForm.recurringRate,
        shopCommissionRate: editForm.shopCommissionRate || null,
        affiliateCode: editForm.affiliateCode.trim() || null,
        zelleEmail: editForm.zelleEmail.trim() || null,
        zellePhone: editForm.zellePhone.trim() || null,
        venmoUsername: editForm.venmoUsername.trim() || null,
        cashAppTag: editForm.cashAppTag.trim() || null,
        mailingAddress: editForm.mailingAddress.trim() || null,
      })
      setEditModalVisible(false)
      fetchPartner()
      Alert.alert('Success', 'Partner updated successfully')
    } catch (error) {
      console.error('Failed to update partner:', error)
      Alert.alert('Error', 'Failed to update partner')
    } finally {
      setSaving(false)
    }
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

  if (!partner) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={styles.errorText}>Partner not found</Text>
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
          <Text style={styles.title}>Partner Details</Text>
          <TouchableOpacity style={styles.editButton} onPress={openEditModal}>
            <Ionicons name="pencil" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(partner.name)}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{partner.name}</Text>
              <Text style={styles.profileNumber}>#{partner.partnerNumber}</Text>
              <Text style={styles.profileEmail}>{partner.email}</Text>
            </View>
          </View>
          <View style={styles.badgeRow}>
            <Badge text={partner.status} variant={statusColors[partner.status] || 'default'} />
            <Badge text={typeLabels[partner.partnerType] || partner.partnerType} variant="primary" />
          </View>
        </Card>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Earned</Text>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {formatCurrency(
                Number(partner.totalEarned) + Number(partner.overrideTotalEarned || 0)
              )}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Pending</Text>
            <Text style={[styles.statValue, { color: colors.warning }]}>
              {formatCurrency(
                Number(partner.pendingAmount) + Number(partner.overridePendingAmount || 0)
              )}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Paid</Text>
            <Text style={styles.statValue}>
              {formatCurrency(Number(partner.totalPaid))}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Leads</Text>
            <Text style={styles.statValue}>{partner.leads?.length || 0}</Text>
          </View>
          {Number(partner.overrideTotalEarned || 0) > 0 && (
            <View style={[styles.statCard, { borderColor: '#8b5cf650' }]}>
              <Text style={styles.statLabel}>Override Earned</Text>
              <Text style={[styles.statValue, { color: '#8b5cf6' }]}>
                {formatCurrency(Number(partner.overrideTotalEarned))}
              </Text>
            </View>
          )}
          {(partner.recruitedPartners?.length || 0) > 0 && (
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Recruits</Text>
              <Text style={styles.statValue}>{partner.recruitedPartners.length}</Text>
            </View>
          )}
        </View>

        {/* Commission Rates */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Commission Rates</Text>
          <View style={styles.ratesRow}>
            <View style={styles.rateItem}>
              <Text style={styles.rateLabel}>First Sale</Text>
              <Text style={styles.rateValue}>{partner.firstSaleRate || 0}%</Text>
            </View>
            <View style={styles.rateItem}>
              <Text style={styles.rateLabel}>Recurring</Text>
              <Text style={styles.rateValue}>{partner.recurringRate || 0}%</Text>
            </View>
            {partner.shopCommissionRate && (
              <View style={styles.rateItem}>
                <Text style={styles.rateLabel}>Shop</Text>
                <Text style={styles.rateValue}>{partner.shopCommissionRate}%</Text>
              </View>
            )}
          </View>
        </Card>

        {/* MLM / Recruit Info */}
        {(partner.sponsorCode || partner.sponsor || (partner.recruitedPartners?.length || 0) > 0) && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Recruitment</Text>

            {/* Sponsor code */}
            {partner.sponsorCode && (
              <View style={styles.mlmRow}>
                <Text style={styles.mlmLabel}>Sponsor Code</Text>
                <Text style={styles.mlmCode}>{partner.sponsorCode}</Text>
              </View>
            )}

            {/* Who recruited this partner */}
            {partner.sponsor && (
              <View style={styles.mlmRow}>
                <Text style={styles.mlmLabel}>Recruited By</Text>
                <Text style={styles.mlmValue}>
                  {partner.sponsor.name}{' '}
                  <Text style={styles.mlmSubValue}>({partner.sponsor.partnerNumber})</Text>
                </Text>
              </View>
            )}

            {/* Partners this partner recruited */}
            {(partner.recruitedPartners?.length || 0) > 0 && (
              <View style={styles.mlmRecruitSection}>
                <Text style={styles.mlmLabel}>Recruits ({partner.recruitedPartners.length})</Text>
                {partner.recruitedPartners.slice(0, 5).map((recruit: any) => (
                  <TouchableOpacity
                    key={recruit.id}
                    style={styles.recruitItem}
                    onPress={() => navigation.navigate('PartnerDetail', { id: recruit.id })}
                  >
                    <View style={styles.recruitInfo}>
                      <Text style={styles.recruitName}>{recruit.name}</Text>
                      <Text style={styles.recruitNumber}>{recruit.partnerNumber}</Text>
                    </View>
                    <View style={styles.recruitRight}>
                      <Badge text={recruit.status} variant={recruit.status === 'ACTIVE' ? 'success' : 'default'} />
                      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Card>
        )}

        {/* Payment Methods */}
        {(partner.zelleEmail || partner.zellePhone || partner.venmoUsername || partner.cashAppTag) && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Methods</Text>
            {partner.zelleEmail && (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Zelle Email</Text>
                <Text style={styles.paymentValue}>{partner.zelleEmail}</Text>
              </View>
            )}
            {partner.zellePhone && (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Zelle Phone</Text>
                <Text style={styles.paymentValue}>{partner.zellePhone}</Text>
              </View>
            )}
            {partner.venmoUsername && (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Venmo</Text>
                <Text style={styles.paymentValue}>@{partner.venmoUsername}</Text>
              </View>
            )}
            {partner.cashAppTag && (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Cash App</Text>
                <Text style={styles.paymentValue}>${partner.cashAppTag}</Text>
              </View>
            )}
          </Card>
        )}

        {/* Recent Leads */}
        {partner.leads && partner.leads.length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Leads</Text>
            {partner.leads.slice(0, 5).map((lead: any) => (
              <TouchableOpacity
                key={lead.id}
                style={styles.leadItem}
                onPress={() => navigation.navigate('PartnerLeadDetail', { id: lead.id })}
              >
                <View style={styles.leadInfo}>
                  <Text style={styles.leadName}>{lead.businessName}</Text>
                  <Text style={styles.leadDate}>{formatDate(lead.createdAt)}</Text>
                </View>
                <View style={styles.leadRight}>
                  <Badge text={lead.status} variant={lead.status === 'WON' ? 'success' : 'default'} />
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </View>
              </TouchableOpacity>
            ))}
          </Card>
        )}

        {/* Contact Info */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.contactRow}>
            <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
            <Text style={styles.contactText}>{partner.email}</Text>
          </View>
          {partner.phone && (
            <View style={styles.contactRow}>
              <Ionicons name="call-outline" size={18} color={colors.textMuted} />
              <Text style={styles.contactText}>{partner.phone}</Text>
            </View>
          )}
          {partner.company && (
            <View style={styles.contactRow}>
              <Ionicons name="business-outline" size={18} color={colors.textMuted} />
              <Text style={styles.contactText}>{partner.company}</Text>
            </View>
          )}
          <View style={styles.contactRow}>
            <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
            <Text style={styles.contactText}>Partner since {formatDate(partner.createdAt)}</Text>
          </View>
        </Card>

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
            <Text style={styles.modalTitle}>Edit Partner</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={styles.modalSave}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Basic Info */}
            <Text style={styles.formSectionTitle}>Basic Information</Text>

            <Text style={styles.inputLabel}>Name *</Text>
            <TextInput
              style={styles.input}
              value={editForm.name}
              onChangeText={(text) => setEditForm({ ...editForm, name: text })}
              placeholder="Partner name"
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

            <Text style={styles.inputLabel}>Company</Text>
            <TextInput
              style={styles.input}
              value={editForm.company}
              onChangeText={(text) => setEditForm({ ...editForm, company: text })}
              placeholder="Company name"
              placeholderTextColor={colors.textMuted}
            />

            {/* Status & Type */}
            <Text style={styles.formSectionTitle}>Status & Type</Text>

            <Text style={styles.inputLabel}>Status</Text>
            <View style={styles.selectorRow}>
              {PARTNER_STATUSES.map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.selectorOption,
                    editForm.status === status && styles.selectorOptionActive,
                  ]}
                  onPress={() => setEditForm({ ...editForm, status })}
                >
                  <Text
                    style={[
                      styles.selectorText,
                      editForm.status === status && styles.selectorTextActive,
                    ]}
                  >
                    {status}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Partner Type</Text>
            <View style={styles.selectorRow}>
              {PARTNER_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.selectorOption,
                    editForm.partnerType === type && styles.selectorOptionActive,
                  ]}
                  onPress={() => setEditForm({ ...editForm, partnerType: type })}
                >
                  <Text
                    style={[
                      styles.selectorText,
                      editForm.partnerType === type && styles.selectorTextActive,
                    ]}
                  >
                    {typeLabels[type] || type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Commission Settings */}
            <Text style={styles.formSectionTitle}>Commission Settings</Text>

            <Text style={styles.inputLabel}>Commission Type</Text>
            <View style={styles.selectorRow}>
              {COMMISSION_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.selectorOption,
                    editForm.commissionType === type && styles.selectorOptionActive,
                  ]}
                  onPress={() => setEditForm({ ...editForm, commissionType: type })}
                >
                  <Text
                    style={[
                      styles.selectorText,
                      editForm.commissionType === type && styles.selectorTextActive,
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.rateInputRow}>
              <View style={styles.rateInputContainer}>
                <Text style={styles.inputLabel}>First Sale Rate (%)</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.firstSaleRate}
                  onChangeText={(text) => setEditForm({ ...editForm, firstSaleRate: text })}
                  placeholder="10"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.rateInputContainer}>
                <Text style={styles.inputLabel}>Recurring Rate (%)</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.recurringRate}
                  onChangeText={(text) => setEditForm({ ...editForm, recurringRate: text })}
                  placeholder="5"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>Shop Commission Rate (%)</Text>
            <TextInput
              style={styles.input}
              value={editForm.shopCommissionRate}
              onChangeText={(text) => setEditForm({ ...editForm, shopCommissionRate: text })}
              placeholder="Optional"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />

            <Text style={styles.inputLabel}>Affiliate Code</Text>
            <TextInput
              style={styles.input}
              value={editForm.affiliateCode}
              onChangeText={(text) => setEditForm({ ...editForm, affiliateCode: text })}
              placeholder="Optional affiliate code"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />

            {/* Payment Methods */}
            <Text style={styles.formSectionTitle}>Payment Methods</Text>

            <Text style={styles.inputLabel}>Zelle Email</Text>
            <TextInput
              style={styles.input}
              value={editForm.zelleEmail}
              onChangeText={(text) => setEditForm({ ...editForm, zelleEmail: text })}
              placeholder="Zelle email"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Zelle Phone</Text>
            <TextInput
              style={styles.input}
              value={editForm.zellePhone}
              onChangeText={(text) => setEditForm({ ...editForm, zellePhone: text })}
              placeholder="Zelle phone number"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>Venmo Username</Text>
            <TextInput
              style={styles.input}
              value={editForm.venmoUsername}
              onChangeText={(text) => setEditForm({ ...editForm, venmoUsername: text })}
              placeholder="Venmo username"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Cash App Tag</Text>
            <TextInput
              style={styles.input}
              value={editForm.cashAppTag}
              onChangeText={(text) => setEditForm({ ...editForm, cashAppTag: text })}
              placeholder="Cash App $tag"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Mailing Address</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={editForm.mailingAddress}
              onChangeText={(text) => setEditForm({ ...editForm, mailingAddress: text })}
              placeholder="Mailing address for checks"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />

            {/* Danger Zone */}
            <View style={styles.dangerZone}>
              <Text style={styles.dangerZoneTitle}>Danger Zone</Text>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => {
                  setEditModalVisible(false)
                  setTimeout(handleDeletePartner, 300)
                }}
                disabled={deleting}
              >
                <Ionicons name="trash-outline" size={18} color={colors.error} />
                <Text style={styles.deleteButtonText}>
                  {deleting ? 'Deleting...' : 'Delete Partner'}
                </Text>
              </TouchableOpacity>
            </View>

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
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  profileInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  profileName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  profileNumber: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  profileEmail: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
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
  ratesRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  rateItem: {},
  rateLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: 2,
  },
  rateValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  paymentLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  paymentValue: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  mlmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  mlmLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  mlmCode: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: '#8b5cf6',
    letterSpacing: 2,
  },
  mlmValue: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  mlmSubValue: {
    fontWeight: fontWeight.normal,
    color: colors.textMuted,
  },
  mlmRecruitSection: {
    marginTop: spacing.sm,
  },
  recruitItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  recruitInfo: {
    flex: 1,
  },
  recruitName: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  recruitNumber: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  recruitRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  leadItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  leadInfo: {
    flex: 1,
  },
  leadName: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  leadDate: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  leadRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  contactText: {
    fontSize: fontSize.sm,
    color: colors.text,
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
  selectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  selectorOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectorOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  selectorText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  selectorTextActive: {
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  rateInputRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  rateInputContainer: {
    flex: 1,
  },
  dangerZone: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dangerZoneTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.error,
    marginBottom: spacing.md,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: colors.errorBg,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: borderRadius.md,
  },
  deleteButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.error,
  },
})
