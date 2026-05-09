import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, TextInput, ActivityIndicator, ScrollView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { api } from '../../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme'

interface Lead {
  id: string
  email: string
  name: string
  businessName: string | null
  phone: string | null
  useCase: string
  budget: string | null
  timeline: string | null
  status: string
  tier: string | null
  quotedAmount: string | null
  depositPaid: boolean
  notes: string | null
  createdAt: string
}

const STATUSES = ['ALL', 'NEW', 'CONTACTED', 'QUALIFIED', 'BOOKED', 'IN_PROGRESS', 'CLOSED_WON', 'CLOSED_LOST']

export function LearnBmpLeadsScreen() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await api.getLearnBmpLeads({
        search: search || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      })
      setLeads(data.leads || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [search, statusFilter])

  useEffect(() => { setLoading(true); load() }, [load])

  async function changeStatus(id: string, status: string) {
    try {
      await api.updateLearnBmpLead(id, { status })
      setLeads((rows) => rows.map((r) => (r.id === id ? { ...r, status } : r)))
    } catch (e) {
      console.error(e)
    }
  }

  function badgeVariant(s: string): 'default' | 'success' | 'warning' | 'error' | 'primary' {
    if (s === 'CLOSED_WON') return 'success'
    if (s === 'NEW') return 'primary'
    if (s === 'CONTACTED' || s === 'QUALIFIED' || s === 'BOOKED' || s === 'IN_PROGRESS') return 'warning'
    if (s === 'CLOSED_LOST') return 'error'
    return 'default'
  }

  const renderItem = ({ item }: { item: Lead }) => {
    const isOpen = expanded === item.id
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={() => setExpanded(isOpen ? null : item.id)}>
        <Card style={styles.row}>
          <View style={styles.rowHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}{item.businessName ? ` · ${item.businessName}` : ''}</Text>
              <Text style={styles.email}>{item.email}</Text>
            </View>
            <View style={styles.statusCol}>
              <Badge text={item.status} variant={badgeVariant(item.status)} />
              {item.tier && (
                <Text style={styles.tierText}>{item.tier.toUpperCase()}</Text>
              )}
              {item.depositPaid && (
                <View style={styles.depositBadge}>
                  <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                  <Text style={styles.depositText}>Deposit paid</Text>
                </View>
              )}
            </View>
          </View>

          {isOpen && (
            <View style={styles.expanded}>
              {item.tier ? <Field label="Tier" value={item.tier.charAt(0).toUpperCase() + item.tier.slice(1)} /> : null}
              {item.quotedAmount ? <Field label="Quoted deposit" value={`$${Number(item.quotedAmount).toLocaleString()}`} /> : null}
              {item.phone ? <Field label="Phone" value={item.phone} /> : null}
              {item.budget ? <Field label="Budget" value={item.budget} /> : null}
              {item.timeline ? <Field label="Timeline" value={item.timeline} /> : null}
              <Field label="Use case" value={item.useCase} />
              {item.notes ? <Field label="Internal notes" value={item.notes} /> : null}

              <View style={styles.actions}>
                {item.status === 'NEW' && (
                  <TouchableOpacity style={styles.actionBtn} onPress={() => changeStatus(item.id, 'CONTACTED')}>
                    <Text style={styles.actionText}>Mark contacted</Text>
                  </TouchableOpacity>
                )}
                {item.status === 'CONTACTED' && (
                  <TouchableOpacity style={styles.actionBtn} onPress={() => changeStatus(item.id, 'QUALIFIED')}>
                    <Text style={styles.actionText}>Mark qualified</Text>
                  </TouchableOpacity>
                )}
                {(item.status === 'QUALIFIED' || item.status === 'BOOKED') && (
                  <TouchableOpacity style={styles.actionBtn} onPress={() => changeStatus(item.id, 'CLOSED_WON')}>
                    <Text style={styles.actionText}>Close — won</Text>
                  </TouchableOpacity>
                )}
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
          placeholder="Search name, email, business..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {STATUSES.map((s) => (
          <TouchableOpacity
            key={s}
            onPress={() => setStatusFilter(s)}
            style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, statusFilter === s && styles.filterTextActive]}>{s.replace('_', ' ')}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={leads}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['3xl'] }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={colors.primary} />}
          ListEmptyComponent={<Text style={styles.empty}>No leads match those filters.</Text>}
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
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.semibold as any },
  filterTextActive: { color: '#fff' },
  row: { marginBottom: spacing.sm },
  rowHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  name: { fontSize: fontSize.base, color: colors.text, fontWeight: fontWeight.medium as any },
  email: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  statusCol: { alignItems: 'flex-end', gap: 6 },
  depositBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  depositText: { fontSize: 10, color: colors.success, fontWeight: fontWeight.semibold as any },
  tierText: { fontSize: 9, color: '#a78bfa', fontWeight: fontWeight.bold as any, letterSpacing: 0.5 },
  expanded: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.md },
  fieldLabel: { fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, fontWeight: fontWeight.semibold as any },
  fieldValue: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  actionBtn: { backgroundColor: colors.primaryBg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  actionText: { color: colors.primary, fontSize: fontSize.xs, fontWeight: fontWeight.semibold as any },
  metaText: { fontSize: fontSize.xs, color: colors.textMuted },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing['3xl'] },
})
