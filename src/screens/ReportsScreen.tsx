import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Dimensions } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../components/Card'
import { api } from '../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme'

const { width } = Dimensions.get('window')

type ReportType = 'sales' | 'customers' | 'inventory'
type TimeRange = '7d' | '30d' | '90d' | '365d'

export default function ReportsScreen({ navigation, hideHeader }: { navigation: any; hideHeader?: boolean }) {
  const [activeReport, setActiveReport] = useState<ReportType>('sales')
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [salesData, setSalesData] = useState<any>(null)
  const [customerData, setCustomerData] = useState<any>(null)
  const [inventoryData, setInventoryData] = useState<any>(null)

  const fetchData = async () => {
    try {
      if (activeReport === 'sales') {
        const data = await api.getSalesReport({ range: timeRange })
        setSalesData(data)
      } else if (activeReport === 'customers') {
        const data = await api.getCustomerReport({ range: timeRange })
        setCustomerData(data)
      } else {
        const data = await api.getInventoryReport()
        setInventoryData(data)
      }
    } catch (error) {
      console.error('Failed to fetch report:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    fetchData()
  }, [activeReport, timeRange])

  const onRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount || 0)
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num?.toString() || '0'
  }

  const formatPercent = (num: number) => {
    return `${num?.toFixed(1) || 0}%`
  }

  const renderSalesReport = () => (
    <>
      {/* Key Metrics */}
      <View style={styles.metricsGrid}>
        <Card style={styles.metricCard}>
          <View style={[styles.metricIcon, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
            <Ionicons name="cash-outline" size={20} color={colors.success} />
          </View>
          <Text style={styles.metricValue}>{formatCurrency(salesData?.totalRevenue || 0)}</Text>
          <Text style={styles.metricLabel}>Total Revenue</Text>
        </Card>
        <Card style={styles.metricCard}>
          <View style={[styles.metricIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
            <Ionicons name="receipt-outline" size={20} color={colors.primary} />
          </View>
          <Text style={styles.metricValue}>{salesData?.totalOrders || 0}</Text>
          <Text style={styles.metricLabel}>Total Orders</Text>
        </Card>
        <Card style={styles.metricCard}>
          <View style={[styles.metricIcon, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
            <Ionicons name="trending-up-outline" size={20} color="#a855f7" />
          </View>
          <Text style={styles.metricValue}>{formatCurrency(salesData?.avgOrderValue || 0)}</Text>
          <Text style={styles.metricLabel}>Avg Order Value</Text>
        </Card>
        <Card style={styles.metricCard}>
          <View style={[styles.metricIcon, { backgroundColor: 'rgba(251, 191, 36, 0.15)' }]}>
            <Ionicons name="refresh-outline" size={20} color={colors.warning} />
          </View>
          <Text style={styles.metricValue}>{formatCurrency(salesData?.refunds || 0)}</Text>
          <Text style={styles.metricLabel}>Refunds</Text>
        </Card>
      </View>

      {/* Top Products */}
      {salesData?.topProducts?.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Top Products</Text>
          <Card style={styles.listCard}>
            {salesData.topProducts.slice(0, 5).map((product: any, index: number) => (
              <View key={product.id || index} style={[styles.listItem, index > 0 && styles.listItemBorder]}>
                <Text style={styles.listRank}>#{index + 1}</Text>
                <View style={styles.listInfo}>
                  <Text style={styles.listName} numberOfLines={1}>{product.name}</Text>
                  <Text style={styles.listSubtext}>{product.sales} sold</Text>
                </View>
                <Text style={styles.listValue}>{formatCurrency(product.revenue)}</Text>
              </View>
            ))}
          </Card>
        </>
      )}

      {/* Revenue by Category */}
      {salesData?.revenueByCategory?.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Revenue by Category</Text>
          <Card style={styles.listCard}>
            {salesData.revenueByCategory.map((cat: any, index: number) => (
              <View key={cat.category || index} style={[styles.listItem, index > 0 && styles.listItemBorder]}>
                <View style={styles.listInfo}>
                  <Text style={styles.listName}>{cat.category}</Text>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${cat.percentage || 0}%` }]} />
                  </View>
                </View>
                <View style={styles.listValueColumn}>
                  <Text style={styles.listValue}>{formatCurrency(cat.revenue)}</Text>
                  <Text style={styles.listSubtext}>{cat.percentage?.toFixed(1)}%</Text>
                </View>
              </View>
            ))}
          </Card>
        </>
      )}
    </>
  )

  const renderCustomerReport = () => (
    <>
      {/* Key Metrics */}
      <View style={styles.metricsGrid}>
        <Card style={styles.metricCard}>
          <View style={[styles.metricIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
            <Ionicons name="people-outline" size={20} color={colors.primary} />
          </View>
          <Text style={styles.metricValue}>{formatNumber(customerData?.totalCustomers || 0)}</Text>
          <Text style={styles.metricLabel}>Total Customers</Text>
        </Card>
        <Card style={styles.metricCard}>
          <View style={[styles.metricIcon, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
            <Ionicons name="person-add-outline" size={20} color={colors.success} />
          </View>
          <Text style={styles.metricValue}>{customerData?.newCustomers || 0}</Text>
          <Text style={styles.metricLabel}>New Customers</Text>
        </Card>
        <Card style={styles.metricCard}>
          <View style={[styles.metricIcon, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
            <Ionicons name="repeat-outline" size={20} color="#a855f7" />
          </View>
          <Text style={styles.metricValue}>{customerData?.repeatCustomers || 0}</Text>
          <Text style={styles.metricLabel}>Repeat Customers</Text>
        </Card>
        <Card style={styles.metricCard}>
          <View style={[styles.metricIcon, { backgroundColor: 'rgba(251, 191, 36, 0.15)' }]}>
            <Ionicons name="analytics-outline" size={20} color={colors.warning} />
          </View>
          <Text style={styles.metricValue}>{formatPercent(customerData?.retentionRate || 0)}</Text>
          <Text style={styles.metricLabel}>Retention Rate</Text>
        </Card>
      </View>

      {/* Additional Stats */}
      <Text style={styles.sectionTitle}>Customer Value</Text>
      <Card style={styles.statsCard}>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Avg Lifetime Value</Text>
          <Text style={styles.statValue}>{formatCurrency(customerData?.avgLifetimeValue || 0)}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Avg Orders per Customer</Text>
          <Text style={styles.statValue}>{customerData?.avgOrdersPerCustomer?.toFixed(1) || 0}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Customer Growth</Text>
          <Text style={[styles.statValue, { color: customerData?.customerGrowth >= 0 ? colors.success : colors.error }]}>
            {customerData?.customerGrowth >= 0 ? '+' : ''}{formatPercent(customerData?.customerGrowth || 0)}
          </Text>
        </View>
      </Card>

      {/* Top Customers */}
      {customerData?.topCustomers?.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Top Customers</Text>
          <Card style={styles.listCard}>
            {customerData.topCustomers.slice(0, 5).map((customer: any, index: number) => (
              <View key={customer.id || index} style={[styles.listItem, index > 0 && styles.listItemBorder]}>
                <Text style={styles.listRank}>#{index + 1}</Text>
                <View style={styles.listInfo}>
                  <Text style={styles.listName} numberOfLines={1}>{customer.name || customer.email}</Text>
                  <Text style={styles.listSubtext}>{customer.ordersCount} orders</Text>
                </View>
                <Text style={styles.listValue}>{formatCurrency(customer.totalSpent)}</Text>
              </View>
            ))}
          </Card>
        </>
      )}
    </>
  )

  const renderInventoryReport = () => (
    <>
      {/* Key Metrics */}
      <View style={styles.metricsGrid}>
        <Card style={styles.metricCard}>
          <View style={[styles.metricIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
            <Ionicons name="cube-outline" size={20} color={colors.primary} />
          </View>
          <Text style={styles.metricValue}>{inventoryData?.totalProducts || 0}</Text>
          <Text style={styles.metricLabel}>Total Products</Text>
        </Card>
        <Card style={styles.metricCard}>
          <View style={[styles.metricIcon, { backgroundColor: 'rgba(251, 191, 36, 0.15)' }]}>
            <Ionicons name="warning-outline" size={20} color={colors.warning} />
          </View>
          <Text style={styles.metricValue}>{inventoryData?.lowStockCount || 0}</Text>
          <Text style={styles.metricLabel}>Low Stock</Text>
        </Card>
        <Card style={styles.metricCard}>
          <View style={[styles.metricIcon, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
            <Ionicons name="alert-circle-outline" size={20} color={colors.error} />
          </View>
          <Text style={styles.metricValue}>{inventoryData?.outOfStockCount || 0}</Text>
          <Text style={styles.metricLabel}>Out of Stock</Text>
        </Card>
        <Card style={styles.metricCard}>
          <View style={[styles.metricIcon, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
            <Ionicons name="cash-outline" size={20} color={colors.success} />
          </View>
          <Text style={styles.metricValue}>{formatCurrency(inventoryData?.inventoryValue || 0)}</Text>
          <Text style={styles.metricLabel}>Inventory Value</Text>
        </Card>
      </View>

      {/* Low Stock Items */}
      {inventoryData?.lowStockItems?.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Low Stock Items</Text>
          <Card style={styles.listCard}>
            {inventoryData.lowStockItems.slice(0, 10).map((item: any, index: number) => (
              <View key={item.id || index} style={[styles.listItem, index > 0 && styles.listItemBorder]}>
                <View style={[styles.stockIndicator, { backgroundColor: item.stock === 0 ? colors.error : colors.warning }]} />
                <View style={styles.listInfo}>
                  <Text style={styles.listName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.listSubtext}>{item.sku || 'No SKU'}</Text>
                </View>
                <View style={styles.listValueColumn}>
                  <Text style={[styles.listValue, { color: item.stock === 0 ? colors.error : colors.warning }]}>
                    {item.stock} left
                  </Text>
                  {item.reorderLevel && (
                    <Text style={styles.listSubtext}>Min: {item.reorderLevel}</Text>
                  )}
                </View>
              </View>
            ))}
          </Card>
        </>
      )}

      {/* Inventory by Category */}
      {inventoryData?.inventoryByCategory?.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Stock by Category</Text>
          <Card style={styles.listCard}>
            {inventoryData.inventoryByCategory.map((cat: any, index: number) => (
              <View key={cat.category || index} style={[styles.listItem, index > 0 && styles.listItemBorder]}>
                <View style={styles.listInfo}>
                  <Text style={styles.listName}>{cat.category}</Text>
                  <Text style={styles.listSubtext}>{cat.productCount} products</Text>
                </View>
                <View style={styles.listValueColumn}>
                  <Text style={styles.listValue}>{cat.totalStock} units</Text>
                  <Text style={styles.listSubtext}>{formatCurrency(cat.value)}</Text>
                </View>
              </View>
            ))}
          </Card>
        </>
      )}
    </>
  )

  return (
    <View style={styles.container}>
      {!hideHeader && (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Reports</Text>
        </View>
      )}

      {/* Report Type Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeReport === 'sales' && styles.tabActive]}
          onPress={() => setActiveReport('sales')}
        >
          <Ionicons
            name="trending-up-outline"
            size={18}
            color={activeReport === 'sales' ? colors.text : colors.textMuted}
          />
          <Text style={[styles.tabText, activeReport === 'sales' && styles.tabTextActive]}>Sales</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeReport === 'customers' && styles.tabActive]}
          onPress={() => setActiveReport('customers')}
        >
          <Ionicons
            name="people-outline"
            size={18}
            color={activeReport === 'customers' ? colors.text : colors.textMuted}
          />
          <Text style={[styles.tabText, activeReport === 'customers' && styles.tabTextActive]}>Customers</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeReport === 'inventory' && styles.tabActive]}
          onPress={() => setActiveReport('inventory')}
        >
          <Ionicons
            name="cube-outline"
            size={18}
            color={activeReport === 'inventory' ? colors.text : colors.textMuted}
          />
          <Text style={[styles.tabText, activeReport === 'inventory' && styles.tabTextActive]}>Inventory</Text>
        </TouchableOpacity>
      </View>

      {/* Time Range Selector (not for inventory) */}
      {activeReport !== 'inventory' && (
        <View style={styles.timeSelector}>
          {(['7d', '30d', '90d', '365d'] as TimeRange[]).map((range) => (
            <TouchableOpacity
              key={range}
              style={[styles.timeButton, timeRange === range && styles.timeButtonActive]}
              onPress={() => setTimeRange(range)}
            >
              <Text style={[styles.timeButtonText, timeRange === range && styles.timeButtonTextActive]}>
                {range === '365d' ? '1Y' : range.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {activeReport === 'sales' && renderSalesReport()}
        {activeReport === 'customers' && renderCustomerReport()}
        {activeReport === 'inventory' && renderInventoryReport()}
        <View style={{ height: 40 }} />
      </ScrollView>
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
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
  },
  tabTextActive: {
    color: colors.text,
  },
  timeSelector: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  timeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timeButtonText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
  },
  timeButtonTextActive: {
    color: colors.text,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  metricCard: {
    width: (width - spacing.lg * 2 - spacing.md) / 2,
    padding: spacing.lg,
  },
  metricIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  metricValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  metricLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  listCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  listItemBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  listRank: {
    width: 30,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
  },
  listInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  listName: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
  },
  listSubtext: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  listValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.success,
  },
  listValueColumn: {
    alignItems: 'flex-end',
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.surfaceHover,
    borderRadius: 3,
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  statsCard: {
    marginBottom: spacing.lg,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  statValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  stockIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.md,
  },
})
