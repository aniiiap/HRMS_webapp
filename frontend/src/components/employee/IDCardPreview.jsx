import { useEffect, useState } from 'react'
import {
  BadgeCheck,
  Building2,
  CalendarDays,
  Download,
  Droplets,
  FlipHorizontal2,
  HeartPulse,
  IdCard,
  Loader2,
  ShieldCheck,
} from 'lucide-react'
import { api } from '../../api/client'

export default function IDCardPreview({ employee }) {
  const [template, setTemplate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [flipped, setFlipped] = useState(false)

  useEffect(() => {
    async function fetchTemplate() {
      if (!employee?.organization) {
        setLoading(false)
        return
      }
      try {
        const { data } = await api.get(`/api/organizations/${employee.organization}/id-card-template/`)
        setTemplate(data)
      } catch (err) {
        // template might not exist, that's okay
      } finally {
        setLoading(false)
      }
    }
    void fetchTemplate()
  }, [employee?.organization])

  if (!employee) return null

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 className="animate-spin text-brand-600" size={32} />
        <p className="text-slate-500">Loading ID Card preview...</p>
      </div>
    )
  }

  // Fallback defaults if no template configured
  const showBloodGroup = template ? template.show_blood_group : true
  const showEmergency = template ? template.show_emergency_contact : true
  const showDob = template ? template.show_dob : false
  const textColor = template?.text_color || '#1e293b'
  const frontBgImage = template?.front_background_image || null
  const backBgImage = template?.back_background_image || null
  const signatureImage = template?.authorized_signature_image || null
  const termsConditions = template?.terms_conditions || "This card is the property of the company. If found, please return to the company address."
  const rgb = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(textColor)
  const brightness = rgb
    ? (Number.parseInt(rgb[1], 16) * 299 + Number.parseInt(rgb[2], 16) * 587 + Number.parseInt(rgb[3], 16) * 114) / 1000
    : 0
  const primaryTextColor = brightness > 155 ? '#0f172a' : textColor

  const cardStyle = {
    width: '260px',
    height: '414px',
    color: textColor,
    fontFamily: 'Helvetica, Arial, sans-serif'
  }

  const details = [
    { label: 'Employee ID', value: employee.employee_code || '—', icon: IdCard, tone: 'bg-brand-50 text-brand-600' },
    showBloodGroup && employee.blood_group
      ? { label: 'Blood group', value: employee.blood_group, icon: Droplets, tone: 'bg-rose-50 text-rose-600' }
      : null,
    showEmergency && employee.emergency_contact
      ? { label: 'Emergency', value: employee.emergency_contact, icon: HeartPulse, tone: 'bg-sky-50 text-sky-600' }
      : null,
    showDob && employee.date_of_birth
      ? { label: 'Date of birth', value: employee.date_of_birth, icon: CalendarDays, tone: 'bg-violet-50 text-violet-600' }
      : null,
  ].filter(Boolean)

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-brand-50/40 shadow-sm dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      <div className="flex flex-col items-center gap-2 border-b border-slate-200/80 px-6 py-6 text-center dark:border-slate-800">
        <span className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-brand-700 dark:border-brand-900/60 dark:bg-brand-950/50 dark:text-brand-300">
          <ShieldCheck size={14} /> Digital identity
        </span>
        <h3 className="mt-1 text-xl font-bold tracking-tight text-slate-900 dark:text-white">Your official ID card</h3>
        <p className="max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">Review both sides, then download a print-ready copy whenever you need it.</p>
      </div>

      <div className="flex flex-col items-center gap-6 px-6 py-8 sm:px-8">
        <button
          type="button"
          aria-label={flipped ? 'Show the front of your ID card' : 'Show the back of your ID card'}
          className="group relative cursor-pointer rounded-[22px] text-left outline-none focus-visible:ring-4 focus-visible:ring-brand-500/30"
          style={{ width: '260px', height: '414px', perspective: '1000px' }}
          onClick={() => setFlipped((value) => !value)}
        >
        <div 
          className="relative h-full w-full rounded-[22px] shadow-[0_24px_50px_-18px_rgba(15,23,42,0.42)] transition-transform duration-700"
          style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
        >
          {/* FRONT FACE */}
          <div 
            className="absolute inset-0 overflow-hidden rounded-[22px] border border-white/40"
            style={{ 
              ...cardStyle, 
              backgroundImage: frontBgImage ? `url(${frontBgImage})` : 'linear-gradient(150deg, #faf8ff 0%, #ffffff 50%, #e0e7ff 100%)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backfaceVisibility: 'hidden'
            }}
          >
            <div className="absolute inset-x-0 top-0 h-32 border-b border-indigo-100 bg-gradient-to-br from-violet-50 via-indigo-50 to-indigo-100" />
            <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-violet-300/35 blur-2xl" />
            <div className="absolute -left-10 top-12 h-20 w-20 rounded-full border-[18px] border-white/45" />
            <div className="relative flex h-full flex-col items-center p-5 text-center">
              <div className="flex h-11 w-full items-center justify-between gap-3 text-slate-900">
                {employee.organization_logo ? (
                  <img src={employee.organization_logo} alt="Company Logo" className="h-9 max-w-[138px] object-contain object-left drop-shadow-sm" />
                ) : (
                  <div className="max-w-[150px] text-left text-[10px] font-black uppercase leading-tight tracking-[0.13em]">
                    {employee.organization_name || 'COMPANY ID'}
                  </div>
                )}
                <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-white/85 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.13em] text-violet-700 shadow-sm backdrop-blur-sm"><ShieldCheck size={10} /> Verified</span>
              </div>

              <div className="mt-4 flex h-24 w-24 shrink-0 aspect-square overflow-hidden rounded-full border-4 bg-white shadow-lg" style={{ borderColor: '#ffffff', borderRadius: '50%' }}>
                {employee.profile_image ? (
                  <img src={employee.profile_image} alt={employee.first_name} className="h-full w-full rounded-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-100 text-3xl font-bold text-slate-400">
                    {employee.first_name?.[0] || 'E'}
                  </div>
                )}
              </div>

              <h2 className="mt-3 text-xl font-extrabold leading-tight tracking-tight" style={{ color: primaryTextColor }}>
                {employee.first_name} {employee.last_name}
              </h2>
              <div className="mt-1 rounded-full border border-violet-100 bg-violet-50/80 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-violet-700 shadow-sm">
                {employee.designation || 'Employee'}
              </div>

              <div className="mt-auto w-full rounded-[18px] border border-slate-200/80 bg-white/90 p-2.5 text-left shadow-[0_12px_24px_-20px_rgba(15,23,42,0.6)] backdrop-blur-md">
                <div className="space-y-1.5">
                  {details.map(({ label, value, icon: Icon, tone }) => (
                    <div key={label} className="flex items-center gap-2 border-b border-slate-900/10 pb-1.5 last:border-0 last:pb-0">
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${tone || 'bg-slate-100 text-slate-500'}`}>
                        <Icon size={13} />
                      </span>
                      <span className="min-w-0 flex-1 text-[8px] font-bold uppercase tracking-[0.1em] text-slate-500">{label}</span>
                      <span className="max-w-[115px] truncate text-right text-[10px] font-bold text-slate-800">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* BACK FACE */}
          <div 
            className="absolute inset-0 overflow-hidden rounded-[22px] border border-white/40"
            style={{ 
              ...cardStyle, 
              backgroundImage: backBgImage ? `url(${backBgImage})` : 'linear-gradient(145deg, #f5f3ff 0%, #e0e7ff 52%, #f8fafc 100%)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              transform: 'rotateY(180deg)',
              backfaceVisibility: 'hidden'
            }}
          >
            <div className="absolute inset-x-0 top-0 h-20 border-b border-indigo-100 bg-gradient-to-r from-violet-50 via-white to-indigo-50" />
            <div className="relative flex h-full flex-col p-5 text-center">
              <div className="flex h-12 items-center justify-center gap-2 text-slate-700">
                <Building2 size={15} />
                <span className="text-[9px] font-bold uppercase tracking-[0.14em]">Company identification</span>
              </div>
              <div className="mt-7 text-base font-extrabold leading-snug text-indigo-800">
                {employee.organization_name || 'COMPANY ID'}
              </div>

              <div className="mt-4 rounded-2xl border border-white/80 bg-white/70 p-3.5 text-left shadow-sm backdrop-blur-md">
                <div className="mb-2 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.11em] text-slate-700">
                  <BadgeCheck size={13} className="text-brand-600" /> Terms & conditions
                </div>
                <p className="max-h-36 overflow-y-auto pr-1 text-[10px] leading-relaxed text-slate-600">
                  {termsConditions}
                </p>
              </div>

              <div className="mt-auto flex flex-col items-center pt-3">
                {signatureImage ? (
                  <img src={signatureImage} className="mb-1 h-8 max-w-[132px] object-contain" alt="Authorized signature" />
                ) : (
                  <div className="mb-1 h-8 w-32 border-b border-slate-900/25" />
                )}
                <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500">Authorized signatory</span>
              </div>
            </div>
          </div>
        </div>
        </button>

        <div className="flex items-center justify-center gap-2 text-sm font-semibold text-brand-700 dark:text-brand-300">
          <FlipHorizontal2 size={16} /> Click the card to view {flipped ? 'the front' : 'the back'}
        </div>
      </div>
    </section>
  )
}
