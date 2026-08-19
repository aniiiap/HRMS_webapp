import { useState, useEffect } from 'react'
import { Laptop, Smartphone, Key, Monitor, RotateCcw } from 'lucide-react'
import { assetsApi } from '../../api/assets'
import { format } from 'date-fns'

export default function EmployeeAssetsTab({ employee, isPrivileged }) {
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAssets = async () => {
    try {
      const res = await assetsApi.getAssets({ employee: employee.id })
      setAssets(Array.isArray(res.data) ? res.data : res.data.results || [])
    } catch (error) {
      console.error('Failed to fetch assigned assets:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (employee?.id) {
      fetchAssets()
    }
  }, [employee?.id])

  const handleReturnAsset = async (asset) => {
    if (!window.confirm(`Are you sure you want to mark ${asset.name} as returned?`)) return
    try {
      await assetsApi.returnAsset(asset.id, { returned_date: format(new Date(), 'yyyy-MM-dd') })
      fetchAssets()
    } catch (error) {
      console.error('Failed to return asset', error)
    }
  }

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Laptop': return <Laptop className="w-5 h-5 text-slate-500" />
      case 'Phone': return <Smartphone className="w-5 h-5 text-slate-500" />
      case 'Monitor': return <Monitor className="w-5 h-5 text-slate-500" />
      case 'Key': return <Key className="w-5 h-5 text-slate-500" />
      default: return <Laptop className="w-5 h-5 text-slate-500" />
    }
  }

  if (loading) return <div className="p-8">Loading assigned assets...</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Assigned Assets</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {assets.map((asset) => (
          <div key={asset.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-2">
                <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  {getCategoryIcon(asset.category_name)}
                </div>
                {isPrivileged && (
                  <button 
                    onClick={() => handleReturnAsset(asset)}
                    className="text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" /> Return
                  </button>
                )}
              </div>
              <h4 className="font-medium text-slate-900 dark:text-white">{asset.name}</h4>
              <p className="text-sm text-slate-500">{asset.category_name} • {asset.serial_number || 'No SN'}</p>
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50">
              <p className="text-xs text-slate-400">Assigned: {asset.current_assignment?.assigned_date}</p>
            </div>
          </div>
        ))}

        {assets.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
            No assets assigned to this employee.
          </div>
        )}
      </div>
    </div>
  )
}
