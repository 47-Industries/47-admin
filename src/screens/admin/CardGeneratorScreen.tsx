import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  Modal,
  Linking,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { WebView } from 'react-native-webview'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import { Card } from '../../components/Card'
import { ZoomableView } from '../../components/ZoomableView'
import { Badge } from '../../components/Badge'
import { api } from '../../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme'

type BrandType = 'FORTY_SEVEN_INDUSTRIES' | 'MOTOREV' | 'BOOKFADE' | 'CUSTOM'
type LayoutType = 'standard' | 'qr-focus' | 'minimal' | 'photo-hero'

interface BookFadeBarber {
  id: string
  name: string
  slug: string
  businessName: string | null
  businessCity: string | null
  businessState: string | null
  profileImage: string | null
  heroImage?: string | null
  themeColor?: string | null
  cardData?: { tagline?: string }
  businessAddress?: string | null
}

interface TeamMember {
  id: string
  name: string
  email: string | null
  phone: string | null
  title: string | null
  image: string | null
  userId: string | null
  user?: {
    email: string | null
    image: string | null
  }
}

interface SavedDesign {
  id: string
  name: string
  brand: BrandType | null
  cardData: Record<string, unknown>
}

interface CardGeneratorScreenProps {
  navigation: any
  route?: {
    params?: {
      design?: SavedDesign
    }
  }
}

const BRAND_OPTIONS: { key: BrandType; label: string; color: string }[] = [
  { key: 'FORTY_SEVEN_INDUSTRIES', label: '47 Industries', color: colors.primary },
  { key: 'MOTOREV', label: 'MotoRev', color: colors.error },
  { key: 'BOOKFADE', label: 'BookFade', color: colors.purpleAlt },
  { key: 'CUSTOM', label: 'Custom', color: '#71717a' },
]

const LAYOUT_OPTIONS: { id: LayoutType; name: string; description: string }[] = [
  { id: 'standard', name: 'Standard', description: 'Classic layout with contact info' },
  { id: 'qr-focus', name: 'QR Focus', description: 'Prominent QR code for digital connection' },
  { id: 'minimal', name: 'Minimal', description: 'Clean, simple design' },
  { id: 'photo-hero', name: 'Photo Hero', description: 'Large profile image emphasis' },
]

const COLOR_PRESETS = [colors.primary, colors.purpleAlt, colors.error, colors.success, colors.warning, colors.pink]

