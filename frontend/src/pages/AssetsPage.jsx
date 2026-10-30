import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Search, Laptop, Smartphone, Key, Monitor, MoreVertical, CheckCircle2, AlertCircle, XCircle, RotateCcw, Download, X, Edit3, UserCheck, Shield, User } from 'lucide-react'
import { assetsApi } from '../api/assets'
import { api, messageFromError } from '../api/client'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

export default function AssetsPage() {
  const [assets, setAssets] = useState([])
  const [employees, setEmployees] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  
  const [manageEmployee, setManageEmployee] = useState(null)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [isDirectAssignModalOpen, setIsDirectAssignModalOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [categoryToDelete, setCategoryToDelete] = useState(null)
  const [assetToReturn, setAssetToReturn] = useState(null)
  const [editingAssetId, setEditingAssetId] = useState(null)
  
  const [formData, setFormData] = useState({
    name: '', category: '', serial_number: '', purchase_date: '', warranty_expiry_date: ''
  })

  const [directAssignData, setDirectAssignData] = useState({
    holderType: 'external',
    employeeId: '',
    holderName: '',
    holderRole: '',
    category: '',
    name: '',
    serial_number: '',
    purchase_date: '',
    warranty_expiry_date: '',
    assigned_date: format(new Date(), 'yyyy-MM-dd'),
    condition_notes: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [assetsRes, empRes, catRes] = await Promise.all([
        assetsApi.getAssets({ nopaginate: 'true' }),
        api.get('/api/employees/', { params: { nopaginate: 'true', is_active: 'true' } }),
        assetsApi.getCategories({ nopaginate: 'true' })
      ])
      setAssets(Array.isArray(assetsRes.data) ? assetsRes.data : assetsRes.data.results || [])
      setEmployees(Array.isArray(empRes.data) ? empRes.data : empRes.data.results || [])
      
      const cats = Array.isArray(catRes.data) ? catRes.data : catRes.data.results || []
      setCategories(cats)
    } catch (error) {
      console.error('Failed to fetch assets data:', error)
      toast.error('Failed to load assets data.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return
    try {
       const res = await assetsApi.createCategory({ name: newCategoryName.trim() })
       const newCat = res.data
       setCategories([...categories, newCat])
       setFormData({...formData, category: newCat.id})
       setIsCategoryModalOpen(false)
       setNewCategoryName('')
       toast.success('Category created successfully!')
    } catch (e) {
       console.error('Failed to create category', e)
       toast.error(messageFromError(e))
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
      toast.success('Category deleted successfully!')
      fetchData()
    } catch (e) {
      console.error('Failed to delete category', e)
      toast.error(messageFromError(e) || 'Failed to delete category. It might be in use by existing assets.')
      setCategoryToDelete(null)
    }
  }

  const handleAddSubmit = async (e) => {
    e.preventDefault()
    try {
      const data = { ...formData }
      if (!data.purchase_date) data.purchase_date = null
      if (!data.warranty_expiry_date) data.warranty_expiry_date = null
      const cleanSerial = data.serial_number?.trim() || null
      data.serial_number = cleanSerial
      
      if (editingAssetId) {
        await assetsApi.updateAsset(editingAssetId, data)
        toast.success('Asset updated successfully!')
        setEditingAssetId(null)
      } else {
        // If an asset with this serial number already exists in this org
        const existingAsset = cleanSerial
          ? assets.find(a => a.serial_number && a.serial_number.toLowerCase() === cleanSerial.toLowerCase())
          : null

        let assetId = null

        if (existingAsset) {
          if (existingAsset.current_assignment) {
            toast.error(`Asset with serial number "${cleanSerial}" is already assigned to ${existingAsset.current_assignment.employee_name}. Please return it first.`)
            return
          }
          // The asset already exists and is available, update it (PATCH to preserve status) and assign it
          await assetsApi.patchAsset(existingAsset.id, data)
          assetId = existingAsset.id
        } else {
          const res = await assetsApi.createAsset(data)
          assetId = res.data.id
        }
        
        if (manageEmployee && assetId) {
          const assignPayload = {
            assigned_date: format(new Date(), 'yyyy-MM-dd')
          }
          if (manageEmployee.isExternal) {
            assignPayload.holder_name = manageEmployee.holder_name
            assignPayload.holder_role = manageEmployee.holder_role
          } else {
            assignPayload.employee = manageEmployee.id
          }
          await assetsApi.assignAsset(assetId, assignPayload)
          toast.success(`Asset assigned to ${manageEmployee.first_name || manageEmployee.holder_name} successfully!`)
        } else {
          toast.success('Asset created successfully!')
        }
      }
      
      setFormData({ name: '', category: '', serial_number: '', purchase_date: '', warranty_expiry_date: '' })
      fetchData()
    } catch (error) {
      console.error('Failed to save asset', error)
      toast.error(messageFromError(error))
    }
  }

  const handleEditAsset = (asset) => {
    setEditingAssetId(asset.id)
    setFormData({
      name: asset.name || '',
      category: asset.category || '',
      serial_number: asset.serial_number || '',
      purchase_date: asset.purchase_date || '',
      warranty_expiry_date: asset.warranty_expiry_date || ''
    })
  }

  const handleCancelEdit = () => {
    setEditingAssetId(null)
    setFormData({ name: '', category: '', serial_number: '', purchase_date: '', warranty_expiry_date: '' })
  }

  const handleReturnAsset = (asset) => {
    setAssetToReturn(asset)
  }

  const executeReturnAsset = async () => {
    if (!assetToReturn) return
    try {
      await assetsApi.returnAsset(assetToReturn.id, { returned_date: format(new Date(), 'yyyy-MM-dd') })
      toast.success('Asset returned successfully!')
      setAssetToReturn(null)
      fetchData()
    } catch (error) {
      console.error('Failed to return asset', error)
      toast.error(messageFromError(error))
      setAssetToReturn(null)
    }
  }

  const handleDirectAssignSubmit = async (e) => {
    e.preventDefault()
    try {
      const data = {
        name: directAssignData.name,
        category: directAssignData.category,
        serial_number: directAssignData.serial_number?.trim() || null,
        purchase_date: directAssignData.purchase_date || null,
        warranty_expiry_date: directAssignData.warranty_expiry_date || null
      }

      if (directAssignData.holderType === 'external' && !directAssignData.holderName.trim()) {
        toast.error('Holder name is required for non-account assignee.')
        return
      }

      if (directAssignData.holderType === 'employee' && !directAssignData.employeeId) {
        toast.error('Please select an employee.')
        return
      }

      const cleanSerial = data.serial_number
      const existingAsset = cleanSerial
        ? assets.find(a => a.serial_number && a.serial_number.toLowerCase() === cleanSerial.toLowerCase())
        : null

      let assetId = null

      if (existingAsset) {
        if (existingAsset.current_assignment) {
          toast.error(`Asset with serial number "${cleanSerial}" is already assigned to ${existingAsset.current_assignment.employee_name}. Please return it first.`)
          return
        }
        await assetsApi.patchAsset(existingAsset.id, data)
        assetId = existingAsset.id
      } else {
        const res = await assetsApi.createAsset(data)
        assetId = res.data.id
      }

      const assignPayload = {
        assigned_date: directAssignData.assigned_date || format(new Date(), 'yyyy-MM-dd'),
        condition_notes: directAssignData.condition_notes || ''
      }

      let recipientName = ''
      if (directAssignData.holderType === 'employee') {
        assignPayload.employee = directAssignData.employeeId
        const emp = employees.find(e => String(e.id) === String(directAssignData.employeeId))
        recipientName = emp ? `${emp.first_name} ${emp.last_name}` : 'Employee'
      } else {
        assignPayload.holder_name = directAssignData.holderName.trim()
        assignPayload.holder_role = directAssignData.holderRole.trim() || 'Executive / External'
        recipientName = assignPayload.holder_name
      }

      await assetsApi.assignAsset(assetId, assignPayload)
      toast.success(`Asset created and assigned to ${recipientName} successfully!`)

      setIsDirectAssignModalOpen(false)
      setDirectAssignData({
        holderType: 'external',
        employeeId: '',
        holderName: '',
        holderRole: '',
        category: '',
        name: '',
        serial_number: '',
        purchase_date: '',
        warranty_expiry_date: '',
        assigned_date: format(new Date(), 'yyyy-MM-dd'),
        condition_notes: ''
      })
      fetchData()
    } catch (error) {
      console.error('Failed to direct assign asset', error)
      toast.error(messageFromError(error))
    }
  }

  // Combined list of assignees for the matrix (both active registered employees and non-account holders with active assignments)
  const allAssignees = useMemo(() => {
    const list = employees.map(emp => ({
      id: emp.id,
      first_name: emp.first_name,
      last_name: emp.last_name,
      display_name: `${emp.first_name} ${emp.last_name}`,
      employee_code: emp.employee_code || '-',
      department: emp.department || '-',
      isExternal: false,
      raw: emp
    }))

    // Find non-account holders from active asset assignments
    const externalHoldersMap = new Map()
    assets.forEach(asset => {
      const ca = asset.current_assignment
      if (ca && !ca.employee_id && ca.holder_name) {
        const key = ca.holder_name.toLowerCase().trim()
        if (!externalHoldersMap.has(key)) {
          externalHoldersMap.set(key, {
            id: `ext_${key}`,
            first_name: ca.holder_name,
            last_name: '',
            holder_name: ca.holder_name,
            holder_role: ca.holder_role || 'Executive / External',
            display_name: ca.holder_name,
            employee_code: 'NON-ACCOUNT',
            department: ca.holder_role || 'External / Executive',
            isExternal: true
          })
        }
      }
    })

    return [...list, ...Array.from(externalHoldersMap.values())]
  }, [employees, assets])

  const exportToCSV = () => {
    const headers = ['Holder Name', 'Holder Type / Code', 'Role / Department', ...categories.map(c => c.name)]
    const rows = allAssignees.map(person => {
      const personAssets = assets.filter(a => {
        const ca = a.current_assignment
        if (!ca) return false
        if (person.isExternal) {
          return !ca.employee_id && ca.holder_name?.toLowerCase().trim() === person.holder_name?.toLowerCase().trim()
        }
        return ca.employee_id === person.id
      })

      return [
        person.display_name,
        person.isExternal ? 'Non-Account Assignee' : (person.employee_code || 'NA'),
        person.department || 'NA',
        ...categories.map(c => {
          const asset = personAssets.find(a => Number(a.category) === Number(c.id) || a.category_name === c.name)
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
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage employee and executive device assignments.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={exportToCSV} className="btn-secondary">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button onClick={() => setIsCategoryModalOpen(true)} className="btn-secondary">
            Add Category
          </button>
          <button 
            onClick={() => {
              setDirectAssignData({
                holderType: 'external',
                employeeId: '',
                holderName: '',
                holderRole: '',
                category: categories[0]?.id || '',
                name: '',
                serial_number: '',
                purchase_date: '',
                warranty_expiry_date: '',
                assigned_date: format(new Date(), 'yyyy-MM-dd'),
                condition_notes: ''
              })
              setIsDirectAssignModalOpen(true)
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Assign Asset
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="border-b border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300">
              <tr>
                <th className="px-6 py-4 font-medium sm:sticky sm:left-0 bg-slate-50/50 dark:bg-slate-800/50 z-10">Assignee / Employee</th>
                {categories.map(c => (
                  <th key={c.id} className="px-6 py-4 font-medium">{c.name}</th>
                ))}
                <th className="px-6 py-4 font-medium text-right sm:sticky sm:right-0 bg-slate-50/50 dark:bg-slate-800/50 z-10">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
              {allAssignees.map(person => {
                const personAssets = assets.filter(a => {
                  const ca = a.current_assignment
                  if (!ca) return false
                  if (person.isExternal) {
                    return !ca.employee_id && ca.holder_name?.toLowerCase().trim() === person.holder_name?.toLowerCase().trim()
                  }
                  return ca.employee_id === person.id
                })

                return (
                  <tr key={person.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 sm:sticky sm:left-0 bg-white dark:bg-slate-900 sm:z-10 group-hover:bg-slate-50/50 dark:group-hover:bg-slate-800/50 border-r border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-slate-900 dark:text-white">{person.display_name}</div>
                        {person.isExternal && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            <Shield className="w-3 h-3" /> Non-Account
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        {person.isExternal ? (
                          <span>{person.holder_role || 'Executive'}</span>
                        ) : (
                          <span>{person.employee_code || '-'} • {person.department || '-'}</span>
                        )}
                      </div>
                    </td>
                    {categories.map(c => {
                      const asset = personAssets.find(a => Number(a.category) === Number(c.id) || a.category_name === c.name)
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
                    <td className="px-6 py-4 text-right sm:sticky sm:right-0 bg-white dark:bg-slate-900 sm:z-10 border-l border-slate-100 dark:border-slate-800">
                      <button 
                        onClick={() => {
                          setManageEmployee(person)
                        }}
                        className="text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 font-medium text-sm flex items-center gap-1 justify-end ml-auto transition-colors"
                      >
                        Manage Assets
                      </button>
                    </td>
                  </tr>
                )
              })}
              {allAssignees.length === 0 && (
                <tr>
                  <td colSpan={categories.length + 2} className="px-6 py-8 text-center text-slate-500">No employees or assignees found.</td>
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
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Manage Assets: {manageEmployee.first_name} {manageEmployee.last_name}
                  </h3>
                  {manageEmployee.isExternal && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      <Shield className="w-3 h-3" /> Non-Account
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  {manageEmployee.isExternal ? manageEmployee.holder_role || 'Executive / External' : `${manageEmployee.department || 'No Department'} • ${manageEmployee.employee_code || 'No ID'}`}
                </p>
              </div>
              <button onClick={() => { setManageEmployee(null); handleCancelEdit(); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="mb-8">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 uppercase tracking-wider">Current Assets</h4>
              <div className="space-y-3">
                {assets.filter(a => {
                  const ca = a.current_assignment
                  if (!ca) return false
                  if (manageEmployee.isExternal) {
                    return !ca.employee_id && ca.holder_name?.toLowerCase().trim() === manageEmployee.holder_name?.toLowerCase().trim()
                  }
                  return ca.employee_id === manageEmployee.id
                }).map(asset => (
                  <div key={asset.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">{asset.category_name ? `${asset.category_name} - ` : ""}{asset.name}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">SN: {asset.serial_number || 'NA'}</div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={() => handleEditAsset(asset)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-500 dark:hover:bg-indigo-500/10 rounded-lg transition-colors tooltip-trigger"
                        title="Edit Asset"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleReturnAsset(asset)}
                        className="p-2 text-amber-600 hover:bg-amber-50 dark:text-amber-500 dark:hover:bg-amber-500/10 rounded-lg transition-colors tooltip-trigger"
                        title="Return Asset"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {assets.filter(a => {
                  const ca = a.current_assignment
                  if (!ca) return false
                  if (manageEmployee.isExternal) {
                    return !ca.employee_id && ca.holder_name?.toLowerCase().trim() === manageEmployee.holder_name?.toLowerCase().trim()
                  }
                  return ca.employee_id === manageEmployee.id
                }).length === 0 && (
                  <div className="text-sm text-slate-500 text-center py-4 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
                    No assets assigned.
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 uppercase tracking-wider">{editingAssetId ? 'Edit Asset' : 'Assign New Asset'}</h4>
              <form onSubmit={handleAddSubmit} className="space-y-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
                    <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none">
                      <option value="">-- Select Category --</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-1">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Brand / Model</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none" placeholder="e.g. MacBook Pro M2" />
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
                <div className="flex gap-3 justify-end pt-2">
                    {editingAssetId && (
                      <button type="button" onClick={handleCancelEdit} className="w-full px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-white rounded-xl transition-colors font-medium">
                        Cancel
                      </button>
                    )}
                    <button type="submit" className="w-full px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl transition-colors font-medium">
                      {editingAssetId ? 'Update Asset' : `Create & Assign to ${manageEmployee.first_name || manageEmployee.holder_name}`}
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

      {/* Direct Assign Asset Modal (For Non-Account Holders / Existing Employees) */}
      {isDirectAssignModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Assign Asset</h3>
                <p className="text-sm text-slate-500 mt-0.5">Assign devices to employees or non-account executives (CEO, CTO, etc.)</p>
              </div>
              <button 
                onClick={() => setIsDirectAssignModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleDirectAssignSubmit} className="space-y-4">
              {/* Assignee Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Assignee Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDirectAssignData({ ...directAssignData, holderType: 'external' })}
                    className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-colors ${
                      directAssignData.holderType === 'external'
                        ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Shield className="w-5 h-5 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-semibold text-sm">Non-Account User</div>
                      <div className="text-xs opacity-75">CEO, CTO, Board or external</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDirectAssignData({ ...directAssignData, holderType: 'employee' })}
                    className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-colors ${
                      directAssignData.holderType === 'employee'
                        ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <UserCheck className="w-5 h-5 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-semibold text-sm">Registered Employee</div>
                      <div className="text-xs opacity-75">Has HRMS employee account</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Assignee Input Fields */}
              {directAssignData.holderType === 'external' ? (
                <div className="space-y-3 p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/50">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Person Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      value={directAssignData.holderName}
                      onChange={e => setDirectAssignData({ ...directAssignData, holderName: e.target.value })}
                      placeholder="e.g. Rajesh Sharma"
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Role / Designation
                    </label>
                    <input
                      type="text"
                      value={directAssignData.holderRole}
                      onChange={e => setDirectAssignData({ ...directAssignData, holderRole: e.target.value })}
                      placeholder="e.g. CEO, Founder, CTO, Advisor"
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3 p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Select Employee <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={directAssignData.employeeId}
                      onChange={e => setDirectAssignData({ ...directAssignData, employeeId: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                    >
                      <option value="">-- Choose Employee --</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name} ({emp.employee_code || 'No Code'} - {emp.department || 'No Dept'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Asset Details */}
              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={directAssignData.category}
                    onChange={e => setDirectAssignData({ ...directAssignData, category: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                  >
                    <option value="">-- Select Category --</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Brand / Model <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      value={directAssignData.name}
                      onChange={e => setDirectAssignData({ ...directAssignData, name: e.target.value })}
                      placeholder="e.g. MacBook Pro M3"
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Serial Number
                    </label>
                    <input
                      type="text"
                      value={directAssignData.serial_number}
                      onChange={e => setDirectAssignData({ ...directAssignData, serial_number: e.target.value })}
                      placeholder="e.g. C02G90..."
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Assigned Date
                    </label>
                    <input
                      type="date"
                      value={directAssignData.assigned_date}
                      onChange={e => setDirectAssignData({ ...directAssignData, assigned_date: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Warranty Expiry
                    </label>
                    <input
                      type="date"
                      value={directAssignData.warranty_expiry_date}
                      onChange={e => setDirectAssignData({ ...directAssignData, warranty_expiry_date: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsDirectAssignModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 rounded-xl transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl transition-colors font-medium shadow-sm"
                >
                  Assign Asset
                </button>
              </div>
            </form>
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
