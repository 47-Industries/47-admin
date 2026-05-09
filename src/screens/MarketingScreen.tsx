import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { api } from '../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme'
import { EmptyState } from '../components/EmptyState'
import { EmailActivityScreen } from './admin/EmailActivityScreen'

interface EmailCampaign {
  id: string
  name: string
  subject: string
  content: string
  recipientType: 'all' | 'customers' | 'newsletter'
  status: 'draft' | 'scheduled' | 'sending' | 'sent'
  scheduledAt: string | null
  sentAt: string | null
  totalRecipients: number
  sentCount: number
  deliveredCount: number
  openCount: number
  clickCount: number
  createdAt: string
  updatedAt: string
}

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'error' | 'primary'> = {
  draft: 'default',
  scheduled: 'primary',
  sending: 'warning',
  sent: 'success',
}

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'draft', label: 'Drafts' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'sent', label: 'Sent' },
]

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'All Subscribers' },
  { value: 'customers', label: 'Customers Only' },
  { value: 'newsletter', label: 'Newsletter Subscribers' },
]

export default function MarketingScreen({ navigation, hideHeader }: { navigation: any; hideHeader?: boolean }) {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'activity'>('campaigns')
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<EmailCampaign | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  const fetchCampaigns = useCallback(async () => {
    try {
      const data = await api.getCampaigns({
        status: statusFilter || undefined,
        search: search || undefined,
      })
      setCampaigns(data.campaigns || [])
    } catch (error) {
      console.error('Failed to fetch campaigns:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [statusFilter, search])

  useEffect(() => {
    setLoading(true)
    fetchCampaigns()
  }, [fetchCampaigns])

  const onRefresh = () => {
    setRefreshing(true)
    fetchCampaigns()
  }

  const handleViewCampaign = (campaign: EmailCampaign) => {
    setSelectedCampaign(campaign)
    setShowDetailModal(true)
  }

  const handleDeleteCampaign = async (id: string) => {
    Alert.alert(
      'Delete Campaign',
      'Are you sure you want to delete this campaign? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteCampaign(id)
              fetchCampaigns()
            } catch (error) {
              console.error('Failed to delete campaign:', error)
              Alert.alert('Error', 'Failed to delete campaign')
            }
          },
        },
      ]
    )
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatShortDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const calculateOpenRate = (campaign: EmailCampaign) => {
    if (campaign.sentCount === 0) return '0'
    return ((campaign.openCount / campaign.sentCount) * 100).toFixed(1)
  }

  // Stats
  const stats = {
    total: campaigns.length,
    sent: campaigns.filter(c => c.status === 'sent').length,
    scheduled: campaigns.filter(c => c.status === 'scheduled').length,
    drafts: campaigns.filter(c => c.status === 'draft').length,
    totalSent: campaigns.reduce((sum, c) => sum + c.sentCount, 0),
    totalOpens: campaigns.reduce((sum, c) => sum + c.openCount, 0),
  }

  const avgOpenRate = stats.totalSent > 0 ? ((stats.totalOpens / stats.totalSent) * 100).toFixed(1) : '0'

  const renderCampaign = ({ item }: { item: EmailCampaign }) => (
    <TouchableOpacity onPress={() => handleViewCampaign(item)} activeOpacity={0.7}>
      <Card style={styles.campaignCard}>
        <View style={styles.campaignHeader}>
          <View style={styles.campaignInfo}>
            <Text style={styles.campaignName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.campaignSubject} numberOfLines={1}>
              Subject: {item.subject}
            </Text>
          </View>
          <Badge
            text={item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            variant={statusColors[item.status] || 'default'}
          />
        </View>

        {item.status === 'sent' && (
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.success }]}>{item.sentCount}</Text>
              <Text style={styles.statLabel}>Sent</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{item.openCount}</Text>
              <Text style={styles.statLabel}>Opens</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.warning }]}>{calculateOpenRate(item)}%</Text>
              <Text style={styles.statLabel}>Open Rate</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.purple }]}>{item.clickCount}</Text>
              <Text style={styles.statLabel}>Clicks</Text>
            </View>
          </View>
        )}

        <View style={styles.campaignFooter}>
          <View style={styles.audienceTag}>
            <Ionicons name="people-outline" size={14} color={colors.textMuted} />
            <Text style={styles.audienceText}>
              {item.recipientType === 'all' ? 'All Subscribers' :
               item.recipientType === 'customers' ? 'Customers' : 'Newsletter'}
            </Text>
          </View>
          <Text style={styles.dateText}>
            {item.status === 'sent' ? `Sent ${formatShortDate(item.sentAt)}` :
             item.status === 'scheduled' ? `Scheduled ${formatShortDate(item.scheduledAt)}` :
             `Created ${formatShortDate(item.createdAt)}`}
          </Text>
        </View>

        {item.status === 'draft' && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                setSelectedCampaign(item)
                setShowCreateModal(true)
              }}
            >
              <Ionicons name="create-outline" size={16} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.primary }]}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDeleteCampaign(item.id)}
            >
              <Ionicons name="trash-outline" size={16} color={colors.error} />
              <Text style={[styles.actionText, { color: colors.error }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </Card>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      {!hideHeader && (
        <View style={styles.header}>
          <Text style={styles.title}>Marketing</Text>
          {activeTab === 'campaigns' && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                setSelectedCampaign(null)
                setShowCreateModal(true)
              }}
            >
              <Ionicons name="add" size={24} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Tab segment */}
      <View style={styles.tabSegment}>
        <TouchableOpacity
          style={[styles.tabSegmentItem, activeTab === 'campaigns' && styles.tabSegmentItemActive]}
          onPress={() => setActiveTab('campaigns')}
        >
          <Text style={[styles.tabSegmentText, activeTab === 'campaigns' && styles.tabSegmentTextActive]}>Campaigns</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabSegmentItem, activeTab === 'activity' && styles.tabSegmentItemActive]}
          onPress={() => setActiveTab('activity')}
        >
          <Text style={[styles.tabSegmentText, activeTab === 'activity' && styles.tabSegmentTextActive]}>Email Activity</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'activity' && <EmailActivityScreen />}

      {activeTab === 'campaigns' && <>

      {/* Stats Row */}
      <View style={styles.statsContainer}>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statCardValue}>{stats.total}</Text>
            <Text style={styles.statCardLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statCardValue, { color: colors.success }]}>{stats.sent}</Text>
            <Text style={styles.statCardLabel}>Sent</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statCardValue, { color: colors.primary }]}>{stats.scheduled}</Text>
            <Text style={styles.statCardLabel}>Scheduled</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statCardValue, { color: colors.warning }]}>{avgOpenRate}%</Text>
            <Text style={styles.statCardLabel}>Open Rate</Text>
          </View>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search campaigns..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Status Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersList}>
          {STATUS_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.value}
              style={[styles.filterChip, statusFilter === filter.value && styles.filterChipActive]}
              onPress={() => setStatusFilter(filter.value)}
            >
              <Text style={[styles.filterChipText, statusFilter === filter.value && styles.filterChipTextActive]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Campaign List */}
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
            <EmptyState icon="mail-outline" title="No campaigns found" />
          ) : (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )
        }
      />

      {/* Create/Edit Campaign Modal */}
      <CampaignModal
        visible={showCreateModal}
        campaign={selectedCampaign}
        onClose={() => {
          setShowCreateModal(false)
          setSelectedCampaign(null)
        }}
        onSaved={() => {
          setShowCreateModal(false)
          setSelectedCampaign(null)
          fetchCampaigns()
        }}
      />

      {/* Campaign Detail Modal */}
      <CampaignDetailModal
        visible={showDetailModal}
        campaign={selectedCampaign}
        onClose={() => {
          setShowDetailModal(false)
          setSelectedCampaign(null)
        }}
        onEdit={() => {
          setShowDetailModal(false)
          setShowCreateModal(true)
        }}
        onDelete={() => {
          if (selectedCampaign) {
            handleDeleteCampaign(selectedCampaign.id)
          }
          setShowDetailModal(false)
          setSelectedCampaign(null)
        }}
      />

      </>}
    </View>
  )
}

