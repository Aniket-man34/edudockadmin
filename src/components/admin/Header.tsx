import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, Search, Edit, Trash2, FileText, Megaphone, Wrench, Loader2, X, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useGlobalSearch, type EntityType } from '@/contexts/GlobalSearchContext'
import { supabase, TABLES } from '@/lib/supabase'
import { deleteStorageFile } from '@/lib/storageUtils'
import { useToast } from '@/hooks/use-toast'

interface SearchItem {
  id: string
  title: string
  imageUrl: string | null
  type: EntityType
}

const typeConfig: Record<EntityType, { label: string; icon: React.ElementType; color: string; bucketField: string }> = {
  pdf: { label: 'PDF', icon: FileText, color: 'bg-blue-100 text-blue-700', bucketField: 'cover_image_url' },
  update: { label: 'Update', icon: Megaphone, color: 'bg-green-100 text-green-700', bucketField: 'image_url' },
  tool: { label: 'Tool', icon: Wrench, color: 'bg-purple-100 text-purple-700', bucketField: 'image_url' },
}

const Header: React.FC = () => {
  const { fullName, avatarUrl, signOut } = useAuth()
  const { openEdit } = useGlobalSearch()
  const { toast } = useToast()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to logout. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchItem[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounced global search
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }

    setIsSearching(true)
    try {
      const [pdfsRes, updatesRes, toolsRes] = await Promise.all([
        supabase.from(TABLES.PDFS).select('id, title, cover_image_url').ilike('title', `%${query}%`).limit(5),
        supabase.from(TABLES.UPDATES).select('id, title, image_url').ilike('title', `%${query}%`).limit(5),
        supabase.from(TABLES.TOOLS).select('id, title, image_url').ilike('title', `%${query}%`).limit(5),
      ])

      const results: SearchItem[] = [
        ...(pdfsRes.data || []).map((p: { id: string; title: string; cover_image_url: string | null }) => ({
          id: p.id, title: p.title, imageUrl: p.cover_image_url, type: 'pdf' as EntityType,
        })),
        ...(updatesRes.data || []).map((u: { id: string; title: string; image_url: string | null }) => ({
          id: u.id, title: u.title, imageUrl: u.image_url, type: 'update' as EntityType,
        })),
        ...(toolsRes.data || []).map((t: { id: string; title: string; image_url: string | null }) => ({
          id: t.id, title: t.title, imageUrl: t.image_url, type: 'tool' as EntityType,
        })),
      ]

      setSearchResults(results)
      setShowDropdown(true)
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsSearching(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => performSearch(searchQuery), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchQuery, performSearch])

  const handleDeleteFromSearch = async (item: SearchItem) => {
    if (!window.confirm(`Delete "${item.title}"?`)) return

    try {
      // Phase 4: Delete storage files first
      const tableMap: Record<EntityType, string> = { pdf: TABLES.PDFS, update: TABLES.UPDATES, tool: TABLES.TOOLS }
      const { data: entity } = await supabase.from(tableMap[item.type]).select('*').eq('id', item.id).single()

      if (entity) {
        // Delete associated storage files
        if (item.type === 'pdf') {
          await deleteStorageFile(entity.cover_image_url)
          await deleteStorageFile(entity.file_url)
        } else if (item.type === 'update') {
          await deleteStorageFile(entity.image_url)
        } else if (item.type === 'tool') {
          await deleteStorageFile(entity.image_url)
        }
      }

      const { error } = await supabase.from(tableMap[item.type]).delete().eq('id', item.id)
      if (error) throw error

      toast({ title: 'Deleted', description: `"${item.title}" deleted successfully.` })
      setSearchResults((prev) => prev.filter((r) => r.id !== item.id))
    } catch (error) {
      console.error('Delete error:', error)
      toast({ title: 'Error', description: 'Failed to delete. Please try again.', variant: 'destructive' })
    }
  }

  return (
    <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <img src="/favicon.svg" alt="EduDock" className="h-8 w-8 mr-4 flex-shrink-0" />

        {/* Global Search */}
        <div className="flex-1 max-w-xl relative" ref={searchRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="search"
              placeholder="Search PDFs, Updates, Tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => { if (searchResults.length > 0) setShowDropdown(true) }}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
            )}
            {!isSearching && searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setSearchResults([]); setShowDropdown(false) }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>

          {/* Search Dropdown */}
          {showDropdown && searchQuery && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
              {searchResults.length === 0 && !isSearching ? (
                <div className="p-4 text-center text-gray-500 text-sm">No results found</div>
              ) : (
                searchResults.map((item) => {
                  const config = typeConfig[item.type]
                  const Icon = config.icon
                  return (
                    <div
                      key={`${item.type}-${item.id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                    >
                      {/* Thumbnail */}
                      <div className="h-10 w-10 rounded overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
                        ) : (
                          <Icon className="h-5 w-5 text-gray-400" />
                        )}
                      </div>

                      {/* Title + Category */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                        <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${config.color}`}>
                          {config.label}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => { openEdit(item.type, item.id); setShowDropdown(false) }}
                          title="Edit"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteFromSearch(item)}
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>

        {/* Right side: Notifications + User */}
        <div className="flex items-center space-x-4 ml-4">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full"></span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="text-gray-600 hover:text-red-600"
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
          </Button>

          <div className="flex items-center space-x-3">
            {avatarUrl ? (
              <img src={avatarUrl} alt={fullName || 'User'} className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-blue-600">
                  {fullName ? fullName.charAt(0).toUpperCase() : 'A'}
                </span>
              </div>
            )}
            <div>
              <p className="text-sm font-medium">{fullName || 'Admin'}</p>
              <p className="text-xs text-gray-500">EduDock Platform</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
