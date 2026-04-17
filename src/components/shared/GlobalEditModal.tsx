import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGlobalSearch, type EntityType } from '@/contexts/GlobalSearchContext'

const routeMap: Record<EntityType, string> = {
  pdf: '/pdfs',
  update: '/updates',
  tool: '/tools',
}

/**
 * This component listens to the GlobalSearchContext's editTarget.
 * When an editTarget is set (e.g., from the global search dropdown),
 * it navigates to the appropriate manager page. The manager page
 * then detects the editTarget and opens its edit dialog.
 */
const GlobalEditModal: React.FC = () => {
  const { editTarget } = useGlobalSearch()
  const navigate = useNavigate()

  useEffect(() => {
    if (editTarget) {
      navigate(routeMap[editTarget.type])
      // Don't closeEdit here — the manager page will consume it
    }
  }, [editTarget, navigate])

  return null // This component has no UI — it only handles navigation
}

export default GlobalEditModal
