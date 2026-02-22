import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { SkeletonList } from '../../components/Skeleton'
import { api } from '../../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme'
import { Client, ClientType, ClientStatus } from '../../types'

interface ClientsScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void
    goBack: () => void
  }
  hideHeader?: boolean
}

const STATUS_FILTERS = [
  { value: null, label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'SUSPENDED', label: 'Suspended' },
]

const TYPE_FILTERS = [
  { value: null, label: 'All Types' },
  { value: 'INDIVIDUAL', label: 'Individual' },
  { value: 'BUSINESS', label: 'Business' },
  { value: 'ENTERPRISE', label: 'Enterprise' },
]

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'error' | 'primary'> = {
  ACTIVE: 'success',
  INACTIVE: 'default',
  SUSPENDED: 'error',
}

const typeColors: Record<string, 'default' | 'success' | 'warning' | 'error' | 'primary'> = {
  INDIVIDUAL: 'default',
  BUSINESS: 'primary',
  ENTERPRISE: 'warning',
}

export function ClientsScreen({ navigation, hideHeader }: ClientsScreenProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [showTypeFilter, setShowTypeFilter] = useState(false)

  // Stats
  const [stats, setStats] = useState({
    totalClients: 0,
    totalRevenue: 0,
    totalOutstanding: 0,
    activeCount: 0,
  })

  // Create Client Modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    type: 'INDIVIDUAL' as ClientType,
    notes: '',
  })
  const [creating, setCreating] = useState(false)

  const fetchClients = useCallback(async (pageNum = 1, refresh = false) => {
    try {
      const params: { page?: number; status?: string; search?: string; type?: string } = { page: pageNum }
      if (statusFilter) params.status = statusFilter
      if (typeFilter) params.type = typeFilter
      if (search) params.search = search

      const data = await api.getAdminClients(params)
      const newClients = data.clients || []

      if (refresh || pageNum === 1) {
        setClients(newClients)
      } else {
        setClients((prev) => [...prev, ...newClients])
      }

      // Calculate stats from fetched data
      const allClients = refresh || pageNum === 1 ? newClients : [...clients, ...newClients]
      const activeClients = allClients.filter((c: Client) => c.status === 'ACTIVE')
      const totalRevenue = allClients.reduce((sum: number, c: Client) => sum + Number(c.totalRevenue || 0), 0)
      const totalOutstanding = allClients.reduce((sum: number, c: Client) => sum + Number(c.totalOutstanding || 0), 0)

      setStats({
        totalClients: data.total || allClients.length,
        totalRevenue,
        totalOutstanding,
        activeCount: activeClients.length,
      })

      setHasMore(newClients.length === 20)
      setPage(pageNum)
    } catch (error) {
      console.error('Failed to fetch clients:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [statusFilter, typeFilter, search, clients])

  useEffect(() => {
    setLoading(true)
    fetchClients(1, true)
  }, [statusFilter, typeFilter])

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setLoading(true)
      fetchClients(1, true)
    }, 300)
    return () => clearTimeout(debounceTimer)
  }, [search])

  const onRefresh = () => {
    setRefreshing(true)
    fetchClients(1, true)
  }

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchClients(page + 1)
    }
  }

  const formatCurrency = (amount: number, compact = false) => {
    if (compact && Math.abs(amount) >= 1000) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(amount || 0)
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0)
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '??'
    const parts = name.split(' ').filter(n => n.length > 0)
    if (parts.length > 0) {
      return parts
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return '??'
  }

  // Create Client Functions
  const openCreateModal = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      type: 'INDIVIDUAL',
      notes: '',
    })
    setShowCreateModal(true)
  }

  const createClient = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Name is required')
      return
    }
    if (!formData.email.trim()) {
      Alert.alert('Error', 'Email is required')
      return
    }

    setCreating(true)
    try {
      await api.createAdminClient({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        company: formData.company.trim() || undefined,
        type: formData.type,
        notes: formData.notes.trim() || undefined,
      })

      Alert.alert('Success', 'Client created successfully')
      setShowCreateModal(false)
      fetchClients(1, true)
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create client')
    } finally {
      setCreating(false)
    }
  }

  const renderClient = ({ item }: { item: Client }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('ClientDetail', { id: item.id })}
      activeOpacity={0.7}
    >
      <Card style={styles.clientCard}>
        <View style={styles.clientHeader}>
          <View style={styles.clientLeft}>
            <View style={[styles.avatar, item.status === 'SUSPENDED' && styles.avatarSuspended]}>
              <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
            </View>
            <View style={styles.clientInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.clientName} numberOfLines={1}>{item.name}</Text>
                {item.clientNumber && (
                  <Text style={styles.clientNumber}>#{item.clientNumber}</Text>
                )}
              </View>
              {item.company && (
                <Text style={styles.companyName} numberOfLines={1}>{item.company}</Text>
              )}
              <Text style={styles.clientEmail} numberOfLines={1}>{item.email}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>

        <View style={styles.badgeRow}>
          <Badge text={item.status} variant={statusColors[item.status] || 'default'} />
          <Badge text={item.type} variant={typeColors[item.type] || 'default'} />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Revenue</Text>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {formatCurrency(Number(item.totalRevenue))}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Outstanding</Text>
            <Text style={[
              styles.statValue,
              Number(item.totalOutstanding) > 0 && { color: colors.warning }
            ]}>
              {formatCurrency(Number(item.totalOutstanding))}
            </Text>
          </View>
        </View>

        <View style={styles.clientFooter}>
          <Text style={styles.footerText}>Added {formatDate(item.createdAt)}</Text>
        </View>
      </Card>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container} edges={hideHeader ? [] : ['top']}>
      {!hideHeader && (
        <View style={styles.header}>
          <Text style={styles.title}>Clients</Text>
          <TouchableOpacity style={styles.createButton} onPress={openCreateModal}>
            <Ionicons name="add" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      )}

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statCardLabel} numberOfLines={1}>Total</Text>
          <Text style={styles.statCardValue} numberOfLines={1}>{stats.totalClients}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statCardLabel} numberOfLines={1}>Active</Text>
          <Text style={[styles.statCardValue, { color: colors.success }]} numberOfLines={1}>{stats.activeCount}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statCardLabel} numberOfLines={1}>Revenue</Text>
          <Text style={[styles.statCardValue, { color: colors.success }]} numberOfLines={1}>
            {formatCurrency(stats.totalRevenue, true)}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statCardLabel} numberOfLines={1}>Owed</Text>
          <Text style={[styles.statCardValue, { color: stats.totalOutstanding > 0 ? colors.warning : colors.text }]} numberOfLines={1}>
            {formatCurrency(stats.totalOutstanding, true)}
          </Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, email, or company..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Status Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {STATUS_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.label}
              style={[styles.filterChip, statusFilter === filter.value && styles.filterChipActive]}
              onPress={() => setStatusFilter(filter.value)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  statusFilter === filter.value && styles.filterChipTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
          <View style={styles.filterDivider} />
          <TouchableOpacity
            style={[styles.filterChip, typeFilter && styles.filterChipActive]}
            onPress={() => setShowTypeFilter(true)}
          >
            <Ionicons
              name="business-outline"
              size={14}
              color={typeFilter ? colors.text : colors.textMuted}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.filterChipText,
                typeFilter && styles.filterChipTextActive,
              ]}
            >
              {typeFilter ? TYPE_FILTERS.find(t => t.value === typeFilter)?.label : 'Type'}
            </Text>
            <Ionicons
              name="chevron-down"
              size={14}
              color={typeFilter ? colors.text : colors.textMuted}
              style={{ marginLeft: 4 }}
            />
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Client List */}
      {loading && clients.length === 0 ? (
        <SkeletonList count={6} />
      ) : (
        <FlatList
          data={clients}
          renderItem={renderClient}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            !loading ? (
              <EmptyState
                icon="people-outline"
                title="No clients found"
                description="Add your first client to get started"
                actionLabel="Add Client"
                onAction={openCreateModal}
              />
            ) : null
          }
        />
      )}

      {/* Type Filter Modal */}
      <Modal visible={showTypeFilter} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Type</Text>
              <TouchableOpacity onPress={() => setShowTypeFilter(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.typeList}>
              {TYPE_FILTERS.map((filter) => (
                <TouchableOpacity
                  key={filter.label}
                  style={styles.typeItem}
                  onPress={() => {
                    setTypeFilter(filter.value)
                    setShowTypeFilter(false)
                  }}
                >
                  <Text style={styles.typeItemText}>{filter.label}</Text>
                  {typeFilter === filter.value && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Client Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Client</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Name */}
              <Text style={styles.inputLabel}>Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Client name"
                placeholderTextColor={colors.textMuted}
                value={formData.name}
                onChangeText={(value) => setFormData({ ...formData, name: value })}
              />

              {/* Email */}
              <Text style={styles.inputLabel}>Email *</Text>
              <TextInput
                style={styles.input}
                placeholder="client@example.com"
                placeholderTextColor={colors.textMuted}
                value={formData.email}
                onChangeText={(value) => setFormData({ ...formData, email: value })}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              {/* Phone */}
              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput
                style={styles.input}
                placeholder="(555) 123-4567"
                placeholderTextColor={colors.textMuted}
                value={formData.phone}
                onChangeText={(value) => setFormData({ ...formData, phone: value })}
                keyboardType="phone-pad"
              />

              {/* Company */}
              <Text style={styles.inputLabel}>Company</Text>
              <TextInput
                style={styles.input}
                placeholder="Company name"
                placeholderTextColor={colors.textMuted}
                value={formData.company}
                onChangeText={(value) => setFormData({ ...formData, company: value })}
              />

              {/* Type Selection */}
              <Text style={styles.inputLabel}>Client Type</Text>
              <View style={styles.typeButtonRow}>
                {(['INDIVIDUAL', 'BUSINESS', 'ENTERPRISE'] as ClientType[]).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      formData.type === type && styles.typeButtonActive,
                    ]}
                    onPress={() => setFormData({ ...formData, type })}
                  >
                    <Ionicons
                      name={
                        type === 'INDIVIDUAL'
                          ? 'person-outline'
                          : type === 'BUSINESS'
                          ? 'business-outline'
                          : 'globe-outline'
                      }
                      size={18}
                      color={formData.type === type ? colors.text : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.typeButtonText,
                        formData.type === type && styles.typeButtonTextActive,
                      ]}
                    >
                      {type.charAt(0) + type.slice(1).toLowerCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Notes */}
              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Additional notes..."
                placeholderTextColor={colors.textMuted}
                value={formData.notes}
                onChangeText={(value) => setFormData({ ...formData, notes: value })}
                multiline
              />

              <View style={styles.modalButtons}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setShowCreateModal(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Create Client"
                  onPress={createClient}
                  loading={creating}
                  style={{ flex: 1, marginLeft: spacing.md }}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 0,
  },
  statCardLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  statCardValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  searchContainer: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    color: colors.text,
    fontSize: fontSize.md,
  },
  filtersContainer: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
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
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  filterChipTextActive: {
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  filterDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
    alignSelf: 'center',
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  clientCard: {
    marginBottom: spacing.md,
  },
  clientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  clientLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSuspended: {
    backgroundColor: colors.error,
    opacity: 0.7,
  },
  avatarText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  clientInfo: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  clientName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    flex: 1,
  },
  clientNumber: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  companyName: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  clientEmail: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginBottom: spacing.sm,
  },
  statItem: {},
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  clientFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
  },
  pickerModalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  modalScroll: {
    padding: spacing.xl,
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
    marginBottom: spacing.lg,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  typeList: {
    padding: spacing.xl,
  },
  typeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  typeItemText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  typeButtonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.xs,
  },
  typeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeButtonText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
  },
  typeButtonTextActive: {
    color: colors.text,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    marginBottom: spacing.xxl,
  },
})
