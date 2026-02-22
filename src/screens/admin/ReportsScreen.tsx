import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Linking,
  Share,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../../components/Card'
import { api } from '../../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme'

const { width } = Dimensions.get('window')

type ReportType = 'sales' | 'inventory' | 'customers'
type DatePreset = '7d' | '30d' | '90d' | 'year' | 'custom'

interface DateRange {
  preset: DatePreset
  startDate: Date | null
  endDate: Date | null
  label: string
}

const DATE_PRESETS: { key: DatePreset; label: string }[] = [
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: '90d', label: 'Last 90 days' },
  { key: 'year', label: 'This Year' },
  { key: 'custom', label: 'Custom' },
]

function getDateRangeParams(dateRange: DateRange): string {
  switch (dateRange.preset) {
    case '7d': return '7'
    case '30d': return '30'
    case '90d': return '90'
    case 'year': return '365'
    case 'custom': return '30'
    default: return '30'
  }
}

function getDatePresetLabel(preset: DatePreset): string {
  return DATE_PRESETS.find(p => p.key === preset)?.label || 'Last 30 days'
}

export function ReportsScreen({ navigation, hideHeader }: { navigation: any; hideHeader?: boolean }) {
  const [activeReport, setActiveReport] = useState<ReportType>('sales')
  const [dateRange, setDateRange] = useState<DateRange>({
    preset: '30d',
    startDate: null,
    endDate: null,
    label: 'Last 30 days',
  })
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null)

  const [salesData, setSalesData] = useState<any>(null)
  const [inventoryData, setInventoryData] = useState<any>(null)
  const [customerData, setCustomerData] = useState<any>(null)

  const fetchData = useCallback(async () => {
    try {
      const rangeParam = getDateRangeParams(dateRange)
      if (activeReport === 'sales') {
        const data = await api.getReport('sales', { range: rangeParam })
        setSalesData(data)
      } else if (activeReport === 'inventory') {
        const data = await api.getReport('inventory', { range: rangeParam })
        setInventoryData(data)
      } else if (activeReport === 'customers') {
        const data = await api.getReport('customers', { range: rangeParam })
        setCustomerData(data)
      }
    } catch (error) {
      console.error('Failed to fetch report:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [activeReport, dateRange])

  useEffect(() => {
    setLoading(true)
    fetchData()
  }, [fetchData])

  const onRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  const handleSelectPreset = (preset: DatePreset) => {
    if (preset === 'custom') {
      // For custom, keep current range but show label
      setDateRange({
        preset: 'custom',
        startDate: null,
        endDate: null,
        label: 'Custom',
      })
    } else {
      setDateRange({
        preset,
        startDate: null,
        endDate: null,
        label: getDatePresetLabel(preset),
      })
    }
    setShowDatePicker(false)
  }

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      setExporting(format)
      const rangeParam = getDateRangeParams(dateRange)
      const exportUrl = api.getReportExportUrl(activeReport, format, { range: rangeParam })
      await Linking.openURL(exportUrl)
    } catch (error) {
      Alert.alert('Export Failed', 'Could not open the export URL. Please try again.')
    } finally {
      setExporting(null)
    }
  }

  const handleShare = async () => {
    try {
      const rangeParam = getDateRangeParams(dateRange)
      const reportLabel = activeReport.charAt(0).toUpperCase() + activeReport.slice(1)
      const csvUrl = api.getReportExportUrl(activeReport, 'csv', { range: rangeParam })
      const pdfUrl = api.getReportExportUrl(activeReport, 'pdf', { range: rangeParam })

      let message = `47 Industries - ${reportLabel} Report\n`
      message += `Period: ${dateRange.label}\n\n`

      if (activeReport === 'sales' && salesData) {
        const summary = salesData.summary || salesData
        message += `Revenue: $${(summary.totalRevenue || 0).toLocaleString()}\n`
        message += `Orders: ${summary.totalOrders || 0}\n`
        message += `Avg Order Value: $${(summary.averageOrderValue || 0).toFixed(2)}\n`
      } else if (activeReport === 'inventory' && inventoryData) {
        const summary = inventoryData.summary || inventoryData
        message += `Total Products: ${summary.totalProducts || 0}\n`
        message += `Low Stock: ${summary.lowStockCount || 0}\n`
        message += `Out of Stock: ${summary.outOfStockCount || 0}\n`
        message += `Inventory Value: $${(summary.totalInventoryValue || 0).toLocaleString()}\n`
      } else if (activeReport === 'customers' && customerData) {
        const summary = customerData.summary || customerData
        message += `Total Customers: ${summary.totalCustomers || 0}\n`
        message += `New Customers: ${summary.newCustomers || 0}\n`
        message += `Repeat Rate: ${(summary.retentionRate || 0).toFixed(1)}%\n`
        message += `Avg Lifetime Value: $${(summary.averageLifetimeValue || 0).toFixed(2)}\n`
      }

      message += `\nCSV: ${csvUrl}\nPDF: ${pdfUrl}`

      await Share.share({
        message,
        title: `${reportLabel} Report - 47 Industries`,
      })
    } catch (error) {
      // User cancelled share
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount || 0)
  }

  const formatCurrencyFull = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount || 0)
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return (num || 0).toString()
  }

  const formatPercent = (num: number) => {
    return `${(num || 0).toFixed(1)}%`
  }

  // --- Sales Report ---
  const renderSalesReport = () => {
    const summary = salesData?.summary || {}
    return (
      <>
        {/* Summary Cards */}
        <View style={styles.metricsGrid}>
          <Card style={styles.metricCard}>
            <View style={[styles.metricIcon, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
              <Ionicons name="cash-outline" size={20} color={colors.success} />
            </View>
            <Text style={styles.metricValue}>{formatCurrency(summary.totalRevenue)}</Text>
            <Text style={styles.metricLabel}>Revenue</Text>
            {summary.revenueGrowth !== undefined && summary.revenueGrowth !== 0 && (
              <View style={styles.changeRow}>
                <Ionicons
                  name={summary.revenueGrowth >= 0 ? 'arrow-up' : 'arrow-down'}
                  size={12}
                  color={summary.revenueGrowth >= 0 ? colors.success : colors.error}
                />
                <Text style={[styles.changeText, { color: summary.revenueGrowth >= 0 ? colors.success : colors.error }]}>
                  {Math.abs(summary.revenueGrowth).toFixed(1)}%
                </Text>
              </View>
            )}
          </Card>
          <Card style={styles.metricCard}>
            <View style={[styles.metricIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
              <Ionicons name="receipt-outline" size={20} color={colors.primary} />
            </View>
            <Text style={styles.metricValue}>{summary.totalOrders || 0}</Text>
            <Text style={styles.metricLabel}>Orders</Text>
          </Card>
          <Card style={styles.metricCard}>
            <View style={[styles.metricIcon, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
              <Ionicons name="trending-up-outline" size={20} color={colors.purple} />
            </View>
            <Text style={styles.metricValue}>{formatCurrencyFull(summary.averageOrderValue)}</Text>
            <Text style={styles.metricLabel}>Avg Order Value</Text>
          </Card>
          <Card style={styles.metricCard}>
            <View style={[styles.metricIcon, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <Ionicons name="bar-chart-outline" size={20} color={colors.warning} />
            </View>
            <Text style={styles.metricValue}>{salesData?.ordersByStatus?.length || 0}</Text>
            <Text style={styles.metricLabel}>Status Types</Text>
          </Card>
        </View>

        {/* Order Status Breakdown */}
        {salesData?.ordersByStatus?.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Orders by Status</Text>
            <Card style={styles.statsCard}>
              {salesData.ordersByStatus.map((item: any, index: number) => (
                <View key={item.status || index} style={[styles.statRow, index === salesData.ordersByStatus.length - 1 && styles.statRowLast]}>
                  <View style={styles.statusRow}>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
                    <Text style={styles.statLabel}>{formatStatusLabel(item.status)}</Text>
                  </View>
                  <Text style={styles.statValue}>{item.count}</Text>
                </View>
              ))}
            </Card>
          </>
        )}

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
                    <Text style={styles.listSubtext}>{product.quantity || product.sales || 0} sold</Text>
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
              {salesData.revenueByCategory.map((cat: any, index: number) => {
                const totalCatRevenue = salesData.revenueByCategory.reduce((sum: number, c: any) => sum + (c.revenue || 0), 0)
                const pct = totalCatRevenue > 0 ? ((cat.revenue || 0) / totalCatRevenue) * 100 : 0
                return (
                  <View key={cat.id || cat.name || index} style={[styles.listItem, index > 0 && styles.listItemBorder]}>
                    <View style={styles.listInfo}>
                      <Text style={styles.listName}>{cat.name || cat.category}</Text>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${Math.min(pct, 100)}%` }]} />
                      </View>
                    </View>
                    <View style={styles.listValueColumn}>
                      <Text style={styles.listValue}>{formatCurrency(cat.revenue)}</Text>
                      <Text style={styles.listSubtext}>{pct.toFixed(1)}%</Text>
                    </View>
                  </View>
                )
              })}
            </Card>
          </>
        )}
      </>
    )
  }

  // --- Inventory Report ---
  const renderInventoryReport = () => {
    const summary = inventoryData?.summary || {}
    return (
      <>
        {/* Summary Cards */}
        <View style={styles.metricsGrid}>
          <Card style={styles.metricCard}>
            <View style={[styles.metricIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
              <Ionicons name="cube-outline" size={20} color={colors.primary} />
            </View>
            <Text style={styles.metricValue}>{summary.totalProducts || 0}</Text>
            <Text style={styles.metricLabel}>Total Products</Text>
          </Card>
          <Card style={styles.metricCard}>
            <View style={[styles.metricIcon, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <Ionicons name="warning-outline" size={20} color={colors.warning} />
            </View>
            <Text style={styles.metricValue}>{summary.lowStockCount || 0}</Text>
            <Text style={styles.metricLabel}>Low Stock</Text>
          </Card>
          <Card style={styles.metricCard}>
            <View style={[styles.metricIcon, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
              <Ionicons name="alert-circle-outline" size={20} color={colors.error} />
            </View>
            <Text style={styles.metricValue}>{summary.outOfStockCount || 0}</Text>
            <Text style={styles.metricLabel}>Out of Stock</Text>
          </Card>
          <Card style={styles.metricCard}>
            <View style={[styles.metricIcon, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
              <Ionicons name="cash-outline" size={20} color={colors.success} />
            </View>
            <Text style={styles.metricValue}>{formatCurrency(summary.totalInventoryValue)}</Text>
            <Text style={styles.metricLabel}>Inventory Value</Text>
          </Card>
        </View>

        {/* Low Stock Items */}
        {inventoryData?.lowStockItems?.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Low Stock Items</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{inventoryData.lowStockItems.length}</Text>
              </View>
            </View>
            <Card style={styles.listCard}>
              {inventoryData.lowStockItems.slice(0, 8).map((item: any, index: number) => (
                <View key={item.id || index} style={[styles.listItem, index > 0 && styles.listItemBorder]}>
                  <View style={[styles.stockDot, { backgroundColor: item.stock === 0 ? colors.error : colors.warning }]} />
                  <View style={styles.listInfo}>
                    <Text style={styles.listName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.listSubtext}>{item.category} -- SKU: {item.sku || 'N/A'}</Text>
                  </View>
                  <View style={styles.listValueColumn}>
                    <Text style={[styles.stockCount, { color: item.stock <= 3 ? colors.error : colors.warning }]}>
                      {item.stock}
                    </Text>
                    <Text style={styles.listSubtext}>in stock</Text>
                  </View>
                </View>
              ))}
            </Card>
          </>
        )}

        {/* Out of Stock */}
        {inventoryData?.outOfStockItems?.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Out of Stock</Text>
              <View style={[styles.badge, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                <Text style={[styles.badgeText, { color: colors.error }]}>{inventoryData.outOfStockItems.length}</Text>
              </View>
            </View>
            <Card style={styles.listCard}>
              {inventoryData.outOfStockItems.slice(0, 8).map((item: any, index: number) => (
                <View key={item.id || index} style={[styles.listItem, index > 0 && styles.listItemBorder]}>
                  <View style={[styles.stockDot, { backgroundColor: colors.error }]} />
                  <View style={styles.listInfo}>
                    <Text style={styles.listName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.listSubtext}>{item.category} -- SKU: {item.sku || 'N/A'}</Text>
                  </View>
                  <Text style={[styles.stockCount, { color: colors.error }]}>0</Text>
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
                <View key={cat.id || cat.name || index} style={[styles.listItem, index > 0 && styles.listItemBorder]}>
                  <View style={styles.listInfo}>
                    <Text style={styles.listName}>{cat.name || cat.category}</Text>
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
  }

  // --- Customers Report ---
  const renderCustomersReport = () => {
    const summary = customerData?.summary || {}
    return (
      <>
        {/* Summary Cards */}
        <View style={styles.metricsGrid}>
          <Card style={styles.metricCard}>
            <View style={[styles.metricIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
              <Ionicons name="people-outline" size={20} color={colors.primary} />
            </View>
            <Text style={styles.metricValue}>{formatNumber(summary.totalCustomers)}</Text>
            <Text style={styles.metricLabel}>Total Customers</Text>
          </Card>
          <Card style={styles.metricCard}>
            <View style={[styles.metricIcon, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
              <Ionicons name="person-add-outline" size={20} color={colors.success} />
            </View>
            <Text style={styles.metricValue}>{summary.newCustomers || 0}</Text>
            <Text style={styles.metricLabel}>New Customers</Text>
          </Card>
          <Card style={styles.metricCard}>
            <View style={[styles.metricIcon, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
              <Ionicons name="repeat-outline" size={20} color={colors.purple} />
            </View>
            <Text style={styles.metricValue}>{formatPercent(summary.retentionRate)}</Text>
            <Text style={styles.metricLabel}>Repeat Rate</Text>
          </Card>
          <Card style={styles.metricCard}>
            <View style={[styles.metricIcon, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <Ionicons name="wallet-outline" size={20} color={colors.warning} />
            </View>
            <Text style={styles.metricValue}>{formatCurrencyFull(summary.averageLifetimeValue)}</Text>
            <Text style={styles.metricLabel}>Avg Lifetime Value</Text>
          </Card>
        </View>

        {/* Customer Value Stats */}
        <Text style={styles.sectionTitle}>Customer Overview</Text>
        <Card style={styles.statsCard}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Total Customers</Text>
            <Text style={styles.statValue}>{summary.totalCustomers || 0}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>New Customers (Period)</Text>
            <Text style={[styles.statValue, { color: colors.success }]}>{summary.newCustomers || 0}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Repeat Customers</Text>
            <Text style={[styles.statValue, { color: colors.primary }]}>{summary.repeatCustomers || 0}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Retention Rate</Text>
            <Text style={[styles.statValue, { color: colors.purple }]}>{formatPercent(summary.retentionRate)}</Text>
          </View>
          <View style={[styles.statRow, styles.statRowLast]}>
            <Text style={styles.statLabel}>Avg Lifetime Value</Text>
            <Text style={[styles.statValue, { color: colors.warning }]}>{formatCurrencyFull(summary.averageLifetimeValue)}</Text>
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
                    <Text style={styles.listName} numberOfLines={1}>{customer.name || 'Anonymous'}</Text>
                    <Text style={styles.listSubtext}>{customer.orderCount || customer.ordersCount || 0} orders</Text>
                  </View>
                  <Text style={styles.listValue}>{formatCurrencyFull(customer.totalSpent)}</Text>
                </View>
              ))}
            </Card>
          </>
        )}

        {/* Customer Segments */}
        {customerData?.segmentStats?.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Customer Segments</Text>
            <Card style={styles.listCard}>
              {customerData.segmentStats.map((segment: any, index: number) => (
                <View key={segment.id || index} style={[styles.listItem, index > 0 && styles.listItemBorder]}>
                  <View style={[styles.segmentDot, { backgroundColor: segment.color || colors.primary }]} />
                  <View style={styles.listInfo}>
                    <Text style={styles.listName}>{segment.name}</Text>
                  </View>
                  <Text style={styles.listSubtext}>{segment.memberCount} members</Text>
                </View>
              ))}
            </Card>
          </>
        )}
      </>
    )
  }

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
      </View>

      {/* Date Range Selector */}
      <TouchableOpacity style={styles.dateSelector} onPress={() => setShowDatePicker(true)}>
        <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
        <Text style={styles.dateSelectorText}>{dateRange.label}</Text>
        <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
      </TouchableOpacity>

      {/* Export Bar */}
      <View style={styles.exportBar}>
        <TouchableOpacity
          style={styles.exportButton}
          onPress={() => handleExport('csv')}
          disabled={exporting !== null}
        >
          {exporting === 'csv' ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <Ionicons name="document-text-outline" size={16} color={colors.primary} />
              <Text style={styles.exportButtonText}>Export CSV</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.exportButton}
          onPress={() => handleExport('pdf')}
          disabled={exporting !== null}
        >
          {exporting === 'pdf' ? (
            <ActivityIndicator size="small" color={colors.error} />
          ) : (
            <>
              <Ionicons name="document-outline" size={16} color={colors.error} />
              <Text style={[styles.exportButtonText, { color: colors.error }]}>Export PDF</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.exportButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={16} color={colors.success} />
          <Text style={[styles.exportButtonText, { color: colors.success }]}>Share</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading report...</Text>
          </View>
        ) : (
          <>
            {activeReport === 'sales' && renderSalesReport()}
            {activeReport === 'inventory' && renderInventoryReport()}
            {activeReport === 'customers' && renderCustomersReport()}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Date Range Picker Modal */}
      <Modal visible={showDatePicker} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDatePicker(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Date Range</Text>
            {DATE_PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset.key}
                style={[
                  styles.modalOption,
                  dateRange.preset === preset.key && styles.modalOptionActive,
                ]}
                onPress={() => handleSelectPreset(preset.key)}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    dateRange.preset === preset.key && styles.modalOptionTextActive,
                  ]}
                >
                  {preset.label}
                </Text>
                {dateRange.preset === preset.key && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

// Helpers
function getStatusColor(status: string): string {
  const statusLower = (status || '').toLowerCase()
  if (statusLower === 'completed' || statusLower === 'delivered') return colors.success
  if (statusLower === 'pending' || statusLower === 'processing') return colors.warning
  if (statusLower === 'cancelled' || statusLower === 'refunded') return colors.error
  if (statusLower === 'shipped') return colors.primary
  return colors.textMuted
}

function formatStatusLabel(status: string): string {
  if (!status) return 'Unknown'
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase().replace(/_/g, ' ')
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
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'flex-start',
  },
  dateSelectorText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  exportBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  exportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exportButtonText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.md,
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
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  changeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    marginLeft: spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  badge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.warning,
  },
  statsCard: {
    marginBottom: spacing.lg,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statRowLast: {
    borderBottomWidth: 0,
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
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
  stockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.md,
  },
  stockCount: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  segmentDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.md,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  modalOptionActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  modalOptionText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  modalOptionTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  modalCloseButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceHover,
  },
  modalCloseText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: fontWeight.semibold,
  },
})

export default ReportsScreen
