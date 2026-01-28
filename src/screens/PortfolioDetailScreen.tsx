import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
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

const CATEGORIES = [
  { value: 'WEB_DEVELOPMENT', label: 'Web Development' },
  { value: 'WEB_APP', label: 'Web Application' },
  { value: 'IOS_APP', label: 'iOS App' },
  { value: 'ANDROID_APP', label: 'Android App' },
  { value: 'CROSS_PLATFORM_APP', label: 'Cross-Platform App' },
  { value: 'AI_AUTOMATION', label: 'AI Automation' },
  { value: 'DESKTOP_APP', label: 'Desktop App' },
  { value: 'THREE_D_PRINTING', label: '3D Printing' },
]

const CATEGORY_LABELS: Record<string, string> = {
  WEB_DEVELOPMENT: 'Web Dev',
  WEB_APP: 'Web App',
  IOS_APP: 'iOS',
  ANDROID_APP: 'Android',
  CROSS_PLATFORM_APP: 'Cross-Platform',
  AI_AUTOMATION: 'AI',
  DESKTOP_APP: 'Desktop',
  THREE_D_PRINTING: '3D Printing',
}

interface ProjectData {
  id: string
  title: string
  slug: string
  category: string
  categories: string[] | null
  clientName: string
  clientLogo: string | null
  description: string
  challenge: string | null
  solution: string | null
  results: string | null
  thumbnailUrl: string | null
  images: (string | { url: string; type: 'mobile' | 'desktop' })[] | null
  videoUrl: string | null
  liveUrl: string | null
  accentColor: string | null
  technologies: string[] | null
  testimonial: string | null
  testimonialAuthor: string | null
  testimonialRole: string | null
  isFeatured: boolean
  showInNavbar: boolean
  isActive: boolean
  sortOrder: number
}

