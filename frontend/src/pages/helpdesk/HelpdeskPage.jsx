import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { LifeBuoy, Plus, MessageSquare, Clock, CheckCircle, XCircle, AlertCircle, ChevronRight, Search, Trash2, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { helpdeskApi } from '../../api/helpdeskApi';
import { assetsApi } from '../../api/assets';
import PageHeader from '../../components/ui/PageHeader';
import PageSkeleton from '../../components/ui/PageSkeleton';
import SmartButton from '../../components/ui/SmartButton';
import DragDropUpload from '../../components/ui/DragDropUpload';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmContext';

export default function HelpdeskPage() {
    const confirm = useConfirm();
    const { isPrivileged } = useAuth(); // HR/Admin
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [categories, setCategories] = useState([]);
    const [assets, setAssets] = useState([]);
    const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isAddingCategory, setIsAddingCategory] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: '',
        asset: '',
        priority: 'low',
        attachment: null
    });

        const fetchData = async () => {
        try {
            const [ticketsRes, categoriesRes, assetsRes] = await Promise.all([
                helpdeskApi.getTickets(),
                helpdeskApi.getCategories().catch(() => ({ data: { results: [] } })),
                assetsApi.getAssets().catch(() => ({ data: { results: [] } }))
            ]);
            setTickets(Array.isArray(ticketsRes.data?.results) ? ticketsRes.data.results : (Array.isArray(ticketsRes.data) ? ticketsRes.data : []));
            setCategories(Array.isArray(categoriesRes.data?.results) ? categoriesRes.data.results : (Array.isArray(categoriesRes.data) ? categoriesRes.data : []));
            setAssets(Array.isArray(assetsRes.data?.results) ? assetsRes.data.results : (Array.isArray(assetsRes.data) ? assetsRes.data : []));
        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleDeleteTicket = async (e, id) => {
        e.preventDefault(); // prevent navigation
        const ok = await confirm({
            title: 'Delete Ticket',
            message: 'Are you sure you want to delete this ticket? This action cannot be undone.',
            confirmLabel: 'Delete',
            destructive: true,
        });
        if (!ok) return;
        
        try {
            await helpdeskApi.deleteTicket(id);
            setTickets(tickets.filter(t => t.id !== id));
        } catch (error) {
            console.error('Delete error:', error);
            alert('Failed to delete ticket.');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);
        
        const data = new FormData();
        data.append('title', formData.title);
        data.append('description', formData.description);
        data.append('category', formData.category);
        if (formData.asset) data.append('asset', formData.asset);
        data.append('priority', formData.priority);
        if (formData.attachment) {
            data.append('attachment', formData.attachment);
        }

        try {
            await helpdeskApi.createTicket(data);
            setIsModalOpen(false);
            setFormData({ title: '', description: '', category: '',
        asset: '', priority: 'low', attachment: null });
            fetchData();
        } catch (error) {
            console.error('Submit error:', error);
            alert('Failed to submit ticket.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusStyles = (status) => {
        switch (status) {
            case 'open': return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'resolved': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'closed': return 'bg-slate-100 text-slate-800 border-slate-200';
            default: return 'bg-slate-100 text-slate-800';
        }
    };

    const getPriorityIcon = (priority) => {
        switch (priority) {
            case 'high': return <AlertCircle className="w-4 h-4 text-rose-500" />;
            case 'medium': return <Clock className="w-4 h-4 text-amber-500" />;
            case 'low': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
            default: return <AlertCircle className="w-4 h-4 text-slate-500" />;
        }
    };

    const filteredTickets = tickets.filter(t => {
        if (activeTab !== 'all' && t.status !== activeTab) return false;
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            return t.title.toLowerCase().includes(lower) || 
                   t.employee_name.toLowerCase().includes(lower) || 
                   t.category.toLowerCase().includes(lower);
        }
        return true;
    });

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <LifeBuoy className="w-6 h-6 text-indigo-600" /> Helpdesk
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage and track your support requests and queries.</p>
                </div>
                <div className="flex gap-3">
                    {isPrivileged && (
                        <button
                            onClick={() => setIsAddCategoryOpen(true)}
                            className="flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm font-medium"
                        >
                            <Settings className="w-4 h-4" />
                            Manage Categories
                        </button>
                    )}
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        Raise a Ticket
                    </button>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl max-w-full overflow-x-auto scrollbar-hide">
                    {['all', 'open', 'in_progress', 'resolved', 'closed'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                                activeTab === tab ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                        >
                            {tab.replace('_', ' ')}
                        </button>
                    ))}
                </div>
                <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                        type="text"
                        placeholder="Search tickets..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-6"><PageSkeleton rows={5} /></div>
                ) : filteredTickets.length === 0 ? (
                    <div className="p-16 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center">
                        <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full mb-4">
                            <LifeBuoy className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">No tickets found</h3>
                        <p className="mt-1 max-w-sm mx-auto">There are currently no tickets matching your filters.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                        {filteredTickets.map(ticket => (
                            <Link 
                                key={ticket.id} 
                                to={`/helpdesk/${ticket.id}`}
                                className="block p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border uppercase tracking-wider ${getStatusStyles(ticket.status)}`}>
                                                {ticket.status.replace('_', ' ')}
                                            </span>
                                            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                                {getPriorityIcon(ticket.priority)} {ticket.priority}
                                            </span>
                                            <span className="text-xs text-slate-400">· {format(new Date(ticket.created_at), 'MMM d, yyyy')}</span>
                                        </div>
                                        <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 transition-colors">
                                            {ticket.title}
                                        </h4>
                                        <div className="mt-2 flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                                            <div className="flex items-center gap-2">
                                                {ticket.employee_avatar ? (
                                                    <img src={ticket.employee_avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                                                ) : (
                                                    <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                                        {ticket.employee_name.charAt(0)}
                                                    </div>
                                                )}
                                                <span>{ticket.employee_name}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                                                <span className="capitalize">{ticket.category}</span>
                                            </div>
                                            {ticket.asset_name && (
                                                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs">
                                                    Asset: {ticket.asset_name}
                                                </div>
                                            )}
                                            {ticket.messages?.length > 0 && (
                                                <div className="flex items-center gap-1.5 text-indigo-500">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                                                    <MessageSquare className="w-3.5 h-3.5" />
                                                    <span className="font-medium">{ticket.messages.length}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0 flex items-center gap-2">
                                        <button 
                                            onClick={(e) => handleDeleteTicket(e, ticket.id)}
                                            className="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:border-red-200 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all text-slate-400 hover:text-red-600"
                                            title="Delete Ticket"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 group-hover:border-indigo-200 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-all text-slate-400 group-hover:text-indigo-600">
                                            <ChevronRight className="w-5 h-5" />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>


            {isAddCategoryOpen && createPortal(
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col max-h-[80vh]">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="font-bold text-slate-900 dark:text-slate-100">Manage Categories</h3>
                            <button onClick={() => setIsAddCategoryOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="flex gap-2 mb-6">
                                <input type="text" className="flex-1 border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl px-4 py-2 border focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="Add new category..." value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
                                <SmartButton loading={isAddingCategory} onClick={async () => {
                                    if(!newCategoryName.trim()) return;
                                    setIsAddingCategory(true);
                                    try {
                                        await helpdeskApi.createCategory(newCategoryName);
                                        setNewCategoryName('');
                                        fetchData();
                                    } catch(e) {
                                        alert('Failed to add category');
                                    } finally { setIsAddingCategory(false); }
                                }} className="px-4 py-2 rounded-xl text-sm font-medium">Add</SmartButton>
                            </div>
                            <div className="space-y-2">
                                {categories.map(c => (
                                    <div key={c.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{c.name}</span>
                                        <button onClick={async () => {
                                            if(!window.confirm('Delete this category?')) return;
                                            try {
                                                await helpdeskApi.deleteCategory(c.id);
                                                fetchData();
                                            } catch(e) {
                                                alert('Failed to delete category');
                                            }
                                        }} className="text-slate-400 hover:text-red-500 transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                {categories.length === 0 && (
                                    <p className="text-center text-sm text-slate-500">No categories found.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>, document.body
            )}

            {isModalOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden max-h-full border border-slate-200 dark:border-slate-700">
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 shrink-0">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                <LifeBuoy className="w-5 h-5 text-indigo-600" /> New Support Ticket
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors bg-slate-50 dark:bg-slate-800 rounded-full p-1.5">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto bg-white dark:bg-slate-900">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="col-span-1 md:col-span-2">
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Subject</label>
                                    <input required type="text" className="w-full border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl px-4 py-2.5 border focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Briefly summarize the issue" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Category</label>
                                    <select required className="w-full border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl px-4 py-2.5 border focus:ring-2 focus:ring-indigo-500 outline-none transition-all truncate"
                                        value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                                        <option value="">-- Select Category --</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.name}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Priority</label>
                                    <select className="w-full border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl px-4 py-2.5 border focus:ring-2 focus:ring-indigo-500 outline-none transition-all truncate"
                                        value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}>
                                        <option value="low">Low - Routine request</option>
                                        <option value="medium">Medium - Needs attention</option>
                                        <option value="high">High - Blocking my work</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Related Asset (Optional)</label>
                                    <select className="w-full border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl px-4 py-2.5 border focus:ring-2 focus:ring-indigo-500 outline-none transition-all truncate"
                                        value={formData.asset} onChange={e => setFormData({...formData, asset: e.target.value})}>
                                        <option value="">-- Select Assigned Asset --</option>
                                        {assets.map(a => (
                                            <option key={a.id} value={a.id}>{a.category_name ? `${a.category_name} - ` : ''}{a.name} {a.serial_number ? `(${a.serial_number})` : ''}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-1 md:col-span-2">
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
                                    <textarea required rows="4" className="w-full border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl px-4 py-3 border focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                                        value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Provide as much detail as possible..."></textarea>
                                </div>
                                <div className="col-span-1 md:col-span-2">
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Attachment (Optional)</label>
                                    <DragDropUpload 
                                        file={formData.attachment}
                                        onFileSelect={(file) => setFormData({...formData, attachment: file})}
                                    />
                                    <p className="text-xs text-slate-500 mt-2">Attach a screenshot or document to help us resolve the issue faster.</p>
                                </div>
                            </div>
                            <div className="pt-6 mt-6 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium transition-colors">Cancel</button>
                                <SmartButton type="submit" loading={isSubmitting} success={!isSubmitting && !isModalOpen && formData.title === ''} className="px-6 py-2.5 rounded-xl font-medium shadow-sm">
                                    Submit Ticket
                                </SmartButton>
                            </div>
                        </form>
                    </div>
                </div>
            , document.body)}
        </div>
    );
}
