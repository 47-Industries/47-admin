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
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { api } from '../../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme'

interface ClientDetailScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void
    goBack: () => void
  }
  route: {
    params: { id: string }
  }
}

const CLIENT_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'LEAD']
const CLIENT_TYPES = ['INDIVIDUAL', 'BUSINESS', 'ENTERPRISE']

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'error' | 'primary'> = {
  ACTIVE: 'success',
  INACTIVE: 'default',
  SUSPENDED: 'error',
  LEAD: 'warning',
}

const typeLabels: Record<string, string> = {
  INDIVIDUAL: 'Individual',
  BUSINESS: 'Business',
  ENTERPRISE: 'Enterprise',
}

export function ClientDetailScreen({ navigation, route }: ClientDetailScreenProps) {
  const { id } = route.params
  const [client, setClient] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<any>({})

  const fetchClient = async () => {
    try {
      const data = await api.getAdminClient(id)
      setClient(data.client)
      setFormData(data.client)
    } catch (error) {
      console.error('Failed to fetch client:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchClient()
  }, [id])

  const onRefresh = () => {
    setRefreshing(true)
    fetchClient()
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.updateAdminClient(id, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        company: formData.company,
        address: formData.address,
        type: formData.type,
        status: formData.status,
        notes: formData.notes,
        autopayEnabled: formData.autopayEnabled,
      })
      Alert.alert('Success', 'Client updated successfully')
      setShowEditModal(false)
      fetchClient()
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update client')
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
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  if (!client) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIcon}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Client</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.errorText}>Client not found</Text>
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
        <Text style={styles.title}>Client Details</Text>
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
            <View style={[styles.avatar, client.status === 'SUSPENDED' && styles.avatarSuspended]}>
              <Text style={styles.avatarText}>{getInitials(client.name)}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{client.name}</Text>
              <Text style={styles.profileNumber}>#{client.clientNumber}</Text>
              {client.company && <Text style={styles.profileCompany}>{client.company}</Text>}
            </View>
          </View>
          <View style={styles.badgeRow}>
            <Badge text={client.status} variant={statusColors[client.status] || 'default'} />
            <Badge text={typeLabels[client.type] || client.type} variant="primary" />
            {client.autopayEnabled && <Badge text="Autopay" variant="success" />}
          </View>
        </Card>

        {/* Financial Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Revenue</Text>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {formatCurrency(Number(client.totalRevenue || client.totalInvoiced || 0))}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Outstanding</Text>
            <Text style={[styles.statValue, { color: Number(client.totalOutstanding) > 0 ? colors.warning : colors.text }]}>
              {formatCurrency(Number(client.totalOutstanding || 0))}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Projects</Text>
            <Text style={styles.statValue}>{client.projects?.length || 0}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Invoices</Text>
            <Text style={styles.statValue}>{client.invoices?.length || 0}</Text>
          </View>
        </View>

        {/* Recent Invoices */}
        {client.invoices && client.invoices.length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Invoices</Text>
            {client.invoices.slice(0, 5).map((invoice: any) => (
              <View key={invoice.id} style={styles.listItem}>
                <View style={styles.listItemInfo}>
                  <Text style={styles.listItemTitle}>{invoice.invoiceNumber}</Text>
                  <Text style={styles.listItemSub}>{formatDate(invoice.createdAt)}</Text>
                </View>
                <View style={styles.listItemRight}>
                  <Text style={styles.listItemAmount}>{formatCurrency(Number(invoice.total))}</Text>
                  <Badge
                    text={invoice.status}
                    variant={invoice.status === 'PAID' ? 'success' : invoice.status === 'OVERDUE' ? 'error' : 'warning'}
                  />
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* Active Projects */}
        {client.projects && client.projects.length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Projects</Text>
            {client.projects.slice(0, 5).map((project: any) => (
              <View key={project.id} style={styles.listItem}>
                <View style={styles.listItemInfo}>
                  <Text style={styles.listItemTitle}>{project.name}</Text>
                  <Text style={styles.listItemSub}>Started {formatDate(project.startDate)}</Text>
                </View>
                <Badge
                  text={project.status}
                  variant={project.status === 'COMPLETED' ? 'success' : project.status === 'ACTIVE' ? 'primary' : 'default'}
                />
              </View>
            ))}
          </Card>
        )}

        {/* Contact Info */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL(`mailto:${client.email}`)}>
            <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
            <Text style={[styles.contactText, { color: colors.primary }]}>{client.email}</Text>
          </TouchableOpacity>
          {client.phone && (
            <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL(`tel:${client.phone}`)}>
              <Ionicons name="call-outline" size={18} color={colors.textMuted} />
              <Text style={[styles.contactText, { color: colors.primary }]}>{client.phone}</Text>
            </TouchableOpacity>
          )}
          {client.address && (
            <View style={styles.contactRow}>
              <Ionicons name="location-outline" size={18} color={colors.textMuted} />
              <Text style={styles.contactText}>{client.address}</Text>
            </View>
          )}
          <View style={styles.contactRow}>
            <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
            <Text style={styles.contactText}>Client since {formatDate(client.createdAt)}</Text>
          </View>
        </Card>

        {/* Notes */}
        {client.notes && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{client.notes}</Text>
          </Card>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Client</Text>
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

              <Text style={styles.inputLabel}>Company</Text>
              <TextInput
                style={styles.input}
                value={formData.company || ''}
                onChangeText={(text) => setFormData({ ...formData, company: text })}
                placeholder="Company name"
                placeholderTextColor={colors.textMuted}
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

              <Text style={styles.inputLabel}>Type</Text>
              <View style={styles.optionButtons}>
                {CLIENT_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.optionButton, formData.type === type && styles.optionButtonActive]}
                    onPress={() => setFormData({ ...formData, type })}
                  >
                    <Text style={[styles.optionButtonText, formData.type === type && styles.optionButtonTextActive]}>
                      {typeLabels[type]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Status</Text>
              <View style={styles.optionButtons}>
                {CLIENT_STATUSES.map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[styles.optionButton, formData.status === status && styles.optionButtonActive]}
                    onPress={() => setFormData({ ...formData, status })}
                  >
                    <Text style={[styles.optionButtonText, formData.status === status && styles.optionButtonTextActive]}>
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.notes || ''}
                onChangeText={(text) => setFormData({ ...formData, notes: text })}
                placeholder="Internal notes..."
                placeholderTextColor={colors.textMuted}
                multiline
              />

              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setFormData({ ...formData, autopayEnabled: !formData.autopayEnabled })}
              >
                <Text style={styles.toggleLabel}>Autopay Enabled</Text>
                <Ionicons
                  name={formData.autopayEnabled ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={formData.autopayEnabled ? colors.primary : colors.textMuted}
                />
              </TouchableOpacity>
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
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: fontSize.lg, color: colors.textMuted, marginTop: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  backIcon: { marginRight: spacing.md },
  title: { flex: 1, fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  editButton: { padding: spacing.sm },
  scroll: { flex: 1 },
  profileCard: { margin: spacing.lg },
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarSuspended: { backgroundColor: colors.error, opacity: 0.7 },
  avatarText: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  profileInfo: { flex: 1, marginLeft: spacing.md },
  profileName: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  profileNumber: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  profileCompany: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.lg, gap: spacing.sm, marginBottom: spacing.md },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  statLabel: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: spacing.xs },
  statValue: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  section: { marginHorizontal: spacing.lg, marginBottom: spacing.md },
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: spacing.md },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  listItemInfo: { flex: 1 },
  listItemTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text },
  listItemSub: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  listItemRight: { alignItems: 'flex-end', gap: spacing.xs },
  listItemAmount: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  contactText: { fontSize: fontSize.sm, color: colors.text, flex: 1 },
  notesText: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, padding: spacing.xl, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  modalTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  modalScroll: { maxHeight: 400 },
  inputLabel: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.sm },
  input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.borderLight, borderRadius: borderRadius.md, padding: spacing.md, color: colors.text, fontSize: fontSize.md, marginBottom: spacing.md },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  optionButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  optionButton: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: borderRadius.md, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  optionButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionButtonText: { fontSize: fontSize.sm, color: colors.textMuted },
  optionButtonTextActive: { color: colors.text, fontWeight: fontWeight.medium },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md, marginBottom: spacing.md },
  toggleLabel: { fontSize: fontSize.md, color: colors.text },
  modalButtons: { flexDirection: 'row', marginTop: spacing.lg },
})
