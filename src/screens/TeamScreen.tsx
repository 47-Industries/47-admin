import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  TextInput,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { ImageViewer } from '../components/ImageViewer'
import { api } from '../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme'

interface TeamMember {
  id: string
  employeeNumber: string
  name: string
  email: string
  phone?: string
  title: string
  department?: string
  startDate: string
  status: string
  salaryType: string
  salaryAmount?: number
  salaryFrequency?: string
  equityPercentage?: number
  profileImageUrl?: string | null
  user?: {
    id: string
    email: string
    role: 'CUSTOMER' | 'ADMIN' | 'SUPER_ADMIN'
    image?: string | null
  }
  _count: {
    contracts: number
    documents: number
    payments: number
  }
}

interface Stats {
  total: number
  active: number
  totalPayments: number
}

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE'

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
]

export function TeamScreen({ navigation, hideHeader }: { navigation: any; hideHeader?: boolean }) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [viewingImage, setViewingImage] = useState<string | null>(null)

  const fetchTeamMembers = useCallback(
    async (pageNum = 1, refresh = false) => {
      try {
        const status =
          statusFilter === 'ALL' ? undefined : statusFilter
        const data = await api.getTeamMembers({
          page: pageNum,
          limit: 20,
          status,
          search: search || undefined,
        })
        const newMembers = data.teamMembers || []

        if (refresh || pageNum === 1) {
          setTeamMembers(newMembers)
        } else {
          setTeamMembers((prev) => [...prev, ...newMembers])
        }

        setHasMore(newMembers.length === 20)
        setPage(pageNum)

        if (data.stats) {
          setStats(data.stats)
        }
      } catch (error) {
        console.error('Failed to fetch team members:', error)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [search, statusFilter]
  )

  useEffect(() => {
    setLoading(true)
    setPage(1)
    fetchTeamMembers(1, true)
  }, [fetchTeamMembers])

  const onRefresh = () => {
    setRefreshing(true)
    fetchTeamMembers(1, true)
  }

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchTeamMembers(page + 1)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getStatusColor = (status: string): string => {
    const statusColors: Record<string, string> = {
      ACTIVE: colors.success,
      INACTIVE: colors.textMuted,
      ON_LEAVE: colors.warning,
      TERMINATED: colors.error,
    }
    return statusColors[status] || colors.textMuted
  }

  const getStatusBadgeVariant = (
    status: string
  ): 'success' | 'warning' | 'error' | 'default' => {
    const variants: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
      ACTIVE: 'success',
      INACTIVE: 'default',
      ON_LEAVE: 'warning',
      TERMINATED: 'error',
    }
    return variants[status] || 'default'
  }

  const getRoleBadgeVariant = (
    role: string
  ): 'primary' | 'warning' | 'error' | 'default' => {
    if (role === 'SUPER_ADMIN') return 'error'
    if (role === 'ADMIN') return 'warning'
    return 'default'
  }

  const getRoleLabel = (role: string): string => {
    if (role === 'SUPER_ADMIN') return 'Super Admin'
    if (role === 'ADMIN') return 'Admin'
    return role
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    })
  }

  const renderTeamMember = ({ item }: { item: TeamMember }) => {
    const profileImage = item.profileImageUrl || item.user?.image

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('TeamMemberDetail', { id: item.id })}
        activeOpacity={0.7}
      >
        <Card style={styles.memberCard}>
          <View style={styles.memberContent}>
            {profileImage ? (
              <TouchableOpacity onPress={() => setViewingImage(profileImage)} activeOpacity={0.8}>
                <Image source={{ uri: profileImage }} style={styles.avatar} />
              </TouchableOpacity>
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
              </View>
            )}
            <View style={styles.memberInfo}>
              <View style={styles.memberHeader}>
                <Text style={styles.memberName} numberOfLines={1}>
                  {item.name}
                </Text>
                <View style={styles.badges}>
                  <Badge
                    text={item.status}
                    variant={getStatusBadgeVariant(item.status)}
                  />
                  {item.user?.role && item.user.role !== 'CUSTOMER' && (
                    <Badge
                      text={getRoleLabel(item.user.role)}
                      variant={getRoleBadgeVariant(item.user.role)}
                    />
                  )}
                </View>
              </View>
              <Text style={styles.memberTitle} numberOfLines={1}>
                {item.title}
                {item.department ? ` | ${item.department}` : ''}
              </Text>
              <Text style={styles.memberEmail} numberOfLines={1}>
                {item.email}
              </Text>
              <View style={styles.memberMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
                  <Text style={styles.metaText}>Since {formatDate(item.startDate)}</Text>
                </View>
                {!item.user && (
                  <View style={styles.metaItem}>
                    <Ionicons name="person-outline" size={12} color={colors.textMuted} />
                    <Text style={styles.metaText}>No Account</Text>
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
    <>
      {/* Stats Cards */}
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Team</Text>
            <Text style={styles.statValue}>{stats.total}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Active</Text>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {stats.active}
            </Text>
          </View>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
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
        {STATUS_FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter.value}
            style={[
              styles.filterChip,
              statusFilter === filter.value && styles.filterChipActive,
            ]}
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
      </View>
    </>
  )

  return (
    <View style={styles.container}>
      <FlatList
        data={teamMembers}
        renderItem={renderTeamMember}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>No team members found</Text>
              {(search || statusFilter !== 'ALL') && (
                <Text style={styles.emptySubtext}>
                  Try adjusting your search or filters
                </Text>
              )}
            </View>
          ) : null
        }
      />
      <ImageViewer
        visible={!!viewingImage}
        imageUrl={viewingImage}
        onClose={() => setViewingImage(null)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
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
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  filterChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
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
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  memberCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  memberContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.lg,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  memberInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  memberName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  badges: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  memberTitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  memberEmail: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  memberMeta: {
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
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
})
