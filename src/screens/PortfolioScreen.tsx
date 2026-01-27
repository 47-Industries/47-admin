import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert, Image } from 'react-native'
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

interface ServiceProject {
  id: string
  title: string
  category: string
  clientName: string
  thumbnailUrl: string | null
  isFeatured: boolean
  showInNavbar: boolean
  isActive: boolean
}

export default function PortfolioScreen({ navigation, hideHeader }: { navigation: any; hideHeader?: boolean }) {
  const [projects, setProjects] = useState<ServiceProject[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('')

  const fetchData = async () => {
    try {
      const projectsRes = await api.getServiceProjects()
      setProjects(projectsRes.projects || [])
    } catch (error) {
      console.error('Failed to fetch portfolio:', error)
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

  const toggleProjectFeatured = async (project: ServiceProject) => {
    try {
      await api.updateServiceProject(project.id, { isFeatured: !project.isFeatured })
      setProjects(prev => prev.map(p =>
        p.id === project.id ? { ...p, isFeatured: !p.isFeatured } : p
      ))
    } catch (error) {
      Alert.alert('Error', 'Failed to update project')
    }
  }

  const toggleProjectActive = async (project: ServiceProject) => {
    try {
      await api.updateServiceProject(project.id, { isActive: !project.isActive })
      setProjects(prev => prev.map(p =>
        p.id === project.id ? { ...p, isActive: !p.isActive } : p
      ))
    } catch (error) {
      Alert.alert('Error', 'Failed to update project')
    }
  }

  const deleteProject = async (project: ServiceProject) => {
    Alert.alert(
      'Delete Project',
      `Are you sure you want to delete "${project.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteServiceProject(project.id)
              setProjects(prev => prev.filter(p => p.id !== project.id))
            } catch (error) {
              Alert.alert('Error', 'Failed to delete project')
            }
          },
        },
      ]
    )
  }

  const filteredProjects = selectedCategory
    ? projects.filter(p => p.category === selectedCategory)
    : projects

  const categories = Object.keys(CATEGORY_LABELS)

  const stats = {
    totalProjects: projects.length,
    featuredProjects: projects.filter(p => p.isFeatured).length,
    activeProjects: projects.filter(p => p.isActive).length,
  }

  const renderProject = ({ item }: { item: ServiceProject }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('PortfolioDetail', { id: item.id })}
      activeOpacity={0.7}
    >
      <Card style={StyleSheet.flatten([styles.projectCard, !item.isActive && styles.projectInactive])}>
        <View style={styles.projectImage}>
          {item.thumbnailUrl ? (
            <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} />
          ) : (
            <View style={styles.noThumbnail}>
              <Ionicons name="image-outline" size={32} color={colors.textMuted} />
            </View>
          )}
          {!item.isActive && (
            <View style={styles.hiddenOverlay}>
              <Text style={styles.hiddenText}>Hidden</Text>
            </View>
          )}
        </View>
        <View style={styles.projectContent}>
          <View style={styles.projectBadges}>
            <Badge
              text={CATEGORY_LABELS[item.category] || item.category}
              variant="primary"
            />
            {item.isFeatured && <Badge text="Featured" variant="warning" />}
            {item.showInNavbar && <Badge text="Navbar" variant="success" />}
          </View>
          <Text style={styles.projectTitle}>{item.title}</Text>
          <Text style={styles.projectClient}>{item.clientName}</Text>
          <View style={styles.projectActions}>
            <TouchableOpacity
              style={[styles.actionBtn, item.isFeatured && styles.actionBtnActive]}
              onPress={() => toggleProjectFeatured(item)}
            >
              <Ionicons
                name="star"
                size={16}
                color={item.isFeatured ? colors.warning : colors.textMuted}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, item.isActive ? styles.actionBtnSuccess : styles.actionBtnError]}
              onPress={() => toggleProjectActive(item)}
            >
              <Ionicons
                name={item.isActive ? 'eye' : 'eye-off'}
                size={16}
                color={item.isActive ? colors.success : colors.error}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => deleteProject(item)}
            >
              <Ionicons name="trash-outline" size={16} color={colors.error} />
            </TouchableOpacity>
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
          <Text style={styles.title}>Portfolio</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('PortfolioDetail', { isNew: true })}
          >
            <Ionicons name="add" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      )}

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.totalProjects}</Text>
          <Text style={styles.statLabel}>Projects</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.success }]}>{stats.activeProjects}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.warning }]}>{stats.featuredProjects}</Text>
          <Text style={styles.statLabel}>Featured</Text>
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
        data={filteredProjects}
        renderItem={renderProject}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.projectsRow}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name="images-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>No portfolio projects</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate('PortfolioDetail', { isNew: true })}
              >
                <Ionicons name="add" size={18} color={colors.primary} />
                <Text style={styles.emptyButtonText}>Add Project</Text>
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
  projectsRow: {
    justifyContent: 'space-between',
  },
  projectCard: {
    width: '48%',
    marginBottom: spacing.md,
    padding: 0,
    overflow: 'hidden',
  },
  projectInactive: {
    opacity: 0.6,
  },
  projectImage: {
    aspectRatio: 16 / 9,
    backgroundColor: colors.surfaceHover,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  noThumbnail: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenText: {
    color: colors.error,
    fontWeight: fontWeight.semibold,
  },
  projectContent: {
    padding: spacing.md,
  },
  projectBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  projectTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  projectClient: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  projectActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceHover,
  },
  actionBtnActive: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
  },
  actionBtnSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  actionBtnError: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
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
