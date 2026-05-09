import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  TextInput, ActivityIndicator, ScrollView,
} from 'react-native'
import { api } from '../../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme'

interface EmailLog {
  id: string
  resendId: string | null
  to: string
  subject: string
  emailType: string
  status: string
  openedAt: string | null
  firstClickAt: string | null
  openCount: number
  clickCount: number
  bouncedAt: string | null
  sentAt: string
}

interface Stats {
  totalSent: number
  totalDelivered: number
  totalOpened: number
  totalBounced: number
}

const EMAIL_TYPES = ['all', 'bmp_confirmation', 'drip_1', 'drip_2', 'drip_3', 'broadcast', 'magic_link', 'kit_delivery', 'inquiry_confirm', 'quote', 'portal_link', 'invite', 'generic']
const STATUSES = ['all', 'sent', 'delivered', 'opened', 'bounced', 'complained']

function typeLabel(t: string) {
  const map: Record<string, string> = {
    bmp_confirmation: 'BMP Confirm',
    drip_1: 'Drip Day 2',
    drip_2: 'Drip Day 5',
    drip_3: 'Drip Day 9',
    broadcast: 'Broadcast',
    magic_link: 'Magic Link',
    kit_delivery: 'Kit',
    inquiry_confirm: 'Inquiry',
    quote: 'Quote',
    portal_link: 'Portal',
    invite: 'Invite',
    generic: 'Other',
  }
  return map[t] ?? t
}

function statusColor(s: string): string {
  switch (s) {
    case 'opened': return colors.success
    case 'delivered': return colors.primary
    case 'bounced': return colors.error
    case 'complained': return colors.warning
    default: return colors.textMuted
  }
}

function typeColor(t: string): string {
  if (t.startsWith('drip') || t === 'bmp_confirmation') return '#a78bfa'
  if (t === 'broadcast') return colors.primary
  if (t === 'kit_delivery') return colors.success
  if (t === 'magic_link') return colors.warning
  return colors.textMuted
}

function fmt(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function EmailActivityScreen() {
  const [logs, setLogs] = useState<EmailLog[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [emailType, setEmailType] = useState('all')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const load = useCallback(async (reset = true) => {
    const currentPage = reset ? 1 : page + 1
    try {
      const data = await api.getEmailActivity({
        page: currentPage,
        emailType: emailType !== 'all' ? emailType : undefined,
        status: status !== 'all' ? status : undefined,
        search: search || undefined,
      })
      if (reset) {
        setLogs(data.logs)
        setStats(data.stats)
        setPage(1)
      } else {
        setLogs(prev => [...prev, ...data.logs])
        setPage(currentPage)
      }
      setHasMore(currentPage < data.pagination.pages)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
      setLoadingMore(false)
    }
  }, [emailType, status, search, page])

  useEffect(() => { setLoading(true); load(true) }, [emailType, status])

  const loadMore = () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    load(false)
  }

  const renderItem = ({ item }: { item: EmailLog }) => (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <Text style={styles.to} numberOfLines={1}>{item.to}</Text>
        <View style={[styles.badge, { backgroundColor: statusColor(item.status) + '25' }]}>
          <Text style={[styles.badgeText, { color: statusColor(item.status) }]}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.subject} numberOfLines={1}>{item.subject}</Text>
      <View style={styles.rowBottom}>
        <View style={[styles.typeBadge, { backgroundColor: typeColor(item.emailType) + '20' }]}>
          <Text style={[styles.typeText, { color: typeColor(item.emailType) }]}>{typeLabel(item.emailType)}</Text>
        </View>
        <Text style={styles.meta}>{fmt(item.sentAt)}</Text>
        {item.openedAt && <Text style={[styles.meta, { color: colors.success }]}>Opened {fmt(item.openedAt)}</Text>}
        {(item.openCount > 0 || item.clickCount > 0) && (
          <Text style={styles.meta}>{item.openCount} opens · {item.clickCount} clicks</Text>
        )}
      </View>
    </View>
  )

  const openRate = stats && stats.totalSent > 0 ? Math.round((stats.totalOpened / stats.totalSent) * 100) : 0

  return (
    <View style={styles.container}>
      {/* Stats strip */}
      {stats && (
        <View style={styles.statsRow}>
          {[
            { label: 'Sent', value: stats.totalSent.toLocaleString() },
            { label: 'Delivered', value: stats.totalDelivered.toLocaleString() },
            { label: 'Opened', value: `${stats.totalOpened} (${openRate}%)` },
            { label: 'Bounced', value: stats.totalBounced.toLocaleString(), warn: stats.totalBounced > 0 },
          ].map(s => (
            <View key={s.label} style={styles.statCard}>
              <Text style={styles.statLabel}>{s.label}</Text>
              <Text style={[styles.statValue, s.warn && stats.totalBounced > 0 ? { color: colors.error } : {}]}>{s.value}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Search */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search email or subject..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => { setLoading(true); load(true) }}
          returnKeyType="search"
        />
      </View>

      {/* Type filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {EMAIL_TYPES.map(t => (
          <TouchableOpacity key={t} onPress={() => setEmailType(t)} style={[styles.chip, emailType === t && styles.chipActive]}>
            <Text style={[styles.chipText, emailType === t && styles.chipTextActive]}>{typeLabel(t) === t ? t.toUpperCase() : typeLabel(t)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Status filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.filterRow, { paddingTop: 0 }]}>
        {STATUSES.map(s => (
          <TouchableOpacity key={s} onPress={() => setStatus(s)} style={[styles.chip, status === s && styles.chipActive]}>
            <Text style={[styles.chipText, status === s && styles.chipTextActive]}>{s === 'all' ? 'ALL STATUS' : s.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={logs}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['3xl'] }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true) }} tintColor={colors.primary} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : null}
          ListEmptyComponent={<Text style={styles.empty}>No emails match those filters.</Text>}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  statsRow: { flexDirection: 'row', padding: spacing.md, gap: spacing.sm },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.sm, borderWidth: 1, borderColor: colors.border },
  statLabel: { fontSize: 9, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, fontWeight: fontWeight.semibold as any },
  statValue: { fontSize: fontSize.sm, fontWeight: fontWeight.bold as any, color: colors.text },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, marginHorizontal: spacing.lg, marginBottom: spacing.sm, padding: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, color: colors.text, fontSize: fontSize.base },
  filterRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.semibold as any },
  chipTextActive: { color: '#fff' },
  row: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  to: { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary, marginRight: spacing.sm },
  subject: { fontSize: fontSize.base, color: colors.text, fontWeight: fontWeight.medium as any, marginBottom: 8 },
  rowBottom: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: fontWeight.bold as any },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  typeText: { fontSize: 10, fontWeight: fontWeight.bold as any },
  meta: { fontSize: 11, color: colors.textMuted },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing['3xl'] },
})
