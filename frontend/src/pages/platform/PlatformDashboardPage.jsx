import { useEffect, useState } from 'react'
import { Building2, Users, Activity, UserPlus, Server, ArrowRight, ShieldCheck, ChevronRight, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api, messageFromError } from '../../api/client'
import PageSkeleton from '../../components/ui/PageSkeleton'

export default function PlatformDashboardPage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    void (async () => {
      try {
        const { data: res } = await api.get('/api/platform/dashboard/')
        setData(res)
      } catch (err) {
        setError(messageFromError(err))
      }
    })()
  }, [])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-red-50/50 dark:bg-red-900/10 rounded-3xl border border-red-100 dark:border-red-900/50">
        <ShieldCheck className="w-12 h-12 text-red-500 mb-3" />
        <p className="text-sm font-semibold text-red-700 dark:text-red-400">{error}</p>
      </div>
    )
  }

  if (!data) {
    return <PageSkeleton rows={4} />
  }

  const { totals, recent_organizations } = data

  return (
    <div className="space-y-8 pb-10">
      {/* Header Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-indigo-800 to-indigo-950 dark:from-slate-900 dark:via-indigo-950 dark:to-slate-950 rounded-3xl p-8 sm:p-10 text-white shadow-2xl shadow-indigo-900/20">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/30 rounded-full blur-3xl"></div>
        
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-xs font-semibold uppercase tracking-wider mb-4 text-indigo-100">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Super Admin View
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">Platform Overview</h2>
          <p className="text-indigo-200 max-w-xl text-sm sm:text-base leading-relaxed">
            Monitor and manage all SaaS tenants, user accounts, and infrastructure metrics from this centralized command center.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Stat Card 1 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Organizations</p>
            <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          <p className="text-4xl font-black text-slate-800 dark:text-slate-100 mb-2">{totals.organizations}</p>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-full w-max">
            <Activity className="w-3.5 h-3.5" />
            {totals.active_organizations} Active Tenants
          </div>
        </div>

        {/* Stat Card 2 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Employees</p>
            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-4xl font-black text-slate-800 dark:text-slate-100 mb-2">{totals.employees}</p>
          <p className="text-xs font-medium text-slate-400">Across all organizations</p>
        </div>

        {/* Stat Card 3 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">User Accounts</p>
            <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <p className="text-4xl font-black text-slate-800 dark:text-slate-100 mb-2">{totals.users}</p>
          <p className="text-xs font-medium text-slate-400">Total registered profiles</p>
        </div>

        {/* Quick Action */}
        <Link to="/platform/organizations" className="bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-3xl p-6 shadow-lg hover:shadow-indigo-500/30 transition-all flex flex-col justify-center items-center text-center group cursor-pointer relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <Server className="w-10 h-10 mb-3 opacity-90 group-hover:scale-110 transition-transform duration-300" />
          <span className="text-lg font-bold">Manage Organizations</span>
          <span className="inline-flex items-center gap-1 text-sm text-indigo-100 font-medium mt-1">
            View All <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </span>
        </Link>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Recent Organizations
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 text-left">Company Name</th>
                <th className="px-6 py-4 text-left">Subscription Plan</th>
                <th className="px-6 py-4 text-left">Staff Details</th>
                <th className="px-6 py-4 text-left">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {(recent_organizations || []).map((o) => (
                <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800 dark:text-slate-200">{o.name}</div>
                    <div className="text-xs text-slate-400 font-medium">ID: #{o.id}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 capitalize border border-indigo-100 dark:border-indigo-800/50">
                      {o.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
                        <Users size={14} className="text-slate-400" /> {o.employee_count} Employees
                      </span>
                      <span className="text-xs text-slate-400">{o.admin_count} Admins</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {o.is_active ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-slate-500 font-medium">
                        <span className="w-2 h-2 rounded-full bg-slate-400"></span> Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link to="/platform/organizations" className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors">
                      Manage <ChevronRight className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
              {(recent_organizations || []).length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    <Building2 className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                    <p className="font-medium text-base">No organizations onboarded yet.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
