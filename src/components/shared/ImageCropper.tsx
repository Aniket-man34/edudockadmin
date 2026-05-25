import React, { useState, useRef, useEffect } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import type { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { compressImage } from '@/lib/imageCompression';
import { Loader2, CropIcon, Eye } from 'lucide-react';

export interface ImageCropperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCropComplete: (file: File) => void;
  initialImage?: string;
}

export function ImageCropper({
  open,
  onOpenChange,
  onCropComplete,
  initialImage,
}: ImageCropperProps) {
  const [imgSrc, setImgSrc] = useState<string>('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      if (initialImage) {
        setImgSrc(initialImage);
        // Set default crop (square aspect ratio, but freeform resizing allowed)
        const defaultCrop = centerCrop(
          makeAspectCrop(
            {
              unit: '%',
              width: 90,
            },
            1, // square aspect ratio
            1000,
            1000
          ),
          1000,
          1000
        );
        setCrop(defaultCrop);
      } else {
        setImgSrc('');
        setCrop(undefined);
      }
      setCompletedCrop(undefined);
      setPreviewUrl('');
      setIsLoading(false);
      setIsProcessing(false);
    }
  }, [open, initialImage]);

  // Generate preview when crop changes
  useEffect(() => {
    if (!completedCrop || !imgRef.current || !previewCanvasRef.current) {
      return;
    }

    const image = imgRef.current;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return;
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height
    );

    // Convert canvas to data URL for preview
    const dataUrl = canvas.toDataURL('image/webp', 0.95);
    setPreviewUrl(dataUrl);
  }, [completedCrop]);

  // Cleanup preview URL when component unmounts or preview changes
  useEffect(() => {
    return () => {
      // Note: data URLs don't need cleanup, but if we switch to blob URLs in future
      // we would need to revoke them here
    };
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      const imageUrl = reader.result?.toString() || '';
      setImgSrc(imageUrl);
      
      // Set default crop (square aspect ratio, but freeform resizing allowed)
      const defaultCrop = centerCrop(
        makeAspectCrop(
          {
            unit: '%',
            width: 90,
          },
          1, // square aspect ratio
          1000,
          1000
        ),
        1000,
        1000
      );
      setCrop(defaultCrop);
    });
    reader.readAsDataURL(file);
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const newCrop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90,
        },
        1, // square aspect ratio
        width,
        height
      ),
      width,
      height
    );
    setCrop(newCrop);
  };

  const getCroppedImage = async (): Promise<File | null> => {
    if (!imgRef.current || !completedCrop) {
      return null;
    }

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return null;
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          resolve(null);
          return;
        }

        const fileName = `cropped-image-${Date.now()}.webp`;
        const file = new File([blob], fileName, { type: 'image/webp' });
        
        try {
          // Compress the cropped image
          const compressedFile = await compressImage(file);
          resolve(compressedFile);
        } catch (error) {
          console.error('Compression failed, using original cropped image:', error);
          resolve(file);
        }
      }, 'image/webp', 0.95);
    });
  };

  const handleCropComplete = async () => {
    if (!completedCrop) {
      alert('Please select a crop area');
      return;
    }

    setIsProcessing(true);
    try {
      const croppedFile = await getCroppedImage();
      if (croppedFile) {
        onCropComplete(croppedFile);
        onOpenChange(false);
      } else {
        alert('Failed to crop image');
      }
    } catch (error) {
      console.error('Crop failed:', error);
      alert('Failed to crop image');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTriggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crop Image</DialogTitle>
          <DialogDescription>
            Select an area to crop. Drag to adjust the crop area.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">

          {/* Image Upload/Crop Area */}
          <div className="border rounded-lg p-3 sm:p-4">
            {!imgSrc ? (
              <div className="flex flex-col items-center justify-center py-8 sm:py-12">
                <CropIcon className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
                <p className="text-muted-foreground mb-3 sm:mb-4 text-sm sm:text-base">No image selected</p>
                <Button onClick={handleTriggerFileSelect} type="button" className="min-h-[44px] px-6">
                  Select Image
                </Button>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8 sm:py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <div className="relative max-h-[50vh] sm:max-h-[400px] overflow-auto rounded border">
                      <ReactCrop
                        crop={crop}
                        onChange={(_, percentCrop) => setCrop(percentCrop)}
                        onComplete={(c) => setCompletedCrop(c)}
                        aspect={undefined}
                        className="max-h-[50vh] sm:max-h-[400px]"
                      >
                        <img
                          ref={imgRef}
                          src={imgSrc}
                          alt="Crop preview"
                          onLoad={onImageLoad}
                          className="max-h-[50vh] sm:max-h-[400px] object-contain"
                        />
                      </ReactCrop>
                      {isProcessing && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded">
                          <div className="bg-white p-4 rounded-lg flex flex-col items-center gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm font-medium">Compressing image...</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground text-center">
                      Drag to adjust crop area. Use handles to resize.
                    </div>

                    {/* Preview Section */}
                    {completedCrop && previewUrl && (
                      <div className="mt-4 p-3 border rounded-lg bg-gray-50">
                        <div className="flex items-center gap-2 mb-2">
                          <Eye className="h-4 w-4 text-blue-500" />
                          <h4 className="text-sm font-medium">Cropped Preview</h4>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                          <div className="flex-shrink-0">
                            <div className="w-32 h-32 border rounded overflow-hidden bg-white">
                              <img
                                src={previewUrl}
                                alt="Cropped preview"
                                className="w-full h-full object-contain"
                              />
                            </div>
                          </div>
                          <div className="flex-1 text-xs text-gray-600">
                            <p className="mb-1">
                              <span className="font-medium">Dimensions:</span> {completedCrop.width} × {completedCrop.height} pixels
                            </p>
                            <p className="mb-1">
                              <span className="font-medium">Position:</span> X: {Math.round(completedCrop.x)}, Y: {Math.round(completedCrop.y)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              This is a preview of how your cropped image will look.
                            </p>
                            <p className="text-xs text-green-600 font-medium mt-2">
                              ✓ This cropped image will be automatically compressed to under 150KB
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Hidden canvas for preview generation */}
                    <canvas
                      ref={previewCanvasRef}
                      className="hidden"
                    />
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-3 sm:gap-2">
          <div className="flex-1 w-full">
            {imgSrc && (
              <Button
                variant="outline"
                onClick={handleTriggerFileSelect}
                disabled={isProcessing}
                className="min-h-[44px] w-full sm:w-auto"
              >
                Change Image
              </Button>
            )}
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
              className="min-h-[44px] flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCropComplete}
              disabled={!imgSrc || !completedCrop || isProcessing}
              className="min-h-[44px] flex-1 sm:flex-none"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Compressing...
                </>
              ) : (
                'Apply Crop & Compress'
              )}
            </Button>
          </div>
        </DialogFooter>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </DialogContent>
    </Dialog>
  );
}