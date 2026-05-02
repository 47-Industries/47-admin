import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, TextInput, ActivityIndicator, ScrollView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { api } from '../../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme'

interface Entry {
  id: string
  email: string
  name: string | null
  useCase: string | null
  currentStack: string | null
  source: string | null
  status: string
  createdAt: string
}

const STATUSES = ['ALL', 'PENDING', 'CONFIRMED', 'INVITED', 'ACTIVATED', 'DECLINED']

export function LearnWaitlistScreen() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await api.getLearnWaitlist({
        search: search || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      })
      setEntries(data.entries || [])
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
      await api.updateLearnWaitlist(id, { status })
      setEntries((rows) => rows.map((r) => (r.id === id ? { ...r, status } : r)))
    } catch (e) {
      console.error(e)
    }
  }

  function badgeVariant(s: string): 'default' | 'success' | 'warning' | 'error' | 'primary' {
    if (s === 'CONFIRMED' || s === 'ACTIVATED') return 'success'
    if (s === 'PENDING') return 'primary'
    if (s === 'INVITED') return 'warning'
    if (s === 'DECLINED') return 'error'
    return 'default'
  }

  const renderItem = ({ item }: { item: Entry }) => {
    const isOpen = expanded === item.id
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={() => setExpanded(isOpen ? null : item.id)}>
        <Card style={styles.row}>
          <View style={styles.rowHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.email}>{item.email}</Text>
              {item.name ? <Text style={styles.name}>{item.name}</Text> : null}
            </View>
            <Badge text={item.status} variant={badgeVariant(item.status)} />
          </View>
          {isOpen && (
            <View style={styles.expanded}>
              {item.useCase ? (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Use case</Text>
                  <Text style={styles.fieldValue}>{item.useCase}</Text>
                </View>
              ) : null}
              {item.currentStack ? (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Current stack</Text>
                  <Text style={styles.fieldValue}>{item.currentStack}</Text>
                </View>
              ) : null}
              <View style={styles.actions}>
                {item.status !== 'INVITED' && item.status !== 'ACTIVATED' && (
                  <TouchableOpacity style={styles.actionBtn} onPress={() => changeStatus(item.id, 'INVITED')}>
                    <Text style={styles.actionText}>Mark invited</Text>
                  </TouchableOpacity>
                )}
                {item.status !== 'ACTIVATED' && (
                  <TouchableOpacity style={styles.actionBtn} onPress={() => changeStatus(item.id, 'ACTIVATED')}>
                    <Text style={styles.actionText}>Mark activated</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.metaText}>Joined: {new Date(item.createdAt).toLocaleDateString()}</Text>
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
          placeholder="Search email, name, or use case..."
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
            <Text style={[styles.filterText, statusFilter === s && styles.filterTextActive]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['3xl'] }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={colors.primary} />}
          ListEmptyComponent={<Text style={styles.empty}>No waitlist entries.</Text>}
        />
      )}
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
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  email: { fontSize: fontSize.base, color: colors.text, fontWeight: fontWeight.medium as any },
  name: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  expanded: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.md },
  field: {},
  fieldLabel: { fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, fontWeight: fontWeight.semibold as any },
  fieldValue: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  actionBtn: { backgroundColor: colors.primaryBg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  actionText: { color: colors.primary, fontSize: fontSize.xs, fontWeight: fontWeight.semibold as any },
  metaText: { fontSize: fontSize.xs, color: colors.textMuted },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing['3xl'] },
})
