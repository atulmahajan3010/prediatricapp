import { useEffect, useRef, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'

// A single in-app modal replaces window.alert()/window.confirm(). The native
// versions open an OS-level dialog which, in the packaged Electron app, can
// leave the renderer's inputs unresponsive after the dialog is dismissed.
let state = null
const listeners = new Set()

function emit() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return state
}

function open(next) {
  state = next
  emit()
}

function close() {
  state = null
  emit()
}

export function showAlert(message, options = {}) {
  return new Promise((resolve) => {
    open({
      type: 'alert',
      message,
      title: options.title || 'Notice',
      confirmLabel: options.confirmLabel || 'OK',
      onConfirm: () => {
        close()
        resolve(true)
      }
    })
  })
}

export function showConfirm(message, options = {}) {
  return new Promise((resolve) => {
    open({
      type: 'confirm',
      message,
      title: options.title || 'Please confirm',
      confirmLabel: options.confirmLabel || 'OK',
      cancelLabel: options.cancelLabel || 'Cancel',
      onConfirm: () => {
        close()
        resolve(true)
      },
      onCancel: () => {
        close()
        resolve(false)
      }
    })
  })
}

export function DialogHost() {
  const dialog = useSyncExternalStore(subscribe, getSnapshot)
  const confirmButtonRef = useRef(null)
  const previouslyFocusedRef = useRef(null)

  useEffect(() => {
    if (dialog) {
      // Restore focus to whatever had it before the dialog opened so the
      // underlying form stays typeable once the dialog closes.
      previouslyFocusedRef.current = document.activeElement
      const timer = setTimeout(() => confirmButtonRef.current?.focus(), 0)
      return () => clearTimeout(timer)
    }
    const target = previouslyFocusedRef.current
    if (target && typeof target.focus === 'function' && document.contains(target)) {
      target.focus()
    }
    previouslyFocusedRef.current = null
    return undefined
  }, [dialog])

  if (!dialog) return null

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault()
      if (dialog.onCancel) dialog.onCancel()
      else dialog.onConfirm()
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      dialog.onConfirm()
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm"
      onKeyDown={handleKeyDown}
    >
      <div
        role={dialog.type === 'confirm' ? 'alertdialog' : 'alert'}
        aria-modal="true"
        aria-labelledby="app-dialog-title"
        aria-describedby="app-dialog-message"
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.45)]"
      >
        <h2 id="app-dialog-title" className="text-base font-semibold text-slate-800">{dialog.title}</h2>
        <p id="app-dialog-message" className="mt-2 whitespace-pre-line text-sm text-slate-600">{dialog.message}</p>
        <div className="mt-5 flex justify-end gap-2">
          {dialog.type === 'confirm' && (
            <button
              type="button"
              onClick={dialog.onCancel}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              {dialog.cancelLabel}
            </button>
          )}
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={dialog.onConfirm}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-700"
          >
            {dialog.confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
