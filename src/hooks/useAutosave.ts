/* eslint-disable react-hooks/refs */
import { useCallback, useEffect, useRef, useState } from 'react'

export interface AutosaveOptions {
  /** Debounce delay in ms. Defaults to 3000. */
  delayMs?: number
  /** Whether autosave is enabled. Defaults to true. */
  enabled?: boolean
  /** Storage key for the draft. If omitted, no localStorage persistence. */
  storageKey?: string
}

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export interface UseAutosaveResult {
  status: AutosaveStatus
  lastSavedAt: Date | null
  /** Manually trigger a save now (bypasses debounce). */
  saveNow: () => Promise<void>
  /** Clear any persisted draft from localStorage. */
  clearDraft: () => void
  /** Load a persisted draft from localStorage (if present). */
  loadDraft: () => string | null
}

/**
 * Debounced autosave hook. Calls `saveFn(value)` whenever `value` changes
 * (after the debounce delay). Optionally persists to localStorage so drafts
 * survive page reloads.
 *
 * The saveFn should be stable (useCallback). It receives the current value
 * and should persist it (e.g. to Supabase). It must not throw — wrap errors
 * internally or return a rejected promise; this hook catches and sets status.
 */
export function useAutosave(
  value: string,
  saveFn: (value: string) => Promise<void>,
  options: AutosaveOptions = {},
): UseAutosaveResult {
  const { delayMs = 3000, enabled = true, storageKey } = options
  const [status, setStatus] = useState<AutosaveStatus>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveFnRef = useRef(saveFn)
  const valueRef = useRef(value)

  // Keep refs current without re-triggering the effect.
  saveFnRef.current = saveFn
  valueRef.current = value

  const doSave = useCallback(async () => {
    setStatus('saving')
    try {
      await saveFnRef.current(valueRef.current)
      setStatus('saved')
      setLastSavedAt(new Date())
      if (storageKey) {
        try {
          localStorage.removeItem(storageKey)
        } catch {
          // ignore quota / private mode errors
        }
      }
    } catch (e) {
      console.error('Autosave failed:', e)
      setStatus('error')
      // Persist to localStorage as a fallback so the user doesn't lose work.
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, valueRef.current)
        } catch {
          // ignore
        }
      }
    }
  }, [storageKey])

  useEffect(() => {
    if (!enabled) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      doSave()
    }, delayMs)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [value, delayMs, enabled, doSave])

  const saveNow = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    await doSave()
  }, [doSave])

  const clearDraft = useCallback(() => {
    if (storageKey) {
      try {
        localStorage.removeItem(storageKey)
      } catch {
        // ignore
      }
    }
  }, [storageKey])

  const loadDraft = useCallback((): string | null => {
    if (!storageKey) return null
    try {
      return localStorage.getItem(storageKey)
    } catch {
      return null
    }
  }, [storageKey])

  return { status, lastSavedAt, saveNow, clearDraft, loadDraft }
}

export default useAutosave
