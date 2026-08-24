import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Send, LifeBuoy, Clock, CheckCircle, AlertCircle, Paperclip, Download, Trash2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { helpdeskApi } from '../../api/helpdeskApi';
import PageSkeleton from '../../components/ui/PageSkeleton';
import { useAuth } from '../../context/AuthContext';
import SmartButton from '../../components/ui/SmartButton';
import { useConfirm } from '../../context/ConfirmContext';

export default function TicketDetailPage() {
    const confirm = useConfirm();
    const { id } = useParams();
    const { isPrivileged, user } = useAuth();
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [attachment, setAttachment] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const messagesEndRef = useRef(null);

    const fetchTicket = async () => {
        try {
            const res = await helpdeskApi.getTicket(id);
            setTicket(res.data);
            setTimeout(() => scrollToBottom(), 100);
        } catch (error) {
            console.error("Failed to load ticket", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTicket();
    }, [id]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if ((!newMessage.trim() && !attachment) || isSubmitting) return;
        setIsSubmitting(true);
        
        const data = new FormData();
        data.append('ticket', id);
        if (newMessage.trim()) data.append('message', newMessage);
        if (attachment) data.append('attachment', attachment);

        try {
            await helpdeskApi.createMessage(data);
            setNewMessage('');
            setAttachment(null);
            fetchTicket();
        } catch (error) {
            console.error('Submit error:', error);
            alert('Failed to send message.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteMessage = async (messageId) => {
        const ok = await confirm({
            title: 'Delete Message',
            message: 'Are you sure you want to delete this message?',
            confirmLabel: 'Delete',
            destructive: true,
        });
        if (!ok) return;
        
        try {
            await helpdeskApi.deleteMessage(messageId);
            setTicket({
                ...ticket,
                messages: ticket.messages.filter(m => m.id !== messageId)
            });
        } catch (error) {
            console.error('Delete message error:', error);
            alert('Failed to delete message.');
        }
    };

    const handleStatusChange = async (newStatus) => {
        if (isUpdatingStatus) return;
        if (!isPrivileged && newStatus !== 'escalated') return;
        setIsUpdatingStatus(true);
        try {
            await helpdeskApi.updateTicketStatus(id, newStatus);
            setTicket({ ...ticket, status: newStatus });
        } catch (error) {
            console.error('Status update error:', error);
            alert('Failed to update status.');
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    if (loading) return <div className="p-8"><PageSkeleton rows={6} /></div>;
    if (!ticket) return <div className="p-8 text-center">Ticket not found or you don't have access.</div>;

    const getStatusStyles = (status) => {
        switch (status) {
            case 'open': return 'bg-amber-100 text-amber-800';
            case 'in_progress': return 'bg-blue-100 text-blue-800';
            case 'resolved': return 'bg-emerald-100 text-emerald-800';
            case 'closed': return 'bg-slate-100 text-slate-800';
            default: return 'bg-slate-100 text-slate-800';
        }
    };

    return (
        <div className="max-w-7xl mx-auto h-[calc(100vh-6rem)] flex flex-col md:flex-row gap-6">
            
            {/* Sidebar Details */}
            <div className="w-full md:w-1/3 flex flex-col gap-4 overflow-y-auto pr-2 pb-4">
                <Link to="/helpdesk" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors w-max mb-2">
                    <ArrowLeft className="w-4 h-4" /> Back to Helpdesk
                </Link>

                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusStyles(ticket.status)}`}>
                            {ticket.status.replace('_', ' ')}
                        </span>
                        <span className="text-xs font-semibold text-slate-400 capitalize">#{ticket.id}</span>
                    </div>
                    
                    <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2 leading-tight">
                        {ticket.title}
                    </h1>
                    
                    <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        {ticket.employee_avatar ? (
                            <img src={ticket.employee_avatar} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-slate-800 shadow-sm" />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-sm font-bold text-indigo-700 dark:text-indigo-300">
                                {ticket.employee_name.charAt(0)}
                            </div>
                        )}
                        <div>
                            <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">{ticket.employee_name}</div>
                            <div className="text-xs text-slate-500">{ticket.employee_code}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-y-4 mt-6">
                        <div>
                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Category</p>
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 capitalize">{ticket.category}</p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Priority</p>
                            <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300 capitalize">
                                {ticket.priority === 'high' ? <AlertCircle className="w-4 h-4 text-rose-500" /> : ticket.priority === 'medium' ? <Clock className="w-4 h-4 text-amber-500" /> : <CheckCircle className="w-4 h-4 text-emerald-500" />}
                                {ticket.priority}
                            </div>
                        </div>
                        <div className="col-span-2">
                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Created on</p>
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{format(new Date(ticket.created_at), 'MMM d, yyyy h:mm a')}</p>
                        </div>
                    </div>

                    {isPrivileged && (
                        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Admin Actions</p>
                            <select 
                                value={ticket.status} 
                                onChange={(e) => handleStatusChange(e.target.value)}
                                disabled={isUpdatingStatus}
                                className="w-full text-sm font-medium border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl px-3 py-2 border focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:opacity-50"
                            >
                                <option value="open">Mark as Open</option>
                                <option value="in_progress">Mark as In Progress</option>
                                <option value="resolved">Mark as Resolved</option>
                                <option value="closed">Close Ticket</option>
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* Chat Interface */}
            <div className="w-full md:w-2/3 flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden h-full">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0 flex items-center gap-3">
                    <LifeBuoy className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-bold text-slate-800 dark:text-slate-200">Conversation</h3>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/30 dark:bg-slate-900/30">
                    
                    {/* Original Ticket Description as first message */}
                    <div className="flex gap-4">
                        {ticket.employee_avatar ? (
                            <img src={ticket.employee_avatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 mt-1" />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-xs font-bold text-indigo-700 dark:text-indigo-300 shrink-0 mt-1">
                                {ticket.employee_name.charAt(0)}
                            </div>
                        )}
                        <div className="flex-1 max-w-[85%]">
                            <div className="flex items-baseline gap-2 mb-1">
                                <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{ticket.employee_name}</span>
                                <span className="text-xs text-slate-400">{format(new Date(ticket.created_at), 'h:mm a')}</span>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-tl-sm border border-slate-100 dark:border-slate-700 shadow-sm text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                                {ticket.description}
                                {ticket.attachment && (
                                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                                        <a href={ticket.attachment} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg transition-colors w-max">
                                            <Paperclip className="w-3.5 h-3.5" /> View Attachment
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Messages */}
                    {ticket.messages?.map((msg) => {
                        const isMe = String(msg.sender) === String(user?.id);
                        const isAi = msg.is_ai;
                        return (
                            <div key={msg.id} className={`flex gap-4 ${isMe ? 'flex-row-reverse' : ''}`}>
                                {msg.sender_avatar && !isAi ? (
                                    <img src={msg.sender_avatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 mt-1" />
                                ) : (
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-1 ${isMe ? 'bg-indigo-600 text-white' : isAi ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                                        {isAi ? 'AI' : msg.sender_name.charAt(0)}
                                    </div>
                                )}
                                <div className={`flex-1 max-w-[85%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                    <div className={`flex items-baseline gap-2 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                                        <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{isAi ? 'AI Assistant' : msg.sender_name}</span>
                                        <span className="text-xs text-slate-400">{format(new Date(msg.created_at), 'h:mm a')}</span>
                                        {(isMe || isPrivileged) && (
                                            <button onClick={() => handleDeleteMessage(msg.id)} className="text-slate-300 hover:text-red-500 transition-colors" title="Delete message">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                    <div className={`p-3.5 rounded-2xl shadow-sm text-sm whitespace-pre-wrap max-w-full break-words
                                        ${isMe ? 'bg-indigo-600 text-white rounded-tr-sm' : isAi ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-900 dark:text-emerald-100 border border-emerald-200 dark:border-emerald-800 rounded-tl-sm' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-700 rounded-tl-sm'}
                                    `}>
                                        {msg.message}
                                        {msg.attachment && (
                                            <div className={`mt-2 pt-2 border-t ${isMe ? 'border-indigo-500/50' : 'border-slate-100 dark:border-slate-700'}`}>
                                                <a href={msg.attachment} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg transition-colors w-max
                                                    ${isMe ? 'bg-indigo-700 hover:bg-indigo-800 text-white' : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300'}
                                                `}>
                                                    <Download className="w-3.5 h-3.5" /> Download File
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {ticket.status !== 'closed' ? (
                    <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shrink-0">
                        {(!isPrivileged && ticket.status !== 'escalated') && (
                            <div className="mb-3 flex justify-center">
                                <button
                                    type="button"
                                    onClick={() => handleStatusChange('escalated')}
                                    disabled={isUpdatingStatus}
                                    className="text-xs font-semibold px-4 py-1.5 bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50 rounded-full transition-colors"
                                >
                                    Need human help? Escalate to HR/Admin
                                </button>
                            </div>
                        )}
                        <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
                            <div className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 transition-all flex flex-col">
                                <textarea 
                                    rows="2"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type your message..."
                                    className="w-full px-4 py-3 bg-transparent text-sm text-slate-900 dark:text-slate-100 outline-none resize-none"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage(e);
                                        }
                                    }}
                                ></textarea>
                                {attachment && (
                                    <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-xs font-medium text-indigo-700 dark:text-indigo-300 flex justify-between items-center border-t border-indigo-100 dark:border-indigo-800/50">
                                        <span className="truncate">{attachment.name}</span>
                                        <button type="button" onClick={() => setAttachment(null)} className="text-slate-400 hover:text-slate-600">
                                            <XCircle className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex flex-col gap-2 shrink-0">
                                <button 
                                    type="button" 
                                    onClick={() => document.getElementById('chat-file-upload').click()}
                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                    title="Attach File"
                                >
                                    <Paperclip className="w-5 h-5" />
                                </button>
                                <input 
                                    type="file" 
                                    id="chat-file-upload" 
                                    className="hidden" 
                                    onChange={(e) => setAttachment(e.target.files[0])}
                                />
                            </div>

                            <SmartButton 
                                type="submit" 
                                loading={isSubmitting} 
                                disabled={!newMessage.trim() && !attachment}
                                className="h-10 px-5 rounded-xl font-medium flex items-center gap-2"
                            >
                                <Send className="w-4 h-4" /> Send
                            </SmartButton>
                        </form>
                    </div>
                ) : (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 shrink-0 text-center">
                        <p className="text-sm font-medium text-slate-500">This ticket has been closed. You cannot send new messages.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
