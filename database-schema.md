# EduDock Database Schema Documentation

This document serves as the official schema reference for the EduDock Supabase project.

## Project Information
- **Project Name**: EduDock136
- **Project ID**: qxuxvhzgmrwpngvmsume
- **Region**: ap-south-1
- **Status**: Active

---

## Database Tables

### 1. `pdfs`
Stores PDF resources with upload and Google Drive support.

| Column Name | Data Type | Nullable | Default | Description |
|-------------|------------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| title | varchar | NO | - | PDF title |
| description | text | YES | - | PDF description |
| file_url | text | YES | - | URL to PDF file |
| cover_image_url | text | YES | - | URL to cover image |
| file_type | varchar | NO | 'upload' | 'upload' or 'drive' |
| drive_link | text | YES | - | Google Drive link when file_type='drive' |
| slug | text | YES | - | URL-friendly slug |
| author_name | varchar | YES | - | Author display name |
| author_avatar | text | YES | - | Author avatar URL |
| clicks | integer | YES | 0 | Click counter |
| category_id | uuid | YES | - | Foreign key to categories.id |
| created_at | timestamptz | YES | now() | Creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |

**Foreign Keys:**
- `category_id` → `categories.id`

**RLS Policies:**
- Enable read access for all authenticated users
- Enable insert for all authenticated users
- Enable update for all authenticated users
- Enable delete for all authenticated users

---

### 2. `updates`
Stores news and updates with optional external URLs.

| Column Name | Data Type | Nullable | Default | Description |
|-------------|------------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| title | varchar | NO | - | Update title |
| content | text | YES | - | Update content |
| image_url | text | YES | - | URL to update image |
| external_url | text | YES | - | External link URL |
| slug | text | YES | - | URL-friendly slug |
| author_name | varchar | YES | - | Author display name |
| author_avatar | text | YES | - | Author avatar URL |
| clicks | integer | YES | 0 | Click counter |
| category_id | uuid | YES | - | Foreign key to categories.id |
| created_at | timestamptz | YES | now() | Creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |

**Foreign Keys:**
- `category_id` → `categories.id`

**RLS Policies:**
- Enable read access for all authenticated users
- Enable insert for all authenticated users
- Enable update for all authenticated users
- Enable delete for all authenticated users

---

### 3. `tools`
Stores external tools and resources.

| Column Name | Data Type | Nullable | Default | Description |
|-------------|------------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| title | varchar | NO | - | Tool title |
| short_description | text | YES | - | Short description |
| description | text | YES | - | Full description |
| url | text | NO | - | Tool URL |
| image_url | text | YES | - | URL to tool image |
| image_type | varchar | YES | 'upload' | 'upload' or 'favicon' |
| favicon_url | text | YES | - | Favicon URL when image_type='favicon' |
| author_name | varchar | YES | - | Author display name |
| author_avatar | text | YES | - | Author avatar URL |
| clicks | integer | YES | 0 | Click counter |
| category_id | uuid | YES | - | Foreign key to categories.id |
| created_at | timestamptz | YES | now() | Creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |

**Foreign Keys:**
- `category_id` → `categories.id`

**RLS Policies:**
- Enable read access for all authenticated users
- Enable insert for all authenticated users
- Enable update for all authenticated users
- Enable delete for all authenticated users

---

### 4. `categories`
Stores categories for PDFs, Updates, and Tools.

| Column Name | Data Type | Nullable | Default | Description |
|-------------|------------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| name | varchar | NO | - | Category name |
| entity_type | varchar | NO | - | 'pdf', 'update', or 'tool' |
| created_at | timestamptz | YES | now() | Creation timestamp |

**Check Constraint:**
- `entity_type` must be one of: 'pdf', 'update', 'tool'

**Foreign Keys Referencing This Table:**
- `pdfs.category_id`
- `updates.category_id`
- `tools.category_id`

**RLS Policies:**
- Enable read access for all authenticated users
- Enable insert for all authenticated users
- Enable update for all authenticated users
- Enable delete for all authenticated users

---

### 5. `pdf_categories`
Simple category list for PDFs (legacy table).

| Column Name | Data Type | Nullable | Default | Description |
|-------------|------------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| name | text | NO | - | Category name |
| created_at | timestamptz | YES | now() | Creation timestamp |

**RLS Policies:**
- Enable read access for all authenticated users
- Enable insert for all authenticated users
- Enable update for all authenticated users
- Enable delete for all authenticated users

---

### 6. `analytics`
Stores monthly visitor statistics for dashboard.

