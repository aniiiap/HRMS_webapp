import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Mail, Save, User, ShieldCheck } from 'lucide-react';
import { api, messageFromError } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/ui/PageHeader';
import PageSkeleton from '../../components/ui/PageSkeleton';
import SmartButton from '../../components/ui/SmartButton';

export default function PlatformProfilePage() {
    const { user, setUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [form, setForm] = useState({
        first_name: '',
        last_name: '',
        contact_email: ''
    });

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const { data } = await api.get('/api/auth/me/');
                setForm({
                    first_name: data.first_name || '',
                    last_name: data.last_name || '',
                    contact_email: data.contact_email || ''
                });
            } catch (err) {
                toast.error(messageFromError(err) || "Failed to load profile");
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const handleChange = (e) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const { data } = await api.patch('/api/auth/me/', form);
            toast.success("Profile updated successfully!");
            // Update context
            if (setUser && data) {
                setUser(prev => ({
                    ...prev,
                    first_name: data.first_name,
                    last_name: data.last_name,
                    contact_email: data.contact_email
                }));
            }
        } catch (err) {
            toast.error(messageFromError(err) || "Failed to update profile");
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <div className="p-6"><PageSkeleton rows={4} /></div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <PageHeader 
                title="Super Admin Settings" 
                subtitle="Manage your platform credentials and contact preferences" 
            />

            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Global Settings</h3>
                </div>
                
                <form onSubmit={handleSave} className="p-6 space-y-6">
                    <div className="grid sm:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">First Name</label>
                            <input 
                                type="text"
                                name="first_name"
                                value={form.first_name}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-900 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Last Name</label>
                            <input 
                                type="text"
                                name="last_name"
                                value={form.last_name}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-900 transition-colors"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-4 rounded-xl text-sm border border-blue-100 dark:border-blue-900/30">
                            <strong>Note:</strong> Your login credentials are not tied to this contact email. You will continue to log in with <em>{user?.email}</em>.
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
                                <Mail className="w-4 h-4 text-slate-400" /> Contact Email
                            </label>
                            <input 
                                type="email"
                                name="contact_email"
                                value={form.contact_email}
                                onChange={handleChange}
                                placeholder="E.g., support@myplatform.com"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-900 transition-colors"
                            />
                            <p className="text-xs text-slate-500 mt-1.5">
                                If any company raises a ticket or sends a message, you will receive an email notification here.
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                        <SmartButton 
                            type="submit"
                            loading={isSaving}
                            className="bg-indigo-600 text-white hover:bg-indigo-700 px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 shadow-sm shadow-indigo-600/20"
                        >
                            <Save className="w-4 h-4" /> Save Changes
                        </SmartButton>
                    </div>
                </form>
            </div>
        </div>
    );
}
