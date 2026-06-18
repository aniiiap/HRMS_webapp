import { createContext, useCallback, useContext, useRef, useState } from 'react'
import ConfirmDialog from '../components/ui/ConfirmDialog'

const ConfirmContext = createContext(null)

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null)
  const resolveRef = useRef(null)

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve
      setDialog({
        title: options.title || 'Please confirm',
        message: options.message || '',
        confirmLabel: options.confirmLabel || 'Confirm',
        cancelLabel: options.cancelLabel || 'Cancel',
        destructive: Boolean(options.destructive),
      })
    })
  }, [])

  function finish(result) {
    resolveRef.current?.(result)
    resolveRef.current = null
    setDialog(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && (
        <ConfirmDialog
          {...dialog}
          onConfirm={() => finish(true)}
          onCancel={() => finish(false)}
        />
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) {
    throw new Error('useConfirm must be used within ConfirmProvider')
  }
  return ctx
}
