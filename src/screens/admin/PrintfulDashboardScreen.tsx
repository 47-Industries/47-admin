import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Dimensions,
  Linking,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { api } from '../../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme'
import { EmptyState } from '../../components/EmptyState'

const { width } = Dimensions.get('window')

type OrderStatus = 'pending' | 'processing' | 'shipped' | 'failed' | null

interface PrintfulStatus {
  connected: boolean
  configured: boolean
  storeName?: string
  storeType?: string
  error?: string
  lastSyncedAt: string | null
  stats: {
    products: number
    totalOrders: number
    failedOrders: number
  }
  stores?: Array<{ id: number; name: string; type: string | null }>
}

interface PrintfulOrder {
  id: string
  printfulId: string | null
  status: string
  trackingNumber: string | null
  trackingUrl: string | null
  shippedAt: string | null
  createdAt: string
  order: {
    id: string
    orderNumber: string
    customerName: string
    customerEmail: string
    total: number
    status: string
    createdAt: string
    items: Array<{
      id: string
      name: string
      quantity: number
      price: number
      image: string | null
    }>
  }
}

interface SyncResult {
  success: boolean
  message: string
  errors?: string[]
}

interface SyncLog {
  id: string
  type: 'all' | 'new'
  status: 'success' | 'error'
  message: string
  timestamp: Date
  productsAdded?: number
  productsUpdated?: number
  errors?: string[]
}

const STATUS_FILTERS: { value: OrderStatus; label: string }[] = [
  { value: null, label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'failed', label: 'Failed' },
]

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'error' | 'primary'> = {
  PENDING: 'warning',
  PROCESSING: 'primary',
  SHIPPED: 'primary',
  DELIVERED: 'success',
  FAILED: 'error',
  CANCELLED: 'error',
}

