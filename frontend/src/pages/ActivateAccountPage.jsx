import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api, messageFromError } from '../api/client'

export default function ActivateAccountPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (token) {
      api.get(`/api/auth/invite/details/?token=${token}`)
        .then(res => setEmail(res.data.email))
        .catch(err => setError(messageFromError(err) || 'Invalid or expired invite link.'))
    }
  }, [token])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!token) {
      setError('Missing invite token. Use the link from your email.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      const { data } = await api.post('/api/auth/invite/accept/', { token, password })
      setSuccess(data?.message || 'Password set. You can now sign in.')
      setTimeout(() => navigate('/login', { replace: true }), 1200)
    } catch (err) {
      setError(messageFromError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-slate-100 p-4 dark:bg-slate-950">
      <form onSubmit={submit} className="card w-full max-w-md space-y-4 p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Create your account</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Set your password using the link from your invite email. You can then sign in to your company admin dashboard.
        </p>
        {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</div>}
        {success && <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">{success}</div>}
        <input
          type="email"
          disabled
          value={email}
          placeholder="Email address"
          className="w-full rounded-xl border border-slate-300 bg-slate-100 px-3 py-2.5 text-slate-500 outline-none cursor-not-allowed dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
        />
        <input
          type="password"
          placeholder="New password"
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-brand-400 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Confirm password"
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-brand-400 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? 'Creating account...' : 'Create account & continue'}
        </button>
        <p className="text-center text-xs text-slate-500 dark:text-slate-400">
          Already activated? <Link to="/login" className="font-semibold text-brand-600 dark:text-brand-400">Sign in</Link>
        </p>
      </form>
    </div>
  )
}
