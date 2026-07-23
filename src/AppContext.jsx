import React, { createContext, useContext, useState, useEffect } from 'react'

const AppContext = createContext({})

export const THEMES = {
  dark:     { label: '🌑 Dark',     preview: '#07071a', light: false },
  midnight: { label: '🔵 Midnight', preview: '#020309', light: false },
  forest:   { label: '🌲 Forest',   preview: '#071a0f', light: false },
  sunset:   { label: '🌅 Sunset',   preview: '#1a0a07', light: false },
  ocean:    { label: '🌊 Ocean',    preview: '#021825', light: false },
  rose:     { label: '🌸 Rose',     preview: '#1a0510', light: false },
}

export function AppProvider({ children }) {
  const [lang,  setLang]  = useState(() => {
    try { return localStorage.getItem('lang')  || 'en'   } catch { return 'en' }
  })
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('theme') || 'dark' } catch { return 'dark' }
  })

  useEffect(() => { try { localStorage.setItem('lang', lang) } catch {} }, [lang])

  useEffect(() => {
    try { localStorage.setItem('theme', theme) } catch {}
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <AppContext.Provider value={{ lang, setLang, theme, setTheme }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() { return useContext(AppContext) }
