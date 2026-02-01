import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { api } from '../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme'
import { User } from '../types'

type RoleFilter = 'ALL' | 'CUSTOMER' | 'ADMIN' | 'SUPER_ADMIN'

interface CustomerSegment {
  id: string
  name: string
  description: string | null
  color: string
  memberCount: number
  isAutomatic: boolean
}

const SEGMENT_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
]

export function UsersScreen({ navigation, hideHeader }: { navigation: any; hideHeader?: boolean }) {
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL')
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [counts, setCounts] = useState({ all: 0, customers: 0, admins: 0 })

  // Segments
  const [segments, setSegments] = useState<CustomerSegment[]>([])
  const [segmentsLoading, setSegmentsLoading] = useState(false)
  const [showCreateSegmentModal, setShowCreateSegmentModal] = useState(false)
  const [editingSegment, setEditingSegment] = useState<CustomerSegment | null>(null)
  const [showEditSegmentModal, setShowEditSegmentModal] = useState(false)

  // Create User Modal
  const [showCreateUserModal, setShowCreateUserModal] = useState(false)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const fetchUsers = async (pageNum = 1, refresh = false, filter = roleFilter, search = debouncedSearch) => {
    try {
      let role: string | undefined
      if (filter === 'CUSTOMER') role = 'USER'
      else if (filter === 'ADMIN') role = 'ADMIN'
      else if (filter === 'SUPER_ADMIN') role = 'SUPER_ADMIN'

      const data = await api.getUsers({
        page: pageNum,
        limit: 20,
        role,
        search: search || undefined
      })
      const newUsers = data.users || []

      if (refresh || pageNum === 1) {
        setUsers(newUsers)
      } else {
        setUsers((prev) => [...prev, ...newUsers])
      }

      setHasMore(newUsers.length === 20)
      setPage(pageNum)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchCounts = async () => {
    try {
      const [allData, customersData, adminsData] = await Promise.all([
        api.getUsers({ page: 1, limit: 1 }),
        api.getUsers({ page: 1, limit: 1, role: 'USER' }),
        api.getUsers({ page: 1, limit: 1, role: 'ADMIN' }),
      ])
      setCounts({
        all: allData.total || 0,
        customers: customersData.total || 0,
        admins: adminsData.total || 0,
      })
    } catch (e) {
      // Silent fail
    }
  }

  const fetchSegments = useCallback(async () => {
    setSegmentsLoading(true)
    try {
      const data = await api.getCustomerSegments()
      setSegments(data.segments || [])
    } catch (error) {
      console.error('Failed to fetch segments:', error)
    } finally {
      setSegmentsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCounts()
    fetchSegments()
  }, [])

  useEffect(() => {
    setLoading(true)
    setPage(1)
    fetchUsers(1, true, roleFilter, debouncedSearch)
  }, [roleFilter, debouncedSearch])

  const onRefresh = () => {
    setRefreshing(true)
    fetchUsers(1, true)
    fetchSegments()
    fetchCounts()
  }

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchUsers(page + 1)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getInitials = (name: string | null | undefined, email: string | null | undefined) => {
    if (name) {
      const parts = name.split(' ').filter(n => n.length > 0)
      if (parts.length > 0) {
        return parts
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
      }
    }
    if (email) {
      return email.slice(0, 2).toUpperCase()
    }
    return '??'
  }

  const getRoleBadgeVariant = (role: string): 'default' | 'success' | 'warning' | 'error' | 'primary' => {
    switch (role) {
      case 'SUPER_ADMIN': return 'error'
      case 'ADMIN': return 'warning'
      case 'CUSTOMER': return 'primary'
      default: return 'default'
    }
  }

  const getRoleBadgeText = (role: string): string => {
    switch (role) {
      case 'SUPER_ADMIN': return 'Super Admin'
      case 'ADMIN': return 'Admin'
      case 'CUSTOMER': return 'Customer'
      default: return role
    }
  }

  const handleEditSegment = (segment: CustomerSegment) => {
    setEditingSegment(segment)
    setShowEditSegmentModal(true)
  }

  const handleUserCreated = () => {
    setShowCreateUserModal(false)
    fetchUsers(1, true)
    fetchCounts()
  }

  const renderUser = ({ item }: { item: User }) => {
    if (!item) return null
    return (
    <TouchableOpacity onPress={() => navigation.navigate('UserDetail', { id: item.id })} activeOpacity={0.7}>
      <Card style={styles.userCard}>
        <View style={styles.userContent}>
          <View style={[styles.avatar, (item.role === 'ADMIN' || item.role === 'SUPER_ADMIN') && styles.adminAvatar]}>
            <Text style={styles.avatarText}>{getInitials(item.name, item.email)}</Text>
          </View>
          <View style={styles.userInfo}>
            <View style={styles.userHeader}>
              <Text style={styles.userName} numberOfLines={1}>{item.name || 'No Name'}</Text>
            </View>
            <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
            <View style={styles.userMeta}>
              <Badge text={getRoleBadgeText(item.role)} variant={getRoleBadgeVariant(item.role)} />
              {item.isFounder && <Badge text="Founder" variant="primary" />}
              {item._count?.orders !== undefined && item._count.orders > 0 && (
                <View style={styles.metaItem}>
                  <Ionicons name="receipt-outline" size={12} color={colors.textMuted} />
                  <Text style={styles.metaText}>{item._count.orders} orders</Text>
                </View>
              )}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
      </Card>
    </TouchableOpacity>
    )
  }

  const renderHeader = () => (
    <View>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateUserModal(true)}
        >
          <Ionicons name="add" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Role Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {(['ALL', 'CUSTOMER', 'ADMIN', 'SUPER_ADMIN'] as RoleFilter[]).map((role) => {
          const isActive = roleFilter === role
          let label = role === 'ALL' ? 'All' : role === 'CUSTOMER' ? 'Customers' : role === 'ADMIN' ? 'Admins' : 'Super Admins'
          let count = role === 'ALL' ? counts.all : role === 'CUSTOMER' ? counts.customers : counts.admins

          return (
            <TouchableOpacity
              key={role}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setRoleFilter(role)}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {label}
              </Text>
              {count > 0 && (
                <View style={[styles.filterCountBadge, isActive && styles.filterCountBadgeActive]}>
                  <Text style={[styles.filterCountText, isActive && styles.filterCountTextActive]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* Segments Section (only show for Customers filter or All) */}
      {(roleFilter === 'CUSTOMER' || roleFilter === 'ALL') && renderSegmentsSection()}
    </View>
  )

  const renderSegmentsSection = () => {
    return (
      <View style={styles.segmentsSection}>
        <View style={styles.segmentsHeader}>
          <Text style={styles.segmentsTitle}>Segments</Text>
          <TouchableOpacity
            style={styles.addSegmentButton}
            onPress={() => setShowCreateSegmentModal(true)}
          >
            <Ionicons name="add" size={18} color={colors.primary} />
            <Text style={styles.addSegmentText}>New</Text>
          </TouchableOpacity>
        </View>

        {segmentsLoading && segments.length === 0 ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: spacing.md }} />
        ) : segments.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.segmentsList}
          >
            {segments.map((segment) => (
              <TouchableOpacity
                key={segment.id}
                style={styles.segmentChip}
                onPress={() => handleEditSegment(segment)}
                activeOpacity={0.7}
              >
                <View style={[styles.segmentDot, { backgroundColor: segment.color }]} />
                <Text style={styles.segmentChipText} numberOfLines={1}>
                  {segment.name}
                </Text>
                <Text style={styles.segmentCount}>
                  {segment.memberCount}
                </Text>
                <Ionicons name="create-outline" size={14} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.noSegmentsText}>No segments created yet</Text>
        )}
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={users}
        renderItem={renderUser}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={renderHeader}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>
                {debouncedSearch ? 'No users found matching your search' : 'No users found'}
              </Text>
            </View>
          ) : null
        }
      />

      {/* Create User Modal */}
      <CreateUserModal
        visible={showCreateUserModal}
        onClose={() => setShowCreateUserModal(false)}
        onCreated={handleUserCreated}
      />

      {/* Create Segment Modal */}
      <CreateSegmentModal
        visible={showCreateSegmentModal}
        onClose={() => setShowCreateSegmentModal(false)}
        onCreated={() => {
          setShowCreateSegmentModal(false)
          fetchSegments()
        }}
      />

      {/* Edit Segment Modal */}
      <EditSegmentModal
        visible={showEditSegmentModal}
        segment={editingSegment}
        onClose={() => {
          setShowEditSegmentModal(false)
          setEditingSegment(null)
        }}
        onSaved={() => {
          setShowEditSegmentModal(false)
          setEditingSegment(null)
          fetchSegments()
        }}
        onDeleted={() => {
          setShowEditSegmentModal(false)
          setEditingSegment(null)
          fetchSegments()
        }}
      />
    </View>
  )
}

// Create User Modal
function CreateUserModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<'CUSTOMER' | 'ADMIN' | 'SUPER_ADMIN'>('CUSTOMER')
  const [password, setPassword] = useState('')
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (visible) {
      setName('')
      setEmail('')
      setPhone('')
      setRole('CUSTOMER')
      setPassword('')
      setSendWelcomeEmail(true)
      setError('')
    }
  }, [visible])

  const handleCreate = async () => {
    if (!email.trim()) {
      setError('Email is required')
      return
    }

    if (!password.trim() || password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    setError('')

    try {
      await api.createUser({
        name: name.trim() || undefined,
        email: email.trim(),
        phone: phone.trim() || undefined,
        role,
        password,
        sendWelcomeEmail,
      })
      onCreated()
    } catch (err: any) {
      setError(err.message || 'Failed to create user')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={modalStyles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={modalStyles.header}>
          <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={modalStyles.title}>Create User</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={modalStyles.content} showsVerticalScrollIndicator={false}>
          {error ? (
            <View style={modalStyles.errorBox}>
              <Text style={modalStyles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={modalStyles.formGroup}>
            <Text style={modalStyles.label}>Name</Text>
            <TextInput
              style={modalStyles.input}
              value={name}
              onChangeText={setName}
              placeholder="John Doe"
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
          </View>

          <View style={modalStyles.formGroup}>
            <Text style={modalStyles.label}>Email *</Text>
            <TextInput
              style={modalStyles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="john@example.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={modalStyles.formGroup}>
            <Text style={modalStyles.label}>Phone</Text>
            <TextInput
              style={modalStyles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+1 (555) 123-4567"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
            />
          </View>

          <View style={modalStyles.formGroup}>
            <Text style={modalStyles.label}>Password *</Text>
            <TextInput
              style={modalStyles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="At least 8 characters"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
            />
          </View>

          <View style={modalStyles.formGroup}>
            <Text style={modalStyles.label}>Role</Text>
            <View style={modalStyles.roleSelector}>
              {(['CUSTOMER', 'ADMIN', 'SUPER_ADMIN'] as const).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[modalStyles.roleOption, role === r && modalStyles.roleOptionActive]}
                  onPress={() => setRole(r)}
                >
                  <Text style={[modalStyles.roleOptionText, role === r && modalStyles.roleOptionTextActive]}>
                    {r === 'CUSTOMER' ? 'Customer' : r === 'ADMIN' ? 'Admin' : 'Super Admin'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={modalStyles.switchRow}>
            <View>
              <Text style={modalStyles.switchLabel}>Send Welcome Email</Text>
              <Text style={modalStyles.switchDescription}>Send login credentials to user</Text>
            </View>
            <Switch
              value={sendWelcomeEmail}
              onValueChange={setSendWelcomeEmail}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.text}
            />
          </View>
        </ScrollView>

        <View style={modalStyles.footer}>
          <TouchableOpacity
            style={[modalStyles.footerBtn, modalStyles.footerBtnSecondary]}
            onPress={onClose}
            disabled={loading}
          >
            <Text style={modalStyles.footerBtnSecondaryText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[modalStyles.footerBtn, modalStyles.footerBtnPrimary, loading && { opacity: 0.5 }]}
            onPress={handleCreate}
            disabled={loading}
          >
            <Text style={modalStyles.footerBtnPrimaryText}>
              {loading ? 'Creating...' : 'Create User'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// Create Segment Modal
function CreateSegmentModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(SEGMENT_COLORS[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (visible) {
      setName('')
      setDescription('')
      setColor(SEGMENT_COLORS[0])
      setError('')
    }
  }, [visible])

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Segment name is required')
      return
    }

    setLoading(true)
    setError('')

    try {
      await api.createCustomerSegment({ name: name.trim(), description: description.trim() || undefined, color })
      onCreated()
    } catch (err: any) {
      setError(err.message || 'Failed to create segment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={modalStyles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={modalStyles.header}>
          <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={modalStyles.title}>New Segment</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={modalStyles.content} showsVerticalScrollIndicator={false}>
          {error ? (
            <View style={modalStyles.errorBox}>
              <Text style={modalStyles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={modalStyles.formGroup}>
            <Text style={modalStyles.label}>Name *</Text>
            <TextInput
              style={modalStyles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g., VIP Customers"
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
          </View>

          <View style={modalStyles.formGroup}>
            <Text style={modalStyles.label}>Description</Text>
            <TextInput
              style={[modalStyles.input, modalStyles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Optional description..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={modalStyles.formGroup}>
            <Text style={modalStyles.label}>Color</Text>
            <View style={modalStyles.colorPicker}>
              {SEGMENT_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    modalStyles.colorOption,
                    { backgroundColor: c },
                    color === c && modalStyles.colorOptionSelected,
                  ]}
                  onPress={() => setColor(c)}
                >
                  {color === c && (
                    <Ionicons name="checkmark" size={18} color="#ffffff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={modalStyles.footer}>
          <TouchableOpacity
            style={[modalStyles.footerBtn, modalStyles.footerBtnSecondary]}
            onPress={onClose}
            disabled={loading}
          >
            <Text style={modalStyles.footerBtnSecondaryText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[modalStyles.footerBtn, modalStyles.footerBtnPrimary, loading && { opacity: 0.5 }]}
            onPress={handleCreate}
            disabled={loading}
          >
            <Text style={modalStyles.footerBtnPrimaryText}>
              {loading ? 'Creating...' : 'Create Segment'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// Edit Segment Modal
function EditSegmentModal({
  visible,
  segment,
  onClose,
  onSaved,
  onDeleted,
}: {
  visible: boolean
  segment: CustomerSegment | null
  onClose: () => void
  onSaved: () => void
  onDeleted: () => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(SEGMENT_COLORS[0])
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (segment && visible) {
      setName(segment.name)
      setDescription(segment.description || '')
      setColor(segment.color || SEGMENT_COLORS[0])
      setError('')
    }
  }, [segment, visible])

  const handleSave = async () => {
    if (!segment) return

    if (!name.trim()) {
      setError('Segment name is required')
      return
    }

    setLoading(true)
    setError('')

    try {
      await api.updateCustomerSegment(segment.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        color,
      })
      onSaved()
    } catch (err: any) {
      setError(err.message || 'Failed to update segment')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = () => {
    if (!segment) return

    const memberCount = segment.memberCount || 0
    const message = memberCount > 0
      ? `This segment has ${memberCount} member${memberCount === 1 ? '' : 's'}. Deleting it will remove all member associations. This action cannot be undone.`
      : 'Are you sure you want to delete this segment? This action cannot be undone.'

    Alert.alert(
      'Delete Segment',
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true)
            try {
              await api.deleteCustomerSegment(segment.id)
              onDeleted()
            } catch (err: any) {
              setError(err.message || 'Failed to delete segment')
              setDeleting(false)
            }
          },
        },
      ]
    )
  }

  if (!segment) return null

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={modalStyles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={modalStyles.header}>
          <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={modalStyles.title}>Edit Segment</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={modalStyles.content} showsVerticalScrollIndicator={false}>
          {error ? (
            <View style={modalStyles.errorBox}>
              <Text style={modalStyles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Segment info */}
          <View style={modalStyles.infoRow}>
            <View style={modalStyles.infoItem}>
              <Ionicons name="people-outline" size={16} color={colors.textMuted} />
              <Text style={modalStyles.infoText}>{segment.memberCount} member{segment.memberCount !== 1 ? 's' : ''}</Text>
            </View>
            {segment.isAutomatic && (
              <View style={modalStyles.infoItem}>
                <Ionicons name="flash-outline" size={16} color={colors.warning} />
                <Text style={modalStyles.infoText}>Auto-assigned</Text>
              </View>
            )}
          </View>

          <View style={modalStyles.formGroup}>
            <Text style={modalStyles.label}>Name *</Text>
            <TextInput
              style={modalStyles.input}
              value={name}
              onChangeText={setName}
              placeholder="Segment name"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={modalStyles.formGroup}>
            <Text style={modalStyles.label}>Description</Text>
            <TextInput
              style={[modalStyles.input, modalStyles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Optional description..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={modalStyles.formGroup}>
            <Text style={modalStyles.label}>Color</Text>
            <View style={modalStyles.colorPicker}>
              {SEGMENT_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    modalStyles.colorOption,
                    { backgroundColor: c },
                    color === c && modalStyles.colorOptionSelected,
                  ]}
                  onPress={() => setColor(c)}
                >
                  {color === c && (
                    <Ionicons name="checkmark" size={18} color="#ffffff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Delete section */}
          <View style={modalStyles.dangerSection}>
            <Text style={modalStyles.dangerTitle}>Danger Zone</Text>
            <TouchableOpacity
              style={modalStyles.deleteButton}
              onPress={handleDelete}
              disabled={deleting}
            >
              <Ionicons name="trash-outline" size={18} color={colors.error} />
              <Text style={modalStyles.deleteButtonText}>
                {deleting ? 'Deleting...' : 'Delete Segment'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: spacing.xxl }} />
        </ScrollView>

        <View style={modalStyles.footer}>
          <TouchableOpacity
            style={[modalStyles.footerBtn, modalStyles.footerBtnSecondary]}
            onPress={onClose}
            disabled={loading || deleting}
          >
            <Text style={modalStyles.footerBtnSecondaryText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[modalStyles.footerBtn, modalStyles.footerBtnPrimary, (loading || deleting) && { opacity: 0.5 }]}
            onPress={handleSave}
            disabled={loading || deleting}
          >
            <Text style={modalStyles.footerBtnPrimaryText}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Search
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
  },
  clearButton: {
    padding: spacing.xs,
  },
  createButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Filter
  filterContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  filterContent: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
    gap: spacing.xs,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
  },
  filterChipTextActive: {
    color: colors.text,
  },
  filterCountBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceHover,
  },
  filterCountBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  filterCountText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
  },
  filterCountTextActive: {
    color: colors.text,
  },
  // Segments
  segmentsSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  segmentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  segmentsTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  addSegmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  addSegmentText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },
  segmentsList: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  segmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.full,
  },
  segmentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  segmentChipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    maxWidth: 120,
  },
  segmentCount: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  noSegmentsText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  // List
  list: {
    paddingBottom: spacing.xxl,
  },
  userCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  userContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminAvatar: {
    backgroundColor: '#f59e0b',
  },
  avatarText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  userInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  userEmail: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  userMeta: {
    flexDirection: 'row',
    marginTop: spacing.xs,
    gap: spacing.sm,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginLeft: 4,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginTop: spacing.md,
    textAlign: 'center',
  },
})

const modalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
  },
  errorBox: {
    backgroundColor: colors.errorBg,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSize.sm,
  },
  infoRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  infoText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: fontSize.md,
  },
  textArea: {
    minHeight: 80,
    paddingTop: spacing.md,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  roleOption: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  roleOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  roleOptionText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
  },
  roleOptionTextActive: {
    color: colors.text,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.md,
  },
  switchLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  switchDescription: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  colorPicker: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  dangerSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dangerTitle: {
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
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBtnSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  footerBtnSecondaryText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  footerBtnPrimary: {
    backgroundColor: colors.primary,
  },
  footerBtnPrimaryText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
})
