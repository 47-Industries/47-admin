import React, { useEffect, useState, useCallback } from 'react'
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
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { api } from '../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme'
import { EmptyState } from '../components/EmptyState'

interface CustomerDetailScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void
    goBack: () => void
  }
  route: {
    params: { id: string }
  }
}

interface Customer {
  id: string
  name: string | null
  email: string
  phone: string | null
  image: string | null
  role: string
  isFounder: boolean
  emailVerified: string | null
  createdAt: string
  totalSpent?: number
  orders?: Order[]
  _count?: {
    orders?: number
  }
  notes?: string
  activityLog?: ActivityLogEntry[]
}

interface Order {
  id: string
  orderNumber: string
  status: string
  total: number
  createdAt: string
}

interface ActivityLogEntry {
  id: string
  action: string
  description: string
  createdAt: string
}

type TabType = 'orders' | 'activity'

export default function CustomerDetailScreen({ navigation, route }: CustomerDetailScreenProps) {
  const { id } = route.params
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('orders')
  const [showEditModal, setShowEditModal] = useState(false)
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showPromoteModal, setShowPromoteModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [promoting, setPromoting] = useState(false)
  const [formData, setFormData] = useState<Partial<Customer>>({})
  const [notes, setNotes] = useState('')
  const [contentSubs, setContentSubs] = useState<any[]>([])
  const [contentSubsLoading, setContentSubsLoading] = useState(false)
  const [showGrantModal, setShowGrantModal] = useState(false)
  const [grantTier, setGrantTier] = useState('PLAYBOOK_LIFETIME')
  const [granting, setGranting] = useState(false)
  const [grantError, setGrantError] = useState('')

  const fetchContentSubs = useCallback(async (email: string) => {
    setContentSubsLoading(true)
    try {
      const data = await api.request<{ subscriptions: any[] }>(`/admin/learn/subscriptions?search=${encodeURIComponent(email)}`)
      setContentSubs(data.subscriptions.filter((s: any) => s.email === email))
    } catch {
      // non-fatal
    } finally {
      setContentSubsLoading(false)
    }
  }, [])

  const handleGrantAccess = async () => {
    if (!customer) return
    setGranting(true)
    setGrantError('')
    try {
      const data = await api.request<any>('/admin/learn/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: customer.email, tier: grantTier }),
      })
      setContentSubs((prev) => [...prev.filter((s) => s.id !== data.id), data])
      setShowGrantModal(false)
    } catch (e: any) {
      setGrantError(e.message || 'Failed to grant access')
    } finally {
      setGranting(false)
    }
  }

  const handleRevokeAccess = async (subId: string, tierLabel: string) => {
    Alert.alert('Revoke Access', `Revoke ${tierLabel} access?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.request(`/admin/learn/subscriptions?id=${subId}`, { method: 'DELETE' })
            setContentSubs((prev) => prev.map((s) => s.id === subId ? { ...s, status: 'CANCELLED' } : s))
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to revoke')
          }
        },
      },
    ])
  }

  const handleReactivateAccess = async (subId: string) => {
    try {
      const data = await api.request<any>('/admin/learn/subscriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: subId, status: 'ACTIVE' }),
      })
      setContentSubs((prev) => prev.map((s) => s.id === subId ? { ...s, status: 'ACTIVE' } : s))
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to reactivate')
    }
  }

  const fetchCustomer = useCallback(async () => {
    try {
      const data = await api.getUser(id)
      setCustomer(data.user)
      setFormData({
        name: data.user.name || '',
        email: data.user.email || '',
        phone: data.user.phone || '',
      })
      setNotes(data.user.notes || '')
      fetchContentSubs(data.user.email)
    } catch (error) {
      console.error('Failed to fetch customer:', error)
      Alert.alert('Error', 'Failed to load customer details')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [id])

  useEffect(() => {
    fetchCustomer()
  }, [fetchCustomer])

  const onRefresh = () => {
    setRefreshing(true)
    fetchCustomer()
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0)
  }

  const getInitials = (name: string | null | undefined, email: string) => {
    if (name) {
      const parts = name.split(' ').filter((n) => n.length > 0)
      if (parts.length > 0) {
        return parts.map((n) => n[0]).join('').toUpperCase().slice(0, 2)
      }
    }
    return email?.slice(0, 2).toUpperCase() || '??'
  }

  const handleSave = async () => {
    if (!customer) return
    setSaving(true)
    try {
      await api.updateUser(customer.id, {
        name: formData.name || null,
        phone: formData.phone || null,
      })
      Alert.alert('Success', 'Customer updated successfully')
      setShowEditModal(false)
      fetchCustomer()
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update customer')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveNotes = async () => {
    if (!customer) return
    setSaving(true)
    try {
      await api.updateUser(customer.id, { notes })
      Alert.alert('Success', 'Notes updated successfully')
      setShowNotesModal(false)
      fetchCustomer()
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update notes')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!customer) return
    setDeleting(true)
    try {
      await api.request(`/admin/customers/${customer.id}`, { method: 'DELETE' })
      Alert.alert('Success', 'Customer deleted successfully')
      navigation.goBack()
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to delete customer')
      setDeleting(false)
    }
  }

  const handlePromote = async () => {
    if (!customer) return
    setPromoting(true)
    try {
      await api.request(`/admin/customers/${customer.id}/promote`, { method: 'POST' })
      Alert.alert('Success', 'Customer promoted to admin')
      setShowPromoteModal(false)
      fetchCustomer()
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to promote customer')
    } finally {
      setPromoting(false)
    }
  }

  const getStatusColor = (status: string): 'default' | 'success' | 'warning' | 'error' | 'primary' => {
    const statusMap: Record<string, 'default' | 'success' | 'warning' | 'error' | 'primary'> = {
      PENDING: 'warning',
      PROCESSING: 'primary',
      SHIPPED: 'primary',
      DELIVERED: 'success',
      CANCELLED: 'error',
      REFUNDED: 'default',
    }
    return statusMap[status] || 'default'
  }

  const calculateTotalSpent = () => {
    if (!customer?.orders) return 0
    return customer.orders
      .filter((o) => o.status !== 'CANCELLED' && o.status !== 'REFUNDED')
      .reduce((sum, o) => sum + (o.total || 0), 0)
  }

  const calculateAverageOrderValue = () => {
    if (!customer?.orders) return 0
    const validOrders = customer.orders.filter((o) => o.status !== 'CANCELLED' && o.status !== 'REFUNDED')
    if (validOrders.length === 0) return 0
    return calculateTotalSpent() / validOrders.length
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  if (!customer) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIcon}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Customer</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.errorText}>Customer not found</Text>
        </View>
      </View>
    )
  }

  const totalOrders = customer._count?.orders || customer.orders?.length || 0
  const totalSpent = customer.totalSpent || calculateTotalSpent()
  const averageOrderValue = calculateAverageOrderValue()

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIcon}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Customer Details</Text>
        <TouchableOpacity onPress={() => setShowEditModal(true)} style={styles.editButton}>
          <Ionicons name="create-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Profile Card */}
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            {customer.image ? (
              <Image source={{ uri: customer.image }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{getInitials(customer.name, customer.email)}</Text>
              </View>
            )}
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{customer.name || 'No Name'}</Text>
              <Text style={styles.profileEmail}>{customer.email}</Text>
              {customer.phone && <Text style={styles.profilePhone}>{customer.phone}</Text>}
            </View>
          </View>
          <View style={styles.badgeRow}>
            <Badge text="Customer" variant="default" />
            {customer.isFounder && <Badge text="Founder" variant="primary" />}
            {customer.emailVerified && <Badge text="Verified" variant="success" />}
          </View>
          <View style={styles.memberSince}>
            <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
            <Text style={styles.memberSinceText}>Member since {formatDate(customer.createdAt)}</Text>
          </View>
        </Card>

        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionButton} onPress={() => Linking.openURL(`mailto:${customer.email}`)}>
            <Ionicons name="mail-outline" size={20} color={colors.primary} />
            <Text style={styles.actionText}>Email</Text>
          </TouchableOpacity>
          {customer.phone && (
            <TouchableOpacity style={styles.actionButton} onPress={() => Linking.openURL(`tel:${customer.phone}`)}>
              <Ionicons name="call-outline" size={20} color={colors.success} />
              <Text style={[styles.actionText, { color: colors.success }]}>Call</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Orders</Text>
            <Text style={styles.statValue}>{totalOrders}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Spent</Text>
            <Text style={[styles.statValue, { color: colors.success }]}>{formatCurrency(totalSpent)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Avg Order</Text>
            <Text style={styles.statValue}>{formatCurrency(averageOrderValue)}</Text>
          </View>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'orders' && styles.tabActive]}
            onPress={() => setActiveTab('orders')}
          >
            <Text style={[styles.tabText, activeTab === 'orders' && styles.tabTextActive]}>Order History</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'activity' && styles.tabActive]}
            onPress={() => setActiveTab('activity')}
          >
            <Text style={[styles.tabText, activeTab === 'activity' && styles.tabTextActive]}>Activity Log</Text>
          </TouchableOpacity>
        </View>

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <Card style={styles.section}>
            {!customer.orders || customer.orders.length === 0 ? (
              <EmptyState icon="receipt-outline" title="No orders yet" />
            ) : (
              customer.orders.map((order) => (
                <TouchableOpacity
                  key={order.id}
                  style={styles.orderItem}
                  onPress={() => navigation.navigate('OrderDetail', { id: order.id })}
                >
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
                    <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
                  </View>
                  <View style={styles.orderRight}>
                    <Text style={styles.orderTotal}>{formatCurrency(order.total)}</Text>
                    <Badge text={order.status} variant={getStatusColor(order.status)} />
                  </View>
                </TouchableOpacity>
              ))
            )}
            {customer.orders && customer.orders.length > 0 && (
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => navigation.navigate('Orders', { customerId: customer.id })}
              >
                <Text style={styles.viewAllText}>View All Orders</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.primary} />
              </TouchableOpacity>
            )}
          </Card>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <Card style={styles.section}>
            {!customer.activityLog || customer.activityLog.length === 0 ? (
              <EmptyState icon="time-outline" title="No activity recorded" />
            ) : (
              customer.activityLog.map((entry) => (
                <View key={entry.id} style={styles.activityItem}>
                  <View style={styles.activityDot} />
                  <View style={styles.activityContent}>
                    <Text style={styles.activityAction}>{entry.action}</Text>
                    <Text style={styles.activityDescription}>{entry.description}</Text>
                    <Text style={styles.activityDate}>{formatDate(entry.createdAt)}</Text>
                  </View>
                </View>
              ))
            )}
          </Card>
        )}

        {/* Notes Section */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Customer Notes</Text>
            <TouchableOpacity onPress={() => setShowNotesModal(true)}>
              <Ionicons name="create-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
          {notes ? (
            <Text style={styles.notesText}>{notes}</Text>
          ) : (
            <Text style={styles.noNotesText}>No notes added yet</Text>
          )}
        </Card>

        {/* Premium Access */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Premium Access</Text>
              <Text style={[styles.memberSinceText, { marginTop: 2 }]}>Playbook and Inner Circle subscriptions</Text>
            </View>
            <TouchableOpacity
              style={styles.grantButton}
              onPress={() => { setGrantTier('PLAYBOOK_LIFETIME'); setGrantError(''); setShowGrantModal(true) }}
            >
              <Ionicons name="add" size={16} color={colors.success} />
              <Text style={styles.grantButtonText}>Grant</Text>
            </TouchableOpacity>
          </View>
          {contentSubsLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : contentSubs.length === 0 ? (
            <Text style={styles.noNotesText}>No active subscriptions</Text>
          ) : (
            contentSubs.map((s) => {
              const tierLabel =
                s.tier === 'PLAYBOOK_LIFETIME' ? 'Playbook Lifetime'
                : s.tier === 'INNER_CIRCLE_MONTHLY' ? 'Inner Circle Monthly'
                : s.tier === 'INNER_CIRCLE_ANNUAL' ? 'Inner Circle Annual'
                : s.tier
              const tierColor = s.tier === 'PLAYBOOK_LIFETIME' ? '#34d399' : '#a78bfa'
              const source = s.stripeSubscriptionId ? 'Stripe Sub' : s.stripeCheckoutSessionId ? 'Stripe Payment' : 'Manual Grant'
              return (
                <View key={s.id} style={styles.subRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.subTier, { color: tierColor }]}>{tierLabel}</Text>
                    <Text style={styles.subSource}>{source}{s.status !== 'ACTIVE' ? ` - ${s.status}` : ''}</Text>
                  </View>
                  {s.status === 'ACTIVE' ? (
                    <TouchableOpacity onPress={() => handleRevokeAccess(s.id, tierLabel)} style={styles.revokeButton}>
                      <Text style={styles.revokeText}>Revoke</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity onPress={() => handleReactivateAccess(s.id)} style={styles.reactivateButton}>
                      <Text style={styles.reactivateText}>Reactivate</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )
            })
          )}
        </Card>

        {/* Actions Section */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <View style={styles.actionsList}>
            <TouchableOpacity style={styles.actionRow} onPress={() => setShowEditModal(true)}>
              <Ionicons name="person-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.actionRowText}>Edit Customer Info</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => navigation.navigate('Orders', { customerId: customer.id })}
            >
              <Ionicons name="receipt-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.actionRowText}>View All Orders</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
            {customer.role !== 'ADMIN' && customer.role !== 'SUPER_ADMIN' && (
              <TouchableOpacity style={styles.actionRow} onPress={() => setShowPromoteModal(true)}>
                <Ionicons name="shield-outline" size={20} color={colors.purple} />
                <Text style={[styles.actionRowText, { color: colors.purple }]}>Promote to Admin</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.actionRow, styles.dangerRow]} onPress={() => setShowDeleteModal(true)}>
              <Ionicons name="trash-outline" size={20} color={colors.error} />
              <Text style={[styles.actionRowText, { color: colors.error }]}>Delete Customer</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </Card>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Customer</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.input}
                value={formData.name || ''}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Full name"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={formData.email || ''}
                editable={false}
                placeholder="Email address"
                placeholderTextColor={colors.textMuted}
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
            </ScrollView>

            <View style={styles.modalButtons}>
              <Button title="Cancel" variant="outline" onPress={() => setShowEditModal(false)} style={{ flex: 1 }} />
              <Button title="Save" onPress={handleSave} loading={saving} style={{ flex: 1, marginLeft: spacing.md }} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Notes Modal */}
      <Modal visible={showNotesModal} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Customer Notes</Text>
              <TouchableOpacity onPress={() => setShowNotesModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add notes about this customer..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={6}
            />

            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => {
                  setNotes(customer?.notes || '')
                  setShowNotesModal(false)
                }}
                style={{ flex: 1 }}
              />
              <Button title="Save Notes" onPress={handleSaveNotes} loading={saving} style={{ flex: 1, marginLeft: spacing.md }} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={showDeleteModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.confirmModal]}>
            <Ionicons name="warning-outline" size={48} color={colors.error} style={{ alignSelf: 'center' }} />
            <Text style={styles.confirmTitle}>Delete Customer</Text>
            <Text style={styles.confirmText}>
              Are you sure you want to delete this customer? This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <Button title="Cancel" variant="outline" onPress={() => setShowDeleteModal(false)} style={{ flex: 1 }} />
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

      {/* Grant Access Modal */}
      <Modal visible={showGrantModal} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Grant Premium Access</Text>
              <TouchableOpacity onPress={() => setShowGrantModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>Select Tier</Text>
            {['PLAYBOOK_LIFETIME', 'INNER_CIRCLE_MONTHLY', 'INNER_CIRCLE_ANNUAL'].map((tier) => {
              const label = tier === 'PLAYBOOK_LIFETIME' ? 'Playbook Lifetime' : tier === 'INNER_CIRCLE_MONTHLY' ? 'Inner Circle Monthly' : 'Inner Circle Annual'
              return (
                <TouchableOpacity
                  key={tier}
                  style={[styles.tierOption, grantTier === tier && styles.tierOptionActive]}
                  onPress={() => setGrantTier(tier)}
                >
                  <Text style={[styles.tierOptionText, grantTier === tier && { color: colors.primary }]}>{label}</Text>
                  {grantTier === tier && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
                </TouchableOpacity>
              )
            })}
            {grantError ? <Text style={styles.grantErrorText}>{grantError}</Text> : null}
            <View style={[styles.modalButtons, { marginTop: spacing.lg }]}>
              <Button title="Cancel" variant="outline" onPress={() => setShowGrantModal(false)} style={{ flex: 1 }} />
              <Button title="Grant Access" onPress={handleGrantAccess} loading={granting} style={{ flex: 1, marginLeft: spacing.md }} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Promote Confirmation Modal */}
      <Modal visible={showPromoteModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.confirmModal]}>
            <Ionicons name="shield-checkmark-outline" size={48} color={colors.purple} style={{ alignSelf: 'center' }} />
            <Text style={styles.confirmTitle}>Promote to Admin</Text>
            <Text style={styles.confirmText}>
              This will grant admin privileges to {customer?.name || customer?.email}. They will be able to access the
              admin dashboard and manage store data.
            </Text>
            <View style={styles.modalButtons}>
              <Button title="Cancel" variant="outline" onPress={() => setShowPromoteModal(false)} style={{ flex: 1 }} />
              <Button
                title="Promote"
                onPress={handlePromote}
                loading={promoting}
                style={{ flex: 1, marginLeft: spacing.md, backgroundColor: colors.purple }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: fontSize.lg, color: colors.textMuted, marginTop: spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backIcon: { marginRight: spacing.md },
  title: { flex: 1, fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  editButton: { padding: spacing.sm },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xxl },
  profileCard: { margin: spacing.lg },
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  profileInfo: { flex: 1, marginLeft: spacing.md },
  profileName: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  profileEmail: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  profilePhone: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.sm },
  memberSince: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  memberSinceText: { fontSize: fontSize.xs, color: colors.textMuted },
  actionsRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.md, marginBottom: spacing.md },
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
    gap: spacing.sm,
  },
  actionText: { fontSize: fontSize.md, color: colors.primary, fontWeight: fontWeight.medium },
  statsGrid: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.sm, marginBottom: spacing.md },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  statLabel: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: spacing.xs },
  statValue: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: fontWeight.medium },
  tabTextActive: { color: colors.text, fontWeight: fontWeight.semibold },
  section: { marginHorizontal: spacing.lg, marginBottom: spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: spacing.md },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyText: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.sm },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  orderInfo: { flex: 1 },
  orderNumber: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text },
  orderDate: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  orderRight: { alignItems: 'flex-end', gap: spacing.xs },
  orderTotal: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  viewAllText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.medium },
  activityItem: { flexDirection: 'row', marginBottom: spacing.md },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 6,
    marginRight: spacing.md,
  },
  activityContent: { flex: 1 },
  activityAction: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text },
  activityDescription: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  activityDate: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  notesText: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  noNotesText: { fontSize: fontSize.sm, color: colors.textMuted, fontStyle: 'italic' },
  actionsList: { marginTop: -spacing.sm },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  actionRowText: { flex: 1, fontSize: fontSize.md, color: colors.text },
  dangerRow: { borderBottomWidth: 0 },
  grantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    borderRadius: borderRadius.sm,
  },
  grantButtonText: { fontSize: fontSize.sm, color: '#34d399', fontWeight: fontWeight.medium },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  subTier: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  subSource: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  revokeButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: borderRadius.sm,
  },
  revokeText: { fontSize: fontSize.xs, color: colors.error },
  reactivateButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.sm,
  },
  reactivateText: { fontSize: fontSize.xs, color: colors.primary },
  tierOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  tierOptionActive: { borderColor: colors.primary, backgroundColor: 'rgba(59, 130, 246, 0.1)' },
  tierOptionText: { fontSize: fontSize.md, color: colors.text },
  grantErrorText: { fontSize: fontSize.sm, color: colors.error, marginTop: spacing.sm },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.8)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    maxHeight: '90%',
  },
  confirmModal: { borderRadius: borderRadius.xl, marginHorizontal: spacing.lg, marginBottom: '40%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  modalTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  modalScroll: { maxHeight: 400 },
  inputLabel: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.sm },
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
  inputDisabled: { opacity: 0.5 },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  modalButtons: { flexDirection: 'row', marginTop: spacing.lg },
  confirmTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  confirmText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
})