| Column Name | Data Type | Nullable | Default | Description |
|-------------|------------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| page | text | YES | - | Page name |
| month | text | NO | - | Month name (e.g., 'January') |
| visitor_count | integer | YES | 0 | Number of visitors |
| year | integer | NO | - | Year (e.g., 2025) |
| created_at | timestamptz | YES | now() | Creation timestamp |

**RLS Policies:**
- Enable read access for all authenticated users
- Enable insert for all authenticated users
- Enable update for all authenticated users
- Enable delete for all authenticated users

---

### 7. `admin_messages`
Stores messages between admin users with Google profile integration.

| Column Name | Data Type | Nullable | Default | Description |
|-------------|------------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| content | text | NO | - | Message content |
| sender_id | uuid | NO | - | Foreign key to auth.users.id |
| sender_name | varchar | NO | - | Cached Google display name |
| sender_avatar | text | YES | - | Cached Google avatar URL |
| is_read | boolean | YES | false | Read status |
| parent_id | uuid | YES | - | Parent message ID for threads |
| created_at | timestamptz | YES | now() | Creation timestamp |

**Foreign Keys:**
- `sender_id` → `auth.users.id`
- `parent_id` → `admin_messages.id` (self-reference)

**RLS Policies:**
- Enable read access for all authenticated users
- Enable insert for all authenticated users
- Enable update for all authenticated users
- Enable delete for all authenticated users

---

### 8. `page_views`
Tracks page visits for analytics.

| Column Name | Data Type | Nullable | Default | Description |
|-------------|------------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| path | text | YES | - | Page path |
| created_at | timestamptz | YES | now() | Creation timestamp |

**RLS Policies:**
- Enable read access for all authenticated users
- Enable insert for all authenticated users
- Enable update for all authenticated users
- Enable delete for all authenticated users

---

## Storage Buckets

### 1. `pdf-covers`
Stores cover images for PDFs.

**Access Level**: Public
**RLS Policies:**
- Allow Admin Full Access
- Public can view pdf-covers

---

### 2. `update-images`
Stores images for updates.

**Access Level**: Public
**RLS Policies:**
- Allow Admin Full Access
- Public can view update-images

---

### 3. `pdf-files`
Stores uploaded PDF files.

**Access Level**: Public
**RLS Policies:**
- Allow Admin Full Access
- Public can view pdf-files

---

### 4. `tool-images`
Stores images for tools.

**Access Level**: Public
**RLS Policies:**
- Allow Admin Full Access
- Public can view tool-images

---

## TypeScript Type Definitions

### Pdf Interface
```typescript
interface Pdf {
  id: string
  title: string
  description: string
  file_url: string
  cover_image_url: string | null
  file_type: 'upload' | 'drive'
  drive_link: string | null
  author_name: string | null
  author_avatar: string | null
  category_id: string | null
  created_at: string
}
```

### Update Interface
```typescript
interface Update {
  id: string
  title: string
  content: string
  image_url: string | null
  external_url: string | null
  author_name: string | null
  author_avatar: string | null
  category_id: string | null
  created_at: string
}
```

### Tool Interface
```typescript
interface Tool {
  id: string
  title: string
  description: string
  url: string
  image_url: string | null
  image_type: 'upload' | 'favicon'
  favicon_url: string | null
  author_name: string | null
  author_avatar: string | null
  category_id: string | null
  created_at: string
}
```

### Category Interface
```typescript
interface Category {
  id: string
  name: string
  entity_type: 'pdf' | 'update' | 'tool'
  created_at: string
}
```

### Message Interface
```typescript
interface Message {
  id: string
  content: string
  sender_id: string
  sender_name: string
  sender_avatar: string | null
  created_at: string
  is_read: boolean
  parent_id: string | null
}
```

---

## Constants

### Table Names
```typescript
const TABLES = {
  PDFS: 'pdfs',
  UPDATES: 'updates',
  TOOLS: 'tools',
  CATEGORIES: 'categories',
  MESSAGES: 'admin_messages',
  ANALYTICS: 'analytics',
}
```

### Storage Bucket Names
```typescript
const STORAGE_BUCKETS = {
  PDF_COVERS: 'pdf-covers',
  UPDATE_IMAGES: 'update-images',
  PDF_FILES: 'pdf-files',
  TOOL_IMAGES: 'tool-images',
}
```

---

## Notes

- All tables have Row Level Security (RLS) enabled
- All tables allow full access (SELECT, INSERT, UPDATE, DELETE) to authenticated users
- Google OAuth metadata is cached in `admin_messages` table for performance
- Analytics data is aggregated monthly for dashboard display
- Categories are shared across PDFs, Updates, and Tools via `entity_type` field
