import imageCompression from 'browser-image-compression'

export interface CompressionOptions {
  maxSizeMB?: number
  maxWidthOrHeight?: number
  useWebWorker?: boolean
  fileType?: string
}

export const DEFAULT_COMPRESSION_OPTIONS: CompressionOptions = {
  maxSizeMB: 0.05, // 50KB
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: 'image/webp',
}

/**
 * Compress an image file to under 50KB (WebP format preferred)
 * @param file The original image file
 * @param options Compression options
 * @returns Compressed File object
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = DEFAULT_COMPRESSION_OPTIONS
): Promise<File> {
  try {
    const compressedFile = await imageCompression(file, {
      maxSizeMB: options.maxSizeMB || DEFAULT_COMPRESSION_OPTIONS.maxSizeMB,
      maxWidthOrHeight: options.maxWidthOrHeight || DEFAULT_COMPRESSION_OPTIONS.maxWidthOrHeight,
      useWebWorker: options.useWebWorker || DEFAULT_COMPRESSION_OPTIONS.useWebWorker,
      fileType: options.fileType || DEFAULT_COMPRESSION_OPTIONS.fileType,
    })

    // Check if compression was successful
    if (compressedFile.size > (options.maxSizeMB || 0.05) * 1024 * 1024) {
      console.warn(`Compressed image size (${compressedFile.size} bytes) exceeds target size`)
    }

    return compressedFile
  } catch (error) {
    console.error('Image compression failed:', error)
    throw new Error('Failed to compress image. Please try again with a different image.')
  }
}

/**
 * Generate a preview URL for an image file
 * @param file The image file
 * @returns Object URL for preview
 */
export function generatePreviewUrl(file: File): string {
  return URL.createObjectURL(file)
}

/**
 * Clean up a preview URL to prevent memory leaks
 * @param url The object URL to revoke
 */
export function cleanupPreviewUrl(url: string): void {
  URL.revokeObjectURL(url)
}

/**
 * Validate if a file is an image
 * @param file The file to validate
 * @returns True if file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

/**
 * Get file size in human readable format
 * @param bytes File size in bytes
 * @returns Formatted string (e.g., "50 KB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}