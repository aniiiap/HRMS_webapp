import { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api, messageFromError } from '../api/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/api/auth/password-reset/request/', { email: email.trim() })
      setSent(true)
      toast.success(data?.message || 'Check your email for reset instructions.')
    } catch (err) {
      setError(messageFromError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-surface bg-mesh-light p-4 dark:bg-stone-950 dark:bg-mesh-dark">
      <form onSubmit={submit} className="card w-full max-w-md space-y-4 p-6 sm:p-8 motion-safe:animate-fade-up">
        <h1 className="font-display text-2xl font-bold text-stone-900 dark:text-white">Forgot password</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Enter your work email. If an account exists, we will send a link to reset your password.
        </p>
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
            {error}
          </div>
        )}
        {sent && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
            If an account exists for this email, you will receive password reset instructions shortly. Check your inbox and spam folder.
          </div>
        )}
        {!sent && (
          <input
            className="input-field"
            type="email"
            placeholder="Work email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        )}
        {!sent ? (
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        ) : (
          <button type="button" className="btn-secondary w-full" onClick={() => setSent(false)}>
            Try another email
          </button>
        )}
        <p className="text-center text-xs text-stone-500 dark:text-stone-400">
          <Link to="/login" className="font-semibold text-brand-600 dark:text-brand-400">
            Back to sign in
          </Link>
        </p>
      </form>
    </div>
  )
}
