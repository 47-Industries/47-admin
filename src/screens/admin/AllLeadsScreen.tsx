import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, TextInput, ActivityIndicator, ScrollView, Linking,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { api } from '../../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme'

interface Lead {
  id: string
  referenceNumber: string
  leadType: string
  status: string
  source: string | null
  email: string
  name: string
  phone: string | null
  company: string | null
  tier: string | null
  serviceType: string | null
  quotedAmount: string | null
  estimatedCost: string | null
  depositPaid: boolean
  contactedAt: string | null
  bookedAt: string | null
  closedAt: string | null
  createdAt: string
  _count: { messages: number }
}

interface ApiResponse {
  leads: Lead[]
  pagination: { page: number; limit: number; total: number; pages: number }
  summary: { byType: Record<string, number>; byStatus: Record<string, number> }
}

const TYPE_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'BMP', label: 'BMP' },
  { value: 'SERVICE_WEB', label: 'Web' },
  { value: 'SERVICE_APP', label: 'App' },
  { value: 'SERVICE_AI', label: 'AI' },
  { value: 'SERVICE_CONSULTING', label: 'Consulting' },
  { value: 'CUSTOM_PRINT', label: 'Print' },
  { value: 'COLD_INBOUND', label: 'Cold' },
  { value: 'BRAND_DEAL', label: 'Brand' },
  { value: 'PRESS', label: 'Press' },
]

const STATUS_FILTERS = ['ALL', 'NEW', 'CONTACTED', 'QUALIFIED', 'QUOTED', 'BOOKED', 'IN_PROGRESS', 'CLOSED_WON', 'CLOSED_LOST']

const TYPE_LABEL: Record<string, string> = {
  BMP: 'BMP',
  SERVICE_WEB: 'WEB',
  SERVICE_APP: 'APP',
  SERVICE_AI: 'AI',
  SERVICE_CONSULTING: 'CON',
  SERVICE_CONTACT: 'CTC',
  SERVICE_OTHER: 'SVC',
  CUSTOM_PRINT: 'PRT',
  COLD_INBOUND: 'COLD',
  BRAND_DEAL: 'BRAND',
  PRESS: 'PRESS',
  PARTNER: 'PRT',
  GENERAL: 'GEN',
}

const TYPE_COLOR: Record<string, string> = {
  BMP: '#3b82f6',
  SERVICE_WEB: '#06b6d4',
  SERVICE_APP: '#0ea5e9',
  SERVICE_AI: '#8b5cf6',
  SERVICE_CONSULTING: '#a855f7',
  SERVICE_CONTACT: '#71717a',
  SERVICE_OTHER: '#71717a',
  CUSTOM_PRINT: '#f59e0b',
  COLD_INBOUND: '#c084fc',
  BRAND_DEAL: '#ec4899',
  PRESS: '#f97316',
  PARTNER: '#10b981',
  GENERAL: '#71717a',
}

const STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'QUOTED', 'PROPOSAL_SENT', 'NEGOTIATING', 'BOOKED', 'IN_PROGRESS', 'CLOSED_WON', 'CLOSED_LOST']

function badgeVariant(s: string): 'default' | 'success' | 'warning' | 'error' | 'primary' {
  if (s === 'CLOSED_WON') return 'success'
  if (s === 'NEW') return 'primary'
  if (s === 'CONTACTED' || s === 'QUALIFIED' || s === 'QUOTED' || s === 'PROPOSAL_SENT' || s === 'NEGOTIATING' || s === 'BOOKED' || s === 'IN_PROGRESS') return 'warning'
  if (s === 'CLOSED_LOST') return 'error'
  return 'default'
}

