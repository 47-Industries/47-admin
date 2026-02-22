import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { api } from '../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme'
import { EmptyState } from '../components/EmptyState'
import { ServiceInquiry } from '../types'

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'error' | 'primary'> = {
  PENDING: 'warning',
  CONTACTED: 'primary',
  QUOTED: 'primary',
  PROPOSAL_SENT: 'primary',
  NEGOTIATING: 'warning',
  ACCEPTED: 'success',
  IN_PROGRESS: 'primary',
  COMPLETED: 'success',
  DECLINED: 'error',
  CANCELLED: 'error',
}

export function InquiriesScreen({ navigation, hideHeader }: { navigation: any; hideHeader?: boolean }) {
  const [inquiries, setInquiries] = useState<ServiceInquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [search, setSearch] = useState('')

  const fetchInquiries = async (pageNum = 1, refresh = false) => {
    try {
      const data = await api.getInquiries({ page: pageNum, limit: 20, search: search || undefined })
      const newInquiries = data.inquiries || []

      if (refresh || pageNum === 1) {
        setInquiries(newInquiries)
      } else {
        setInquiries((prev) => [...prev, ...newInquiries])
      }

      setHasMore(newInquiries.length === 20)
      setPage(pageNum)
    } catch (error) {
      console.error('Failed to fetch inquiries:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    fetchInquiries(1, true)
  }, [search])

  const onRefresh = () => {
    setRefreshing(true)
    fetchInquiries(1, true)
  }

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchInquiries(page + 1)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return 'Today'
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return `${diffDays} days ago`
    }
    return date.toLocaleDateString()
  }

  const renderInquiry = ({ item }: { item: ServiceInquiry }) => (
    <TouchableOpacity onPress={() => navigation.navigate('InquiryDetail', { id: item.id })} activeOpacity={0.7}>
      <Card style={styles.inquiryCard}>
        <View style={styles.inquiryHeader}>
          <View style={styles.serviceType}>
            <Ionicons
              name={
                item.serviceType === 'CUSTOM_PC'
                  ? 'desktop-outline'
                  : item.serviceType === 'REPAIR'
                  ? 'construct-outline'
                  : 'settings-outline'
              }
              size={20}
              color={colors.primary}
            />
            <Text style={styles.serviceTypeText}>{item.serviceType?.replace('_', ' ') || 'Service'}</Text>
          </View>
          <Badge text={item.status} variant={statusColors[item.status] || 'default'} />
        </View>

        <View style={styles.inquiryContent}>
          <View style={styles.customerInfo}>
            <Ionicons name="person-outline" size={16} color={colors.textMuted} />
            <Text style={styles.customerName}>{item.name}</Text>
          </View>
          <View style={styles.customerInfo}>
            <Ionicons name="mail-outline" size={16} color={colors.textMuted} />
            <Text style={styles.customerEmail}>{item.email}</Text>
          </View>
          {item.phone && (
            <View style={styles.customerInfo}>
              <Ionicons name="call-outline" size={16} color={colors.textMuted} />
              <Text style={styles.customerPhone}>{item.phone}</Text>
            </View>
          )}
        </View>

        {item.message && (
          <Text style={styles.message} numberOfLines={2}>
            {item.message}
          </Text>
        )}

        <View style={styles.inquiryFooter}>
          <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
          {item.budget && <Text style={styles.budget}>Budget: ${item.budget}</Text>}
        </View>
      </Card>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      {!hideHeader && (
        <View style={styles.header}>
          <Text style={styles.title}>Service Inquiries</Text>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search inquiries..."
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

      <FlatList
        data={inquiries}
        renderItem={renderInquiry}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          !loading ? (
            <EmptyState icon="chatbubbles-outline" title="No inquiries yet" />
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
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxl,
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
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  inquiryCard: {
    marginBottom: spacing.md,
  },
  inquiryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  serviceType: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceTypeText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginLeft: spacing.sm,
    textTransform: 'capitalize',
  },
  inquiryContent: {
    marginBottom: spacing.md,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  customerName: {
    fontSize: fontSize.sm,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  customerEmail: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
  customerPhone: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
  message: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  inquiryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  date: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  budget: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.success,
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
