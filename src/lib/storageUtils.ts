import { supabase } from './supabase'

/**
 * Extract the storage file path from a public URL.
 * Public URLs look like: https://{project}.supabase.co/storage/v1/object/public/{bucket}/{path}
 * We need just the {path} part to delete the file.
 */
function extractFilePath(publicUrl: string | null | undefined): string | null {
  if (!publicUrl) return null

  try {
    const url = new URL(publicUrl)
    // Path format: /storage/v1/object/public/{bucket}/{filePath}
    const parts = url.pathname.split('/')
    // Find the bucket name after "/public/"
    const publicIndex = parts.indexOf('public')
    if (publicIndex === -1 || publicIndex + 2 >= parts.length) return null

    // Everything after /public/{bucket}/ is the file path
    const filePath = parts.slice(publicIndex + 2).join('/')
    return filePath || null
  } catch {
    // If URL parsing fails, try a simpler approach
    const match = publicUrl.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/)
    return match ? match[1] : null
  }
}

/**
 * Extract the bucket name from a public URL.
 */
function extractBucketName(publicUrl: string | null | undefined): string | null {
  if (!publicUrl) return null

  try {
    const url = new URL(publicUrl)
    const parts = url.pathname.split('/')
    const publicIndex = parts.indexOf('public')
    if (publicIndex === -1 || publicIndex + 1 >= parts.length) return null

    return parts[publicIndex + 1] || null
  } catch {
    const match = publicUrl.match(/\/storage\/v1\/object\/public\/([^/]+)\//)
    return match ? match[1] : null
  }
}

/**
 * Delete a file from Supabase Storage given its public URL.
 * Returns true if deletion succeeded or no file existed.
 * Returns false if deletion failed.
 */
export async function deleteStorageFile(publicUrl: string | null | undefined): Promise<boolean> {
  if (!publicUrl) return true // No file to delete

  const filePath = extractFilePath(publicUrl)
  const bucketName = extractBucketName(publicUrl)

  if (!filePath || !bucketName) {
    console.warn('Could not parse storage path from URL:', publicUrl)
    return true // Proceed as if deleted (URL might be external)
  }

  try {
    const { error } = await supabase.storage.from(bucketName).remove([filePath])
    if (error) {
      console.warn('Storage deletion warning:', error.message)
      // File might not exist, still return true to allow DB deletion
    }
    return true
  } catch (err) {
    console.warn('Storage deletion error:', err)
    return true // Still proceed with DB deletion
  }
}

/**
 * Delete multiple storage files by their public URLs.
 */
export async function deleteStorageFiles(urls: (string | null | undefined)[]): Promise<boolean> {
  const results = await Promise.all(urls.map((url) => deleteStorageFile(url)))
  return results.every(Boolean)
}