export function PrintfulDashboardScreen({ navigation, hideHeader }: { navigation: any; hideHeader?: boolean }) {
  const [status, setStatus] = useState<PrintfulStatus | null>(null)
  const [orders, setOrders] = useState<PrintfulOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [syncing, setSyncing] = useState<'all' | 'new' | null>(null)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [orderFilter, setOrderFilter] = useState<OrderStatus>(null)
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'history'>('overview')
  const [retrying, setRetrying] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const [statusData, ordersData] = await Promise.all([
        api.getPrintfulStatus(),
        api.getPrintfulOrders({ status: orderFilter || undefined }),
      ])
      setStatus(statusData)
      setOrders(ordersData.orders || [])
    } catch (error) {
      console.error('Failed to fetch Printful data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [orderFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const onRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  const handleSync = async (mode: 'all' | 'new') => {
    setSyncing(mode)
    setSyncResult(null)

    try {
      const result = await api.syncPrintfulProducts(mode)
      const syncLog: SyncLog = {
        id: Date.now().toString(),
        type: mode,
        status: 'success',
        message: result.message || `Synced ${result.synced || 0} products`,
        timestamp: new Date(),
        productsAdded: result.added,
        productsUpdated: result.updated,
        errors: result.errors,
      }
      setSyncLogs((prev) => [syncLog, ...prev.slice(0, 9)])
      setSyncResult({
        success: true,
        message: result.message || `Successfully synced products`,
        errors: result.errors,
      })
      fetchData()
    } catch (error: any) {
      const syncLog: SyncLog = {
        id: Date.now().toString(),
        type: mode,
        status: 'error',
        message: error.message || 'Sync failed',
        timestamp: new Date(),
      }
      setSyncLogs((prev) => [syncLog, ...prev.slice(0, 9)])
      setSyncResult({
        success: false,
        message: error.message || 'Failed to sync products',
      })
    } finally {
      setSyncing(null)
    }
  }

  const handleRetryOrder = async (orderId: string) => {
    setRetrying(orderId)
    try {
      await api.retryPrintfulOrder(orderId)
      fetchData()
    } catch (error) {
      console.error('Failed to retry order:', error)
    } finally {
      setRetrying(null)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString()
  }

  const StatCard = ({ title, value, icon, color = colors.primary, onPress }: any) => (
    <TouchableOpacity
      style={styles.statCard}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </TouchableOpacity>
  )

  const renderOrder = ({ item }: { item: PrintfulOrder }) => (
    <Card style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderNumber}>#{item.order.orderNumber}</Text>
          <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
        </View>
        <Badge text={item.status} variant={statusColors[item.status] || 'default'} />
      </View>

      <View style={styles.orderDetails}>
        <View style={styles.orderCustomer}>
          <Ionicons name="person-outline" size={16} color={colors.textMuted} />
          <Text style={styles.customerName}>{item.order.customerName}</Text>
        </View>
        {item.printfulId && (
          <Text style={styles.printfulId}>Printful #{item.printfulId}</Text>
        )}
      </View>

      <View style={styles.orderItems}>
        <Text style={styles.itemsCount}>
          {item.order.items.length} item{item.order.items.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {item.trackingNumber && (
        <TouchableOpacity
          style={styles.trackingRow}
          onPress={() => item.trackingUrl && Linking.openURL(item.trackingUrl)}
        >
          <Ionicons name="navigate-outline" size={16} color={colors.primary} />
          <Text style={styles.trackingText}>Track: {item.trackingNumber}</Text>
        </TouchableOpacity>
      )}

      {item.status === 'FAILED' && (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => handleRetryOrder(item.id)}
          disabled={retrying === item.id}
        >
          {retrying === item.id ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <>
              <Ionicons name="refresh-outline" size={16} color={colors.text} />
              <Text style={styles.retryText}>Retry Order</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </Card>
  )

  const renderSyncLog = ({ item }: { item: SyncLog }) => (
    <View style={styles.logRow}>
      <View style={[styles.logDot, { backgroundColor: item.status === 'success' ? colors.success : colors.error }]} />
      <View style={styles.logContent}>
        <Text style={styles.logMessage}>{item.message}</Text>
        <Text style={styles.logTime}>
          {item.type === 'all' ? 'Full Sync' : 'New Products'} - {formatDateTime(item.timestamp.toISOString())}
        </Text>
        {item.productsAdded !== undefined && (
          <Text style={styles.logStats}>
            Added: {item.productsAdded}, Updated: {item.productsUpdated || 0}
          </Text>
        )}
        {item.errors && item.errors.length > 0 && (
          <Text style={styles.logErrors}>{item.errors.length} error(s)</Text>
        )}
      </View>
    </View>
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading Printful status...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {!hideHeader && (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Printful</Text>
        </View>
      )}

      {/* Tab Selector */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>Overview</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'orders' && styles.tabActive]}
          onPress={() => setActiveTab('orders')}
        >
          <Text style={[styles.tabText, activeTab === 'orders' && styles.tabTextActive]}>Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>Sync History</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'overview' && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {/* Connection Status */}
          <Card style={styles.connectionCard}>
            <View style={styles.connectionHeader}>
              <View style={[styles.connectionDot, { backgroundColor: status?.connected ? colors.success : colors.error }]} />
              <Text style={styles.connectionTitle}>
                {status?.connected ? 'Connected' : 'Disconnected'}
              </Text>
            </View>
            {status?.storeName && (
              <Text style={styles.storeName}>{status.storeName}</Text>
            )}
            {status?.storeType && (
              <Text style={styles.storeType}>{status.storeType}</Text>
            )}
            {status?.lastSyncedAt && (
              <Text style={styles.lastSync}>
                Last sync: {formatDateTime(status.lastSyncedAt)}
              </Text>
            )}
            {status?.error && (
              <Text style={styles.errorText}>{status.error}</Text>
            )}
            {!status?.connected && (
              <TouchableOpacity style={styles.reconnectButton} onPress={onRefresh}>
                <Ionicons name="refresh-outline" size={16} color={colors.text} />
                <Text style={styles.reconnectText}>Reconnect</Text>
              </TouchableOpacity>
            )}
          </Card>

          {/* Stats Grid */}
          <Text style={styles.sectionTitle}>Sync Stats</Text>
          <View style={styles.statsGrid}>
            <StatCard
              title="Products Synced"
              value={status?.stats.products || 0}
              icon="cube-outline"
              color={colors.primary}
            />
            <StatCard
              title="Total Orders"
              value={status?.stats.totalOrders || 0}
              icon="receipt-outline"
              color={colors.success}
            />
            <StatCard
              title="Failed Orders"
              value={status?.stats.failedOrders || 0}
              icon="alert-circle-outline"
              color={colors.error}
              onPress={status?.stats.failedOrders ? () => {
                setOrderFilter('failed')
                setActiveTab('orders')
              } : undefined}
            />
            <StatCard
              title="Pending"
              value={orders.filter((o) => o.status === 'PENDING').length}
              icon="time-outline"
              color={colors.warning}
            />
          </View>

          {/* Sync Actions */}
          <Text style={styles.sectionTitle}>Sync Actions</Text>
          <Card style={styles.syncCard}>
            <Text style={styles.syncDescription}>
              Sync your Printful store products to your 47 Industries catalog.
            </Text>

            <View style={styles.syncButtons}>
              <TouchableOpacity
                style={[styles.syncButton, styles.syncButtonPrimary]}
                onPress={() => handleSync('new')}
                disabled={!!syncing || !status?.connected}
              >
                {syncing === 'new' ? (
                  <ActivityIndicator size="small" color={colors.text} />
                ) : (
                  <>
                    <Ionicons name="add-circle-outline" size={18} color={colors.text} />
                    <Text style={styles.syncButtonText}>Sync New Products</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.syncButton, styles.syncButtonSecondary]}
                onPress={() => handleSync('all')}
                disabled={!!syncing || !status?.connected}
              >
                {syncing === 'all' ? (
                  <ActivityIndicator size="small" color={colors.text} />
                ) : (
                  <>
                    <Ionicons name="sync-outline" size={18} color={colors.text} />
                    <Text style={styles.syncButtonText}>Sync All Products</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.syncNotes}>
              <Text style={styles.syncNoteText}>
                <Text style={styles.syncNoteBold}>Sync New:</Text> Only adds new products. Preserves existing descriptions.
              </Text>
              <Text style={styles.syncNoteText}>
                <Text style={styles.syncNoteBold}>Sync All:</Text> Updates all products including names, prices, images.
              </Text>
            </View>

            {syncResult && (
              <View style={[styles.syncResult, { backgroundColor: syncResult.success ? colors.successBg : colors.errorBg }]}>
                <Text style={[styles.syncResultText, { color: syncResult.success ? colors.success : colors.error }]}>
                  {syncResult.message}
                </Text>
                {syncResult.errors && syncResult.errors.length > 0 && (
                  <View style={styles.syncErrors}>
                    {syncResult.errors.map((error, i) => (
                      <Text key={i} style={styles.syncErrorItem}>- {error}</Text>
                    ))}
                  </View>
                )}
              </View>
            )}
          </Card>

          {/* Setup Instructions */}
          {!status?.configured && (
            <Card style={styles.setupCard}>
              <View style={styles.setupHeader}>
                <Ionicons name="warning-outline" size={24} color={colors.warning} />
                <Text style={styles.setupTitle}>Setup Required</Text>
              </View>
              <Text style={styles.setupText}>
                To use Printful integration, add the following environment variables:
              </Text>
              <View style={styles.setupCode}>
                <Text style={styles.codeText}>PRINTFUL_API_KEY=your-api-key</Text>
                <Text style={styles.codeText}>PRINTFUL_WEBHOOK_SECRET=your-webhook-secret</Text>
              </View>
            </Card>
          )}

          {/* No API Store Warning */}
          {status?.configured && !status?.connected && status?.stores && status.stores.length > 0 && (
            <Card style={styles.warningCard}>
              <View style={styles.setupHeader}>
                <Ionicons name="alert-circle-outline" size={24} color={colors.error} />
                <Text style={[styles.setupTitle, { color: colors.error }]}>Manual Order / API Store Required</Text>
              </View>
              <Text style={styles.setupText}>
                Your Printful account has {status.stores.length} store(s), but none are set up for API access.
              </Text>
              <Text style={styles.setupText}>Current stores:</Text>
              {status.stores.map((store) => (
                <View key={store.id} style={styles.storeRow}>
                  <View style={[styles.connectionDot, { backgroundColor: colors.error }]} />
                  <Text style={styles.storeRowText}>
                    {store.name} ({store.type || 'unknown'})
                  </Text>
                </View>
              ))}
            </Card>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {activeTab === 'orders' && (
        <View style={styles.ordersContainer}>
          {/* Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterRow}
            contentContainerStyle={styles.filterContent}
          >
            {STATUS_FILTERS.map((filter) => (
              <TouchableOpacity
                key={filter.label}
                style={[styles.filterPill, orderFilter === filter.value && styles.filterPillActive]}
                onPress={() => setOrderFilter(filter.value)}
              >
                <Text style={[styles.filterPillText, orderFilter === filter.value && styles.filterPillTextActive]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <FlatList
            data={orders}
            renderItem={renderOrder}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.ordersList}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            ListEmptyComponent={
              <EmptyState icon="receipt-outline" title="No Printful orders found" />
            }
          />
        </View>
      )}

      {activeTab === 'history' && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          <Text style={styles.sectionTitle}>Recent Sync Operations</Text>
          {syncLogs.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="time-outline" size={32} color={colors.textMuted} />
              <Text style={styles.emptyCardText}>No sync history yet</Text>
              <Text style={styles.emptyCardSubtext}>Sync operations will appear here</Text>
            </Card>
          ) : (
            <Card style={styles.logsCard}>
              {syncLogs.map((log) => (
                <React.Fragment key={log.id}>
                  {renderSyncLog({ item: log })}
                </React.Fragment>
              ))}
            </Card>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
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
  loadingText: {
    marginTop: spacing.md,
    color: colors.textMuted,
    fontSize: fontSize.md,
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
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginRight: spacing.sm,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
  },
  tabTextActive: {
    color: colors.primary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  connectionCard: {
    marginBottom: spacing.lg,
  },
  connectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  connectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  connectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  storeName: {
    fontSize: fontSize.md,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  storeType: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  lastSync: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.error,
    marginTop: spacing.sm,
  },
  reconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceHover,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  reconnectText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statCard: {
    width: (width - spacing.lg * 2 - spacing.md) / 2,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  statTitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  syncCard: {
    marginBottom: spacing.lg,
  },
  syncDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  syncButtons: {
    gap: spacing.md,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  syncButtonPrimary: {
    backgroundColor: colors.primary,
  },
  syncButtonSecondary: {
    backgroundColor: colors.surfaceHover,
    borderWidth: 1,
    borderColor: colors.border,
  },
  syncButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  syncNotes: {
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  syncNoteText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  syncNoteBold: {
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  syncResult: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  syncResultText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  syncErrors: {
    marginTop: spacing.sm,
  },
  syncErrorItem: {
    fontSize: fontSize.xs,
    color: colors.error,
  },
  setupCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.warningBg,
    borderColor: colors.warning,
  },
  warningCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.errorBg,
    borderColor: colors.error,
  },
  setupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  setupTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.warning,
  },
  setupText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  setupCode: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  codeText: {
    fontSize: fontSize.xs,
    color: colors.text,
    fontFamily: 'monospace',
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  storeRowText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  ordersContainer: {
    flex: 1,
  },
  filterRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  filterPill: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  filterPillTextActive: {
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  ordersList: {
    padding: spacing.lg,
  },
  orderCard: {
    marginBottom: spacing.md,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  orderNumber: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  orderDate: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  orderDetails: {
    marginBottom: spacing.md,
  },
  orderCustomer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  customerName: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  printfulId: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  orderItems: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  itemsCount: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  trackingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs,
  },
  trackingText: {
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.error,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  retryText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
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
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyCardText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  emptyCardSubtext: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  logsCard: {
    padding: 0,
  },
  logRow: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: spacing.md,
  },
  logContent: {
    flex: 1,
  },
  logMessage: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
  },
  logTime: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  logStats: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  logErrors: {
    fontSize: fontSize.xs,
    color: colors.error,
    marginTop: spacing.xs,
  },
})
