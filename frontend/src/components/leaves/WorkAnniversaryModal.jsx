import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { PartyPopper, X, Award } from 'lucide-react'
import Confetti from 'react-confetti'
import { useWindowSize } from 'react-use'

export default function WorkAnniversaryModal({ anniversaries, currentUser }) {
  const [activeAnniversary, setActiveAnniversary] = useState(null)
  const { width, height } = useWindowSize()
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    if (!anniversaries || anniversaries.length === 0) return

    const currentYear = new Date().getFullYear()
    
    // Find the first anniversary today that hasn't been dismissed yet
    const unseen = anniversaries.find((w) => {
      if (w.days_until !== 0) return false // Only show exactly on the day
      const key = `anniversary_dismissed_${currentYear}_${w.employee_code}`
      return localStorage.getItem(key) !== 'true'
    })

    if (unseen) {
      setActiveAnniversary(unseen)
      setShowConfetti(true)
      // Stop new confetti from falling after a few seconds, but let existing ones fall
      setTimeout(() => setShowConfetti(false), 5000)
    }
  }, [anniversaries])

  if (!activeAnniversary) return null

  const isSelf = activeAnniversary.user_id === currentUser?.id
  const years = activeAnniversary.years_completed
  
  const dismiss = () => {
    const currentYear = new Date().getFullYear()
    const key = `anniversary_dismissed_${currentYear}_${activeAnniversary.employee_code}`
    localStorage.setItem(key, 'true')
    setActiveAnniversary(null)
  }

  return createPortal(
    <>
      <Confetti
        width={width}
        height={height}
        recycle={showConfetti}
        numberOfPieces={250}
        gravity={0.15}
        style={{ zIndex: 99999, position: 'fixed', top: 0, left: 0 }}
      />
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm motion-safe:animate-fade-in dark:bg-black/60">
        <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/60 bg-white/95 p-8 text-center shadow-2xl shadow-brand-900/20 backdrop-blur-xl motion-safe:animate-scale-up dark:border-slate-700/50 dark:bg-slate-900/95 dark:shadow-black">
          
          {/* Subtle background glow */}
          <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-brand-100/50 blur-3xl dark:bg-brand-900/20" />
          <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-amber-100/50 blur-3xl dark:bg-amber-900/20" />

          <button
            onClick={dismiss}
            className="absolute right-5 top-5 rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          >
            <X size={18} />
          </button>

          <div className="relative z-10 flex flex-col items-center pt-2">
            <div className="relative mb-6">
              {activeAnniversary.profile_image ? (
                <img
                  src={activeAnniversary.profile_image}
                  alt={activeAnniversary.name}
                  className="h-28 w-28 rounded-full border-4 border-white object-cover shadow-lg dark:border-slate-800"
                />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-brand-50 to-slate-100 shadow-lg dark:border-slate-800 dark:from-slate-800 dark:to-slate-900">
                  <span className="text-4xl font-bold text-brand-700 dark:text-brand-400">
                    {activeAnniversary.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-white shadow-lg ring-4 ring-white dark:ring-slate-800">
                <Award size={20} className="fill-amber-100" />
              </div>
            </div>

            <div className="mb-2 flex items-center justify-center gap-2 text-amber-500">
              <PartyPopper size={22} className="animate-bounce" />
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                {isSelf ? 'Congratulations!' : 'Work Anniversary'}
              </h2>
              <PartyPopper size={22} className="animate-bounce" />
            </div>

            {isSelf ? (
              <>
                <p className="mt-3 text-lg font-medium text-slate-700 dark:text-slate-300">
                  You have successfully completed
                </p>
                <div className="my-3 bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-5xl font-black text-transparent">
                  {years} {years === 1 ? 'Year' : 'Years'}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  with the organization! Thank you for your dedication and hard work.
                </p>
              </>
            ) : (
              <>
                <p className="mt-3 text-lg font-medium text-slate-700 dark:text-slate-300">
                  Let's celebrate <strong className="font-bold text-slate-900 dark:text-white">{activeAnniversary.name}</strong>!
                </p>
                <div className="my-3 bg-gradient-to-r from-brand-600 to-brand-500 bg-clip-text text-4xl font-black text-transparent dark:from-brand-400 dark:to-brand-300">
                  {years} {years === 1 ? 'Year' : 'Years'} Completed
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Join us in congratulating them on this amazing milestone.
                </p>
              </>
            )}

            <button
              onClick={dismiss}
              className="mt-8 w-full rounded-2xl bg-slate-900 px-6 py-3.5 font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-lg dark:bg-brand-600 dark:hover:bg-brand-500"
            >
              {isSelf ? 'Thank you!' : 'Celebrate!'}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}
