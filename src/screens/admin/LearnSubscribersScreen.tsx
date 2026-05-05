import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, TextInput, ActivityIndicator, ScrollView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { api } from '../../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme'

interface Subscriber {
  id: string
  email: string
  name: string | null
  source: string | null
  status: string
  confirmedAt: string | null
  createdAt: string
  bounceCount?: number
  complaintCount?: number
  suppressedAt?: string | null
  suppressionReason?: string | null
}

const STATUS_FILTERS = ['ALL', 'PENDING', 'CONFIRMED', 'UNSUBSCRIBED', 'BOUNCED', 'SUPPRESSED']

export function LearnSubscribersScreen() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const load = useCallback(async () => {
    try {
      const data = await api.getLearnSubscribers({
        search: search || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      })
      setSubscribers(data.subscribers || [])
    } catch (e) {
      console.error('Failed to load subscribers', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [search, statusFilter])

  useEffect(() => { setLoading(true); load() }, [load])

  function badgeVariant(s: string): 'default' | 'success' | 'warning' | 'error' | 'primary' {
    if (s === 'CONFIRMED') return 'success'
    if (s === 'PENDING') return 'primary'
    if (s === 'UNSUBSCRIBED' || s === 'BOUNCED') return 'error'
    return 'default'
  }

  async function changeStatus(id: string, status: string) {
    try {
      await api.updateLearnSubscriber(id, { status })
      setSubscribers((rows) => rows.map((r) => (r.id === id ? { ...r, status } : r)))
    } catch (e) {
      console.error(e)
    }
  }

  const renderItem = ({ item }: { item: Subscriber }) => (
    <Card style={styles.row}>
      <View style={styles.rowHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.email}>{item.email}</Text>
          {item.name ? <Text style={styles.name}>{item.name}</Text> : null}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Badge text={item.status} variant={badgeVariant(item.status)} />
          {item.suppressedAt ? (
            <Badge text="SUPPRESSED" variant="error" />
          ) : (item.bounceCount ?? 0) > 0 ? (
            <Badge text={`${item.bounceCount} bounce${item.bounceCount === 1 ? '' : 's'}`} variant="warning" />
          ) : null}
        </View>
      </View>
      <View style={styles.meta}>
        <Text style={styles.metaText}>Source: {item.source || '—'}</Text>
        <Text style={styles.metaText}>Joined: {new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>
      {item.suppressionReason ? (
        <Text style={[styles.metaText, { color: colors.error }]}>Reason: {item.suppressionReason}</Text>
      ) : null}
      {item.status === 'PENDING' && (
        <TouchableOpacity style={styles.actionBtn} onPress={() => changeStatus(item.id, 'CONFIRMED')}>
          <Text style={styles.actionText}>Mark confirmed</Text>
        </TouchableOpacity>
      )}
    </Card>
  )

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search email or name..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {STATUS_FILTERS.map((s) => (
          <TouchableOpacity
            key={s}
            onPress={() => setStatusFilter(s)}
            style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, statusFilter === s && styles.filterTextActive]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={subscribers}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['3xl'] }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={colors.primary} />}
          ListEmptyComponent={<Text style={styles.empty}>No subscribers match those filters.</Text>}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    margin: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: fontSize.base },
  filterRow: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.md },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.semibold as any },
  filterTextActive: { color: '#fff' },
  row: { marginBottom: spacing.sm },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  email: { fontSize: fontSize.base, color: colors.text, fontWeight: fontWeight.medium as any },
  name: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  metaText: { fontSize: fontSize.xs, color: colors.textMuted },
  actionBtn: { marginTop: spacing.md, alignSelf: 'flex-start', backgroundColor: colors.primaryBg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  actionText: { color: colors.primary, fontSize: fontSize.xs, fontWeight: fontWeight.semibold as any },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing['3xl'] },
})
