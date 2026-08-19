import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Search, Laptop, Smartphone, Key, Monitor, MoreVertical, CheckCircle2, AlertCircle, XCircle, RotateCcw, Download, X } from 'lucide-react'
import { assetsApi } from '../api/assets'
import { api } from '../api/client'
import { format } from 'date-fns'

export default function AssetsPage() {
  const [assets, setAssets] = useState([])
  const [employees, setEmployees] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  
  const [manageEmployee, setManageEmployee] = useState(null)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [categoryToDelete, setCategoryToDelete] = useState(null)
  const [assetToReturn, setAssetToReturn] = useState(null)
  
  const [formData, setFormData] = useState({
    name: '', category: '', serial_number: '', purchase_date: '', warranty_expiry_date: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [assetsRes, empRes, catRes] = await Promise.all([
        assetsApi.getAssets(),
        api.get('/api/employees/'),
        assetsApi.getCategories()
      ])
      setAssets(Array.isArray(assetsRes.data) ? assetsRes.data : assetsRes.data.results || [])
      setEmployees(Array.isArray(empRes.data) ? empRes.data : empRes.data.results || [])
      
      const cats = Array.isArray(catRes.data) ? catRes.data : catRes.data.results || []
      setCategories(cats)
      
      if (cats.length > 0 && !formData.category) {
        setFormData(prev => ({...prev, category: cats[0].id}))
      }
    } catch (error) {
      console.error('Failed to fetch assets data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return
    try {
       const res = await assetsApi.createCategory({ name: newCategoryName })
       const newCat = res.data
       setCategories([...categories, newCat])
       setFormData({...formData, category: newCat.id})
       setIsCategoryModalOpen(false)
       setNewCategoryName('')
    } catch (e) {
       console.error('Failed to create category', e)
    }
  }

  const handleDeleteCategory = (id, name) => {
    setCategoryToDelete({ id, name })
  }

  const executeDeleteCategory = async () => {
    if (!categoryToDelete) return
    try {
      await assetsApi.deleteCategory(categoryToDelete.id)
      setCategories(categories.filter(c => c.id !== categoryToDelete.id))
      setCategoryToDelete(null)
      fetchData()
    } catch (e) {
      console.error('Failed to delete category', e)
      alert('Failed to delete category. It might be in use by existing assets.')
      setCategoryToDelete(null)
    }
  }

  const handleAddSubmit = async (e) => {
    e.preventDefault()
    try {
      const data = { ...formData }
      if (!data.purchase_date) data.purchase_date = null
      if (!data.warranty_expiry_date) data.warranty_expiry_date = null
      if (!data.serial_number) data.serial_number = null
      
      const res = await assetsApi.createAsset(data)
      
      if (manageEmployee) {
        await assetsApi.assignAsset(res.data.id, {
          employee: manageEmployee.id,
          assigned_date: format(new Date(), 'yyyy-MM-dd')
        })
      }
      
      setFormData({ name: '', category: categories.length > 0 ? categories[0].id : '', serial_number: '', purchase_date: '', warranty_expiry_date: '' })
      fetchData()
    } catch (error) {
      console.error('Failed to add asset', error)
    }
  }

  const handleReturnAsset = (asset) => {
    setAssetToReturn(asset)
  }

  const executeReturnAsset = async () => {
    if (!assetToReturn) return
    try {
      await assetsApi.returnAsset(assetToReturn.id, { returned_date: format(new Date(), 'yyyy-MM-dd') })
      setAssetToReturn(null)
      fetchData()
    } catch (error) {
      console.error('Failed to return asset', error)
      setAssetToReturn(null)
    }
  }

  const exportToCSV = () => {
    const headers = ['Employee Name', 'Employee Code', 'Department', ...categories.map(c => c.name)]
    const rows = employees.map(emp => {
      const empAssets = assets.filter(a => a.current_assignment?.employee_id === emp.id)
      return [
        `${emp.first_name} ${emp.last_name}`,
        emp.employee_code || 'NA',
        emp.department || 'NA',
        ...categories.map(c => {
          const asset = empAssets.find(a => a.category === c.id || a.category_name === c.name)
          return asset ? `${asset.name} (${asset.serial_number || 'NA'})` : 'NA'
        })
      ]
    })
    
    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.map(field => `"${field}"`).join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `assets_export_${format(new Date(), 'yyyy-MM-dd')}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Available': return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">Available</span>
      case 'Assigned': return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">Assigned</span>
      case 'Under Repair': return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">Under Repair</span>
      default: return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-500/10 dark:text-slate-400">{status}</span>
    }
  }

  if (loading) return <div className="p-8">Loading assets...</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Assets Matrix</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage employee device assignments.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={exportToCSV} className="btn-secondary">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button onClick={() => setIsCategoryModalOpen(true)} className="btn-secondary">
            Add Category
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="border-b border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300">
              <tr>
                <th className="px-6 py-4 font-medium sticky left-0 bg-slate-50/50 dark:bg-slate-800/50 z-10">Employee Name</th>
                {categories.map(c => (
                  <th key={c.id} className="px-6 py-4 font-medium">{c.name}</th>
                ))}
                <th className="px-6 py-4 font-medium text-right sticky right-0 bg-slate-50/50 dark:bg-slate-800/50 z-10">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
              {employees.map(emp => {
                const empAssets = assets.filter(a => a.current_assignment?.employee_id === emp.id)
                return (
                  <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 sticky left-0 bg-white dark:bg-slate-900 z-10 group-hover:bg-slate-50/50 dark:group-hover:bg-slate-800/50 border-r border-slate-100 dark:border-slate-800">
                      <div className="font-medium text-slate-900 dark:text-white">{emp.first_name} {emp.last_name}</div>
                      <div className="text-xs text-slate-500">{emp.employee_code || '-'} • {emp.department || '-'}</div>
                    </td>
                    {categories.map(c => {
                      const asset = empAssets.find(a => a.category === c.id || a.category_name === c.name)
                      return (
                        <td key={c.id} className="px-6 py-4">
                          {asset ? (
                            <div>
                              <div className="font-medium text-slate-700 dark:text-slate-300">{asset.name}</div>
                              <div className="text-xs text-slate-500 font-mono">{asset.serial_number || 'NA'}</div>
                            </div>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500">NA</span>
                          )}
                        </td>
                      )
                    })}
                    <td className="px-6 py-4 text-right sticky right-0 bg-white dark:bg-slate-900 z-10 border-l border-slate-100 dark:border-slate-800">
                      <button 
                        onClick={() => {
                          setManageEmployee(emp)
                        }}
                        className="text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 font-medium text-sm flex items-center gap-1 justify-end ml-auto transition-colors"
                      >
                        Manage Assets
                      </button>
                    </td>
                  </tr>
                )
              })}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={categories.length + 2} className="px-6 py-8 text-center text-slate-500">No employees found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manage Assets Modal */}
      {manageEmployee && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Manage Assets: {manageEmployee.first_name} {manageEmployee.last_name}
                </h3>
                <p className="text-sm text-slate-500 mt-1">{manageEmployee.department || 'No Department'} • {manageEmployee.employee_code || 'No ID'}</p>
              </div>
              <button onClick={() => setManageEmployee(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="mb-8">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 uppercase tracking-wider">Current Assets</h4>
              <div className="space-y-3">
                {assets.filter(a => a.current_assignment?.employee_id === manageEmployee.id).map(asset => (
                  <div key={asset.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">{asset.name}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">SN: {asset.serial_number || 'NA'}</div>
                    </div>
                    <button 
                      onClick={() => handleReturnAsset(asset)}
                      className="p-2 text-amber-600 hover:bg-amber-50 dark:text-amber-500 dark:hover:bg-amber-500/10 rounded-lg transition-colors tooltip-trigger"
                      title="Return Asset"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {assets.filter(a => a.current_assignment?.employee_id === manageEmployee.id).length === 0 && (
                  <div className="text-sm text-slate-500 text-center py-4 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
                    No assets assigned.
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 uppercase tracking-wider">Assign New Asset</h4>
              <form onSubmit={handleAddSubmit} className="space-y-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Asset Name</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none" placeholder="e.g. MacBook Pro M2" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
                    <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none">
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Serial Number</label>
                    <input type="text" value={formData.serial_number} onChange={e => setFormData({...formData, serial_number: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Purchase Date</label>
                    <input type="date" value={formData.purchase_date} onChange={e => setFormData({...formData, purchase_date: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Warranty Expiry</label>
                    <input type="date" value={formData.warranty_expiry_date} onChange={e => setFormData({...formData, warranty_expiry_date: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none" />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button type="submit" className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl transition-colors font-medium w-full">
                    Create & Assign to {manageEmployee.first_name}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Category Modal */}
      {isCategoryModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Add Asset Category</h3>
            <div className="space-y-4">
              {categories.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Existing Categories</label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(c => (
                      <span key={c.id} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-600 flex items-center gap-1.5">
                        {c.name}
                        <button type="button" onClick={() => handleDeleteCategory(c.id, c.name)} className="text-slate-400 hover:text-red-500 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">New Category Name</label>
                <input required type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="e.g. Vehicles" className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 rounded-xl transition-colors font-medium">Cancel</button>
                <button type="button" onClick={handleAddCategory} className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl transition-colors font-medium">Save</button>
              </div>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Delete Category Confirmation Modal */}
      {categoryToDelete && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-4 text-red-600 dark:text-red-400">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Delete Category</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              Are you sure you want to delete the category <strong>"{categoryToDelete.name}"</strong>? This will fail if assets are currently using this category.
            </p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setCategoryToDelete(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 rounded-xl transition-colors font-medium">
                Cancel
              </button>
              <button type="button" onClick={executeDeleteCategory} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors font-medium">
                Delete
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Return Asset Confirmation Modal */}
      {assetToReturn && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-4 text-amber-600 dark:text-amber-500">
              <RotateCcw className="w-6 h-6" />
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Return Asset</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              Are you sure you want to return <strong>{assetToReturn.name}</strong>?
            </p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setAssetToReturn(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 rounded-xl transition-colors font-medium">
                Cancel
              </button>
              <button type="button" onClick={executeReturnAsset} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-colors font-medium">
                Return Asset
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  )
}