// Campaign Create/Edit Modal Component
function CampaignModal({
  visible,
  campaign,
  onClose,
  onSaved,
}: {
  visible: boolean
  campaign: EmailCampaign | null
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [recipientType, setRecipientType] = useState<'all' | 'customers' | 'newsletter'>('all')
  const [scheduleMode, setScheduleMode] = useState<'now' | 'schedule'>('now')
  const [scheduledAt, setScheduledAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (campaign) {
      setName(campaign.name)
      setSubject(campaign.subject)
      setContent(campaign.content)
      setRecipientType(campaign.recipientType)
      if (campaign.scheduledAt) {
        setScheduleMode('schedule')
        setScheduledAt(campaign.scheduledAt)
      } else {
        setScheduleMode('now')
        setScheduledAt('')
      }
    } else {
      resetForm()
    }
  }, [campaign, visible])

  const resetForm = () => {
    setName('')
    setSubject('')
    setContent('')
    setRecipientType('all')
    setScheduleMode('now')
    setScheduledAt('')
    setError('')
  }

  const handleSaveDraft = async () => {
    if (!validateForm()) return
    setLoading(true)
    setError('')

    try {
      if (campaign) {
        await api.updateCampaign(campaign.id, {
          name,
          subject,
          content,
          recipientType,
          status: 'draft',
        })
      } else {
        await api.createCampaign({
          name,
          subject,
          content,
          recipientType,
          status: 'draft',
        })
      }
      onSaved()
    } catch (err: any) {
      setError(err.message || 'Failed to save campaign')
    } finally {
      setLoading(false)
    }
  }

  const handleSchedule = async () => {
    if (!validateForm()) return
    if (scheduleMode === 'schedule' && !scheduledAt) {
      setError('Please select a schedule date and time')
      return
    }
    setLoading(true)
    setError('')

    try {
      if (campaign) {
        await api.updateCampaign(campaign.id, {
          name,
          subject,
          content,
          recipientType,
          status: 'scheduled',
          scheduledAt: scheduleMode === 'schedule' ? scheduledAt : undefined,
        })
      } else {
        await api.createCampaign({
          name,
          subject,
          content,
          recipientType,
          status: 'scheduled',
          scheduledAt: scheduleMode === 'schedule' ? scheduledAt : undefined,
        })
      }
      onSaved()
    } catch (err: any) {
      setError(err.message || 'Failed to schedule campaign')
    } finally {
      setLoading(false)
    }
  }

  const handleSendNow = async () => {
    if (!validateForm()) return

    Alert.alert(
      'Send Campaign',
      'Are you sure you want to send this campaign immediately?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            setLoading(true)
            setError('')

            try {
              let campaignId = campaign?.id
              if (!campaignId) {
                const result = await api.createCampaign({
                  name,
                  subject,
                  content,
                  recipientType,
                  status: 'draft',
                })
                campaignId = result.campaign.id
              } else {
                await api.updateCampaign(campaignId, {
                  name,
                  subject,
                  content,
                  recipientType,
                })
              }
              await api.sendCampaign(campaignId)
              onSaved()
            } catch (err: any) {
              setError(err.message || 'Failed to send campaign')
            } finally {
              setLoading(false)
            }
          },
        },
      ]
    )
  }

  const validateForm = () => {
    if (!name.trim()) {
      setError('Campaign name is required')
      return false
    }
    if (!subject.trim()) {
      setError('Subject line is required')
      return false
    }
    if (!content.trim()) {
      setError('Email content is required')
      return false
    }
    return true
  }

  const isViewOnly = campaign?.status === 'sent' || campaign?.status === 'sending'

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {isViewOnly ? 'View Campaign' : campaign ? 'Edit Campaign' : 'New Campaign'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.formGroup}>
            <Text style={styles.label}>Campaign Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g., Holiday Sale Announcement"
              placeholderTextColor={colors.textMuted}
              editable={!isViewOnly}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Subject Line *</Text>
            <TextInput
              style={styles.input}
              value={subject}
              onChangeText={setSubject}
              placeholder="e.g., Don't miss our biggest sale!"
              placeholderTextColor={colors.textMuted}
              editable={!isViewOnly}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Audience</Text>
            <View style={styles.audienceSelector}>
              {AUDIENCE_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.audienceOption,
                    recipientType === option.value && styles.audienceOptionActive,
                  ]}
                  onPress={() => !isViewOnly && setRecipientType(option.value as any)}
                  disabled={isViewOnly}
                >
                  <Text
                    style={[
                      styles.audienceOptionText,
                      recipientType === option.value && styles.audienceOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Email Content *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={content}
              onChangeText={setContent}
              placeholder="Write your email content here..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={10}
              textAlignVertical="top"
              editable={!isViewOnly}
            />
          </View>

          {!isViewOnly && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>Send Options</Text>
              <View style={styles.scheduleSelector}>
                <TouchableOpacity
                  style={[styles.scheduleOption, scheduleMode === 'now' && styles.scheduleOptionActive]}
                  onPress={() => setScheduleMode('now')}
                >
                  <Ionicons
                    name="flash-outline"
                    size={20}
                    color={scheduleMode === 'now' ? colors.text : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.scheduleOptionText,
                      scheduleMode === 'now' && styles.scheduleOptionTextActive,
                    ]}
                  >
                    Send Now
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.scheduleOption, scheduleMode === 'schedule' && styles.scheduleOptionActive]}
                  onPress={() => setScheduleMode('schedule')}
                >
                  <Ionicons
                    name="time-outline"
                    size={20}
                    color={scheduleMode === 'schedule' ? colors.text : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.scheduleOptionText,
                      scheduleMode === 'schedule' && styles.scheduleOptionTextActive,
                    ]}
                  >
                    Schedule
                  </Text>
                </TouchableOpacity>
              </View>

              {scheduleMode === 'schedule' && (
                <TextInput
                  style={[styles.input, { marginTop: spacing.md }]}
                  value={scheduledAt}
                  onChangeText={setScheduledAt}
                  placeholder="YYYY-MM-DD HH:MM"
                  placeholderTextColor={colors.textMuted}
                />
              )}
            </View>
          )}

          <View style={{ height: spacing.xxl }} />
        </ScrollView>

        {!isViewOnly && (
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.footerButton, styles.footerButtonSecondary]}
              onPress={handleSaveDraft}
              disabled={loading}
            >
              <Text style={styles.footerButtonSecondaryText}>
                {loading ? 'Saving...' : 'Save Draft'}
              </Text>
            </TouchableOpacity>
            {scheduleMode === 'schedule' ? (
              <TouchableOpacity
                style={[styles.footerButton, styles.footerButtonPrimary]}
                onPress={handleSchedule}
                disabled={loading}
              >
                <Text style={styles.footerButtonPrimaryText}>
                  {loading ? 'Scheduling...' : 'Schedule'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.footerButton, styles.footerButtonSuccess]}
                onPress={handleSendNow}
                disabled={loading}
              >
                <Text style={styles.footerButtonPrimaryText}>
                  {loading ? 'Sending...' : 'Send Now'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  )
}

