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
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
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

export function TeamMemberDetailScreen({ navigation, route }: any) {
  const { id } = route.params
  const [member, setMember] = useState<TeamMember | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<Partial<TeamMember>>({})

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

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.updateTeamMember(id, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        title: formData.title,
        department: formData.department,
        status: formData.status,
        gender: formData.gender,
        address: formData.address,
        salaryType: formData.salaryType,
        salaryAmount: formData.salaryAmount,
        salaryFrequency: formData.salaryFrequency,
        equityPercentage: formData.equityPercentage,
        splitsExpenses: formData.splitsExpenses,
        defaultSplitPercent: formData.defaultSplitPercent,
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
      <SafeAreaView style={styles.container} edges={['top']}>
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
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIcon}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Team Member</Text>
        <TouchableOpacity onPress={() => setShowEditModal(true)} style={styles.editButton}>
          <Ionicons name="create-outline" size={22} color={colors.primary} />
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
              <Image source={{ uri: member.profileImageUrl }} style={styles.avatar} />
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
          </View>
        </Card>

        {/* Employment Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Start Date</Text>
            <Text style={styles.statValue}>{formatDate(member.startDate)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Compensation</Text>
            <Text style={styles.statValue}>
              {member.salaryType === 'EQUITY_ONLY' ? 'Equity Only' :
               member.salaryAmount ? formatCurrency(member.salaryAmount) : '-'}
            </Text>
          </View>
          {member.equityPercentage !== undefined && member.equityPercentage > 0 && (
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Equity</Text>
              <Text style={[styles.statValue, { color: colors.success }]}>{member.equityPercentage}%</Text>
            </View>
          )}
          {member.totalPaid !== undefined && (
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Paid</Text>
              <Text style={styles.statValue}>{formatCurrency(member.totalPaid)}</Text>
            </View>
          )}
        </View>

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

      {/* Edit Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Team Member</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
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

              <Text style={styles.inputLabel}>Email *</Text>
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                placeholder="Email address"
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
                placeholder="Address"
                placeholderTextColor={colors.textMuted}
                multiline
              />

              <Text style={styles.inputLabel}>Status</Text>
              <View style={styles.statusButtons}>
                {['ACTIVE', 'ON_LEAVE', 'INACTIVE', 'TERMINATED'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[styles.statusButton, formData.status === status && styles.statusButtonActive]}
                    onPress={() => setFormData({ ...formData, status })}
                  >
                    <Text style={[styles.statusButtonText, formData.status === status && styles.statusButtonTextActive]}>
                      {status.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Gender</Text>
              <View style={styles.statusButtons}>
                {['MALE', 'FEMALE', 'OTHER'].map((gender) => (
                  <TouchableOpacity
                    key={gender}
                    style={[styles.statusButton, formData.gender === gender && styles.statusButtonActive]}
                    onPress={() => setFormData({ ...formData, gender })}
                  >
                    <Text style={[styles.statusButtonText, formData.gender === gender && styles.statusButtonTextActive]}>
                      {gender}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <Button title="Cancel" variant="outline" onPress={() => setShowEditModal(false)} style={{ flex: 1 }} />
              <Button title="Save" onPress={handleSave} loading={saving} style={{ flex: 1, marginLeft: spacing.md }} />
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
  scroll: {
    flex: 1,
  },
  profileCard: {
    margin: spacing.lg,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  modalScroll: {
    maxHeight: 400,
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
    marginBottom: spacing.md,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statusButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusButtonText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  statusButtonTextActive: {
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: spacing.lg,
  },
})
