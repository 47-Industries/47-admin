import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Image,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { api } from '../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme'

interface BlogPost {
  id: string
  title: string
  slug: string
  content: string | null
  excerpt: string | null
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  coverImage: string | null
  featured: boolean
  author: { id: string; name: string | null; email: string }
  category: { id: string; name: string; slug: string } | null
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  _count?: { views: number }
}

interface BlogCategory {
  id: string
  name: string
  slug: string
}

const STATUS_OPTIONS: { value: BlogPost['status']; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'ARCHIVED', label: 'Archived' },
]

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'error' | 'primary'> = {
  DRAFT: 'warning',
  PUBLISHED: 'success',
  ARCHIVED: 'default',
}

export default function BlogPostDetailScreen({ navigation, route }: any) {
  const { id } = route.params
  const [post, setPost] = useState<BlogPost | null>(null)
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editData, setEditData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    status: 'DRAFT' as BlogPost['status'],
    categoryId: '',
    featured: false,
  })

  useEffect(() => {
    fetchData()
  }, [id])

  const fetchData = async () => {
    try {
      const [postData, categoriesData] = await Promise.all([
        api.getBlogPost(id),
        api.getBlogCategories(),
      ])
      setPost(postData.post)
      setCategories(categoriesData.categories || [])
      setEditData({
        title: postData.post.title,
        slug: postData.post.slug,
        excerpt: postData.post.excerpt || '',
        content: postData.post.content || '',
        status: postData.post.status,
        categoryId: postData.post.category?.id || '',
        featured: postData.post.featured,
      })
    } catch (error) {
      console.error('Failed to fetch blog post:', error)
      Alert.alert('Error', 'Failed to load blog post details')
    } finally {
      setLoading(false)
    }
  }

  const savePost = async () => {
    if (!editData.title.trim()) {
      Alert.alert('Error', 'Title is required')
      return
    }
    if (!editData.slug.trim()) {
      Alert.alert('Error', 'Slug is required')
      return
    }

    setSaving(true)
    try {
      await api.updateBlogPost(id, {
        title: editData.title,
        slug: editData.slug,
        excerpt: editData.excerpt || null,
        content: editData.content || null,
        status: editData.status,
        categoryId: editData.categoryId || null,
        featured: editData.featured,
      })
      await fetchData()
      setShowEditModal(false)
      Alert.alert('Success', 'Blog post updated')
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update blog post')
    } finally {
      setSaving(false)
    }
  }

  const toggleFeatured = async () => {
    setSaving(true)
    try {
      await api.updateBlogPost(id, { featured: !post?.featured })
      setPost(post ? { ...post, featured: !post.featured } : null)
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update blog post')
    } finally {
      setSaving(false)
    }
  }

  const updateStatus = async (status: BlogPost['status']) => {
    setSaving(true)
    try {
      await api.updateBlogPost(id, { status })
      setPost(post ? { ...post, status } : null)
      Alert.alert('Success', `Post ${status.toLowerCase()}`)
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update status')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.deleteBlogPost(id)
      setShowDeleteModal(false)
      Alert.alert('Success', 'Blog post deleted successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ])
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to delete blog post')
    } finally {
      setDeleting(false)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Blog post not found</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Blog Post</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setShowDeleteModal(true)} style={styles.deleteButton}>
            <Ionicons name="trash-outline" size={22} color={colors.error} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowEditModal(true)} style={styles.editButton}>
            <Ionicons name="create-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Cover Image */}
        {post.coverImage ? (
          <Image source={{ uri: post.coverImage }} style={styles.coverImage} />
        ) : (
          <View style={styles.coverImagePlaceholder}>
            <Ionicons name="image-outline" size={64} color={colors.textMuted} />
            <Text style={styles.placeholderText}>No cover image</Text>
          </View>
        )}

        {/* Post Info */}
        <View style={styles.postHeader}>
          <Text style={styles.postTitle}>{post.title}</Text>
          <View style={styles.badges}>
            <Badge text={post.status} variant={statusColors[post.status]} />
            {post.featured && <Badge text="Featured" variant="warning" />}
            {post.category && <Badge text={post.category.name} variant="primary" />}
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{post._count?.views || 0}</Text>
            <Text style={styles.statLabel}>Views</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>
              {post.status === 'PUBLISHED' && post.publishedAt
                ? new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : '-'}
            </Text>
            <Text style={styles.statLabel}>Published</Text>
          </Card>
        </View>

        {/* Featured Toggle */}
        <Card style={styles.togglesCard}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Ionicons name="star-outline" size={20} color={colors.textMuted} />
              <Text style={styles.toggleLabel}>Featured Post</Text>
            </View>
            <Switch
              value={post.featured}
              onValueChange={toggleFeatured}
              trackColor={{ false: colors.border, true: colors.warning }}
              thumbColor={colors.text}
            />
          </View>
        </Card>

        {/* Status Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <Card style={styles.actionsCard}>
          <View style={styles.actionsRow}>
            {post.status !== 'PUBLISHED' && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.successBg }]}
                onPress={() => updateStatus('PUBLISHED')}
                disabled={saving}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color={colors.success} />
                <Text style={[styles.actionBtnText, { color: colors.success }]}>Publish</Text>
              </TouchableOpacity>
            )}
            {post.status !== 'DRAFT' && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.warningBg }]}
                onPress={() => updateStatus('DRAFT')}
                disabled={saving}
              >
                <Ionicons name="document-outline" size={20} color={colors.warning} />
                <Text style={[styles.actionBtnText, { color: colors.warning }]}>Unpublish</Text>
              </TouchableOpacity>
            )}
            {post.status !== 'ARCHIVED' && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.surfaceHover }]}
                onPress={() => updateStatus('ARCHIVED')}
                disabled={saving}
              >
                <Ionicons name="archive-outline" size={20} color={colors.textMuted} />
                <Text style={[styles.actionBtnText, { color: colors.textMuted }]}>Archive</Text>
              </TouchableOpacity>
            )}
          </View>
        </Card>

        {/* Details */}
        <Text style={styles.sectionTitle}>Details</Text>
        <Card style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Slug</Text>
            <Text style={styles.detailValue}>/{post.slug}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Author</Text>
            <Text style={styles.detailValue}>{post.author.name || post.author.email}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Category</Text>
            <Text style={styles.detailValue}>{post.category?.name || 'Uncategorized'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Created</Text>
            <Text style={styles.detailValue}>{formatDate(post.createdAt)}</Text>
          </View>
          {post.publishedAt && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Published</Text>
              <Text style={styles.detailValue}>{formatDate(post.publishedAt)}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Last Updated</Text>
            <Text style={styles.detailValue}>{formatDate(post.updatedAt)}</Text>
          </View>
        </Card>

        {/* Excerpt */}
        {post.excerpt && (
          <>
            <Text style={styles.sectionTitle}>Excerpt</Text>
            <Card style={styles.contentCard}>
              <Text style={styles.excerptText}>{post.excerpt}</Text>
            </Card>
          </>
        )}

        {/* Content */}
        {post.content && (
          <>
            <Text style={styles.sectionTitle}>Content</Text>
            <Card style={styles.contentCard}>
              <Text style={styles.contentText}>{post.content}</Text>
            </Card>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={showEditModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEditModal(false)} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Blog Post</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.inputLabel}>Title *</Text>
            <TextInput
              style={styles.input}
              value={editData.title}
              onChangeText={(text) => {
                setEditData({ ...editData, title: text })
              }}
              placeholder="Post title"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.inputLabel}>Slug *</Text>
            <View style={styles.slugRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={editData.slug}
                onChangeText={(text) => setEditData({ ...editData, slug: text })}
                placeholder="post-url-slug"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.generateSlugBtn}
                onPress={() => setEditData({ ...editData, slug: generateSlug(editData.title) })}
              >
                <Ionicons name="refresh-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Status</Text>
            <View style={styles.statusSelector}>
              {STATUS_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.statusOption,
                    editData.status === option.value && styles.statusOptionActive,
                  ]}
                  onPress={() => setEditData({ ...editData, status: option.value })}
                >
                  <Text
                    style={[
                      styles.statusOptionText,
                      editData.status === option.value && styles.statusOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              <TouchableOpacity
                style={[
                  styles.categoryOption,
                  !editData.categoryId && styles.categoryOptionActive,
                ]}
                onPress={() => setEditData({ ...editData, categoryId: '' })}
              >
                <Text
                  style={[
                    styles.categoryOptionText,
                    !editData.categoryId && styles.categoryOptionTextActive,
                  ]}
                >
                  None
                </Text>
              </TouchableOpacity>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryOption,
                    editData.categoryId === category.id && styles.categoryOptionActive,
                  ]}
                  onPress={() => setEditData({ ...editData, categoryId: category.id })}
                >
                  <Text
                    style={[
                      styles.categoryOptionText,
                      editData.categoryId === category.id && styles.categoryOptionTextActive,
                    ]}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Ionicons name="star-outline" size={20} color={colors.textMuted} />
                <Text style={styles.toggleLabel}>Featured Post</Text>
              </View>
              <Switch
                value={editData.featured}
                onValueChange={(value) => setEditData({ ...editData, featured: value })}
                trackColor={{ false: colors.border, true: colors.warning }}
                thumbColor={colors.text}
              />
            </View>

            <Text style={styles.inputLabel}>Excerpt</Text>
            <TextInput
              style={[styles.input, styles.textArea, { minHeight: 80 }]}
              value={editData.excerpt}
              onChangeText={(text) => setEditData({ ...editData, excerpt: text })}
              placeholder="Brief summary of the post..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <Text style={styles.inputLabel}>Content</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={editData.content}
              onChangeText={(text) => setEditData({ ...editData, content: text })}
              placeholder="Write your blog post content here..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={10}
              textAlignVertical="top"
            />

            <View style={{ height: spacing.xxl }} />
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => setShowEditModal(false)}
              style={{ flex: 1 }}
            />
            <Button
              title="Save"
              onPress={savePost}
              loading={saving}
              style={{ flex: 1, marginLeft: spacing.md }}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={showDeleteModal} animationType="fade" transparent>
        <View style={[styles.modalOverlay, styles.deleteModalOverlay]}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteIconContainer}>
              <Ionicons name="warning" size={48} color={colors.error} />
            </View>
            <Text style={styles.deleteModalTitle}>Delete Blog Post?</Text>
            <Text style={styles.deleteModalMessage}>
              Are you sure you want to delete "{post?.title}"? This action cannot be undone.
            </Text>
            <View style={styles.deleteModalButtons}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setShowDeleteModal(false)}
                style={{ flex: 1 }}
                disabled={deleting}
              />
              <Button
                title={deleting ? 'Deleting...' : 'Delete'}
                variant="danger"
                onPress={handleDelete}
                loading={deleting}
                style={{ flex: 1, marginLeft: spacing.md }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: fontSize.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  deleteButton: {
    padding: spacing.sm,
  },
  editButton: {
    padding: spacing.sm,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  coverImage: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.surfaceHover,
  },
  coverImagePlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceHover,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  placeholderText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  postHeader: {
    marginBottom: spacing.lg,
  },
  postTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.lg,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  togglesCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: fontSize.md,
    color: colors.text,
    marginLeft: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  actionsCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  actionBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  detailsCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  detailValue: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
    textAlign: 'right',
    flex: 1,
    marginLeft: spacing.md,
  },
  contentCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  excerptText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  contentText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  modalContent: {
    flex: 1,
    padding: spacing.xl,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: fontSize.md,
  },
  textArea: {
    minHeight: 150,
    paddingTop: spacing.md,
  },
  slugRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  generateSlugBtn: {
    width: 44,
    height: 44,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statusOption: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  statusOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusOptionText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  statusOptionTextActive: {
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  categoryScroll: {
    marginBottom: spacing.md,
  },
  categoryOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
  },
  categoryOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryOptionText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  categoryOptionTextActive: {
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  // Delete modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  deleteModalOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteModalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    marginHorizontal: spacing.xl,
    alignItems: 'center',
    width: '90%',
    maxWidth: 400,
  },
  deleteIconContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: colors.errorBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  deleteModalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  deleteModalMessage: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    width: '100%',
  },
})
