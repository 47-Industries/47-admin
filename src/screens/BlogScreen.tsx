import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Image } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { api } from '../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme'

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string | null
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  coverImage: string | null
  author: { name: string | null; email: string }
  category: { name: string } | null
  publishedAt: string | null
  createdAt: string
  _count?: { views: number }
}

interface BlogCategory {
  id: string
  name: string
  slug: string
  _count?: { posts: number }
}

interface EmailCampaign {
  id: string
  name: string
  subject: string
  status: string
  sentAt: string | null
  scheduledFor: string | null
  stats?: {
    sent: number
    opens: number
    clicks: number
  }
}

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'error' | 'primary'> = {
  DRAFT: 'warning',
  PUBLISHED: 'success',
  ARCHIVED: 'default',
  PENDING: 'warning',
  SENT: 'success',
  SCHEDULED: 'primary',
}

export default function BlogScreen({ navigation, hideHeader }: { navigation: any; hideHeader?: boolean }) {
  const [activeTab, setActiveTab] = useState<'posts' | 'categories' | 'campaigns'>('posts')
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('')

  const fetchData = async () => {
    try {
      if (activeTab === 'posts') {
        const data = await api.getBlogPosts({ status: statusFilter || undefined })
        setPosts(data.posts || [])
      } else if (activeTab === 'categories') {
        const data = await api.getBlogCategories()
        setCategories(data.categories || [])
      } else {
        const data = await api.getEmailCampaigns()
        setCampaigns(data.campaigns || [])
      }
    } catch (error) {
      console.error('Failed to fetch blog data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    fetchData()
  }, [activeTab, statusFilter])

  const onRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const stats = {
    totalPosts: posts.length,
    publishedPosts: posts.filter(p => p.status === 'PUBLISHED').length,
    draftPosts: posts.filter(p => p.status === 'DRAFT').length,
    totalCategories: categories.length,
  }

  const renderPost = ({ item }: { item: BlogPost }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('BlogPostDetail', { id: item.id })}
      activeOpacity={0.7}
    >
      <Card style={styles.postCard}>
        <View style={styles.postContent}>
          {item.coverImage && (
            <Image source={{ uri: item.coverImage }} style={styles.coverImage} />
          )}
          <View style={styles.postInfo}>
            <View style={styles.postHeader}>
              <Badge text={item.status} variant={statusColors[item.status]} />
              {item.category && (
                <Text style={styles.categoryText}>{item.category.name}</Text>
              )}
            </View>
            <Text style={styles.postTitle} numberOfLines={2}>{item.title}</Text>
            {item.excerpt && (
              <Text style={styles.postExcerpt} numberOfLines={2}>{item.excerpt}</Text>
            )}
            <View style={styles.postMeta}>
              <Text style={styles.authorText}>
                {item.author.name || item.author.email}
              </Text>
              <Text style={styles.dateText}>
                {item.status === 'PUBLISHED'
                  ? formatDate(item.publishedAt)
                  : formatDate(item.createdAt)}
              </Text>
            </View>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  )

  const renderCategory = ({ item }: { item: BlogCategory }) => (
    <Card style={styles.categoryCard}>
      <View style={styles.categoryContent}>
        <View style={styles.categoryIcon}>
          <Ionicons name="folder-outline" size={24} color={colors.primary} />
        </View>
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryName}>{item.name}</Text>
          <Text style={styles.categorySlug}>/{item.slug}</Text>
        </View>
        <View style={styles.categoryCount}>
          <Text style={styles.countValue}>{item._count?.posts || 0}</Text>
          <Text style={styles.countLabel}>posts</Text>
        </View>
      </View>
    </Card>
  )

  const renderCampaign = ({ item }: { item: EmailCampaign }) => (
    <Card style={styles.campaignCard}>
      <View style={styles.campaignHeader}>
        <View style={styles.campaignInfo}>
          <Text style={styles.campaignName}>{item.name}</Text>
          <Text style={styles.campaignSubject} numberOfLines={1}>{item.subject}</Text>
        </View>
        <Badge text={item.status} variant={statusColors[item.status] || 'default'} />
      </View>
      {item.stats && (
        <View style={styles.campaignStats}>
          <View style={styles.campaignStat}>
            <Text style={styles.statValue}>{item.stats.sent}</Text>
            <Text style={styles.statLabel}>Sent</Text>
          </View>
          <View style={styles.campaignStat}>
            <Text style={styles.statValue}>{item.stats.opens}</Text>
            <Text style={styles.statLabel}>Opens</Text>
          </View>
          <View style={styles.campaignStat}>
            <Text style={styles.statValue}>{item.stats.clicks}</Text>
            <Text style={styles.statLabel}>Clicks</Text>
          </View>
          {item.stats.sent > 0 && (
            <View style={styles.campaignStat}>
              <Text style={[styles.statValue, { color: colors.success }]}>
                {((item.stats.opens / item.stats.sent) * 100).toFixed(1)}%
              </Text>
              <Text style={styles.statLabel}>Open Rate</Text>
            </View>
          )}
        </View>
      )}
      <View style={styles.campaignFooter}>
        <Text style={styles.campaignDate}>
          {item.status === 'SENT'
            ? `Sent ${formatDate(item.sentAt)}`
            : item.scheduledFor
            ? `Scheduled for ${formatDate(item.scheduledFor)}`
            : `Created ${formatDate(item.sentAt || '')}`}
        </Text>
      </View>
    </Card>
  )

  return (
    <View style={styles.container}>
      {!hideHeader && (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Blog</Text>
        </View>
      )}

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.totalPosts}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.success }]}>{stats.publishedPosts}</Text>
          <Text style={styles.statLabel}>Published</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.warning }]}>{stats.draftPosts}</Text>
          <Text style={styles.statLabel}>Drafts</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.totalCategories}</Text>
          <Text style={styles.statLabel}>Categories</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'posts' && styles.tabActive]}
          onPress={() => setActiveTab('posts')}
        >
          <Text style={[styles.tabText, activeTab === 'posts' && styles.tabTextActive]}>Posts</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'categories' && styles.tabActive]}
          onPress={() => setActiveTab('categories')}
        >
          <Text style={[styles.tabText, activeTab === 'categories' && styles.tabTextActive]}>Categories</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'campaigns' && styles.tabActive]}
          onPress={() => setActiveTab('campaigns')}
        >
          <Text style={[styles.tabText, activeTab === 'campaigns' && styles.tabTextActive]}>Campaigns</Text>
        </TouchableOpacity>
      </View>

      {/* Status Filter for Posts */}
      {activeTab === 'posts' && (
        <View style={styles.filterContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={['', 'DRAFT', 'PUBLISHED', 'ARCHIVED']}
            keyExtractor={(item) => item || 'all'}
            contentContainerStyle={styles.filterList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.filterBtn, statusFilter === item && styles.filterBtnActive]}
                onPress={() => setStatusFilter(item)}
              >
                <Text style={[styles.filterText, statusFilter === item && styles.filterTextActive]}>
                  {item || 'All'}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {activeTab === 'posts' && (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.empty}>
                <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
                <Text style={styles.emptyText}>No blog posts</Text>
              </View>
            ) : null
          }
        />
      )}

      {activeTab === 'categories' && (
        <FlatList
          data={categories}
          renderItem={renderCategory}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.empty}>
                <Ionicons name="folder-outline" size={48} color={colors.textMuted} />
                <Text style={styles.emptyText}>No categories</Text>
              </View>
            ) : null
          }
        />
      )}

      {activeTab === 'campaigns' && (
        <FlatList
          data={campaigns}
          renderItem={renderCampaign}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.empty}>
                <Ionicons name="mail-outline" size={48} color={colors.textMuted} />
                <Text style={styles.emptyText}>No email campaigns</Text>
              </View>
            ) : null
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
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
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
  postCard: {
    marginBottom: spacing.md,
    padding: 0,
    overflow: 'hidden',
  },
  postContent: {
    flexDirection: 'row',
  },
  coverImage: {
    width: 100,
    height: 100,
  },
  postInfo: {
    flex: 1,
    padding: spacing.md,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  categoryText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  postTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  postExcerpt: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  postMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  authorText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  dateText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  categoryCard: {
    marginBottom: spacing.md,
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  categoryName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  categorySlug: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  categoryCount: {
    alignItems: 'center',
  },
  countValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  countLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  campaignCard: {
    marginBottom: spacing.md,
  },
  campaignHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  campaignInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  campaignName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  campaignSubject: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  campaignStats: {
    flexDirection: 'row',
    gap: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  campaignStat: {
    alignItems: 'center',
  },
  campaignFooter: {
    marginTop: spacing.md,
  },
  campaignDate: {
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
})
