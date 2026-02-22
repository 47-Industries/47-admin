import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { api } from '../../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme'

interface PrintQueueItem {
  id: string
  name: string
  brand: string | null
  status: 'pending' | 'printed'
  createdAt: string
  cardData: Record<string, unknown>
}

interface SavedDesign {
  id: string
  name: string
  brand: string | null
  cardData: Record<string, unknown>
  createdAt: string
}

export default function BusinessCardsScreen({ navigation }: { navigation: any }) {
  const [printQueue, setPrintQueue] = useState<PrintQueueItem[]>([])
  const [recentDesigns, setRecentDesigns] = useState<SavedDesign[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [queueData, designsData] = await Promise.all([
        api.getBusinessCardQueue().catch(() => ({ queue: [] })),
        api.getBusinessCardDesigns().catch(() => ({ designs: [] })),
      ])
      setPrintQueue(queueData.queue || [])
      setRecentDesigns(designsData.designs || [])
    } catch (error) {
      console.error('Error fetching business cards data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const onRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  const handleGenerateNew = () => {
    navigation.navigate('CardGenerator')
  }

  const handleEditDesign = (design: SavedDesign) => {
    navigation.navigate('CardGenerator', { design })
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getBrandColor = (brand: string | null): string => {
    switch (brand) {
      case 'FORTY_SEVEN_INDUSTRIES':
        return colors.primary
      case 'MOTOREV':
        return colors.error
      case 'BOOKFADE':
        return colors.purpleAlt
      default:
        return colors.textMuted
    }
  }

  const getBrandLabel = (brand: string | null): string => {
    switch (brand) {
      case 'FORTY_SEVEN_INDUSTRIES':
        return '47 Industries'
      case 'MOTOREV':
        return 'MotoRev'
      case 'BOOKFADE':
        return 'BookFade'
      default:
        return 'Custom'
    }
  }

  const renderQueueItem = ({ item }: { item: PrintQueueItem }) => (
    <Card style={styles.queueCard}>
      <View style={styles.queueHeader}>
        <View style={styles.queueInfo}>
          <Text style={styles.queueName} numberOfLines={1}>{item.name}</Text>
          <View style={[styles.brandTag, { backgroundColor: `${getBrandColor(item.brand)}20` }]}>
            <Text style={[styles.brandTagText, { color: getBrandColor(item.brand) }]}>
              {getBrandLabel(item.brand)}
            </Text>
          </View>
        </View>
        <Badge
          text={item.status === 'pending' ? 'Pending' : 'Printed'}
          variant={item.status === 'pending' ? 'warning' : 'success'}
        />
      </View>
      <Text style={styles.queueDate}>Added {formatDate(item.createdAt)}</Text>
    </Card>
  )

  const renderDesignItem = ({ item }: { item: SavedDesign }) => (
    <TouchableOpacity onPress={() => handleEditDesign(item)} activeOpacity={0.7}>
      <Card style={styles.designCard}>
        <View style={styles.designHeader}>
          <View style={styles.designInfo}>
            <Text style={styles.designName} numberOfLines={1}>{item.name}</Text>
            <View style={[styles.brandTag, { backgroundColor: `${getBrandColor(item.brand)}20` }]}>
              <Text style={[styles.brandTagText, { color: getBrandColor(item.brand) }]}>
                {getBrandLabel(item.brand)}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </View>
        <Text style={styles.designDate}>Created {formatDate(item.createdAt)}</Text>
      </Card>
    </TouchableOpacity>
  )

  const renderHeader = () => (
    <>
      {/* Print Queue Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Print Queue</Text>
          <View style={[styles.countBadge, { backgroundColor: printQueue.length > 0 ? colors.warningBg : colors.surfaceHover }]}>
            <Text style={[styles.countBadgeText, { color: printQueue.length > 0 ? colors.warning : colors.textMuted }]}>
              {printQueue.filter(i => i.status === 'pending').length}
            </Text>
          </View>
        </View>

        {printQueue.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="print-outline" size={32} color={colors.textMuted} />
            <Text style={styles.emptyText}>No cards in print queue</Text>
          </Card>
        ) : (
          <FlatList
            data={printQueue}
            renderItem={renderQueueItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        )}
      </View>

      {/* Generate New Button */}
      <TouchableOpacity style={styles.generateButton} onPress={handleGenerateNew}>
        <View style={styles.generateButtonContent}>
          <View style={styles.generateIconContainer}>
            <Ionicons name="add-circle-outline" size={28} color={colors.primary} />
          </View>
          <View style={styles.generateTextContainer}>
            <Text style={styles.generateTitle}>Generate New Card</Text>
            <Text style={styles.generateSubtitle}>Create a custom business card</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={24} color={colors.textMuted} />
      </TouchableOpacity>

      {/* Recently Generated Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recently Generated</Text>
      </View>
    </>
  )

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="card-outline" size={48} color={colors.textMuted} />
      <Text style={styles.emptyStateTitle}>No Saved Designs</Text>
      <Text style={styles.emptyStateText}>Generate your first business card to get started</Text>
      <TouchableOpacity style={styles.emptyButton} onPress={handleGenerateNew}>
        <Text style={styles.emptyButtonText}>Generate Card</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Business Cards</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleGenerateNew}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        <FlatList
          data={recentDesigns}
          renderItem={renderDesignItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={recentDesigns.length === 0 ? renderEmpty : null}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        />
      )}
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  addButton: {
    backgroundColor: colors.primary,
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  section: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  countBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  countBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  queueCard: {
    marginBottom: spacing.sm,
  },
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  queueInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  queueName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  queueDate: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  brandTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  brandTagText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  generateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  generateIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateTextContainer: {
    flex: 1,
  },
  generateTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  generateSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  designCard: {
    marginBottom: spacing.sm,
  },
  designHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  designInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  designName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  designDate: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    gap: spacing.md,
  },
  emptyStateTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  emptyStateText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  emptyButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: '#fff',
  },
})
