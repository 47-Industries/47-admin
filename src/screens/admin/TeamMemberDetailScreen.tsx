import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  Alert,
  Linking,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { ImageViewer } from '../../components/ImageViewer'
import { api } from '../../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme'

interface TeamMember {
  id: string
  employeeNumber: string
  name: string
  email: string
  workEmail?: string
  phone?: string
  address?: string
  dateOfBirth?: string
  gender?: string
  profileImageUrl?: string
  title: string
  department?: string
  startDate: string
  endDate?: string
  status: string
  salaryType: string
  salaryAmount?: number
  salaryFrequency?: string
  equityPercentage?: number
  equityVestingStart?: string
  equityVestingEnd?: string
  equityNotes?: string
  splitsExpenses: boolean
  defaultSplitPercent?: number
  showOnAbout: boolean
  publicBio?: string
  user?: {
    id: string
    email: string
    role: string
    username?: string
  }
  contracts?: any[]
  documents?: any[]
  payments?: any[]
  totalPaid?: number
  createdAt: string
}

const STATUS_OPTIONS = ['ACTIVE', 'ON_LEAVE', 'INACTIVE', 'TERMINATED']
const GENDER_OPTIONS = ['MALE', 'FEMALE', 'OTHER']
const SALARY_TYPES = ['SALARY', 'HOURLY', 'CONTRACT', 'EQUITY_ONLY']
const SALARY_FREQUENCIES = ['ANNUAL', 'MONTHLY', 'BIWEEKLY', 'HOURLY']

