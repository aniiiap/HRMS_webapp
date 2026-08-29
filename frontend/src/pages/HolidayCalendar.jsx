import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, CalendarDays, List as ListIcon, MapPin, Edit, Trash2 } from 'lucide-react';
import { getHolidays, createHoliday, updateHoliday, deleteHoliday, getShiftTemplates } from '../api/holidayApi';
import { useAuth } from '../context/AuthContext';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, parseISO, isToday } from 'date-fns';
import toast from 'react-hot-toast';

export default function HolidayCalendar() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'owner' || user?.role === 'hr' || user?.role === 'hr_admin';

  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('grid'); // 'list' | 'grid'
  
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [formData, setFormData] = useState({ name: '', date: '', description: '', is_optional: false, is_active: true, applicable_shifts: [] });

  const [shiftTemplates, setShiftTemplates] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [holidayRes, shiftRes] = await Promise.all([
        getHolidays(),
        isAdmin ? getShiftTemplates().catch(() => ({ data: [] })) : Promise.resolve({ data: [] })
      ]);
      const sorted = holidayRes.data.sort((a, b) => new Date(a.date) - new Date(b.date));
      setHolidays(sorted);
      setShiftTemplates(shiftRes.data);
    } catch (error) {
      toast.error('Failed to load holidays');
    } finally {
      setLoading(false);
    }
  };

  const fetchHolidays = async () => {
    try {
      const res = await getHolidays();
      const sorted = res.data.sort((a, b) => new Date(a.date) - new Date(b.date));
      setHolidays(sorted);
    } catch (error) {
    }
  };

  const handleOpenModal = (holiday = null) => {
    if (holiday) {
      setEditingHoliday(holiday);
      setFormData({
        name: holiday.name,
        date: holiday.date,
        description: holiday.description || '',
        is_optional: holiday.is_optional,
        is_active: holiday.is_active !== false,
        applicable_shifts: holiday.applicable_shifts || [],
      });
    } else {
      setEditingHoliday(null);
      setFormData({ name: '', date: '', description: '', is_optional: false, is_active: true, applicable_shifts: [] });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingHoliday) {
        await updateHoliday(editingHoliday.id, formData);
        toast.success('Holiday updated successfully!');
      } else {
        await createHoliday(formData);
        toast.success('Holiday added successfully!');
      }
      setShowModal(false);
      fetchHolidays();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save holiday');
    }
  };

  const handleDelete = (id) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteHoliday(deleteConfirmId);
      toast.success('Holiday deleted successfully');
      setDeleteConfirmId(null);
      fetchHolidays();
    } catch (err) {
      toast.error('Failed to delete holiday');
    }
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const today = () => setCurrentDate(new Date());

  const renderCells = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const dateFormat = 'd';
    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = '';

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, dateFormat);
        const cloneDay = day;
        const isCurrentMonth = isSameMonth(day, monthStart);
        const dayHolidays = holidays.filter((h) => isSameDay(parseISO(h.date), cloneDay));
        const hasHoliday = dayHolidays.length > 0;
        const isWeekend = cloneDay.getDay() === 0 || cloneDay.getDay() === 6;
          
        let bgClass = 'bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750/70';
          
        if (!isCurrentMonth) {
          bgClass = 'bg-slate-50/70 text-slate-400 dark:bg-slate-900/60 dark:text-slate-600';
        } else if (isWeekend && hasHoliday) {
          bgClass = 'bg-gradient-to-br from-amber-50 via-rose-50 to-fuchsia-50 text-slate-900 dark:from-amber-900/20 dark:via-rose-900/20 dark:to-fuchsia-900/20 dark:text-slate-100 hover:opacity-90';
        } else if (isWeekend) {
          bgClass = 'bg-indigo-50/30 text-indigo-900 dark:bg-indigo-900/10 dark:text-indigo-200 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20';
        } else if (hasHoliday) {
          bgClass = 'bg-brand-50/30 text-slate-900 dark:bg-brand-900/10 dark:text-slate-100 hover:bg-brand-50/50 dark:hover:bg-brand-900/20';
        }

        if (isToday(cloneDay)) {
          bgClass += ' ring-2 ring-inset ring-brand-500 shadow-sm bg-brand-50/80 dark:bg-brand-900/40';
        }

        days.push(
          <div
            key={day.toString()}
            className={`group min-h-[120px] p-2.5 transition-all duration-300 border-r border-b border-slate-200/50 dark:border-slate-700/50 ${bgClass} hover:shadow-[inset_0_0_15px_rgba(0,0,0,0.03)] dark:hover:shadow-[inset_0_0_15px_rgba(255,255,255,0.02)]`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full transition-colors ${isToday(cloneDay) ? 'bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-md shadow-brand-500/30' : 'text-slate-700 dark:text-slate-300 group-hover:text-brand-600 dark:group-hover:text-brand-400'}`}>
                {formattedDate}
              </span>
            </div>
            <div className="space-y-1.5">
              {dayHolidays.map((h) => (
                <div key={h.id} className={`relative px-2.5 py-1.5 text-xs font-semibold rounded-lg flex flex-col shadow-sm border ${h.is_optional ? 'bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200 text-amber-800 dark:from-amber-900/40 dark:to-amber-900/20 dark:border-amber-700/50 dark:text-amber-300' : 'bg-gradient-to-r from-brand-50 to-brand-100 border-brand-200 text-brand-800 dark:from-brand-900/40 dark:to-brand-900/20 dark:border-brand-700/50 dark:text-brand-300'} transform transition-transform duration-200 hover:scale-[1.02] cursor-pointer`}>
                  <span className="truncate pr-5" title={h.name}>{h.name}</span>
                  {h.is_optional && <span className="text-[9px] opacity-80 uppercase tracking-wide mt-0.5">Optional</span>}
                  {isAdmin && (
                    <div className="absolute hidden group-hover:flex right-1 top-1/2 -translate-y-1/2 bg-white/95 dark:bg-slate-800/95 rounded shadow-sm overflow-hidden z-10 border border-slate-200 dark:border-slate-600">
                      <button onClick={(e) => { e.stopPropagation(); handleOpenModal(h); }} className="p-1 text-slate-500 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition" title="Edit">
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(h.id); }} className="p-1 text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="flex flex-col rounded-b-xl overflow-hidden shadow-sm">{rows}</div>;
  };

  const getUpcomingHolidays = () => {
    const todayDate = new Date();
    todayDate.setHours(0,0,0,0);
    return holidays.filter(h => new Date(h.date) >= todayDate);
  };

  const getPastHolidays = () => {
    const todayDate = new Date();
    todayDate.setHours(0,0,0,0);
    return holidays.filter(h => new Date(h.date) < todayDate).reverse();
  };

  const EmptyIllustration = () => (
    <div className="relative w-48 h-48 mx-auto mb-6">
      {/* Decorative Blobs */}
      <div className="absolute inset-0 bg-brand-100 dark:bg-brand-900/30 rounded-full blur-3xl opacity-50 animate-pulse"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-gradient-to-br from-brand-50 to-brand-100 dark:from-brand-800/40 dark:to-brand-900/40 rounded-[2rem] flex items-center justify-center shadow-inner rotate-3">
        <CalendarIcon className="h-14 w-14 text-brand-500 dark:text-brand-400 drop-shadow-sm -rotate-3" />
      </div>
      {/* Small floating elements */}
      <div className="absolute top-6 right-6 w-8 h-8 bg-amber-100 dark:bg-amber-900/50 rounded-full shadow-sm animate-bounce flex items-center justify-center" style={{animationDuration: '3s'}}><div className="w-2 h-2 rounded-full bg-amber-400"></div></div>
      <div className="absolute bottom-10 left-6 w-6 h-6 bg-emerald-100 dark:bg-emerald-900/50 rounded-full shadow-sm animate-bounce flex items-center justify-center" style={{animationDuration: '2.5s', animationDelay: '0.5s'}}><div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div></div>
    </div>
  );

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-gradient-to-r from-white via-white to-brand-50/50 dark:from-slate-800 dark:via-slate-800 dark:to-brand-900/20 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-700/60 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-brand-400 to-indigo-500 rounded-full blur-3xl opacity-20 dark:opacity-10 pointer-events-none"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-indigo-600 dark:from-brand-400 dark:to-indigo-400 tracking-tight">Holiday Calendar</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1.5 font-medium">View and manage organizational holidays & events.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto relative z-10">
          <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1 rounded-xl w-full sm:w-auto border border-slate-200/50 dark:border-slate-700/50 shadow-inner">
            <button onClick={() => setViewMode('list')} className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-md text-brand-600 dark:text-brand-400 scale-100' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white scale-95 hover:scale-100'}`}>
              <ListIcon className="h-4 w-4" /> List
            </button>
            <button onClick={() => setViewMode('grid')} className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow-md text-brand-600 dark:text-brand-400 scale-100' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white scale-95 hover:scale-100'}`}>
              <CalendarDays className="h-4 w-4" /> Grid
            </button>
          </div>
          {isAdmin && (
            <button onClick={() => handleOpenModal()} className="btn-primary whitespace-nowrap px-5 py-2.5 shadow-lg shadow-brand-500/25 hover:shadow-xl hover:shadow-brand-500/40 hover:-translate-y-1 transition-all duration-300 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400">
              <Plus className="h-5 w-5 mr-1.5" /> Add Holiday
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/60 p-6 animate-pulse">
          <div className="flex justify-between items-center mb-8">
            <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
            <div className="flex gap-2">
              <div className="h-8 w-20 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
              <div className="h-8 w-20 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-3 mb-3">
            {[...Array(7)].map((_, i) => <div key={i} className="h-4 w-12 bg-slate-200 dark:bg-slate-700 rounded mx-auto"></div>)}
          </div>
          <div className="grid grid-cols-7 gap-3">
            {[...Array(35)].map((_, i) => (
              <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"></div>
            ))}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="relative rounded-2xl shadow-xl shadow-slate-200/40 dark:shadow-slate-900/20 border border-slate-200 dark:border-slate-700/60 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white dark:bg-slate-900">
          <div className="relative z-10">
            <div className="flex items-center justify-between p-5 border-b border-slate-200/80 dark:border-slate-700/80 bg-white/70 dark:bg-slate-900/80">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {format(currentDate, 'MMMM yyyy')}
              </h2>
              <div className="flex items-center gap-2">
                <button onClick={today} className="px-3 py-1.5 text-sm font-semibold text-slate-700 bg-white/90 border border-slate-200 dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-200 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors shadow-sm">Today</button>
                <div className="flex items-center border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden shadow-sm">
                  <button onClick={prevMonth} className="p-1.5 bg-white/90 text-slate-600 hover:text-slate-800 hover:bg-white dark:bg-slate-800/90 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-700 transition-colors border-r border-slate-200 dark:border-slate-600"><ChevronLeft className="h-5 w-5" /></button>
                  <button onClick={nextMonth} className="p-1.5 bg-white/90 text-slate-600 hover:text-slate-800 hover:bg-white dark:bg-slate-800/90 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-700 transition-colors"><ChevronRight className="h-5 w-5" /></button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-7 border-b border-slate-200/80 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/70">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest text-center py-3">{d}</div>
              ))}
            </div>
            {renderCells()}
          </div>
        </div>
      ) : (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <section>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2.5">
              <div className="p-1.5 bg-brand-100 dark:bg-brand-900/30 rounded-lg">
                <CalendarIcon className="h-5 w-5 text-brand-600 dark:text-brand-400" />
              </div>
              Upcoming Holidays
            </h3>
            {getUpcomingHolidays().length === 0 ? (
              <div className="text-center py-16 bg-gradient-to-b from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/50 rounded-3xl border border-slate-200 dark:border-slate-700/60 shadow-sm animate-in fade-in zoom-in-95 duration-500">
                <EmptyIllustration />
                <h4 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">No upcoming holidays</h4>
                <p className="text-slate-500 max-w-sm mx-auto font-medium">It looks like the holiday calendar is empty for the rest of the year. Time to plan some time off!</p>
                {isAdmin && (
                  <button onClick={() => handleOpenModal()} className="mt-8 btn-primary inline-flex items-center shadow-lg shadow-brand-500/20 hover:shadow-xl hover:shadow-brand-500/30 hover:-translate-y-1 transition-all duration-300">
                    <Plus className="h-4 w-4 mr-2" /> Add a Holiday
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {getUpcomingHolidays().map((h) => (
                  <HolidayCard key={h.id} holiday={h} isAdmin={isAdmin} onEdit={handleOpenModal} onDelete={handleDelete} />
                ))}
              </div>
            )}
          </section>

          {getPastHolidays().length > 0 && (
            <section className="pt-4 border-t border-slate-200 dark:border-slate-700/60">
              <h3 className="text-lg font-bold text-slate-500 dark:text-slate-400 mb-6 flex items-center gap-2.5 opacity-80">
                <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <CalendarIcon className="h-4 w-4" />
                </div>
                Past Holidays
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 opacity-90">
                {getPastHolidays().map((h) => (
                  <HolidayCard key={h.id} holiday={h} isAdmin={isAdmin} onEdit={handleOpenModal} onDelete={handleDelete} isPast />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Delete Holiday?</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Are you sure you want to delete this holiday? This action cannot be undone.
              </p>
            </div>
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700 flex gap-3 justify-end">
              <button type="button" onClick={() => setDeleteConfirmId(null)} className="btn-secondary flex-1">Cancel</button>
              <button type="button" onClick={confirmDelete} className="btn-primary bg-rose-600 hover:bg-rose-700 border-rose-600 hover:border-rose-700 text-white flex-1 shadow-rose-500/25">Delete</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Add/Edit Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                {editingHoliday ? 'Edit Holiday' : 'Add New Holiday'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-700 rounded-full transition-colors">
                <span className="sr-only">Close</span>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Holiday Name <span className="text-rose-500">*</span></label>
                  <input required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2.5 text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm" placeholder="e.g. Diwali" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Date <span className="text-rose-500">*</span></label>
                  <input required type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2.5 text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
                <textarea rows="2" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full resize-none rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2.5 text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm" placeholder="Add optional details or notes..."></textarea>
              </div>
              
              <div className="flex flex-wrap items-center gap-x-8 gap-y-3 p-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-700/50">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({...formData, is_active: e.target.checked})} className="h-5 w-5 rounded-md border-slate-300 text-brand-600 focus:ring-brand-600 cursor-pointer transition-colors" />
                  <span className="text-sm text-slate-700 dark:text-slate-300 font-medium group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Holiday is Active</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" checked={formData.is_optional} onChange={(e) => setFormData({...formData, is_optional: e.target.checked})} className="h-5 w-5 rounded-md border-slate-300 text-amber-600 focus:ring-amber-600 cursor-pointer transition-colors" />
                  <span className="text-sm text-slate-700 dark:text-slate-300 font-medium group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Optional / Restricted</span>
                </label>
              </div>

              {shiftTemplates.length > 0 && (
                <div className="pt-1">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2.5">
                    Applicable Shifts <span className="text-xs text-slate-500 font-normal ml-1.5">(Leave empty for all)</span>
                  </label>
                  <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto p-1.5 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-700/50">
                    {shiftTemplates.map((s) => {
                      const isSelected = formData.applicable_shifts?.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            const current = formData.applicable_shifts || [];
                            const newShifts = isSelected ? current.filter(id => id !== s.id) : [...current, s.id];
                            setFormData({...formData, applicable_shifts: newShifts});
                          }}
                          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-all ${isSelected ? 'bg-brand-50 border-brand-200 text-brand-700 dark:bg-brand-900/40 dark:border-brand-700 dark:text-brand-300 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600'}`}
                        >
                          {s.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-700">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary px-6">Cancel</button>
                <button type="submit" className="btn-primary px-6 shadow-md shadow-brand-500/25">{editingHoliday ? 'Save Changes' : 'Add Holiday'}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

function HolidayCard({ holiday, isAdmin, onEdit, onDelete, isPast }) {
  const dateObj = parseISO(holiday.date);
  
  return (
    <div className={`group relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${isPast ? 'opacity-60 grayscale-[40%] hover:grayscale-0' : 'shadow-md shadow-slate-200/40 dark:shadow-none'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-4">
          <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl text-center shadow-inner relative overflow-hidden ${holiday.is_optional ? 'bg-gradient-to-b from-amber-50 to-amber-100 text-amber-700 dark:from-amber-900/40 dark:to-amber-900/20 dark:text-amber-400' : 'bg-gradient-to-b from-brand-50 to-brand-100 text-brand-700 dark:from-brand-900/40 dark:to-brand-900/20 dark:text-brand-400'}`}>
            <div className="absolute top-0 left-0 right-0 h-1 bg-black/5 dark:bg-white/10"></div>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">{format(dateObj, 'MMM')}</span>
            <span className="text-2xl font-black leading-none mt-0.5">{format(dateObj, 'dd')}</span>
          </div>
          <div className="pt-1">
            <h4 className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{holiday.name}</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1.5 font-medium">
              <MapPin className="h-3.5 w-3.5 opacity-70" /> {format(dateObj, 'EEEE')}
            </p>
            {holiday.is_optional && (
              <span className="inline-block mt-2 px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-[10px] font-bold uppercase tracking-wider rounded-md border border-amber-200 dark:border-amber-700/50">Optional</span>
            )}
          </div>
        </div>
        {isAdmin && (
          <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col gap-1.5 translate-x-2 group-hover:translate-x-0">
            <button onClick={() => onEdit(holiday)} className="p-2 text-slate-400 hover:text-brand-600 bg-slate-50 hover:bg-brand-50 dark:bg-slate-700/50 dark:hover:bg-brand-900/50 rounded-lg transition-colors shadow-sm" title="Edit">
              <Edit className="h-4 w-4" />
            </button>
            <button onClick={() => onDelete(holiday.id)} className="p-2 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 dark:bg-slate-700/50 dark:hover:bg-rose-900/50 rounded-lg transition-colors shadow-sm" title="Delete">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      {holiday.description && (
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/60">
          <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">{holiday.description}</p>
        </div>
      )}
    </div>
  );
}
