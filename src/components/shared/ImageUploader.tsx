import React, { useState, useRef, useEffect } from 'react'
import { ImagePlus, X, Minimize2, CheckCircle, Loader2, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { compressImage, generatePreviewUrl, cleanupPreviewUrl, formatFileSize, isImageFile } from '@/lib/imageCompression'

interface ImageUploaderProps {
  onImageChange: (file: File | null) => void
  currentImageUrl?: string | null
  label?: string
  bucketName: string
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageChange,
  currentImageUrl,
  label = 'Image',
  bucketName,
}) => {
  const [originalFile, setOriginalFile] = useState<File | null>(null)
  const [stagedFile, setStagedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null)
  const [isCompressing, setIsCompressing] = useState(false)
  const [isCompressed, setIsCompressed] = useState(false)
  const [originalSize, setOriginalSize] = useState<number>(0)
  const [compressedSize, setCompressedSize] = useState<number>(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        cleanupPreviewUrl(previewUrl)
      }
    }
  }, [previewUrl])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!isImageFile(file)) {
      alert('Please select an image file')
      return
    }

    // Clean up previous preview URL
    if (previewUrl && previewUrl.startsWith('blob:')) {
      cleanupPreviewUrl(previewUrl)
    }

    // Step 1: Stage the file locally
    setOriginalFile(file)
    setStagedFile(file)
    setOriginalSize(file.size)
    setIsCompressed(false)
    setCompressedSize(0)

    // Generate local preview
    const url = generatePreviewUrl(file)
    setPreviewUrl(url)

    // Notify parent
    onImageChange(file)
  }

  const handleCompress = async () => {
    if (!stagedFile) return

    setIsCompressing(true)
    try {
      // Step 2: Compress the staged file
      const compressed = await compressImage(stagedFile)
      
      // Clean up old preview
      if (previewUrl && previewUrl.startsWith('blob:')) {
        cleanupPreviewUrl(previewUrl)
      }

      // Keep original file, update staged file to compressed version
      setStagedFile(compressed)
      setCompressedSize(compressed.size)
      setIsCompressed(true)

      // Generate new preview
      const url = generatePreviewUrl(compressed)
      setPreviewUrl(url)

      // Notify parent of the compressed file
      onImageChange(compressed)
    } catch (error) {
      console.error('Compression failed:', error)
      alert('Failed to compress image. Please try again.')
    } finally {
      setIsCompressing(false)
    }
  }

  const handleRevertCompression = () => {
    if (!originalFile) return

    // Clean up compressed preview URL
    if (previewUrl && previewUrl.startsWith('blob:')) {
      cleanupPreviewUrl(previewUrl)
    }

    // Revert to original file
    setStagedFile(originalFile)
    setIsCompressed(false)
    setCompressedSize(0)

    // Generate preview for original file
    const url = generatePreviewUrl(originalFile)
    setPreviewUrl(url)

    // Notify parent
    onImageChange(originalFile)
  }

  const handleRemove = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      cleanupPreviewUrl(previewUrl)
    }
    setOriginalFile(null)
    setStagedFile(null)
    setPreviewUrl(null)
    setIsCompressed(false)
    setOriginalSize(0)
    setCompressedSize(0)
    onImageChange(null)

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Calculate reduction percentage
  const reductionPercentage = originalSize > 0 && compressedSize > 0
    ? Math.round((1 - compressedSize / originalSize) * 100)
    : 0;

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">{label}</label>
      
      {/* Preview Area */}
      {previewUrl && (
        <div className="relative inline-block">
          <div className="w-full max-w-xs rounded-lg overflow-hidden border border-gray-200">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-32 sm:h-40 object-cover"
            />
          </div>
          
          {/* Compressed badge */}
          {isCompressed && (
            <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
              Compressed
            </div>
          )}
          
          {/* File size badge */}
          {isCompressed && compressedSize > 0 && (
            <div className="absolute bottom-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
              {formatFileSize(compressedSize)}
            </div>
          )}
          
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
            aria-label="Remove image"
          >
            <X className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          </button>
        </div>
      )}

      {/* File Input */}
      {!previewUrl && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 sm:p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors active:bg-blue-50"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
        >
          <ImagePlus className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Click to select an image</p>
          <p className="text-xs text-gray-400 mt-1">PNG, JPG, WebP up to 10MB</p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Compression Controls */}
      {stagedFile && !isCompressed && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Original size: {formatFileSize(originalSize)}</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCompress}
            disabled={isCompressing}
            className="w-full min-h-[44px]"
          >
            {isCompressing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Compressing...
              </>
            ) : (
              <>
                <Minimize2 className="mr-2 h-4 w-4" />
                Compress Image (50KB)
              </>
            )}
          </Button>
        </div>
      )}

      {/* Compression Success with Revert Option */}
      {isCompressed && (
        <div className="space-y-2">
          <div className="flex items-start space-x-2 text-sm text-green-600 bg-green-50 p-2.5 rounded-md">
            <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs sm:text-sm font-medium">Image compressed successfully</p>
              <p className="text-xs text-green-500 mt-1">
                Preview shows compressed version: {formatFileSize(originalSize)} → {formatFileSize(compressedSize)}
                {reductionPercentage > 0 && ` (${reductionPercentage}% smaller)`}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRevertCompression}
            className="w-full min-h-[44px]"
          >
            <Undo2 className="mr-2 h-4 w-4" />
            Revert to Original
          </Button>
        </div>
      )}

      {/* Bucket Info */}
      <p className="text-xs text-gray-400">Will be uploaded to: {bucketName}</p>
    </div>
  )
}

export default ImageUploader