export function TeamMemberDetailScreen({ navigation, route }: any) {
  const { id } = route.params
  const [member, setMember] = useState<TeamMember | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [formData, setFormData] = useState<Partial<TeamMember>>({})
  const [viewingImage, setViewingImage] = useState<string | null>(null)

  const fetchMember = async () => {
    try {
      const data = await api.getTeamMember(id)
      setMember(data.teamMember)
      setFormData(data.teamMember)
    } catch (error) {
      console.error('Failed to fetch team member:', error)
      Alert.alert('Error', 'Failed to load team member')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchMember()
  }, [id])

  const onRefresh = () => {
    setRefreshing(true)
    fetchMember()
  }

  const handleDeleteTeamMember = () => {
    Alert.alert(
      'Delete Team Member',
      `Are you sure you want to delete ${member?.name}? This will also delete all associated contracts, payments, and documents. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true)
            try {
              await api.deleteTeamMember(id)
              Alert.alert('Success', 'Team member deleted successfully')
              navigation.goBack()
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete team member')
            } finally {
              setDeleting(false)
            }
          },
        },
      ]
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.updateTeamMember(id, {
        name: formData.name,
        email: formData.email,
        workEmail: formData.workEmail || null,
        phone: formData.phone || null,
        address: formData.address || null,
        dateOfBirth: formData.dateOfBirth || null,
        gender: formData.gender || null,
        title: formData.title,
        department: formData.department || null,
        startDate: formData.startDate,
        endDate: formData.endDate || null,
        status: formData.status,
        salaryType: formData.salaryType,
        salaryAmount: formData.salaryAmount || null,
        salaryFrequency: formData.salaryFrequency || null,
        equityPercentage: formData.equityPercentage || null,
        equityNotes: formData.equityNotes || null,
        splitsExpenses: formData.splitsExpenses,
        defaultSplitPercent: formData.defaultSplitPercent || null,
        showOnAbout: formData.showOnAbout,
        publicBio: formData.publicBio || null,
      })
      Alert.alert('Success', 'Team member updated')
      setShowEditModal(false)
      fetchMember()
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update')
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
      timeZone: 'UTC',
    })
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getStatusVariant = (status: string): 'success' | 'warning' | 'error' | 'default' => {
    const variants: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
      ACTIVE: 'success',
      ON_LEAVE: 'warning',
      INACTIVE: 'default',
      TERMINATED: 'error',
    }
    return variants[status] || 'default'
  }

  const getRoleVariant = (role: string): 'primary' | 'warning' | 'error' | 'default' => {
    if (role === 'SUPER_ADMIN') return 'error'
    if (role === 'ADMIN') return 'warning'
    return 'default'
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  if (!member) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIcon}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Team Member</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.errorText}>Team member not found</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIcon}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Team Member</Text>
        <TouchableOpacity onPress={() => setShowEditModal(true)} style={styles.editButton}>
          <Ionicons name="pencil" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Profile Card */}
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            {member.profileImageUrl ? (
              <TouchableOpacity onPress={() => setViewingImage(member.profileImageUrl!)} activeOpacity={0.8}>
                <Image source={{ uri: member.profileImageUrl }} style={styles.avatar} />
              </TouchableOpacity>
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>{getInitials(member.name)}</Text>
              </View>
            )}
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{member.name}</Text>
              <Text style={styles.profileNumber}>#{member.employeeNumber}</Text>
              <Text style={styles.profileTitle}>{member.title}</Text>
              {member.department && <Text style={styles.profileDept}>{member.department}</Text>}
            </View>
          </View>
          <View style={styles.badgeRow}>
            <Badge text={member.status} variant={getStatusVariant(member.status)} />
            {member.user?.role && member.user.role !== 'CUSTOMER' && (
              <Badge text={member.user.role.replace('_', ' ')} variant={getRoleVariant(member.user.role)} />
            )}
            {member.splitsExpenses && <Badge text="Splits Expenses" variant="primary" />}
            {member.showOnAbout && <Badge text="On About Page" variant="default" />}
          </View>
        </Card>

        {/* Employment Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Start Date</Text>
            <Text style={styles.statValue}>{formatDate(member.startDate)}</Text>
          </View>
          {member.endDate && (
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>End Date</Text>
              <Text style={styles.statValue}>{formatDate(member.endDate)}</Text>
            </View>
          )}
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Compensation</Text>
            <Text style={styles.statValue}>
              {member.salaryType === 'EQUITY_ONLY' ? 'Equity Only' :
               member.salaryAmount ? `${formatCurrency(member.salaryAmount)}${member.salaryFrequency ? `/${member.salaryFrequency.toLowerCase()}` : ''}` : '-'}
            </Text>
          </View>
          {member.totalPaid !== undefined && (
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Paid</Text>
              <Text style={styles.statValue}>{formatCurrency(member.totalPaid)}</Text>
            </View>
          )}
        </View>

        {/* Equity Section */}
        {(member.equityPercentage !== undefined && member.equityPercentage > 0) && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Equity</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Ownership</Text>
              <Text style={[styles.detailValue, { color: colors.success }]}>{member.equityPercentage}%</Text>
            </View>
            {member.equityVestingStart && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Vesting Start</Text>
                <Text style={styles.detailValue}>{formatDate(member.equityVestingStart)}</Text>
              </View>
            )}
            {member.equityVestingEnd && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Vesting End</Text>
                <Text style={styles.detailValue}>{formatDate(member.equityVestingEnd)}</Text>
              </View>
            )}
            {member.equityNotes && (
              <View style={styles.notesContainer}>
                <Text style={styles.detailLabel}>Notes</Text>
                <Text style={styles.notesText}>{member.equityNotes}</Text>
              </View>
            )}
          </Card>
        )}

        {/* Expense Splits */}
        {member.splitsExpenses && member.defaultSplitPercent && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Expense Splits</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Default Split</Text>
              <Text style={styles.detailValue}>{member.defaultSplitPercent}%</Text>
            </View>
          </Card>
        )}

        {/* Personal Info */}
        {(member.dateOfBirth || member.gender) && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            {member.dateOfBirth && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date of Birth</Text>
                <Text style={styles.detailValue}>{formatDate(member.dateOfBirth)}</Text>
              </View>
            )}
            {member.gender && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Gender</Text>
                <Text style={styles.detailValue}>{member.gender}</Text>
              </View>
            )}
          </Card>
        )}

        {/* Contact Information */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL(`mailto:${member.email}`)}>
            <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
            <Text style={[styles.contactText, { color: colors.primary }]}>{member.email}</Text>
          </TouchableOpacity>
          {member.workEmail && (
            <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL(`mailto:${member.workEmail}`)}>
              <Ionicons name="briefcase-outline" size={18} color={colors.textMuted} />
              <Text style={[styles.contactText, { color: colors.primary }]}>{member.workEmail}</Text>
            </TouchableOpacity>
          )}
          {member.phone && (
            <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL(`tel:${member.phone}`)}>
              <Ionicons name="call-outline" size={18} color={colors.textMuted} />
              <Text style={[styles.contactText, { color: colors.primary }]}>{member.phone}</Text>
            </TouchableOpacity>
          )}
          {member.address && (
            <View style={styles.contactRow}>
              <Ionicons name="location-outline" size={18} color={colors.textMuted} />
              <Text style={styles.contactText}>{member.address}</Text>
            </View>
          )}
        </Card>

        {/* About Page Settings */}
        {member.showOnAbout && member.publicBio && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Public Bio</Text>
            <Text style={styles.bioText}>{member.publicBio}</Text>
          </Card>
        )}

        {/* Account Info */}
        {member.user && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            <View style={styles.contactRow}>
              <Ionicons name="person-outline" size={18} color={colors.textMuted} />
              <Text style={styles.contactText}>
                {member.user.username ? `@${member.user.username}` : member.user.email}
              </Text>
            </View>
            <View style={styles.contactRow}>
              <Ionicons name="shield-outline" size={18} color={colors.textMuted} />
              <Text style={styles.contactText}>Role: {member.user.role.replace('_', ' ')}</Text>
            </View>
          </Card>
        )}

        {/* Contracts */}
        {member.contracts && member.contracts.length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Contracts ({member.contracts.length})</Text>
            {member.contracts.slice(0, 3).map((contract: any) => (
              <View key={contract.id} style={styles.listItem}>
                <View style={styles.listItemInfo}>
                  <Text style={styles.listItemTitle}>{contract.title}</Text>
                  <Text style={styles.listItemSub}>{contract.type} - {formatDate(contract.createdAt)}</Text>
                </View>
                <Badge
                  text={contract.status}
                  variant={contract.status === 'SIGNED' ? 'success' : 'warning'}
                />
              </View>
            ))}
          </Card>
        )}

        {/* Payments */}
        {member.payments && member.payments.length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Payments ({member.payments.length})</Text>
            {member.payments.slice(0, 5).map((payment: any) => (
              <View key={payment.id} style={styles.listItem}>
                <View style={styles.listItemInfo}>
                  <Text style={styles.listItemTitle}>{payment.type} - {payment.paymentNumber}</Text>
                  <Text style={styles.listItemSub}>{formatDate(payment.paidAt || payment.createdAt)}</Text>
                </View>
                <Text style={[styles.listItemAmount, { color: colors.success }]}>
                  {formatCurrency(payment.amount)}
                </Text>
              </View>
            ))}
          </Card>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      <ImageViewer
        visible={!!viewingImage}
        imageUrl={viewingImage}
        onClose={() => setViewingImage(null)}
      />

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Team Member</Text>
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
            <Text style={styles.formSection}>Basic Information</Text>

            <Text style={styles.inputLabel}>Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Full name"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.inputLabel}>Title *</Text>
            <TextInput
              style={styles.input}
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
              placeholder="Job title"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.inputLabel}>Department</Text>
            <TextInput
              style={styles.input}
              value={formData.department || ''}
              onChangeText={(text) => setFormData({ ...formData, department: text })}
              placeholder="Department"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.inputLabel}>Status</Text>
            <View style={styles.optionRow}>
              {STATUS_OPTIONS.map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[styles.optionButton, formData.status === status && styles.optionButtonActive]}
                  onPress={() => setFormData({ ...formData, status })}
                >
                  <Text style={[styles.optionText, formData.status === status && styles.optionTextActive]}>
                    {status.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Contact Info */}
            <Text style={styles.formSection}>Contact Information</Text>

            <Text style={styles.inputLabel}>Personal Email *</Text>
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              placeholder="Personal email"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Work Email</Text>
            <TextInput
              style={styles.input}
              value={formData.workEmail || ''}
              onChangeText={(text) => setFormData({ ...formData, workEmail: text })}
              placeholder="Work email"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Phone</Text>
            <TextInput
              style={styles.input}
              value={formData.phone || ''}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              placeholder="Phone number"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>Address</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.address || ''}
              onChangeText={(text) => setFormData({ ...formData, address: text })}
              placeholder="Full address"
              placeholderTextColor={colors.textMuted}
              multiline
            />

            {/* Personal Info */}
            <Text style={styles.formSection}>Personal Information</Text>

            <Text style={styles.inputLabel}>Date of Birth</Text>
            <TextInput
              style={styles.input}
              value={formData.dateOfBirth || ''}
              onChangeText={(text) => setFormData({ ...formData, dateOfBirth: text })}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.inputLabel}>Gender</Text>
            <View style={styles.optionRow}>
              {GENDER_OPTIONS.map((gender) => (
                <TouchableOpacity
                  key={gender}
                  style={[styles.optionButton, formData.gender === gender && styles.optionButtonActive]}
                  onPress={() => setFormData({ ...formData, gender })}
                >
                  <Text style={[styles.optionText, formData.gender === gender && styles.optionTextActive]}>
                    {gender}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Employment */}
            <Text style={styles.formSection}>Employment</Text>

            <Text style={styles.inputLabel}>Start Date</Text>
            <TextInput
              style={styles.input}
              value={formData.startDate || ''}
              onChangeText={(text) => setFormData({ ...formData, startDate: text })}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.inputLabel}>End Date</Text>
            <TextInput
              style={styles.input}
              value={formData.endDate || ''}
              onChangeText={(text) => setFormData({ ...formData, endDate: text })}
              placeholder="YYYY-MM-DD (if terminated)"
              placeholderTextColor={colors.textMuted}
            />

            {/* Compensation */}
            <Text style={styles.formSection}>Compensation</Text>

            <Text style={styles.inputLabel}>Salary Type</Text>
            <View style={styles.optionRow}>
              {SALARY_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.optionButton, formData.salaryType === type && styles.optionButtonActive]}
                  onPress={() => setFormData({ ...formData, salaryType: type })}
                >
                  <Text style={[styles.optionText, formData.salaryType === type && styles.optionTextActive]}>
                    {type.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Salary Amount</Text>
            <TextInput
              style={styles.input}
              value={formData.salaryAmount?.toString() || ''}
              onChangeText={(text) => setFormData({ ...formData, salaryAmount: text ? parseFloat(text) : undefined })}
              placeholder="Amount"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />

            <Text style={styles.inputLabel}>Salary Frequency</Text>
            <View style={styles.optionRow}>
              {SALARY_FREQUENCIES.map((freq) => (
                <TouchableOpacity
                  key={freq}
                  style={[styles.optionButton, formData.salaryFrequency === freq && styles.optionButtonActive]}
                  onPress={() => setFormData({ ...formData, salaryFrequency: freq })}
                >
                  <Text style={[styles.optionText, formData.salaryFrequency === freq && styles.optionTextActive]}>
                    {freq}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Equity */}
            <Text style={styles.formSection}>Equity</Text>

            <Text style={styles.inputLabel}>Equity Percentage</Text>
            <TextInput
              style={styles.input}
              value={formData.equityPercentage?.toString() || ''}
              onChangeText={(text) => setFormData({ ...formData, equityPercentage: text ? parseFloat(text) : undefined })}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />

            <Text style={styles.inputLabel}>Equity Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.equityNotes || ''}
              onChangeText={(text) => setFormData({ ...formData, equityNotes: text })}
              placeholder="Vesting schedule, cliff, etc."
              placeholderTextColor={colors.textMuted}
              multiline
            />

            {/* Expense Splitting */}
            <Text style={styles.formSection}>Expense Splitting</Text>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Splits Expenses</Text>
              <Switch
                value={formData.splitsExpenses}
                onValueChange={(value) => setFormData({ ...formData, splitsExpenses: value })}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>

            {formData.splitsExpenses && (
              <>
                <Text style={styles.inputLabel}>Default Split Percent</Text>
                <TextInput
                  style={styles.input}
                  value={formData.defaultSplitPercent?.toString() || ''}
                  onChangeText={(text) => setFormData({ ...formData, defaultSplitPercent: text ? parseFloat(text) : undefined })}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </>
            )}

            {/* About Page */}
            <Text style={styles.formSection}>About Page</Text>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Show on About Page</Text>
              <Switch
                value={formData.showOnAbout}
                onValueChange={(value) => setFormData({ ...formData, showOnAbout: value })}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>

            {formData.showOnAbout && (
              <>
                <Text style={styles.inputLabel}>Public Bio</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.publicBio || ''}
                  onChangeText={(text) => setFormData({ ...formData, publicBio: text })}
                  placeholder="Bio shown on the website"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={4}
                />
              </>
            )}

            {/* Danger Zone */}
            <View style={styles.dangerZone}>
              <Text style={styles.dangerZoneTitle}>Danger Zone</Text>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => {
                  setShowEditModal(false)
                  setTimeout(handleDeleteTeamMember, 300)
                }}
                disabled={deleting}
              >
                <Ionicons name="trash-outline" size={18} color={colors.error} />
                <Text style={styles.deleteButtonText}>
                  {deleting ? 'Deleting...' : 'Delete Team Member'}
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
  scroll: {
    flex: 1,
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
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarPlaceholder: {
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
  },
  profileTitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  profileDept: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
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
    fontSize: fontSize.md,
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
  notesContainer: {
    paddingTop: spacing.sm,
  },
  notesText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  bioText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
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
    flex: 1,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listItemInfo: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  listItemSub: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  listItemAmount: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
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
  formSection: {
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
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  optionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  optionTextActive: {
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  switchLabel: {
    fontSize: fontSize.md,
    color: colors.text,
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
