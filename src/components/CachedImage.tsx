import React from 'react'
import { Image, ImageProps } from 'react-native'

// Simple wrapper around Image for future caching support
// Currently passes through to standard Image component
export function CachedImage(props: ImageProps) {
  return <Image {...props} />
}

export default CachedImage
