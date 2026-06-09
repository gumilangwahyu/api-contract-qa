'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'

type ToastType = 'success' | 'error' | 'warning'

interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface GlobalUIContextType {
  isLoading: boolean
  loadingText: string
  showLoader: (text?: string) => void
  hideLoader: () => void
  showToast: (message: string, type: ToastType, duration?: number) => void
  handleError: (error: any, fallbackMessage?: string) => void
}

const GlobalUIContext = createContext<GlobalUIContextType | undefined>(undefined)

export function useGlobalUI() {
  const context = useContext(GlobalUIContext)
  if (!context) {
    throw new Error('useGlobalUI must be used within a GlobalUIProvider')
  }
  return context
}

export function GlobalUIProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false)
  const [loadingText, setLoadingText] = useState('Memproses...')
  const [toasts, setToasts] = useState<Toast[]>([])
  const [progress, setProgress] = useState(0)
  const [progressVisible, setProgressVisible] = useState(false)

  const showLoader = useCallback((text = 'Memproses...') => {
    setLoadingText(text)
    setIsLoading(true)
  }, [])

  const hideLoader = useCallback(() => {
    setIsLoading(false)
  }, [])

  const showToast = useCallback((message: string, type: ToastType, duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, message, type, duration }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const handleError = useCallback((error: any, fallbackMessage = 'Terjadi kesalahan sistem') => {
    console.error('Global Error Caught:', error)
    let finalMessage = fallbackMessage

    if (error && typeof error === 'object') {
      if (typeof error.message === 'string') {
        finalMessage = error.message
      } else if (error.error && typeof error.error === 'string') {
        finalMessage = error.error
      }
    } else if (typeof error === 'string') {
      finalMessage = error
    }

    showToast(finalMessage, 'error')
  }, [showToast])

  useEffect(() => {
    let intervalId: any
    let timeoutId: any

    if (isLoading) {
      setProgressVisible(true)
      setProgress(15)

      intervalId = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev
          const step = Math.random() * 5 + 2
          return Math.min(90, prev + step)
        })
      }, 250)
    } else {
      setProgress(100)
      timeoutId = setTimeout(() => {
        setProgressVisible(false)
        setProgress(0)
      }, 300)
    }

    return () => {
      if (intervalId) clearInterval(intervalId)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [isLoading])

  return (
    <GlobalUIContext.Provider
      value={{
        isLoading,
        loadingText,
        showLoader,
        hideLoader,
        showToast,
        handleError,
      }}
    >
      {/* TOP PROGRESS BAR */}
      {progressVisible && (
        <div 
          className="fixed top-0 left-0 z-[9999] h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-300 ease-out"
          style={{ 
            width: `${progress}%`, 
            opacity: progress === 100 ? 0 : 1,
            boxShadow: '0 1px 10px rgba(99, 102, 241, 0.5), 0 0 5px rgba(99, 102, 241, 0.5)'
          }}
        >
          <div className="absolute right-0 top-0 h-full w-20 bg-gradient-to-r from-transparent to-white opacity-50 blur-[2px] animate-pulse" />
        </div>
      )}

      {children}

      {/* GLOBAL LOADER OVERLAY */}
      {isLoading && (
        <div className="fixed inset-0 z-[9998] flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300">
          <div className="relative flex items-center justify-center">
            {/* Spinning ring */}
            <div className="w-16 h-16 border-4 border-slate-800 border-t-blue-500 rounded-full animate-spin shadow-[0_0_20px_rgba(59,130,246,0.4)]"></div>
            {/* Inner pulsing pulse */}
            <div className="absolute w-8 h-8 bg-blue-500/20 rounded-full animate-ping"></div>
          </div>
          <p className="mt-5 text-sm font-semibold tracking-widest text-slate-200 uppercase animate-pulse">
            {loadingText}
          </p>
        </div>
      )}

      {/* GLOBAL TOASTS CONTAINER */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </div>
    </GlobalUIContext.Provider>
  )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id)
    }, toast.duration || 4000)
    return () => clearTimeout(timer)
  }, [toast, onDismiss])

  // Style customization based on alert type
  let bgClass = 'bg-slate-900/95 border-slate-700/60 text-slate-200'
  let iconColor = 'text-slate-400'
  let iconSvg = (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )

  if (toast.type === 'success') {
    bgClass = 'bg-emerald-950/80 border-emerald-500/30 text-emerald-200 backdrop-blur-md'
    iconColor = 'text-emerald-400'
    iconSvg = (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  } else if (toast.type === 'error') {
    bgClass = 'bg-rose-950/80 border-rose-500/30 text-rose-200 backdrop-blur-md'
    iconColor = 'text-rose-400'
    iconSvg = (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    )
  } else if (toast.type === 'warning') {
    bgClass = 'bg-amber-950/80 border-amber-500/30 text-amber-200 backdrop-blur-md'
    iconColor = 'text-amber-400'
    iconSvg = (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    )
  }

  return (
    <div
      className={`pointer-events-auto flex items-start p-4 rounded-xl border shadow-xl transition-all duration-300 animate-slide-in-right ${bgClass}`}
      role="alert"
    >
      <div className={`flex-shrink-0 ${iconColor}`}>{iconSvg}</div>
      <div className="ml-3 flex-1 pt-0.5">
        <p className="text-sm font-medium">{toast.message}</p>
      </div>
      <div className="ml-4 flex-shrink-0 flex">
        <button
          className="inline-flex text-slate-400 hover:text-slate-200 focus:outline-none"
          onClick={() => onDismiss(toast.id)}
        >
          <span className="sr-only">Close</span>
          <svg className="h-5 h-5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
