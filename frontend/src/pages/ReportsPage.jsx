import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api, messageFromError } from '../api/client'

export default function ReportsPage() {
  const [attendance, setAttendance] = useState({})
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get('/api/reports/attendance/')
        setAttendance(data.by_day || {})
      } catch (err) {
        setError(messageFromError(err))
      }
    }
    void load()
  }, [])

  const rows = Object.entries(attendance).map(([date, present]) => ({ date, present }))

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Reports</h2>
      {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="card h-96 p-4">
        <p className="mb-2 font-semibold">Attendance report</p>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={rows}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" hide /><YAxis /><Tooltip /><Bar dataKey="present" fill="#2563eb" /></BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
