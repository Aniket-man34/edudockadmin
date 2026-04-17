import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================
// Edge Function: delete-storage-file
// ============================================================
// Triggered by Database Webhooks when a row is deleted from
// pdfs, updates, or tools tables. Parses the OLD record,
// finds any storage file URLs (image_url, file_url,
// cover_image_url), and deletes the actual files from the
// Supabase Storage buckets using the Service Role Key.
// ============================================================

// Environment variables (set via Supabase Dashboard → Edge Functions → Secrets)
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? "";
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET") ?? "";

// Known storage buckets in the EduDock project
const KNOWN_BUCKETS = [
  "pdf-covers",
  "update-images",
  "pdf-files",
  "tool-images",
];

// URL fields in database rows that may reference storage files
const STORAGE_URL_FIELDS = [
  "image_url",
  "file_url",
  "cover_image_url",
] as const;

// Supabase Database Webhook payload structure
interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE" | "TRUNCATE" | "ALL";
  table: string;
  schema: string;
  record: Record<string, unknown> | null;
  old_record: Record<string, unknown> | null;
}

/**
 * Extract the storage bucket name and file path from a Supabase public URL.
 * Public URLs follow the pattern:
 *   https://{project}.supabase.co/storage/v1/object/public/{bucket}/{filePath}
 *
 * Returns null if the URL doesn't match a known Supabase storage pattern.
 */
function extractBucketAndPath(
  url: string,
): { bucket: string; path: string } | null {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/");
    const publicIndex = parts.indexOf("public");

    if (publicIndex === -1 || publicIndex + 2 >= parts.length) return null;

    const bucket = parts[publicIndex + 1];
    const path = parts.slice(publicIndex + 2).join("/");

    // Only process URLs pointing to our known storage buckets
    if (!KNOWN_BUCKETS.includes(bucket) || !path) return null;

    return { bucket, path };
  } catch {
    // Fallback: try regex match for non-standard URLs
    const match = url.match(
      /\/storage\/v1\/object\/public\/([^/]+)\/(.+)/,
    );
    if (match && KNOWN_BUCKETS.includes(match[1]) && match[2]) {
      return { bucket: match[1], path: match[2] };
    }
    return null;
  }
}

Deno.serve(async (req: Request) => {
  // Only accept POST requests
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Verify webhook secret if configured
  if (WEBHOOK_SECRET) {
    const incomingSecret = req.headers.get("X-Webhook-Secret") ?? "";
    if (incomingSecret !== WEBHOOK_SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // Validate required environment variables
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error(
      "[delete-storage-file] Missing SUPABASE_URL or SERVICE_ROLE_KEY",
    );
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const payload: WebhookPayload = await req.json();

    // Only process DELETE events
    if (payload.type !== "DELETE") {
      return new Response(
        JSON.stringify({
          success: true,
          message: `Ignored: event type is ${payload.type}, not DELETE`,
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    const oldRecord = payload.old_record;
    if (!oldRecord) {
      return new Response(
        JSON.stringify({ success: true, message: "No old_record in payload" }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    // Create Supabase admin client with Service Role Key (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const deletedFiles: string[] = [];
    const skippedUrls: string[] = [];
    const errors: string[] = [];

    // Scan all known URL fields in the deleted record
    for (const field of STORAGE_URL_FIELDS) {
      const url = oldRecord[field];

      // Skip if field is missing, null, or not a string
      if (!url || typeof url !== "string") continue;

      // Try to extract bucket and path from the URL
      const extracted = extractBucketAndPath(url);

      if (!extracted) {
        // Not a Supabase storage URL — could be a Google Drive link,
        // a favicon URL, or an external image URL. Safe to skip.
        skippedUrls.push(`${field}=${url}`);
        continue;
      }

      // Delete the file from storage using Service Role Key
      const { error } = await supabase.storage
        .from(extracted.bucket)
        .remove([extracted.path]);

      if (error) {
        // Log error but don't fail — the DB row is already deleted
        errors.push(
          `Failed to delete ${extracted.bucket}/${extracted.path}: ${error.message}`,
        );
      } else {
        deletedFiles.push(`${extracted.bucket}/${extracted.path}`);
      }
    }

    const summary = [
      `Table: ${payload.table}`,
      `Deleted files: ${deletedFiles.length > 0 ? deletedFiles.join(", ") : "none"}`,
      `Skipped URLs: ${skippedUrls.length > 0 ? skippedUrls.join(", ") : "none"}`,
      `Errors: ${errors.length > 0 ? errors.join(", ") : "none"}`,
    ].join(", ");

    console.log(`[delete-storage-file] ${summary}`);

    return new Response(
      JSON.stringify({
        success: true,
        table: payload.table,
        deletedFiles,
        skippedUrls,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[delete-storage-file] Unhandled error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
