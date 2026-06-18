import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api, messageFromError } from '../api/client'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!token) {
      setError('Missing reset token. Use the link from your email or request a new one.')
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
      const { data } = await api.post('/api/auth/password-reset/confirm/', { token, password })
      setSuccess(data?.message || 'Password updated. You can now sign in.')
      setTimeout(() => navigate('/login', { replace: true }), 1500)
    } catch (err) {
      setError(messageFromError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-surface bg-mesh-light p-4 dark:bg-stone-950 dark:bg-mesh-dark">
      <form onSubmit={submit} className="card w-full max-w-md space-y-4 p-6 sm:p-8 motion-safe:animate-fade-up">
        <h1 className="font-display text-2xl font-bold text-stone-900 dark:text-white">Set new password</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Choose a new password for your HR Core account. This link expires in 1 hour.
        </p>
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
            {error}
            {!token && (
              <p className="mt-2">
                <Link to="/forgot-password" className="font-semibold text-brand-600 dark:text-brand-400">
                  Request a new reset link
                </Link>
              </p>
            )}
          </div>
        )}
        {success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
            {success}
          </div>
        )}
        <input
          type="password"
          placeholder="New password"
          className="input-field"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />
        <input
          type="password"
          placeholder="Confirm new password"
          className="input-field"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />
        <button type="submit" className="btn-primary w-full" disabled={loading || !token}>
          {loading ? 'Saving…' : 'Update password'}
        </button>
        <p className="text-center text-xs text-stone-500 dark:text-stone-400">
          <Link to="/login" className="font-semibold text-brand-600 dark:text-brand-400">
            Back to sign in
          </Link>
          {' · '}
          <Link to="/forgot-password" className="font-semibold text-brand-600 dark:text-brand-400">
            Request new link
          </Link>
        </p>
      </form>
    </div>
  )
}