// Campaign Detail Modal Component
function CampaignDetailModal({
  visible,
  campaign,
  onClose,
  onEdit,
  onDelete,
}: {
  visible: boolean
  campaign: EmailCampaign | null
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  if (!campaign) return null

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

  const calculateRate = (numerator: number, denominator: number) => {
    if (denominator === 0) return '0'
    return ((numerator / denominator) * 100).toFixed(1)
  }

  const isSent = campaign.status === 'sent'
  const isDraft = campaign.status === 'draft'

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Campaign Details</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {/* Campaign Info */}
          <Card style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailName}>{campaign.name}</Text>
              <Badge
                text={campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                variant={statusColors[campaign.status] || 'default'}
              />
            </View>
            <Text style={styles.detailSubject}>Subject: {campaign.subject}</Text>
            <View style={styles.detailMeta}>
              <View style={styles.detailMetaItem}>
                <Ionicons name="people-outline" size={16} color={colors.textMuted} />
                <Text style={styles.detailMetaText}>
                  {campaign.recipientType === 'all' ? 'All Subscribers' :
                   campaign.recipientType === 'customers' ? 'Customers Only' : 'Newsletter Subscribers'}
                </Text>
              </View>
              <View style={styles.detailMetaItem}>
                <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
                <Text style={styles.detailMetaText}>
                  {campaign.status === 'sent' ? `Sent ${formatDate(campaign.sentAt)}` :
                   campaign.status === 'scheduled' ? `Scheduled ${formatDate(campaign.scheduledAt)}` :
                   `Created ${formatDate(campaign.createdAt)}`}
                </Text>
              </View>
            </View>
          </Card>

          {/* Stats (for sent campaigns) */}
          {isSent && (
            <Card style={styles.detailCard}>
              <Text style={styles.sectionTitle}>Campaign Performance</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={[styles.statBoxValue, { color: colors.success }]}>{campaign.sentCount}</Text>
                  <Text style={styles.statBoxLabel}>Sent</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statBoxValue, { color: colors.primary }]}>{campaign.deliveredCount}</Text>
                  <Text style={styles.statBoxLabel}>Delivered</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statBoxValue, { color: colors.warning }]}>{campaign.openCount}</Text>
                  <Text style={styles.statBoxLabel}>Opened</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statBoxValue, { color: colors.purple }]}>{campaign.clickCount}</Text>
                  <Text style={styles.statBoxLabel}>Clicked</Text>
                </View>
              </View>

              <View style={styles.ratesRow}>
                <View style={styles.rateItem}>
                  <Text style={styles.rateLabel}>Open Rate</Text>
                  <Text style={styles.rateValue}>{calculateRate(campaign.openCount, campaign.sentCount)}%</Text>
                </View>
                <View style={styles.rateItem}>
                  <Text style={styles.rateLabel}>Click Rate</Text>
                  <Text style={styles.rateValue}>{calculateRate(campaign.clickCount, campaign.openCount)}%</Text>
                </View>
                <View style={styles.rateItem}>
                  <Text style={styles.rateLabel}>Delivery Rate</Text>
                  <Text style={styles.rateValue}>{calculateRate(campaign.deliveredCount, campaign.sentCount)}%</Text>
                </View>
              </View>
            </Card>
          )}

          {/* Email Content Preview */}
          <Card style={styles.detailCard}>
            <Text style={styles.sectionTitle}>Email Content</Text>
            <View style={styles.contentPreview}>
              <Text style={styles.contentText}>{campaign.content}</Text>
            </View>
          </Card>

          <View style={{ height: spacing.xxl }} />
        </ScrollView>

        {/* Actions for draft campaigns */}
        {isDraft && (
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.footerButton, styles.footerButtonDanger]}
              onPress={onDelete}
            >
              <Text style={styles.footerButtonDangerText}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.footerButton, styles.footerButtonPrimary]}
              onPress={onEdit}
            >
              <Text style={styles.footerButtonPrimaryText}>Edit</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
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
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  tabSegment: {
    flexDirection: 'row',
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabSegmentItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  tabSegmentItemActive: {
    backgroundColor: colors.primary,
  },
  tabSegmentText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium as any,
    color: colors.textMuted,
  },
  tabSegmentTextActive: {
    color: '#fff',
    fontWeight: fontWeight.semibold as any,
  },
  title: {
    fontSize: fontSize.xxl,
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
  statsContainer: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statCardValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statCardLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  searchContainer: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    color: colors.text,
    fontSize: fontSize.md,
  },
  filtersContainer: {
    marginBottom: spacing.md,
  },
  filtersList: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  filterChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  filterChipTextActive: {
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
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
  statsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  campaignFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  audienceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  audienceText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  dateText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionText: {
    fontSize: fontSize.sm,
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
  emptyButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  emptyButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
  },

  // Modal Styles
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
  errorBox: {
    backgroundColor: colors.errorBg,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSize.sm,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: fontSize.md,
  },
  textArea: {
    minHeight: 150,
    paddingTop: spacing.md,
  },
  audienceSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  audienceOption: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  audienceOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  audienceOptionText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  audienceOptionTextActive: {
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  scheduleSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  scheduleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
  },
  scheduleOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  scheduleOptionText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  scheduleOptionTextActive: {
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerButtonSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  footerButtonSecondaryText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  footerButtonPrimary: {
    backgroundColor: colors.primary,
  },
  footerButtonPrimaryText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  footerButtonSuccess: {
    backgroundColor: colors.success,
  },
  footerButtonDanger: {
    backgroundColor: colors.errorBg,
    borderWidth: 1,
    borderColor: colors.error,
  },
  footerButtonDangerText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.error,
  },

  // Detail Modal Styles
  detailCard: {
    marginBottom: spacing.lg,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  detailName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    flex: 1,
    marginRight: spacing.md,
  },
  detailSubject: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  detailMeta: {
    gap: spacing.sm,
  },
  detailMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailMetaText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surfaceHover,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  statBoxValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statBoxLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  ratesRow: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rateItem: {
    flex: 1,
    alignItems: 'center',
  },
  rateLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  rateValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  contentPreview: {
    backgroundColor: colors.surfaceHover,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  contentText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
})
