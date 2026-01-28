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
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { api } from '../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme'
import { User } from '../types'

type UserType = 'customers' | 'admins'

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
  const [userType, setUserType] = useState<UserType>('customers')
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [counts, setCounts] = useState({ customers: 0, admins: 0 })

  // Segments
  const [segments, setSegments] = useState<CustomerSegment[]>([])
  const [segmentsLoading, setSegmentsLoading] = useState(false)
  const [showCreateSegmentModal, setShowCreateSegmentModal] = useState(false)
  const [editingSegment, setEditingSegment] = useState<CustomerSegment | null>(null)
  const [showEditSegmentModal, setShowEditSegmentModal] = useState(false)

  const fetchUsers = async (pageNum = 1, refresh = false, type = userType) => {
    try {
      const role = type === 'admins' ? 'ADMIN' : 'USER'
      const data = await api.getUsers({ page: pageNum, limit: 20, role })
      const newUsers = data.users || []

      if (refresh || pageNum === 1) {
        setUsers(newUsers)
      } else {
        setUsers((prev) => [...prev, ...newUsers])
      }

      setHasMore(newUsers.length === 20)
      setPage(pageNum)

      // Update counts if available
      if (data.counts) {
        setCounts(data.counts)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
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

  // Fetch counts on mount
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [customersData, adminsData] = await Promise.all([
          api.getUsers({ page: 1, limit: 1, role: 'USER' }),
          api.getUsers({ page: 1, limit: 1, role: 'ADMIN' }),
        ])
        setCounts({
          customers: customersData.total || 0,
          admins: adminsData.total || 0,
        })
      } catch (e) {
        // Silent fail
      }
    }
    fetchCounts()
    fetchSegments()
  }, [])

  useEffect(() => {
    setLoading(true)
    setPage(1)
    fetchUsers(1, true, userType)
  }, [userType])

  const onRefresh = () => {
    setRefreshing(true)
    fetchUsers(1, true)
    fetchSegments()
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

  const handleEditSegment = (segment: CustomerSegment) => {
    setEditingSegment(segment)
    setShowEditSegmentModal(true)
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
              <View style={styles.badges}>
                {item.isFounder && <Badge text="Founder" variant="primary" />}
                {item.role === 'ADMIN' && <Badge text="Admin" variant="warning" />}
                {item.role === 'SUPER_ADMIN' && <Badge text="Super" variant="error" />}
              </View>
            </View>
            <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
            <View style={styles.userMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
                <Text style={styles.metaText}>{formatDate(item.createdAt)}</Text>
              </View>
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

  const renderSegmentsSection = () => {
    if (userType !== 'customers') return null

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
      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, userType === 'customers' && styles.tabActive]}
          onPress={() => setUserType('customers')}
        >
          <Ionicons
            name="people"
            size={18}
            color={userType === 'customers' ? colors.text : colors.textMuted}
          />
          <Text style={[styles.tabText, userType === 'customers' && styles.tabTextActive]}>
            Customers
          </Text>
          {counts.customers > 0 && (
            <View style={[styles.countBadge, userType === 'customers' && styles.countBadgeActive]}>
              <Text style={[styles.countText, userType === 'customers' && styles.countTextActive]}>
                {counts.customers}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, userType === 'admins' && styles.tabActive]}
          onPress={() => setUserType('admins')}
        >
          <Ionicons
            name="shield"
            size={18}
            color={userType === 'admins' ? colors.text : colors.textMuted}
          />
          <Text style={[styles.tabText, userType === 'admins' && styles.tabTextActive]}>
            Admins
          </Text>
          {counts.admins > 0 && (
            <View style={[styles.countBadge, userType === 'admins' && styles.countBadgeActive]}>
              <Text style={[styles.countText, userType === 'admins' && styles.countTextActive]}>
                {counts.admins}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Segments Section */}
      {renderSegmentsSection()}

      <FlatList
        data={users}
        renderItem={renderUser}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons
                name={userType === 'admins' ? 'shield-outline' : 'people-outline'}
                size={48}
                color={colors.textMuted}
              />
              <Text style={styles.emptyText}>
                No {userType === 'admins' ? 'admins' : 'customers'} found
              </Text>
            </View>
          ) : null
        }
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
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.text,
  },
  countBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceHover,
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  countText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
  },
  countTextActive: {
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
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  userCard: {
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
  badges: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  userEmail: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  userMeta: {
    flexDirection: 'row',
    marginTop: spacing.xs,
    gap: spacing.md,
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
