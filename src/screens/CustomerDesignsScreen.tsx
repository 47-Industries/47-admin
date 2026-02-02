import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, TextInput, Linking } from 'react-native'
import { CachedImage } from '../components/CachedImage'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { api } from '../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme'

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'error' | 'primary'> = {
  PENDING: 'warning',
  IN_PROGRESS: 'primary',
  COMPLETED: 'success',
  ARCHIVED: 'default',
}

interface CustomerDesign {
  id: string
  customerEmail: string
  source: string | null
  sourceCustomerId: string | null
  productId: string
  variantId: string | null
  designName: string
  designNotes: string | null
  gcodePath: string | null
  designFile: string | null
  previewImage: string | null
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED'
  customization: any
  originalOrderId: string | null
  createdAt: string
  updatedAt: string
  completedAt: string | null
  product?: {
    name: string
    slug: string
  }
  variant?: {
    name: string
    sku: string | null
  }
  order?: {
    orderNumber: string
  }
}

export default function CustomerDesignsScreen({ navigation, hideHeader }: { navigation: any; hideHeader?: boolean }) {
  const [designs, setDesigns] = useState<CustomerDesign[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)

  const fetchDesigns = async (pageNum = 1, refresh = false) => {
    try {
      const data = await api.getCustomerDesigns({
        page: pageNum,
        limit: 20,
        search: search || undefined,
        status: statusFilter || undefined,
      })
      const newDesigns = data.designs || []

      if (refresh || pageNum === 1) {
        setDesigns(newDesigns)
      } else {
        setDesigns((prev) => [...prev, ...newDesigns])
      }

      setHasMore(newDesigns.length === 20)
      setPage(pageNum)
    } catch (error) {
      console.error('Failed to fetch customer designs:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchDesigns()
  }, [search, statusFilter])

  const onRefresh = () => {
    setRefreshing(true)
    fetchDesigns(1, true)
  }

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchDesigns(page + 1)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const StatusFilterChip = ({ status, label }: { status: string | null; label: string }) => (
    <TouchableOpacity
      style={[styles.filterChip, statusFilter === status && styles.filterChipActive]}
      onPress={() => setStatusFilter(status)}
    >
      <Text style={[styles.filterChipText, statusFilter === status && styles.filterChipTextActive]}>{label}</Text>
    </TouchableOpacity>
  )

  const renderDesign = ({ item }: { item: CustomerDesign }) => (
    <TouchableOpacity onPress={() => navigation.navigate('CustomerDesignDetail', { id: item.id })} activeOpacity={0.7}>
      <Card style={styles.designCard}>
        <View style={styles.designHeader}>
          <View style={styles.designInfo}>
            <Text style={styles.designName} numberOfLines={1}>{item.designName}</Text>
            <Text style={styles.designDate}>{formatDate(item.createdAt)}</Text>
          </View>
          <Badge text={item.status.replace('_', ' ')} variant={statusColors[item.status] || 'default'} />
        </View>

        {/* Preview Image or Placeholder */}
        {item.previewImage ? (
          <CachedImage source={{ uri: item.previewImage }} style={styles.previewImage} resizeMode="cover" />
        ) : (
          <View style={styles.previewPlaceholder}>
            <Ionicons name="cube-outline" size={32} color={colors.textMuted} />
            <Text style={styles.previewPlaceholderText}>No preview</Text>
          </View>
        )}

        <View style={styles.customerInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={16} color={colors.textMuted} />
            <Text style={styles.infoText} numberOfLines={1}>{item.customerEmail}</Text>
          </View>
          {item.product && (
            <View style={styles.infoRow}>
              <Ionicons name="cube-outline" size={16} color={colors.textMuted} />
              <Text style={styles.infoText} numberOfLines={1}>{item.product.name}</Text>
            </View>
          )}
        </View>

        <View style={styles.specRow}>
          {/* G-code status */}
          <View style={styles.spec}>
            <Text style={styles.specLabel}>G-code</Text>
            <View style={[styles.statusDot, { backgroundColor: item.gcodePath ? colors.success : colors.warning }]} />
            <Text style={[styles.specValue, { color: item.gcodePath ? colors.success : colors.warning }]}>
              {item.gcodePath ? 'Ready' : 'Needs Slicing'}
            </Text>
          </View>

          {/* Design file */}
          {item.designFile && (
            <View style={styles.spec}>
              <Text style={styles.specLabel}>File</Text>
              <Ionicons name="document-outline" size={14} color={colors.primary} />
              <Text style={[styles.specValue, { color: colors.primary }]}>Uploaded</Text>
            </View>
          )}

          {/* Source */}
          {item.source && (
            <View style={styles.spec}>
              <Text style={styles.specLabel}>Source</Text>
              <Text style={styles.specValue}>{item.source}</Text>
            </View>
          )}
        </View>

        {/* Customization preview */}
        {item.customization && (item.customization.businessName || item.customization.logoType) && (
          <View style={styles.customizationRow}>
            <Ionicons name="settings-outline" size={14} color={colors.textMuted} />
            <Text style={styles.customizationText} numberOfLines={1}>
              {item.customization.businessName || item.customization.logoType}
              {item.customization.color && ` - ${item.customization.color}`}
            </Text>
          </View>
        )}
      </Card>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      {!hideHeader && (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Customer Designs</Text>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by email, design name..."
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
      <View style={styles.filtersScroll}>
        <StatusFilterChip status={null} label="All" />
        <StatusFilterChip status="PENDING" label="Pending" />
        <StatusFilterChip status="IN_PROGRESS" label="In Progress" />
        <StatusFilterChip status="COMPLETED" label="Completed" />
        <StatusFilterChip status="ARCHIVED" label="Archived" />
      </View>

      <FlatList
        data={designs}
        renderItem={renderDesign}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name="brush-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>No designs found</Text>
              <Text style={styles.emptySubtext}>Customer design files will appear here</Text>
            </View>
          ) : null
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    padding: spacing.sm,
    marginRight: spacing.sm,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
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
  filtersScroll: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  filterChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
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
  designCard: {
    marginBottom: spacing.md,
  },
  designHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  designInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  designName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  designDate: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  previewImage: {
    width: '100%',
    height: 120,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceHover,
  },
  previewPlaceholder: {
    width: '100%',
    height: 80,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceHover,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewPlaceholderText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  customerInfo: {
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    flex: 1,
  },
  specRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexWrap: 'wrap',
  },
  spec: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  specLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  specValue: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  customizationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  customizationText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    flex: 1,
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
