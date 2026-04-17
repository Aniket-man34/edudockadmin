import React, { useState, useRef, useEffect } from 'react'
import { ImagePlus, X, Minimize2, CheckCircle, Loader2 } from 'lucide-react'
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

      // Replace staged file with compressed version
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

  const handleRemove = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      cleanupPreviewUrl(previewUrl)
    }
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
              className="w-full h-40 object-cover"
            />
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* File Input */}
      {!previewUrl && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
        >
          <ImagePlus className="h-10 w-10 text-gray-400 mx-auto mb-2" />
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
            className="w-full"
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

      {/* Compression Success */}
      {isCompressed && (
        <div className="flex items-center space-x-2 text-sm text-green-600 bg-green-50 p-2 rounded-md">
          <CheckCircle className="h-4 w-4" />
          <span>
            Compressed: {formatFileSize(originalSize)} → {formatFileSize(compressedSize)}
          </span>
        </div>
      )}

      {/* Bucket Info */}
      <p className="text-xs text-gray-400">Will be uploaded to: {bucketName}</p>
    </div>
  )
}

export default ImageUploader