export default function PortfolioDetailScreen({ navigation, route }: any) {
  const { id, isNew } = route.params || {}
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showTechModal, setShowTechModal] = useState(false)
  const [newTech, setNewTech] = useState('')

  const [formData, setFormData] = useState({
    title: '',
    category: 'WEB_DEVELOPMENT',
    categories: [] as string[],
    clientName: '',
    clientLogo: '',
    description: '',
    challenge: '',
    solution: '',
    results: '',
    thumbnailUrl: '',
    images: [] as { url: string; type: 'mobile' | 'desktop' }[],
    videoUrl: '',
    liveUrl: '',
    accentColor: '',
    technologies: [] as string[],
    testimonial: '',
    testimonialAuthor: '',
    testimonialRole: '',
    isFeatured: false,
    showInNavbar: false,
    isActive: true,
    sortOrder: 0,
  })

  useEffect(() => {
    if (id && !isNew) {
      fetchProject()
    }
  }, [id])

  const fetchProject = async () => {
    try {
      const data = await api.getServiceProject(id)
      const project = data.project as ProjectData

      // Normalize images
      const normalizedImages = (project.images || []).map(img => {
        if (typeof img === 'string') {
          return { url: img, type: 'mobile' as const }
        }
        return img
      })

      setFormData({
        title: project.title,
        category: project.category,
        categories: project.categories || [],
        clientName: project.clientName,
        clientLogo: project.clientLogo || '',
        description: project.description,
        challenge: project.challenge || '',
        solution: project.solution || '',
        results: project.results || '',
        thumbnailUrl: project.thumbnailUrl || '',
        images: normalizedImages,
        videoUrl: project.videoUrl || '',
        liveUrl: project.liveUrl || '',
        accentColor: project.accentColor || '',
        technologies: project.technologies || [],
        testimonial: project.testimonial || '',
        testimonialAuthor: project.testimonialAuthor || '',
        testimonialRole: project.testimonialRole || '',
        isFeatured: project.isFeatured,
        showInNavbar: project.showInNavbar,
        isActive: project.isActive,
        sortOrder: project.sortOrder,
      })
    } catch (error) {
      console.error('Failed to fetch project:', error)
      Alert.alert('Error', 'Failed to load project details')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Please enter a project title')
      return
    }
    if (!formData.clientName.trim()) {
      Alert.alert('Error', 'Please enter a client name')
      return
    }
    if (!formData.description.trim()) {
      Alert.alert('Error', 'Please enter a description')
      return
    }

    setSaving(true)
    try {
      await api.updateServiceProject(id, {
        ...formData,
        sortOrder: parseInt(String(formData.sortOrder)) || 0,
      })
      Alert.alert('Success', 'Project updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ])
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update project')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.deleteServiceProject(id)
      setShowDeleteModal(false)
      Alert.alert('Success', 'Project deleted successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ])
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to delete project')
    } finally {
      setDeleting(false)
    }
  }

  const toggleCategory = (category: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category],
    }))
  }

  const addTechnology = () => {
    if (newTech.trim() && !formData.technologies.includes(newTech.trim())) {
      setFormData(prev => ({
        ...prev,
        technologies: [...prev.technologies, newTech.trim()],
      }))
      setNewTech('')
    }
  }

  const removeTechnology = (tech: string) => {
    setFormData(prev => ({
      ...prev,
      technologies: prev.technologies.filter(t => t !== tech),
    }))
  }

  const toggleFeatured = async () => {
    const newValue = !formData.isFeatured
    setFormData(prev => ({ ...prev, isFeatured: newValue }))
    try {
      await api.updateServiceProject(id, { isFeatured: newValue })
    } catch (error) {
      setFormData(prev => ({ ...prev, isFeatured: !newValue }))
      Alert.alert('Error', 'Failed to update project')
    }
  }

  const toggleActive = async () => {
    const newValue = !formData.isActive
    setFormData(prev => ({ ...prev, isActive: newValue }))
    try {
      await api.updateServiceProject(id, { isActive: newValue })
    } catch (error) {
      setFormData(prev => ({ ...prev, isActive: !newValue }))
      Alert.alert('Error', 'Failed to update project')
    }
  }

  const toggleShowInNavbar = async () => {
    const newValue = !formData.showInNavbar
    setFormData(prev => ({ ...prev, showInNavbar: newValue }))
    try {
      await api.updateServiceProject(id, { showInNavbar: newValue })
    } catch (error) {
      setFormData(prev => ({ ...prev, showInNavbar: !newValue }))
      Alert.alert('Error', 'Failed to update project')
    }
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {isNew ? 'New Project' : formData.title || 'Project Details'}
        </Text>
        <View style={styles.headerActions}>
          {!isNew && (
            <TouchableOpacity onPress={() => setShowDeleteModal(true)} style={styles.deleteButton}>
              <Ionicons name="trash-outline" size={22} color={colors.error} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Thumbnail Preview */}
          {formData.thumbnailUrl ? (
            <Image source={{ uri: formData.thumbnailUrl }} style={styles.thumbnail} />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <Ionicons name="image-outline" size={48} color={colors.textMuted} />
              <Text style={styles.thumbnailPlaceholderText}>No thumbnail</Text>
            </View>
          )}

          {/* Status Badges */}
          <View style={styles.badges}>
            <Badge
              text={CATEGORY_LABELS[formData.category] || formData.category}
              variant="primary"
            />
            {formData.isFeatured && <Badge text="Featured" variant="warning" />}
            {formData.showInNavbar && <Badge text="Navbar" variant="success" />}
            {!formData.isActive && <Badge text="Hidden" variant="error" />}
          </View>

          {/* Quick Toggles */}
          <Card style={styles.togglesCard}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Ionicons name="eye-outline" size={20} color={colors.textMuted} />
                <Text style={styles.toggleLabel}>Active (visible on site)</Text>
              </View>
              <Switch
                value={formData.isActive}
                onValueChange={toggleActive}
                trackColor={{ false: colors.border, true: colors.success }}
                thumbColor={colors.text}
              />
            </View>
            <View style={styles.toggleDivider} />
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Ionicons name="star-outline" size={20} color={colors.textMuted} />
                <Text style={styles.toggleLabel}>Featured Project</Text>
              </View>
              <Switch
                value={formData.isFeatured}
                onValueChange={toggleFeatured}
                trackColor={{ false: colors.border, true: colors.warning }}
                thumbColor={colors.text}
              />
            </View>
            <View style={styles.toggleDivider} />
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Ionicons name="menu-outline" size={20} color={colors.textMuted} />
                <Text style={styles.toggleLabel}>Show in Navbar</Text>
              </View>
              <Switch
                value={formData.showInNavbar}
                onValueChange={toggleShowInNavbar}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.text}
              />
            </View>
          </Card>

          {/* Basic Information */}
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <Card style={styles.formCard}>
            <Text style={styles.inputLabel}>Project Title *</Text>
            <TextInput
              style={styles.input}
              value={formData.title}
              onChangeText={text => setFormData(prev => ({ ...prev, title: text }))}
              placeholder="e.g., E-Commerce Platform Redesign"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.inputLabel}>Primary Category *</Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowCategoryModal(true)}
            >
              <Text style={styles.selectButtonText}>
                {CATEGORIES.find(c => c.value === formData.category)?.label || formData.category}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
            </TouchableOpacity>

            <Text style={styles.inputLabel}>Client Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.clientName}
              onChangeText={text => setFormData(prev => ({ ...prev, clientName: text }))}
              placeholder="e.g., Acme Corporation"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.inputLabel}>Live URL</Text>
            <TextInput
              style={styles.input}
              value={formData.liveUrl}
              onChangeText={text => setFormData(prev => ({ ...prev, liveUrl: text }))}
              placeholder="https://example.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="url"
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={text => setFormData(prev => ({ ...prev, description: text }))}
              placeholder="Provide an overview of the project..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </Card>

          {/* Additional Categories */}
          <Text style={styles.sectionTitle}>Additional Categories</Text>
          <Card style={styles.formCard}>
            <Text style={styles.helperText}>Select all categories that apply to this project</Text>
            <View style={styles.categoryChips}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.categoryChip,
                    formData.categories.includes(cat.value) && styles.categoryChipActive,
                  ]}
                  onPress={() => toggleCategory(cat.value)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      formData.categories.includes(cat.value) && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          {/* Case Study Details */}
          <Text style={styles.sectionTitle}>Case Study Details</Text>
          <Card style={styles.formCard}>
            <Text style={styles.inputLabel}>The Challenge</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.challenge}
              onChangeText={text => setFormData(prev => ({ ...prev, challenge: text }))}
              placeholder="What problems did the client face?"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <Text style={styles.inputLabel}>The Solution</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.solution}
              onChangeText={text => setFormData(prev => ({ ...prev, solution: text }))}
              placeholder="How did you solve the problem?"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <Text style={styles.inputLabel}>The Results</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.results}
              onChangeText={text => setFormData(prev => ({ ...prev, results: text }))}
              placeholder="What outcomes were achieved?"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </Card>

          {/* Technologies */}
          <Text style={styles.sectionTitle}>Technologies Used</Text>
          <Card style={styles.formCard}>
            <View style={styles.techInputRow}>
              <TextInput
                style={[styles.input, styles.techInput]}
                value={newTech}
                onChangeText={setNewTech}
                placeholder="e.g., React, Node.js, AWS"
                placeholderTextColor={colors.textMuted}
                onSubmitEditing={addTechnology}
                returnKeyType="done"
              />
              <TouchableOpacity style={styles.addTechButton} onPress={addTechnology}>
                <Ionicons name="add" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            {formData.technologies.length > 0 && (
              <View style={styles.techChips}>
                {formData.technologies.map(tech => (
                  <View key={tech} style={styles.techChip}>
                    <Text style={styles.techChipText}>{tech}</Text>
                    <TouchableOpacity
                      onPress={() => removeTechnology(tech)}
                      style={styles.techChipRemove}
                    >
                      <Ionicons name="close" size={14} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </Card>

          {/* Media */}
          <Text style={styles.sectionTitle}>Media</Text>
          <Card style={styles.formCard}>
            <Text style={styles.inputLabel}>Thumbnail URL</Text>
            <TextInput
              style={styles.input}
              value={formData.thumbnailUrl}
              onChangeText={text => setFormData(prev => ({ ...prev, thumbnailUrl: text }))}
              placeholder="https://example.com/image.jpg"
              placeholderTextColor={colors.textMuted}
              keyboardType="url"
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Video URL</Text>
            <TextInput
              style={styles.input}
              value={formData.videoUrl}
              onChangeText={text => setFormData(prev => ({ ...prev, videoUrl: text }))}
              placeholder="https://youtube.com/watch?v=..."
              placeholderTextColor={colors.textMuted}
              keyboardType="url"
              autoCapitalize="none"
            />
            <Text style={styles.helperText}>YouTube or Vimeo URL</Text>
          </Card>

          {/* Gallery Images */}
          {formData.images.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Gallery ({formData.images.length})</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.galleryScroll}
              >
                {formData.images.map((img, index) => (
                  <View key={index} style={styles.galleryItem}>
                    <Image source={{ uri: img.url }} style={styles.galleryImage} />
                    <View style={styles.galleryBadge}>
                      <Text style={styles.galleryBadgeText}>
                        {img.type === 'desktop' ? 'Desktop' : 'Mobile'}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </>
          )}

          {/* Testimonial */}
          <Text style={styles.sectionTitle}>Client Testimonial</Text>
          <Card style={styles.formCard}>
            <Text style={styles.inputLabel}>Testimonial Quote</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.testimonial}
              onChangeText={text => setFormData(prev => ({ ...prev, testimonial: text }))}
              placeholder="What did the client say about working with you?"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <Text style={styles.inputLabel}>Author Name</Text>
            <TextInput
              style={styles.input}
              value={formData.testimonialAuthor}
              onChangeText={text => setFormData(prev => ({ ...prev, testimonialAuthor: text }))}
              placeholder="e.g., John Smith"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.inputLabel}>Author Role</Text>
            <TextInput
              style={styles.input}
              value={formData.testimonialRole}
              onChangeText={text => setFormData(prev => ({ ...prev, testimonialRole: text }))}
              placeholder="e.g., CEO at Acme Corp"
              placeholderTextColor={colors.textMuted}
            />
          </Card>

          {/* Settings */}
          <Text style={styles.sectionTitle}>Settings</Text>
          <Card style={styles.formCard}>
            <Text style={styles.inputLabel}>Sort Order</Text>
            <TextInput
              style={styles.input}
              value={String(formData.sortOrder)}
              onChangeText={text =>
                setFormData(prev => ({ ...prev, sortOrder: parseInt(text) || 0 }))
              }
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
            />
            <Text style={styles.helperText}>Lower numbers appear first</Text>

            <Text style={[styles.inputLabel, { marginTop: spacing.lg }]}>Accent Color</Text>
            <TextInput
              style={styles.input}
              value={formData.accentColor}
              onChangeText={text => setFormData(prev => ({ ...prev, accentColor: text }))}
              placeholder="#3b82f6"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />
            <Text style={styles.helperText}>
              Custom brand color for this project page (leave blank for default blue)
            </Text>
          </Card>

          {/* Save Button */}
          <View style={styles.saveContainer}>
            <Button title={saving ? 'Saving...' : 'Save Changes'} onPress={handleSave} loading={saving} />
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Category Selection Modal */}
      <Modal visible={showCategoryModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <ScrollView style={styles.modalScroll}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.modalOption,
                    formData.category === cat.value && styles.modalOptionActive,
                  ]}
                  onPress={() => {
                    setFormData(prev => ({ ...prev, category: cat.value }))
                    setShowCategoryModal(false)
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      formData.category === cat.value && styles.modalOptionTextActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                  {formData.category === cat.value && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Button title="Cancel" variant="outline" onPress={() => setShowCategoryModal(false)} />
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={showDeleteModal} animationType="fade" transparent>
        <View style={[styles.modalOverlay, styles.deleteModalOverlay]}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteIconContainer}>
              <Ionicons name="warning" size={48} color={colors.error} />
            </View>
            <Text style={styles.deleteModalTitle}>Delete Project?</Text>
            <Text style={styles.deleteModalMessage}>
              Are you sure you want to delete "{formData.title}"? This action cannot be undone.
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
    marginLeft: spacing.sm,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    padding: spacing.sm,
  },
  keyboardView: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  thumbnail: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.surfaceHover,
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.surfaceHover,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailPlaceholderText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  togglesCard: {
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
  toggleDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginVertical: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  formCard: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: fontSize.md,
    marginBottom: spacing.lg,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: -spacing.md,
    marginBottom: spacing.lg,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  selectButtonText: {
    color: colors.text,
    fontSize: fontSize.md,
  },
  categoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceHover,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  categoryChipTextActive: {
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  techInputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  techInput: {
    flex: 1,
    marginBottom: 0,
  },
  addTechButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  techChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  techChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingVertical: spacing.xs,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  techChipText: {
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  techChipRemove: {
    padding: spacing.xs,
  },
  galleryScroll: {
    marginBottom: spacing.lg,
  },
  galleryItem: {
    marginRight: spacing.md,
    position: 'relative',
  },
  galleryImage: {
    width: 120,
    height: 80,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceHover,
  },
  galleryBadge: {
    position: 'absolute',
    bottom: spacing.xs,
    left: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  galleryBadgeText: {
    fontSize: 10,
    color: colors.text,
  },
  saveContainer: {
    marginTop: spacing.lg,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xxl,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  modalScroll: {
    marginBottom: spacing.lg,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalOptionActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    marginHorizontal: -spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderBottomWidth: 0,
  },
  modalOptionText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  modalOptionTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.medium,
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
