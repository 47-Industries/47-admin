import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { api } from '../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme'

const CATEGORY_LABELS: Record<string, string> = {
  WEB_DEVELOPMENT: 'Web Dev',
  IOS_APP: 'iOS',
  ANDROID_APP: 'Android',
  CROSS_PLATFORM_APP: 'Cross-Platform',
  DESKTOP_APP: 'Desktop',
  THREE_D_PRINTING: '3D Printing',
}

interface ServicePackage {
  id: string
  name: string
  category: string
  price: string | null
  billingType: string
  shortDesc: string
  isPopular: boolean
  isActive: boolean
  estimatedDays: number | null
  _count?: { inquiries: number }
}

export default function ServicesScreen({ navigation, hideHeader }: { navigation: any; hideHeader?: boolean }) {
  const [packages, setPackages] = useState<ServicePackage[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('')

  const fetchData = async () => {
    try {
      const packagesRes = await api.getServicePackages()
      setPackages(packagesRes.packages || [])
    } catch (error) {
      console.error('Failed to fetch packages:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const onRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  const formatCurrency = (price: string | null) => {
    if (!price) return 'Custom'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(price))
  }

  const filteredPackages = selectedCategory
    ? packages.filter(p => p.category === selectedCategory)
    : packages

  const stats = {
    totalPackages: packages.length,
    activePackages: packages.filter(p => p.isActive).length,
    popularPackages: packages.filter(p => p.isPopular).length,
  }

  const categories = Object.keys(CATEGORY_LABELS)

  const renderPackage = ({ item }: { item: ServicePackage }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('ServicePackageDetail', { id: item.id })}
      activeOpacity={0.7}
    >
      <Card style={styles.packageCard}>
        <View style={styles.packageHeader}>
          <View style={styles.packageInfo}>
            <Text style={styles.packageName}>{item.name}</Text>
            <View style={styles.badges}>
              <Badge
                text={CATEGORY_LABELS[item.category] || item.category}
                variant="primary"
              />
              {item.isPopular && <Badge text="Popular" variant="warning" />}
              {!item.isActive && <Badge text="Inactive" variant="error" />}
            </View>
          </View>
          <View style={styles.packagePrice}>
            <Text style={styles.priceText}>{formatCurrency(item.price)}</Text>
            <Text style={styles.billingText}>
              {item.billingType === 'one_time' ? 'One-time' : item.billingType}
            </Text>
          </View>
        </View>
        <Text style={styles.packageDesc} numberOfLines={2}>{item.shortDesc}</Text>
        <View style={styles.packageFooter}>
          {item.estimatedDays && (
            <View style={styles.footerItem}>
              <Ionicons name="time-outline" size={14} color={colors.textMuted} />
              <Text style={styles.footerText}>~{item.estimatedDays} days</Text>
            </View>
          )}
          <View style={styles.footerItem}>
            <Ionicons name="chatbubble-outline" size={14} color={colors.textMuted} />
            <Text style={styles.footerText}>{item._count?.inquiries || 0} inquiries</Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      {!hideHeader && (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Packages</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('ServicePackageDetail', { isNew: true })}
          >
            <Ionicons name="add" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      )}

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.totalPackages}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.success }]}>{stats.activePackages}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.warning }]}>{stats.popularPackages}</Text>
          <Text style={styles.statLabel}>Popular</Text>
        </View>
      </View>

      {/* Category Filter */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={['', ...categories]}
          keyExtractor={(item) => item || 'all'}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterBtn, selectedCategory === item && styles.filterBtnActive]}
              onPress={() => setSelectedCategory(item)}
            >
              <Text style={[styles.filterText, selectedCategory === item && styles.filterTextActive]}>
                {item ? CATEGORY_LABELS[item] : 'All'}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={filteredPackages}
        renderItem={renderPackage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name="cube-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>No service packages</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate('ServicePackageDetail', { isNew: true })}
              >
                <Ionicons name="add" size={18} color={colors.primary} />
                <Text style={styles.emptyButtonText}>Create Package</Text>
              </TouchableOpacity>
            </View>
          ) : null
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
    flex: 1,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  statItem: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  filterContainer: {
    marginBottom: spacing.md,
  },
  filterList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterBtnActive: {
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
  packageCard: {
    marginBottom: spacing.md,
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  packageInfo: {
    flex: 1,
  },
  packageName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  packagePrice: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  billingText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  packageDesc: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  packageFooter: {
    flexDirection: 'row',
    gap: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  footerText: {
    fontSize: fontSize.sm,
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
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    gap: spacing.xs,
  },
  emptyButtonText: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
})
