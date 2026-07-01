import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { expensesApi } from '../api/expensesApi';
import { CheckCircle, XCircle, Search, ExternalLink, Download } from 'lucide-react';
import ReceiptViewerModal from '../components/ui/ReceiptViewerModal';
import PageSkeleton from '../components/ui/PageSkeleton';

export default function AdminExpensesPage() {
    const [claims, setClaims] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('pending');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'));
    const [newCategoryName, setNewCategoryName] = useState('');
    const [selectedClaimIds, setSelectedClaimIds] = useState([]);
    const [previewReceiptUrl, setPreviewReceiptUrl] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [claimsRes, catRes] = await Promise.all([
                expensesApi.getClaims(),
                expensesApi.getCategories()
            ]);
            
            const cData = claimsRes.data?.results || claimsRes.data;
            setClaims(Array.isArray(cData) ? cData : []);
            
            const catData = catRes.data?.results || catRes.data;
            setCategories(Array.isArray(catData) ? catData : []);
        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id, action) => {
        try {
            if (action === 'approve') {
                await expensesApi.approveClaim(id, { admin_note: "Approved by admin" });
            } else if (action === 'reject') {
                await expensesApi.rejectClaim(id, { admin_note: "Rejected by admin" });
            } else if (action === 'delete') {
                if (!window.confirm("Are you sure you want to delete this expense claim?")) return;
                await expensesApi.deleteClaim(id);
            } else if (action === 'reimburse') {
                await expensesApi.reimburseClaim(id);
            } else if (action === 'toggle_payroll') {
                await expensesApi.togglePayroll(id);
                return;
            }
            fetchData();
        } catch (error) {
            alert(`Failed to ${action} claim`);
        }
    };

    const handleBulkAction = async (action) => {
        if (!selectedClaimIds.length) return;
        try {
            if (action === 'approve') {
                await expensesApi.bulkApprove(selectedClaimIds);
            } else if (action === 'reject') {
                await expensesApi.bulkReject(selectedClaimIds);
            }
            setSelectedClaimIds([]);
            fetchData();
        } catch (error) {
            alert(`Failed to bulk ${action} claims`);
        }
    };

    const handleAddCategory = async (e) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        try {
            await expensesApi.createCategory({ name: newCategoryName });
            setNewCategoryName('');
            fetchData();
        } catch (error) {
            alert("Failed to create category");
        }
    };

    const handleDeleteCategory = async (id) => {
        if (!window.confirm("Delete this category?")) return;
        try {
            await expensesApi.deleteCategory(id);
            fetchData();
        } catch (error) {
            alert("Failed to delete category");
        }
    };

    const filteredClaims = claims.filter(c => {
        if (c.status !== activeTab) return false;
        
        if (filterMonth) {
            const claimMonth = format(new Date(c.date_incurred), 'yyyy-MM');
            if (claimMonth !== filterMonth) return false;
        }

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const matchesName = c.employee_name?.toLowerCase().includes(term);
            const matchesCode = c.employee_code?.toLowerCase().includes(term);
            const matchesTitle = c.title?.toLowerCase().includes(term);
            if (!matchesName && !matchesCode && !matchesTitle) return false;
        }

        return true;
    });

    const handleExportCSV = () => {
        import('../utils/csvExport').then(({ downloadCSV }) => {
            const exportData = filteredClaims.map(c => ({
                'Employee Name': c.employee_name,
                'Employee Code': c.employee_code,
                'Title': c.title,
                'Category': c.category_name || '',
                'Amount': c.amount,
                'Date': format(new Date(c.date_incurred), 'yyyy-MM-dd'),
                'Status': c.status,
                'Notes': c.notes || ''
            }));
            downloadCSV(exportData, `Expense_Report_${activeTab}_${filterMonth}.csv`);
        });
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Expense Approvals</h1>
                    <p className="text-slate-500 dark:text-slate-400">Review and manage employee expense claims and categories.</p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-max">
                        {['pending', 'approved', 'rejected', 'categories'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => {
                                    setActiveTab(tab);
                                    setSelectedClaimIds([]);
                                }}
                                className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${
                                    activeTab === tab ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handleExportCSV}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            Export CSV
                        </button>
                        
                        {activeTab !== 'categories' && (
                            <>
                                <div className="relative w-64">
                                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input 
                                        type="text"
                                        placeholder="Search claims..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 bg-transparent dark:text-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <input
                                    type="month"
                                    value={filterMonth}
                                    onChange={(e) => setFilterMonth(e.target.value)}
                                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 bg-transparent dark:text-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-600"
                                />
                            </>
                        )}
                    </div>
                </div>

                {activeTab === 'pending' && selectedClaimIds.length > 0 && (
                    <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded-xl p-4 shadow-sm">
                        <span className="text-sm font-medium text-indigo-800 dark:text-indigo-300">{selectedClaimIds.length} claims selected</span>
                        <div className="space-x-3">
                            <button 
                                onClick={() => handleBulkAction('reject')}
                                className="px-4 py-2 bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-slate-700 border border-red-200 dark:border-red-800/50 rounded-lg text-sm font-medium transition-colors"
                            >
                                Reject Selected
                            </button>
                            <button 
                                onClick={() => handleBulkAction('approve')}
                                className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors"
                            >
                                Approve Selected
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'categories' ? (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm p-6 max-w-2xl">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Expense Categories</h2>
                        <form onSubmit={handleAddCategory} className="flex gap-3 mb-6">
                            <input
                                type="text"
                                placeholder="New category name (e.g. Travel, Meals)"
                                className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 bg-transparent dark:text-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={newCategoryName}
                                onChange={e => setNewCategoryName(e.target.value)}
                            />
                            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
                                Add Category
                            </button>
                        </form>
                        
                        <div className="space-y-2">
                            {categories.map(cat => (
                                <div key={cat.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                    <span className="font-medium text-slate-800 dark:text-slate-200">{cat.name}</span>
                                    <button onClick={() => handleDeleteCategory(cat.id)} className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-1 transition-colors">
                                        <XCircle className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                            {categories.length === 0 && (
                                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">No categories defined yet.</p>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                        {loading ? (
                            <div className="p-6">
                                <PageSkeleton rows={4} />
                            </div>
                        ) : filteredClaims.length === 0 ? (
                            <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                                No {activeTab} claims to show.
                            </div>
                        ) : (
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                        {activeTab === 'pending' && (
                                            <th className="px-6 py-4 w-12">
                                                <input 
                                                    type="checkbox" 
                                                    className="rounded border-slate-300 w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                                                    checked={filteredClaims.length > 0 && selectedClaimIds.length === filteredClaims.length}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedClaimIds(filteredClaims.map(c => c.id));
                                                        } else {
                                                            setSelectedClaimIds([]);
                                                        }
                                                    }}
                                                />
                                            </th>
                                        )}
                                        <th className="px-6 py-4 font-medium">Employee</th>
                                        <th className="px-6 py-4 font-medium">Date</th>
                                        <th className="px-6 py-4 font-medium">Title & Category</th>
                                        <th className="px-6 py-4 font-medium">Amount</th>
                                        <th className="px-6 py-4 font-medium">Receipt</th>
                                        <th className="px-6 py-4 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                    {filteredClaims.map(claim => (
                                        <tr key={claim.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${selectedClaimIds.includes(claim.id) ? 'bg-indigo-50/30 dark:bg-indigo-900/20' : ''}`}>
                                            {activeTab === 'pending' && (
                                                <td className="px-6 py-4">
                                                    <input 
                                                        type="checkbox" 
                                                        className="rounded border-slate-300 w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                                                        checked={selectedClaimIds.includes(claim.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedClaimIds([...selectedClaimIds, claim.id]);
                                                            } else {
                                                                setSelectedClaimIds(selectedClaimIds.filter(id => id !== claim.id));
                                                            }
                                                        }}
                                                    />
                                                </td>
                                            )}
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-900 dark:text-slate-100">{claim.employee_name}</div>
                                                <div className="text-slate-500 dark:text-slate-400 text-xs">{claim.employee_code}</div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">
                                                {format(new Date(claim.date_incurred), 'MMM dd, yyyy')}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-900 dark:text-slate-100">{claim.title}</div>
                                                <div className="text-slate-500 dark:text-slate-400 text-xs">{claim.category_name || '-'}</div>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">
                                                ₹{claim.amount}
                                            </td>
                                            <td className="px-6 py-4">
                                                {claim.receipt ? (
                                                    <button onClick={() => setPreviewReceiptUrl(claim.receipt)} className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 text-xs font-medium cursor-pointer">
                                                        <ExternalLink className="w-3 h-3" /> View
                                                    </button>
                                                ) : (
                                                    <span className="text-slate-400 text-xs">No receipt</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                {activeTab === 'pending' && (
                                                    <>
                                                        <button onClick={() => handleAction(claim.id, 'reject')} className="px-3 py-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-xs font-medium transition-colors">
                                                            Reject
                                                        </button>
                                                        <button onClick={() => handleAction(claim.id, 'approve')} className="px-3 py-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-xs font-medium transition-colors">
                                                            Approve
                                                        </button>
                                                    </>
                                                )}
                                                {activeTab === 'approved' && (
                                                    <div className="flex flex-col items-end gap-2">
                                                        {claim.is_reimbursed ? (
                                                            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">Reimbursed</span>
                                                        ) : (
                                                            <>
                                                                <button onClick={() => handleAction(claim.id, 'reimburse')} className="px-3 py-1.5 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-xs font-medium transition-colors w-full">
                                                                    Mark Reimbursed
                                                                </button>
                                                                <label className="text-[10px] text-slate-500 dark:text-slate-400 cursor-pointer flex items-center gap-1 justify-end">
                                                                    <input 
                                                                        type="checkbox" 
                                                                        checked={!claim.skip_payroll}
                                                                        onChange={(e) => {
                                                                            const newVal = !e.target.checked;
                                                                            setClaims(claims.map(c => c.id === claim.id ? { ...c, skip_payroll: newVal } : c));
                                                                            handleAction(claim.id, 'toggle_payroll');
                                                                        }}
                                                                        className="rounded border-slate-300 w-3 h-3"
                                                                    />
                                                                    Include in next payroll
                                                                </label>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                                {activeTab === 'rejected' && (
                                                    <button onClick={() => handleAction(claim.id, 'delete')} className="px-3 py-1.5 text-slate-600 bg-slate-100 hover:bg-red-100 hover:text-red-600 rounded-lg text-xs font-medium transition-colors">
                                                        Delete
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                <ReceiptViewerModal 
                    url={previewReceiptUrl} 
                    onClose={() => setPreviewReceiptUrl(null)} 
                />
        </div>
    );
}
