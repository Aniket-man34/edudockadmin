/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback } from 'react'

export type EntityType = 'pdf' | 'update' | 'tool'

export interface SearchResult {
  id: string
  title: string
  imageUrl: string | null
  type: EntityType
}

interface EditTarget {
  type: EntityType
  id: string
}

interface GlobalSearchContextType {
  editTarget: EditTarget | null
  setEditTarget: (target: EditTarget | null) => void
  openEdit: (type: EntityType, id: string) => void
  closeEdit: () => void
}

const GlobalSearchContext = createContext<GlobalSearchContextType | undefined>(undefined)

export const GlobalSearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null)

  const openEdit = useCallback((type: EntityType, id: string) => {
    setEditTarget({ type, id })
  }, [])

  const closeEdit = useCallback(() => {
    setEditTarget(null)
  }, [])

  return (
    <GlobalSearchContext.Provider value={{ editTarget, setEditTarget, openEdit, closeEdit }}>
      {children}
    </GlobalSearchContext.Provider>
  )
}

export const useGlobalSearch = () => {
  const context = useContext(GlobalSearchContext)
  if (!context) {
    throw new Error('useGlobalSearch must be used within a GlobalSearchProvider')
  }
  return context
}