export default function CardGeneratorScreen({ navigation, route }: CardGeneratorScreenProps) {
  const existingDesign = route?.params?.design

  // Brand & Layout
  const [selectedBrand, setSelectedBrand] = useState<BrandType>('FORTY_SEVEN_INDUSTRIES')
  const [selectedLayout, setSelectedLayout] = useState<LayoutType>('standard')

  // Form fields
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [profileImage, setProfileImage] = useState('')
  const [themeColor, setThemeColor] = useState(colors.primary)

  // QR Code
  const [qrEnabled, setQrEnabled] = useState(false)
  const [qrUrl, setQrUrl] = useState('')
  const [qrLabel, setQrLabel] = useState('Scan to Visit')

  // BookFade import
  const [barberUsername, setBarberUsername] = useState('')
  const [importingBarber, setImportingBarber] = useState(false)

  // Team member import (47 Industries)
  const [teamSearchQuery, setTeamSearchQuery] = useState('')
  const [teamSearchResults, setTeamSearchResults] = useState<TeamMember[]>([])
  const [searchingTeam, setSearchingTeam] = useState(false)
  const [showTeamResults, setShowTeamResults] = useState(false)

  // Generated cards
  const [frontHtml, setFrontHtml] = useState('')
  const [backHtml, setBackHtml] = useState('')
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)

  // Preview
  const [previewSide, setPreviewSide] = useState<'front' | 'back'>('front')
  const [showPreviewModal, setShowPreviewModal] = useState(false)

  // Load existing design
  useEffect(() => {
    if (existingDesign) {
      const data = existingDesign.cardData
      setSelectedBrand(existingDesign.brand || 'CUSTOM')
      setName((data.name as string) || '')
      setTitle((data.title as string) || '')
      setCompany((data.company as string) || '')
      setEmail((data.email as string) || '')
      setPhone((data.phone as string) || '')
      setWebsite((data.website as string) || '')
      setProfileImage((data.profileImage as string) || '')
      setThemeColor((data.themeColor as string) || colors.primary)
      setSelectedLayout((data.layout as LayoutType) || 'standard')

      const qrCode = data.qrCode as { enabled?: boolean; url?: string; label?: string } | undefined
      if (qrCode) {
        setQrEnabled(qrCode.enabled || false)
        setQrUrl(qrCode.url || '')
        setQrLabel(qrCode.label || 'Scan to Visit')
      }
    }
  }, [existingDesign])

  // Update defaults when brand changes
  useEffect(() => {
    if (!existingDesign) {
      switch (selectedBrand) {
        case 'FORTY_SEVEN_INDUSTRIES':
          setCompany('47 Industries')
          setWebsite('47industries.com')
          setThemeColor(colors.primary)
          setQrUrl('https://47industries.com')
          break
        case 'MOTOREV':
          setCompany('MotoRev')
          setWebsite('motorevapp.com')
          setThemeColor(colors.error)
          setQrUrl('https://motorevapp.com')
          break
        case 'BOOKFADE':
          setCompany('')
          setWebsite('bookfade.app')
          setThemeColor(colors.purpleAlt)
          setQrEnabled(true)
          setQrLabel('Scan to Book')
          break
        case 'CUSTOM':
          setThemeColor(colors.primary)
          break
      }
    }
  }, [selectedBrand, existingDesign])

  const handleImportFromBookFade = async () => {
    if (!barberUsername.trim()) {
      Alert.alert('Error', 'Please enter a username')
      return
    }

    setImportingBarber(true)
    try {
      const data = await api.getBookFadeBarber(barberUsername.trim())
      if (data.barber) {
        const barber = data.barber as BookFadeBarber
        setName(barber.name || '')
        setTitle(barber.cardData?.tagline || 'Professional Barber')
        setCompany(barber.businessName || '')
        setProfileImage(barber.profileImage || '')
        setThemeColor(barber.themeColor || colors.purpleAlt)
        setQrEnabled(true)
        setQrUrl(`https://bookfade.app/b/${barber.slug}`)
        setQrLabel('Scan to Book')
        Alert.alert('Success', 'Barber data imported successfully')
      } else {
        Alert.alert('Not Found', 'Barber not found on BookFade')
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to import barber data')
    } finally {
      setImportingBarber(false)
    }
  }

  const handleSearchTeam = async () => {
    if (!teamSearchQuery.trim()) return

    setSearchingTeam(true)
    try {
      const data = await api.getTeamMembers({ search: teamSearchQuery.trim(), limit: 10 })
      setTeamSearchResults(data.teamMembers || [])
      setShowTeamResults(true)
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to search team members')
    } finally {
      setSearchingTeam(false)
    }
  }

  const handleSelectTeamMember = (member: TeamMember) => {
    setName(member.name || '')
    setEmail(member.email || member.user?.email || '')
    setPhone(member.phone || '')
    setTitle(member.title || '')
    setProfileImage(member.image || member.user?.image || '')
    setShowTeamResults(false)
    setTeamSearchResults([])
    setTeamSearchQuery('')
  }

  const handleGenerateCard = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required')
      return
    }

    setGenerating(true)
    try {
      const data = await api.generateBusinessCard({
        name,
        title,
        company,
        email,
        phone,
        website,
        profileImage,
        themeColor,
        layout: selectedLayout,
        brand: selectedBrand,
        qrCode: qrEnabled ? { enabled: true, url: qrUrl, label: qrLabel } : undefined,
      })

      setFrontHtml(data.front)
      setBackHtml(data.back)
      setShowPreviewModal(true)
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to generate card')
    } finally {
      setGenerating(false)
    }
  }

  const handleSaveDesign = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required to save design')
      return
    }

    setSaving(true)
    try {
      const cardData = {
        name,
        title,
        company,
        email,
        phone,
        website,
        profileImage,
        themeColor,
        layout: selectedLayout,
        qrCode: qrEnabled ? { enabled: true, url: qrUrl, label: qrLabel } : undefined,
      }

      const displayName = `${name}${company ? ` - ${company}` : ''}`

      await api.saveBusinessCardDesign({
        name: displayName,
        brand: selectedBrand !== 'CUSTOM' ? selectedBrand : null,
        cardData,
      })

      Alert.alert('Success', 'Design saved successfully')
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save design')
    } finally {
      setSaving(false)
    }
  }

  const printCard = async (side: 'front' | 'back') => {
    const html = side === 'front' ? frontHtml : backHtml
    if (!html) {
      Alert.alert('Error', 'Generate a card preview first')
      return
    }
    try {
      await Print.printAsync({ html })
    } catch (error: any) {
      if (error.message !== 'Printing did not complete') {
        Alert.alert('Error', error.message || 'Failed to print')
      }
    }
  }

  const shareCardPdf = async (side: 'front' | 'back') => {
    const html = side === 'front' ? frontHtml : backHtml
    if (!html) {
      Alert.alert('Error', 'Generate a card preview first')
      return
    }
    try {
      const { uri } = await Print.printToFileAsync({ html })
      const canShare = await Sharing.isAvailableAsync()
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' })
      } else {
        Alert.alert('Sharing not available', 'Your device does not support file sharing')
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to generate PDF')
    }
  }

  const printSheet = async (side: 'front' | 'back') => {
    const html = side === 'front' ? frontHtml : backHtml
    if (!html) {
      Alert.alert('Error', 'Generate a card preview first')
      return
    }
    // 10-up sheet: 2 cols x 5 rows on 8.5"x11" (792x1008pt at 96dpi)
    // card 3.5"x2" = 336x192pt, margins: left=72pt, top=48pt
    const sheetHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      @page { size: 8.5in 11in; margin: 0; }
      body { margin: 0; padding: 0; width: 8.5in; height: 11in; }
      .sheet { width: 8.5in; height: 11in; position: relative; }
      .card { position: absolute; width: 3.5in; height: 2in; overflow: hidden; }
      ${[0,1,2,3,4].map(row => [0,1].map(col =>
        `.card-${row}-${col} { left: ${0.75 + col * 3.5}in; top: ${0.5 + row * 2}in; }`
      ).join('\n')).join('\n')}
      iframe { width: 3.5in; height: 2in; border: none; display: block; }
    </style></head><body><div class="sheet">
      ${[0,1,2,3,4].map(row => [0,1].map(col =>
        `<div class="card card-${row}-${col}"><iframe srcdoc="${html.replace(/"/g, '&quot;').replace(/'/g, '&#39;')}"></iframe></div>`
      ).join('')).join('')}
    </div></body></html>`
    try {
      const { uri } = await Print.printToFileAsync({ html: sheetHtml, width: 816, height: 1056 })
      const canShare = await Sharing.isAvailableAsync()
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' })
      } else {
        Alert.alert('Sharing not available', 'Your device does not support file sharing')
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to generate print sheet')
    }
  }

  const clearForm = () => {
    setName('')
    setTitle('')
    setEmail('')
    setPhone('')
    setProfileImage('')
    setFrontHtml('')
    setBackHtml('')
    setBarberUsername('')
    setTeamSearchQuery('')
    setTeamSearchResults([])
    setShowTeamResults(false)
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {existingDesign ? 'Edit Card' : 'New Business Card'}
          </Text>
        </View>
        <TouchableOpacity onPress={clearForm} style={styles.clearButton}>
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Brand Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Brand</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.brandScroll}>
            {BRAND_OPTIONS.map((brand) => (
              <TouchableOpacity
                key={brand.key}
                style={[
                  styles.brandChip,
                  selectedBrand === brand.key && { backgroundColor: brand.color, borderColor: brand.color },
                ]}
                onPress={() => setSelectedBrand(brand.key)}
              >
                <Text
                  style={[
                    styles.brandChipText,
                    selectedBrand === brand.key && styles.brandChipTextActive,
                  ]}
                >
                  {brand.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 47 Industries Team Import */}
        {selectedBrand === 'FORTY_SEVEN_INDUSTRIES' && (
          <Card style={styles.importCard} borderColor=colors.primary>
            <View style={styles.importHeader}>
              <Ionicons name="people-outline" size={20} color=colors.primary />
              <Text style={styles.importTitle}>Import from Team</Text>
            </View>
            <View style={styles.importRow}>
              <TextInput
                style={styles.importInput}
                value={teamSearchQuery}
                onChangeText={setTeamSearchQuery}
                placeholder="Search team members..."
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                onSubmitEditing={handleSearchTeam}
                returnKeyType="search"
              />
              <TouchableOpacity
                style={[styles.importButton, { backgroundColor: colors.primary }, searchingTeam && styles.importButtonDisabled]}
                onPress={handleSearchTeam}
                disabled={searchingTeam}
              >
                {searchingTeam ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="search-outline" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>

            {/* Team Search Results */}
            {showTeamResults && teamSearchResults.length > 0 && (
              <View style={styles.searchResults}>
                {teamSearchResults.map((member) => (
                  <TouchableOpacity
                    key={member.id}
                    style={styles.searchResultItem}
                    onPress={() => handleSelectTeamMember(member)}
                  >
                    <View style={styles.searchResultAvatar}>
                      {member.image || member.user?.image ? (
                        <View style={styles.avatarImage}>
                          <Text style={styles.avatarText}>{(member.name || 'U').charAt(0)}</Text>
                        </View>
                      ) : (
                        <View style={[styles.avatarImage, { backgroundColor: colors.primary }]}>
                          <Text style={styles.avatarText}>{(member.name || 'U').charAt(0)}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.searchResultInfo}>
                      <Text style={styles.searchResultName}>{member.name || 'Unknown'}</Text>
                      <Text style={styles.searchResultMeta}>
                        {member.title || 'Team Member'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {showTeamResults && teamSearchResults.length === 0 && !searchingTeam && (
              <Text style={styles.noResultsText}>No team members found</Text>
            )}
          </Card>
        )}

        {/* BookFade Import */}
        {selectedBrand === 'BOOKFADE' && (
          <Card style={styles.importCard} borderColor=colors.purpleAlt>
            <View style={styles.importHeader}>
              <Ionicons name="cloud-download-outline" size={20} color=colors.purpleAlt />
              <Text style={styles.importTitle}>Import from BookFade</Text>
            </View>
            <View style={styles.importRow}>
              <TextInput
                style={styles.importInput}
                value={barberUsername}
                onChangeText={setBarberUsername}
                placeholder="Enter barber username"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={[styles.importButton, importingBarber && styles.importButtonDisabled]}
                onPress={handleImportFromBookFade}
                disabled={importingBarber}
              >
                {importingBarber ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="download-outline" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* Layout Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Layout</Text>
          <View style={styles.layoutGrid}>
            {LAYOUT_OPTIONS.map((layout) => (
              <TouchableOpacity
                key={layout.id}
                style={[
                  styles.layoutCard,
                  selectedLayout === layout.id && { borderColor: themeColor, borderWidth: 2 },
                ]}
                onPress={() => setSelectedLayout(layout.id)}
              >
                <Text style={styles.layoutName}>{layout.name}</Text>
                <Text style={styles.layoutDescription}>{layout.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Card Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Card Details</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Full Name"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Title / Role</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., Founder, Developer, Barber"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Company</Text>
            <TextInput
              style={styles.input}
              value={company}
              onChangeText={setCompany}
              placeholder="Company Name"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="email@example.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="(555) 123-4567"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Website</Text>
            <TextInput
              style={styles.input}
              value={website}
              onChangeText={setWebsite}
              placeholder="example.com"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* QR Code Section */}
        <Card style={styles.qrSection}>
          <View style={styles.qrHeader}>
            <View style={styles.qrHeaderLeft}>
              <Ionicons name="qr-code-outline" size={20} color={themeColor} />
              <Text style={styles.qrTitle}>QR Code</Text>
            </View>
            <Switch
              value={qrEnabled}
              onValueChange={setQrEnabled}
              trackColor={{ false: colors.border, true: themeColor }}
              thumbColor="#fff"
            />
          </View>

          {qrEnabled && (
            <View style={styles.qrFields}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>QR Code URL</Text>
                <TextInput
                  style={styles.input}
                  value={qrUrl}
                  onChangeText={setQrUrl}
                  placeholder="https://example.com"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>QR Label</Text>
                <TextInput
                  style={styles.input}
                  value={qrLabel}
                  onChangeText={setQrLabel}
                  placeholder="Scan to Visit"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>
          )}
        </Card>

        {/* Theme Color */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Theme Color</Text>
          <View style={styles.colorRow}>
            {COLOR_PRESETS.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: color },
                  themeColor === color && styles.colorSwatchActive,
                ]}
                onPress={() => setThemeColor(color)}
              />
            ))}
          </View>
          <TextInput
            style={[styles.input, styles.colorInput]}
            value={themeColor}
            onChangeText={setThemeColor}
            placeholder=colors.primary
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {/* Profile Image */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Image URL</Text>
          <TextInput
            style={styles.input}
            value={profileImage}
            onChangeText={setProfileImage}
            placeholder="https://..."
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.previewButton, generating && styles.buttonDisabled]}
            onPress={handleGenerateCard}
            disabled={generating}
          >
            {generating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="eye-outline" size={20} color="#fff" />
                <Text style={styles.previewButtonText}>Preview Card</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.generateButton, !frontHtml && styles.buttonDisabled]}
            onPress={handleSaveDesign}
            disabled={!frontHtml || saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="save-outline" size={20} color="#fff" />
                <Text style={styles.generateButtonText}>Save Design</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: spacing.xxxl }} />
      </ScrollView>

      {/* Preview Modal */}
      <Modal
        visible={showPreviewModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPreviewModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowPreviewModal(false)}>
              <Text style={styles.modalCancel}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Card Preview</Text>
            <View style={{ width: 50 }} />
          </View>

          {/* Side Toggle */}
          <View style={styles.sideToggle}>
            <TouchableOpacity
              style={[styles.sideButton, previewSide === 'front' && { backgroundColor: themeColor }]}
              onPress={() => setPreviewSide('front')}
            >
              <Text style={[styles.sideButtonText, previewSide === 'front' && styles.sideButtonTextActive]}>
                Front
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sideButton, previewSide === 'back' && { backgroundColor: themeColor }]}
              onPress={() => setPreviewSide('back')}
            >
              <Text style={[styles.sideButtonText, previewSide === 'back' && styles.sideButtonTextActive]}>
                Back
              </Text>
            </TouchableOpacity>
          </View>

          {/* Card Preview */}
          <View style={styles.previewContainer}>
            {(previewSide === 'front' ? frontHtml : backHtml) ? (
              <ZoomableView style={styles.zoomableContainer} minScale={1} maxScale={5}>
                <WebView
                  source={{ html: previewSide === 'front' ? frontHtml : backHtml }}
                  style={styles.previewWebView}
                  scrollEnabled={false}
                  showsVerticalScrollIndicator={false}
                  scalesPageToFit={false}
                />
              </ZoomableView>
            ) : (
              <View style={styles.previewEmpty}>
                <Ionicons name="card-outline" size={48} color={colors.textMuted} />
                <Text style={styles.previewEmptyText}>No preview available</Text>
              </View>
            )}
          </View>

          {/* Zoom hint */}
          <Text style={styles.zoomHint}>Pinch to zoom, drag to pan</Text>

          {/* PDF Actions */}
          <View style={styles.modalActions}>
            <View style={styles.printRow}>
              <TouchableOpacity
                style={[styles.pdfButton, { flex: 1 }]}
                onPress={() => printCard('front')}
              >
                <Ionicons name="print-outline" size={18} color="#fff" />
                <Text style={styles.pdfButtonText}>Print Front</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pdfButton, { flex: 1 }]}
                onPress={() => printCard('back')}
              >
                <Ionicons name="print-outline" size={18} color="#fff" />
                <Text style={styles.pdfButtonText}>Print Back</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.printRow}>
              <TouchableOpacity
                style={[styles.shareButton, { flex: 1 }]}
                onPress={() => shareCardPdf('front')}
              >
                <Ionicons name="share-outline" size={18} color="#fff" />
                <Text style={styles.pdfButtonText}>Save Front PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.shareButton, { flex: 1 }]}
                onPress={() => shareCardPdf('back')}
              >
                <Ionicons name="share-outline" size={18} color="#fff" />
                <Text style={styles.pdfButtonText}>Save Back PDF</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.sheetButton}
              onPress={() => printSheet(previewSide)}
            >
              <Ionicons name="document-outline" size={18} color="#fff" />
              <Text style={styles.pdfButtonText}>10-Up Sheet ({previewSide === 'front' ? 'Front' : 'Back'})</Text>
            </TouchableOpacity>
          </View>

          {/* Print Instructions */}
          <View style={styles.printInfo}>
            <Text style={styles.printInfoTitle}>Print Specifications</Text>
            <Text style={styles.printInfoText}>Finished size: 3.5" x 2" (US Standard)</Text>
            <Text style={styles.printInfoText}>10-up sheet: 2 cols x 5 rows on 8.5" x 11"</Text>
            <Text style={styles.printInfoText}>Use perforated business card paper for best results</Text>
          </View>
        </View>
      </Modal>
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
  clearButton: {
    padding: spacing.xs,
  },
  clearButtonText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  brandScroll: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  brandChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  brandChipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  brandChipTextActive: {
    color: '#fff',
  },
  importCard: {
    marginTop: spacing.lg,
  },
  importHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  importTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  importRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  importInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: fontSize.md,
  },
  importButton: {
    backgroundColor: colors.purpleAlt,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  importButtonDisabled: {
    opacity: 0.6,
  },
  searchResults: {
    marginTop: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchResultAvatar: {
    marginRight: spacing.md,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: '#fff',
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  searchResultMeta: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  noResultsText: {
    marginTop: spacing.md,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  layoutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  layoutCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  layoutName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  layoutDescription: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  formRow: {
    flexDirection: 'row',
    gap: spacing.md,
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
  qrSection: {
    marginTop: spacing.xl,
  },
  qrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  qrHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  qrTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  qrFields: {
    marginTop: spacing.lg,
  },
  colorRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
  },
  colorSwatchActive: {
    borderWidth: 3,
    borderColor: '#fff',
  },
  colorInput: {
    fontFamily: 'monospace',
  },
  actions: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
  },
  previewButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: '#fff',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.success,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
  },
  generateButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.5,
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
  modalCancel: {
    fontSize: fontSize.md,
    color: colors.primary,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  sideToggle: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sideButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  sideButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  sideButtonTextActive: {
    color: '#fff',
  },
  previewContainer: {
    flex: 1,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  zoomableContainer: {
    flex: 1,
  },
  previewWebView: {
    flex: 1,
    backgroundColor: '#fff',
  },
  zoomHint: {
    textAlign: 'center',
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  previewEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  previewEmptyText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  modalActions: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  printRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  sheetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.purpleAlt,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  pdfButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: '#fff',
  },
  printInfo: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  printInfoTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  printInfoText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    lineHeight: 18,
  },
})
