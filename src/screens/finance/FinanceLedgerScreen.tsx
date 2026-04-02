import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { api } from '../../services/api'
import { colors } from '../../theme'

interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  direction: 'in' | 'out'
  categoryLabel: string | null
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.abs(n))
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function FinanceLedgerScreen({ navigation }: { navigation: any }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const start = new Date(year, month, 1).toISOString()
      const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString()
      const data = await api.request<{ transactions: Transaction[] }>(
        `/admin/finance/transactions?start=${start}&end=${end}&limit=50`
      )
      setTransactions(data.transactions || [])
    } catch (e) {
      console.error(e)
    }
  }, [year, month])

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [load])

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const monthLabel = new Date(year, month, 1).toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Ledger</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Month Navigator */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={prevMonth} style={styles.navArrow}>
          <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <TouchableOpacity onPress={nextMonth} style={styles.navArrow}>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {transactions.length === 0 ? (
            <Text style={styles.emptyText}>No transactions for {monthLabel}.</Text>
          ) : (
            transactions.map(tx => (
              <View key={tx.id} style={styles.txRow}>
                <View style={styles.txLeft}>
                  <Text style={styles.txDate}>{fmtDate(tx.date)}</Text>
                  <Text style={styles.txDesc} numberOfLines={2}>{tx.description}</Text>
                  {tx.categoryLabel && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{tx.categoryLabel}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.txAmount, { color: tx.direction === 'in' ? colors.success : colors.error }]}>
                  {tx.direction === 'in' ? '+' : '-'}{fmt(tx.amount)}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#27272a',
  },
  navArrow: { padding: 8 },
  monthLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, paddingBottom: 40 },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 40 },
  txRow: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#27272a',
  },
  txLeft: { flex: 1, marginRight: 12 },
  txDate: { fontSize: 11, color: colors.textMuted, marginBottom: 2 },
  txDesc: { fontSize: 14, color: colors.text, fontWeight: '500' },
  badge: { marginTop: 4, alignSelf: 'flex-start', backgroundColor: '#27272a', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 10, color: colors.textSecondary, fontWeight: '600' },
  txAmount: { fontSize: 14, fontWeight: '700', marginTop: 2 },
})
