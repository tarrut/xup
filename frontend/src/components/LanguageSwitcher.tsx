import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'ca', label: 'Català' },
]

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function change(lang: string) {
    i18n.changeLanguage(lang)
    localStorage.setItem('lang', lang)
    setOpen(false)
  }

  const current = LANGS.find(l => l.code === i18n.language) ?? LANGS[0]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200 px-2 py-1 rounded border border-gray-700 hover:border-gray-500 transition-colors"
      >
        {current.code.toUpperCase()}
        <span className="text-gray-600">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-28 bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
          {LANGS.map(({ code, label }) => (
            <button
              key={code}
              onClick={() => change(code)}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                i18n.language === code
                  ? 'text-white bg-gray-800 font-semibold'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
