import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { api } from '../../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme'

interface Lead {
  id: string
  leadNumber: string
  businessName: string
  contactName: string
  email: string
  phone?: string
  status: string
  interests?: string[]
  estimatedBudget?: string
  createdAt: string
  partner?: {
    id: string
    name: string
    partnerNumber: string
  }
}

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'error' | 'primary'> = {
  NEW: 'primary',
  CONTACTED: 'warning',
  QUALIFIED: 'success',
  PROPOSAL: 'primary',
  NEGOTIATION: 'warning',
  WON: 'success',
  LOST: 'error',
  CONVERTED: 'success',
  STALE: 'default',
}

const STATUS_FILTERS = ['ALL', 'NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST']

export function PartnerLeadsScreen({ navigation, hideHeader }: { navigation: any; hideHeader?: boolean }) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const fetchLeads = useCallback(async () => {
    try {
      const data = await api.getAdminLeads({
        search: search || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      })
      setLeads(data.leads || [])
    } catch (error) {
      console.error('Failed to fetch leads:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [search, statusFilter])

  useEffect(() => {
    setLoading(true)
    fetchLeads()
  }, [fetchLeads])

  const onRefresh = () => {
    setRefreshing(true)
    fetchLeads()
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const renderLead = ({ item }: { item: Lead }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('PartnerLeadDetail', { id: item.id })}
      activeOpacity={0.7}
    >
      <Card style={styles.leadCard}>
        <View style={styles.leadHeader}>
          <View style={styles.leadInfo}>
            <Text style={styles.leadName}>{item.businessName}</Text>
            <Text style={styles.leadNumber}>#{item.leadNumber}</Text>
          </View>
          <Badge text={item.status} variant={statusColors[item.status] || 'default'} />
        </View>

        <View style={styles.leadDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="person-outline" size={14} color={colors.textMuted} />
            <Text style={styles.detailText}>{item.contactName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="mail-outline" size={14} color={colors.textMuted} />
            <Text style={styles.detailText}>{item.email}</Text>
          </View>
          {item.phone && (
            <View style={styles.detailRow}>
              <Ionicons name="call-outline" size={14} color={colors.textMuted} />
              <Text style={styles.detailText}>{item.phone}</Text>
            </View>
          )}
        </View>

        {item.interests && item.interests.length > 0 && (
          <View style={styles.interestsRow}>
            {item.interests.slice(0, 3).map((interest, index) => (
              <View key={index} style={styles.interestTag}>
                <Text style={styles.interestText}>{interest.replace(/_/g, ' ')}</Text>
              </View>
            ))}
            {item.interests.length > 3 && (
              <View style={styles.interestTag}>
                <Text style={styles.interestText}>+{item.interests.length - 3}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.leadFooter}>
          <View style={styles.partnerInfo}>
            {item.partner && (
              <>
                <Ionicons name="people-outline" size={14} color={colors.textMuted} />
                <Text style={styles.partnerText}>{item.partner.name}</Text>
              </>
            )}
          </View>
          <View style={styles.dateInfo}>
            <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  )

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={20} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search leads..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContainer}
      >
        {STATUS_FILTERS.map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterPill,
              statusFilter === status && styles.filterPillActive,
            ]}
            onPress={() => setStatusFilter(status)}
          >
            <Text
              style={[
                styles.filterText,
                statusFilter === status && styles.filterTextActive,
              ]}
            >
              {status}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )

  if (loading && leads.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      {!hideHeader && (
        <View style={styles.header}>
          <TouchableOpacity style={styles.backIcon} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Partner Leads</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('NewPartnerLead')}
          >
            <Ionicons name="add" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={leads}
        renderItem={renderLead}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No leads found</Text>
          </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
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
  addButton: {
    padding: spacing.sm,
  },
  headerContainer: {
    paddingBottom: spacing.md,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.lg,
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
  filterScroll: {
    marginTop: spacing.md,
  },
  filterContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  filterTextActive: {
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  leadCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  leadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  leadInfo: {
    flex: 1,
  },
  leadName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  leadNumber: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  leadDetails: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  interestsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  interestTag: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  interestText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    textTransform: 'capitalize',
  },
  leadFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  partnerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  partnerText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dateText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
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