export function AllLeadsScreen() {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const out = await api.getLeads({
        leadType: typeFilter !== 'all' ? typeFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: search || undefined,
        limit: 100,
      })
      setData(out)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [search, statusFilter, typeFilter])

  useEffect(() => { setLoading(true); load() }, [load])

  async function changeStatus(id: string, status: string) {
    try {
      await api.updateLead(id, { status })
      setData((prev) => prev ? {
        ...prev,
        leads: prev.leads.map(l => l.id === id ? { ...l, status } : l),
      } : prev)
    } catch (e) {
      console.error(e)
    }
  }

  const renderItem = ({ item }: { item: Lead }) => {
    const isOpen = expanded === item.id
    const typeColor = TYPE_COLOR[item.leadType] || '#71717a'
    const money = item.quotedAmount ? `$${Number(item.quotedAmount).toLocaleString()}` : (item.estimatedCost ? `$${Number(item.estimatedCost).toLocaleString()}` : null)
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={() => setExpanded(isOpen ? null : item.id)}>
        <Card style={styles.row}>
          <View style={styles.rowHeader}>
            <View style={styles.typeTag}>
              <Text style={[styles.typeTagText, { color: typeColor }]}>{TYPE_LABEL[item.leadType] || item.leadType.slice(0, 4)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}{item.company ? ` · ${item.company}` : ''}</Text>
              <Text style={styles.email}>{item.email}</Text>
            </View>
            <View style={styles.statusCol}>
              <Badge text={item.status.replace(/_/g, ' ')} variant={badgeVariant(item.status)} />
              {money && <Text style={styles.moneyText}>{money}</Text>}
              {item.depositPaid && (
                <View style={styles.depositBadge}>
                  <Ionicons name="checkmark-circle" size={11} color={colors.success} />
                  <Text style={styles.depositText}>Paid</Text>
                </View>
              )}
            </View>
          </View>

          {isOpen && (
            <View style={styles.expanded}>
              <Field label="Reference" value={item.referenceNumber} />
              {item.tier && <Field label="Tier" value={item.tier.toUpperCase()} />}
              {item.serviceType && <Field label="Service Type" value={item.serviceType.replace(/_/g, ' ')} />}
              {item.source && <Field label="Source" value={item.source} />}
              {item.phone ? (
                <TouchableOpacity onPress={() => Linking.openURL(`tel:${item.phone}`)}>
                  <Text style={styles.fieldLabel}>Phone</Text>
                  <Text style={[styles.fieldValue, { color: colors.success }]}>{item.phone}</Text>
                </TouchableOpacity>
              ) : null}
              <Field label="Messages" value={`${item._count.messages} in thread`} />

              <View style={styles.actions}>
                {STATUSES.filter(s => s !== item.status).slice(0, 4).map(s => (
                  <TouchableOpacity key={s} style={styles.actionBtn} onPress={() => changeStatus(item.id, s)}>
                    <Text style={styles.actionText}>{s.replace(/_/g, ' ')}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.metaText}>Created: {new Date(item.createdAt).toLocaleDateString()}</Text>
            </View>
          )}
        </Card>
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search name, email, company, reference..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {TYPE_FILTERS.map(t => (
          <TouchableOpacity key={t.value} onPress={() => setTypeFilter(t.value)} style={[styles.filterChip, typeFilter === t.value && styles.filterChipActive]}>
            <Text style={[styles.filterText, typeFilter === t.value && styles.filterTextActive]}>
              {t.label}{data?.summary.byType[t.value] ? ` (${data.summary.byType[t.value]})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {STATUS_FILTERS.map(s => (
          <TouchableOpacity key={s} onPress={() => setStatusFilter(s)} style={[styles.filterChipSm, statusFilter === s && styles.filterChipActive]}>
            <Text style={[styles.filterTextSm, statusFilter === s && styles.filterTextActive]}>{s.replace(/_/g, ' ')}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={data?.leads || []}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['3xl'] }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={colors.primary} />}
          ListEmptyComponent={<Text style={styles.empty}>No leads match these filters.</Text>}
        />
      )}
    </View>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, margin: spacing.lg, padding: spacing.md,
    borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, gap: spacing.sm,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: fontSize.base },
  filterRow: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.md },
  filterChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 999,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  filterChipSm: {
    paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: 999,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.semibold as any },
  filterTextSm: { fontSize: 10, color: colors.textSecondary, fontWeight: fontWeight.semibold as any },
  filterTextActive: { color: '#fff' },
  row: { marginBottom: spacing.sm },
  rowHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  typeTag: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, minWidth: 38, alignItems: 'center' },
  typeTagText: { fontSize: 9, fontWeight: fontWeight.bold as any, letterSpacing: 0.5 },
  name: { fontSize: fontSize.base, color: colors.text, fontWeight: fontWeight.medium as any },
  email: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  statusCol: { alignItems: 'flex-end', gap: 4 },
  moneyText: { fontSize: 11, color: '#c8a84b', fontWeight: fontWeight.bold as any },
  depositBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  depositText: { fontSize: 9, color: colors.success, fontWeight: fontWeight.semibold as any },
  expanded: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.md },
  fieldLabel: { fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, fontWeight: fontWeight.semibold as any },
  fieldValue: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  actionBtn: { backgroundColor: colors.primaryBg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  actionText: { color: colors.primary, fontSize: fontSize.xs, fontWeight: fontWeight.semibold as any },
  metaText: { fontSize: fontSize.xs, color: colors.textMuted },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 40, fontSize: fontSize.sm },
})
