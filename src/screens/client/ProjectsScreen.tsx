import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { api } from '../../services/api'
import { StatusBadge, getStatusType } from '../../components/StatusBadge'
import { EmptyState } from '../../components/EmptyState'
import { colors, portalColors, spacing, borderRadius, fontSize, fontWeight } from '../../theme'
import { Project } from '../../types'

interface ProjectsScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void
    goBack: () => void
  }
  hideHeader?: boolean
}

const statusFilters = ['ALL', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'ON_HOLD']

export function ProjectsScreen({ navigation, hideHeader }: ProjectsScreenProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeFilter, setActiveFilter] = useState('ALL')

  const fetchProjects = async () => {
    try {
      const params = activeFilter === 'ALL' ? {} : { status: activeFilter }
      const data = await api.getClientProjects(params)
      setProjects(data.projects)
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [activeFilter])

  const onRefresh = () => {
    setRefreshing(true)
    fetchProjects()
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'TBD'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  const renderProject = ({ item }: { item: Project }) => (
    <TouchableOpacity
      style={styles.projectCard}
      onPress={() => navigation.navigate('ProjectDetail', { id: item.id })}
    >
      <View style={styles.projectHeader}>
        <View style={styles.projectNumber}>
          <Ionicons name="folder-outline" size={20} color={portalColors.client} />
          <Text style={styles.projectNumberText}>#{item.projectNumber}</Text>
        </View>
        <StatusBadge
          status={getStatusType(item.status)}
          label={item.status.replace(/_/g, ' ')}
          size="sm"
        />
      </View>

      <Text style={styles.projectName}>{item.name}</Text>

      {item.description && (
        <Text style={styles.projectDescription} numberOfLines={2}>
          {item.description}
        </Text>
      )}

      <View style={styles.projectProgress}>
        <Text style={styles.progressLabel}>Progress</Text>
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${item.progress || 0}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>{item.progress || 0}%</Text>
        </View>
      </View>

      <View style={styles.projectFooter}>
        <View style={styles.dateItem}>
          <Text style={styles.dateLabel}>Start</Text>
          <Text style={styles.dateValue}>{formatDate(item.startDate)}</Text>
        </View>
        <View style={styles.dateItem}>
          <Text style={styles.dateLabel}>End</Text>
          <Text style={styles.dateValue}>{formatDate(item.endDate)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container} edges={hideHeader ? [] : ['top']}>
      {!hideHeader && (
        <View style={styles.header}>
          <TouchableOpacity onPress={navigation.goBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Projects</Text>
          <View style={styles.placeholder} />
        </View>
      )}

      {/* Filter */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          data={statusFilters}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterChip, activeFilter === item && styles.filterChipActive]}
              onPress={() => setActiveFilter(item)}
            >
              <Text style={[styles.filterText, activeFilter === item && styles.filterTextActive]}>
                {item.replace(/_/g, ' ')}
              </Text>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item}
        />
      </View>

      <FlatList
        data={projects}
        renderItem={renderProject}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={portalColors.client} />
        }
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="folder-outline"
              title="No projects found"
              description="Your projects will appear here"
            />
          ) : null
        }
      />
    </SafeAreaView>
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
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },
  filterContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterList: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: portalColors.client,
  },
  filterText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.text,
  },
  list: {
    padding: spacing.lg,
    flexGrow: 1,
  },
  projectCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  projectNumber: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  projectNumberText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  projectName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  projectDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  projectProgress: {
    marginBottom: spacing.md,
  },
  progressLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: portalColors.client,
    borderRadius: 3,
  },
  progressText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    width: 40,
    textAlign: 'right',
  },
  projectFooter: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  dateItem: {},
  dateLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: 2,
  },
  dateValue: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
})
