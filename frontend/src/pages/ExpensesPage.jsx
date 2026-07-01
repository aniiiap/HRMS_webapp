import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Receipt, Clock, CheckCircle, XCircle } from 'lucide-react';
import PageSkeleton from '../components/ui/PageSkeleton';
import SmartButton from '../components/ui/SmartButton';
import DragDropUpload from '../components/ui/DragDropUpload';
import { format } from 'date-fns';
import { expensesApi } from '../api/expensesApi';

export default function ExpensesPage() {
    const [claims, setClaims] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        category: '',
        amount: '',
        date_incurred: '',
        notes: '',
        receipt: null
    });

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (isModalOpen) {
            fetchData();
        }
    }, [isModalOpen]);

    const fetchData = async () => {
        try {
            const claimsRes = await expensesApi.getClaims();
            const cData = claimsRes.data?.results || claimsRes.data;
            setClaims(Array.isArray(cData) ? cData : []);
        } catch (error) {
            console.error("Failed to load claims:", error);
            setClaims([]);
        }
        
        try {
            const catRes = await expensesApi.getCategories();
            const catData = catRes.data?.results || catRes.data;
            setCategories(Array.isArray(catData) ? catData : []);
        } catch (error) {
            console.error("Failed to load categories:", error);
            setCategories([]);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files.length > 0) {
            setFormData({ ...formData, receipt: e.target.files[0] });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);
        const data = new FormData();
        data.append('title', formData.title);
        if (formData.category) data.append('category', formData.category);
        data.append('amount', formData.amount);
        data.append('date_incurred', formData.date_incurred);
        if (formData.notes) data.append('notes', formData.notes);
        if (formData.receipt) data.append('receipt', formData.receipt);

        try {
            await expensesApi.createClaim(data);
            setIsModalOpen(false);
            setFormData({ title: '', category: '', amount: '', date_incurred: '', notes: '', receipt: null });
            fetchData();
        } catch (error) {
            const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
            console.error('Submit error:', error.response?.data);
            alert(`Failed to submit expense claim: ${errorMsg}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            pending: 'bg-amber-50 text-amber-600 border-amber-200',
            approved: 'bg-emerald-50 text-emerald-600 border-emerald-200',
            rejected: 'bg-red-50 text-red-600 border-red-200'
        };
        const icons = {
            pending: <Clock className="w-3 h-3 mr-1" />,
            approved: <CheckCircle className="w-3 h-3 mr-1" />,
            rejected: <XCircle className="w-3 h-3 mr-1" />
        };
        return (
            <span className={`inline-flex w-max items-center px-2 py-1 text-xs font-medium rounded-full border ${styles[status]}`}>
                {icons[status]} {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    return (
        <div className="w-full">
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Expenses & Reimbursements</h1>
                        <p className="text-slate-500 dark:text-slate-400">Track and manage your out-of-pocket business expenses.</p>
                    </div>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Submit Expense
                    </button>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                    {loading ? (
                        <div className="p-6">
                            <PageSkeleton rows={4} />
                        </div>
                    ) : claims.length === 0 ? (
                        <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                            <Receipt className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                            <p>You haven't submitted any expense claims yet.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Date</th>
                                    <th className="px-6 py-4 font-medium">Title</th>
                                    <th className="px-6 py-4 font-medium">Category</th>
                                    <th className="px-6 py-4 font-medium">Amount</th>
                                    <th className="px-6 py-4 font-medium">Status</th>
                                    <th className="px-6 py-4 font-medium">Reimbursed?</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                {claims.map(claim => (
                                    <tr key={claim.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{format(new Date(claim.date_incurred), 'MMM dd, yyyy')}</td>
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-200">{claim.title}</td>
                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{claim.category_name || '-'}</td>
                                        <td className="px-6 py-4 text-slate-900 dark:text-slate-200 font-medium">₹{claim.amount}</td>
                                        <td className="px-6 py-4">{getStatusBadge(claim.status)}</td>
                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                                            {claim.is_reimbursed ? <span className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold">Yes, via Payroll</span> : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {isModalOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 sm:p-6">
                    <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col overflow-hidden max-h-full">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                            <h3 className="text-lg font-bold text-slate-800">New Expense Claim</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto bg-white">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="col-span-1 md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                                    <input required type="text" className="w-full border-slate-200 rounded-xl px-4 py-2 border focus:ring-2 focus:ring-indigo-500"
                                        value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. Client Dinner" />
                                </div>
                                {categories.length > 0 && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Category (Optional)</label>
                                        <select className="w-full border-slate-200 rounded-xl px-4 py-2 border focus:ring-2 focus:ring-indigo-500"
                                            value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                                            <option value="">Select a category...</option>
                                            {categories.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Date Incurred</label>
                                    <input required type="date" className="w-full border-slate-200 rounded-xl px-4 py-2 border focus:ring-2 focus:ring-indigo-500"
                                        value={formData.date_incurred} onChange={e => setFormData({...formData, date_incurred: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹)</label>
                                    <input required type="number" step="0.01" className="w-full border-slate-200 rounded-xl px-4 py-2 border focus:ring-2 focus:ring-indigo-500"
                                        value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} placeholder="0.00" />
                                </div>
                                <div className="col-span-1 md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Receipt Image/PDF</label>
                                    <DragDropUpload 
                                        file={formData.receipt}
                                        onFileSelect={(file) => setFormData({...formData, receipt: file})}
                                    />
                                </div>
                                <div className="col-span-1 md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Notes (Optional)</label>
                                    <textarea className="w-full border-slate-200 rounded-xl px-4 py-2 border focus:ring-2 focus:ring-indigo-500" rows="2"
                                        value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Add any additional details here..."></textarea>
                                </div>
                            </div>
                            <div className="pt-6 mt-4 flex justify-end gap-3 border-t border-slate-100">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-xl font-medium transition-colors">Cancel</button>
                                <SmartButton type="submit" loading={isSubmitting} success={!isSubmitting && !isModalOpen && Object.keys(formData).length === 0} className="px-6 py-2">
                                    Submit Claim
                                </SmartButton>
                            </div>
                        </form>
                    </div>
                </div>
            , document.body)}
        </div>
    );
}
