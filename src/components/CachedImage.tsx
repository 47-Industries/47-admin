import React from 'react'
import { Image, ImageProps, ImageContentFit } from 'expo-image'
import { StyleProp, ImageStyle, ViewStyle } from 'react-native'

// Blurhash placeholder - a subtle gray blur
const DEFAULT_BLURHASH = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4'

interface CachedImageProps {
  source: { uri: string } | number
  style?: StyleProp<ImageStyle | ViewStyle>
  contentFit?: ImageContentFit
  placeholder?: string
  transition?: number
  onLoad?: () => void
  onError?: () => void
}

export function CachedImage({
  source,
  style,
  contentFit = 'cover',
  placeholder = DEFAULT_BLURHASH,
  transition = 200,
  onLoad,
  onError,
}: CachedImageProps) {
  // Handle both uri objects and require() numbers
  const imageSource = typeof source === 'number' ? source : source?.uri

  if (!imageSource) {
    return null
  }

  return (
    <Image
      source={imageSource}
      style={style}
      contentFit={contentFit}
      placeholder={placeholder}
      placeholderContentFit="cover"
      transition={transition}
      cachePolicy="memory-disk"
      onLoad={onLoad}
      onError={onError}
    />
  )
}

export default CachedImage
