import { Image } from 'expo-image'
import { StyleProp, ImageStyle } from 'react-native'

interface CachedImageProps {
  source: { uri: string } | number
  style?: StyleProp<ImageStyle>
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'
}

export function CachedImage({ source, style, contentFit = 'cover' }: CachedImageProps) {
  if (!source || (typeof source === 'object' && !source.uri)) {
    return null
  }

  return (
    <Image
      source={source}
      style={style}
      contentFit={contentFit}
      cachePolicy="memory-disk"
      transition={150}
    />
  )
}

export default CachedImage
