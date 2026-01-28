import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { api } from '../../services/api'
import { colors, portalColors, spacing, borderRadius, fontSize, fontWeight } from '../../theme'

interface NewLeadScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void
    goBack: () => void
  }
}

const interestOptions = [
  'Web Development',
  'App Development',
  'AI Solutions',
  '3D Printing',
  'Custom PC',
  'Repair Services',
  'Other',
]

// Validation patterns
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^[\d\s\-\+\(\)]{7,20}$/

type FormField = 'businessName' | 'contactName' | 'email' | 'phone' | 'interests'

export function NewLeadScreen({ navigation }: NewLeadScreenProps) {
  const [businessName, setBusinessName] = useState('')
  const [contactName, setContactName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [interests, setInterests] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [estimatedValue, setEstimatedValue] = useState('')
  const [loading, setLoading] = useState(false)

  const [errors, setErrors] = useState<Partial<Record<FormField, string>>>({})
  const [touched, setTouched] = useState<Partial<Record<FormField, boolean>>>({})

  const toggleInterest = (interest: string) => {
    const newInterests = interests.includes(interest)
      ? interests.filter((i) => i !== interest)
      : [...interests, interest]
    setInterests(newInterests)

    if (touched.interests) {
      const error = newInterests.length === 0 ? 'Please select at least one interest' : undefined
      setErrors(prev => ({ ...prev, interests: error }))
    }
  }

  // Validate a single field
  const validateField = (field: FormField, value: string | string[]): string | undefined => {
    switch (field) {
      case 'businessName':
        if (!value || (typeof value === 'string' && !value.trim())) {
          return 'Business name is required'
        }
        break
      case 'contactName':
        if (!value || (typeof value === 'string' && !value.trim())) {
          return 'Contact name is required'
        }
        break
      case 'email':
        if (!value || (typeof value === 'string' && !value.trim())) {
          return 'Email is required'
        }
        if (typeof value === 'string' && !EMAIL_REGEX.test(value.trim())) {
          return 'Please enter a valid email address'
        }
        break
      case 'phone':
        if (value && typeof value === 'string' && value.trim()) {
          if (!PHONE_REGEX.test(value.trim())) {
            return 'Please enter a valid phone number'
          }
        }
        break
      case 'interests':
        if (Array.isArray(value) && value.length === 0) {
          return 'Please select at least one interest'
        }
        break
    }
    return undefined
  }

  // Validate entire form
  const validateForm = (): boolean => {
    const newErrors: Partial<Record<FormField, string>> = {}

    const businessNameError = validateField('businessName', businessName)
    if (businessNameError) newErrors.businessName = businessNameError

    const contactNameError = validateField('contactName', contactName)
    if (contactNameError) newErrors.contactName = contactNameError

    const emailError = validateField('email', email)
    if (emailError) newErrors.email = emailError

    const phoneError = validateField('phone', phone)
    if (phoneError) newErrors.phone = phoneError

    const interestsError = validateField('interests', interests)
    if (interestsError) newErrors.interests = interestsError

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Check if form is valid for button state
  const isFormValid = (): boolean => {
    if (!businessName.trim() || !contactName.trim() || !email.trim()) {
      return false
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      return false
    }
    if (phone.trim() && !PHONE_REGEX.test(phone.trim())) {
      return false
    }
    if (interests.length === 0) {
      return false
    }
    return true
  }

  // Handle field blur for inline validation
  const handleBlur = (field: FormField) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    let value: string | string[]
    switch (field) {
      case 'businessName':
        value = businessName
        break
      case 'contactName':
        value = contactName
        break
      case 'email':
        value = email
        break
      case 'phone':
        value = phone
        break
      case 'interests':
        value = interests
        break
      default:
        value = ''
    }
    const error = validateField(field, value)
    setErrors(prev => ({ ...prev, [field]: error }))
  }

  const handleSubmit = async () => {
    // Mark all fields as touched
    setTouched({
      businessName: true,
      contactName: true,
      email: true,
      phone: true,
      interests: true,
    })

    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors before submitting')
      return
    }

    setLoading(true)
    try {
      await api.createPartnerLead({
        businessName: businessName.trim(),
        contactName: contactName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        interests,
        notes: notes.trim() || undefined,
        estimatedValue: estimatedValue ? parseFloat(estimatedValue) : undefined,
      })
      Alert.alert('Success', 'Lead submitted successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ])
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit lead')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={navigation.goBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Submit Lead</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Business Name</Text>
            <Text style={styles.requiredIndicator}>*</Text>
          </View>
          <TextInput
            style={[styles.input, touched.businessName && errors.businessName && styles.inputError]}
            value={businessName}
            onChangeText={(text) => {
              setBusinessName(text)
              if (touched.businessName) {
                const error = validateField('businessName', text)
                setErrors(prev => ({ ...prev, businessName: error }))
              }
            }}
            onBlur={() => handleBlur('businessName')}
            placeholder="Enter business name"
            placeholderTextColor={colors.textMuted}
          />
          {touched.businessName && errors.businessName && (
            <Text style={styles.errorText}>{errors.businessName}</Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Contact Name</Text>
            <Text style={styles.requiredIndicator}>*</Text>
          </View>
          <TextInput
            style={[styles.input, touched.contactName && errors.contactName && styles.inputError]}
            value={contactName}
            onChangeText={(text) => {
              setContactName(text)
              if (touched.contactName) {
                const error = validateField('contactName', text)
                setErrors(prev => ({ ...prev, contactName: error }))
              }
            }}
            onBlur={() => handleBlur('contactName')}
            placeholder="Enter contact person's name"
            placeholderTextColor={colors.textMuted}
          />
          {touched.contactName && errors.contactName && (
            <Text style={styles.errorText}>{errors.contactName}</Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.requiredIndicator}>*</Text>
          </View>
          <TextInput
            style={[styles.input, touched.email && errors.email && styles.inputError]}
            value={email}
            onChangeText={(text) => {
              setEmail(text)
              if (touched.email) {
                const error = validateField('email', text)
                setErrors(prev => ({ ...prev, email: error }))
              }
            }}
            onBlur={() => handleBlur('email')}
            placeholder="Enter email address"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {touched.email && errors.email && (
            <Text style={styles.errorText}>{errors.email}</Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={[styles.input, touched.phone && errors.phone && styles.inputError]}
            value={phone}
            onChangeText={(text) => {
              setPhone(text)
              if (touched.phone) {
                const error = validateField('phone', text)
                setErrors(prev => ({ ...prev, phone: error }))
              }
            }}
            onBlur={() => handleBlur('phone')}
            placeholder="Enter phone number"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
          />
          {touched.phone && errors.phone && (
            <Text style={styles.errorText}>{errors.phone}</Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Interests</Text>
            <Text style={styles.requiredIndicator}>*</Text>
          </View>
          <View style={[styles.interestsGrid, touched.interests && errors.interests && styles.interestsError]}>
            {interestOptions.map((interest) => (
              <TouchableOpacity
                key={interest}
                style={[
                  styles.interestChip,
                  interests.includes(interest) && styles.interestChipActive,
                ]}
                onPress={() => {
                  setTouched(prev => ({ ...prev, interests: true }))
                  toggleInterest(interest)
                }}
              >
                <Text
                  style={[
                    styles.interestChipText,
                    interests.includes(interest) && styles.interestChipTextActive,
                  ]}
                >
                  {interest}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {touched.interests && errors.interests && (
            <Text style={styles.errorText}>{errors.interests}</Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Estimated Value</Text>
          <View style={styles.currencyInput}>
            <Text style={styles.currencySymbol}>$</Text>
            <TextInput
              style={styles.currencyTextInput}
              value={estimatedValue}
              onChangeText={setEstimatedValue}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add any additional notes about this lead..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, (loading || !isFormValid()) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading || !isFormValid()}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Submitting...' : 'Submit Lead'}
          </Text>
        </TouchableOpacity>
        {!isFormValid() && (
          <Text style={styles.submitHint}>Please fill in all required fields to continue</Text>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
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
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  requiredIndicator: {
    color: colors.error,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    marginLeft: 4,
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
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    fontSize: fontSize.xs,
    color: colors.error,
    marginTop: spacing.xs,
  },
  textArea: {
    minHeight: 100,
    paddingTop: spacing.md,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  interestsError: {
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginHorizontal: -spacing.sm,
  },
  interestChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  interestChipActive: {
    backgroundColor: `${portalColors.partner}20`,
    borderColor: portalColors.partner,
  },
  interestChipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  interestChipTextActive: {
    color: portalColors.partner,
    fontWeight: fontWeight.medium,
  },
  currencyInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
  },
  currencySymbol: {
    paddingLeft: spacing.md,
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  currencyTextInput: {
    flex: 1,
    padding: spacing.md,
    color: colors.text,
    fontSize: fontSize.md,
  },
  submitButton: {
    backgroundColor: portalColors.partner,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  submitHint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
})
