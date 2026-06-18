import { Toaster } from 'react-hot-toast'
import { useTheme } from '../../context/ThemeContext'

export default function AppToaster() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3200,
        style: isDark
          ? {
              borderRadius: '14px',
              background: '#1c1917',
              color: '#f5f5f4',
              border: '1px solid #44403c',
              boxShadow: '0 12px 40px -12px rgba(0, 0, 0, 0.65)',
              fontSize: '14px',
              fontWeight: 500,
            }
          : {
              borderRadius: '14px',
              background: '#fffcfa',
              color: '#292524',
              border: '1px solid #e8dfd3',
              boxShadow: '0 8px 32px -8px rgba(13, 148, 136, 0.15)',
              fontSize: '14px',
              fontWeight: 500,
            },
        success: {
          iconTheme: {
            primary: '#0d9488',
            secondary: isDark ? '#1c1917' : '#fffcfa',
          },
        },
        error: {
          iconTheme: {
            primary: '#e11d48',
            secondary: isDark ? '#1c1917' : '#fffcfa',
          },
        },
      }}
    />
  )
}
