
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { JobApplication, ApplicationStats, UserProfile, AtsReport, ApplicationStatus } from './types';
import { StatsCard } from './components/StatsCard';
import { ApplicationForm } from './components/ApplicationForm';
import { STATUS_COLORS, STATUSES, STORAGE_KEYS } from './constants';
import { extractTextFromPdf } from './services/geminiService';

type TimeFilter = 'today' | 'week' | 'month' | 'year' | 'all';

const App: React.FC = () => {
  const [applications, setApplications] = useState<JobApplication[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.APPLICATIONS);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load apps:", e);
      return [];
    }
  });

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      return saved ? JSON.parse(saved) : { resumeText: '' };
    } catch (e) {
      return { resumeText: '' };
    }
  });

  const [lastSaved, setLastSaved] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [parseSuccess, setParseSuccess] = useState(false);
  const [selectedReport, setSelectedReport] = useState<AtsReport | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'All'>('All');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const importFileRef = useRef<HTMLInputElement>(null);
  const resumeUploadRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(applications));
    setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  }, [applications]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(userProfile));
  }, [userProfile]);

  const handleExportData = () => {
    const data = { applications, userProfile, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `jobhunt_pro_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.applications) setApplications(data.applications);
        if (data.userProfile) setUserProfile(data.userProfile);
        alert("Success! Your job pipeline has been restored.");
      } catch (err) {
        alert("Error: Invalid backup file format.");
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || file.type !== 'application/pdf') return;

    setIsExtractingPdf(true);
    setParseSuccess(false);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        try {
          const extractedText = await extractTextFromPdf(base64);
          setUserProfile({ resumeText: extractedText });
          setParseSuccess(true);
        } catch (e: any) {
          alert(e.message);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      alert("Error processing PDF.");
    } finally {
      setIsExtractingPdf(false);
      if (event.target) event.target.value = '';
    }
  };

  const updateAppStatus = (id: string, newStatus: ApplicationStatus) => {
    setApplications(prev => prev.map(app => 
      app.id === id ? { ...app, status: newStatus } : app
    ));
  };

  const parseDate = (d: string) => {
    const [y, m, day] = d.split('-').map(Number);
    return new Date(y, m - 1, day);
  };

  const stats: ApplicationStats = useMemo(() => {
    const now = new Date();
    const todayStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    
    const oneWeekAgo = new Date(); oneWeekAgo.setDate(now.getDate() - 7);
    const oneMonthAgo = new Date(); oneMonthAgo.setMonth(now.getMonth() - 1);
    const oneYearAgo = new Date(); oneYearAgo.setFullYear(now.getFullYear() - 1);

    return {
      today: applications.filter(a => a.appliedDate === todayStr).length,
      week: applications.filter(a => parseDate(a.appliedDate) >= oneWeekAgo).length,
      month: applications.filter(a => parseDate(a.appliedDate) >= oneMonthAgo).length,
      year: applications.filter(a => parseDate(a.appliedDate) >= oneYearAgo).length,
    };
  }, [applications]);

  const filteredAndSortedApps = useMemo(() => {
    const now = new Date();
    const todayStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    const oneWeekAgo = new Date(); oneWeekAgo.setDate(now.getDate() - 7);
    const oneMonthAgo = new Date(); oneMonthAgo.setMonth(now.getMonth() - 1);
    const oneYearAgo = new Date(); oneYearAgo.setFullYear(now.getFullYear() - 1);

    let result = applications.filter(app => {
      const matchesSearch = app.companyName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           app.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (app.location && app.location.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = statusFilter === 'All' || app.status === statusFilter;
      
      let matchesTime = true;
      if (timeFilter !== 'all') {
        const appDate = parseDate(app.appliedDate);
        if (timeFilter === 'today') matchesTime = app.appliedDate === todayStr;
        else if (timeFilter === 'week') matchesTime = appDate >= oneWeekAgo;
        else if (timeFilter === 'month') matchesTime = appDate >= oneMonthAgo;
        else if (timeFilter === 'year') matchesTime = appDate >= oneYearAgo;
      }

      return matchesSearch && matchesStatus && matchesTime;
    });

    result.sort((a, b) => {
      const dateA = new Date(a.appliedDate).getTime();
      const dateB = new Date(b.appliedDate).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [applications, searchQuery, statusFilter, timeFilter, sortOrder]);

  const deleteApplication = (id: string) => {
    if (window.confirm('Remove this application record?')) setApplications(prev => prev.filter(a => a.id !== id));
  };

  const formatDisplayDate = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const appDate = new Date(dateStr);
    appDate.setHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - appDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return appDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const toggleTimeFilter = (filter: TimeFilter) => {
    setTimeFilter(prev => prev === filter ? 'all' : filter);
  };

  return (
    <div className="min-h-screen pb-20 bg-slate-50/50 font-sans text-slate-900">
      <input type="file" ref={importFileRef} onChange={handleImportData} className="hidden" accept=".json" />
      <input type="file" ref={resumeUploadRef} onChange={handlePdfUpload} className="hidden" accept=".pdf" />

      <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-2.5 rounded-xl shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight hidden sm:block uppercase">JobHunt <span className="text-indigo-600">Pro</span></h1>
            <div className="flex items-center space-x-1 hidden md:flex">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sync Active {lastSaved && `• ${lastSaved}`}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-4">
          <div className="hidden lg:flex items-center bg-slate-100 rounded-xl p-1">
            <button onClick={handleExportData} className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-white rounded-lg transition-all">Export</button>
            <button onClick={() => importFileRef.current?.click()} className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-white rounded-lg transition-all">Import</button>
          </div>

          <button onClick={() => setShowProfile(true)} className="flex items-center space-x-2 px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 border border-slate-100 bg-white font-semibold shadow-sm transition-all active:scale-95">
            <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            <span className="hidden md:inline">Profile</span>
          </button>

          <button onClick={() => setShowForm(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg transition-all active:scale-95 flex items-center space-x-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            <span className="hidden xs:inline">Track Job</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-10 space-y-10">
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard 
            label="Applied Today" 
            value={stats.today} 
            isActive={timeFilter === 'today'}
            onClick={() => toggleTimeFilter('today')}
            color="bg-emerald-500/10 text-emerald-600" 
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}/></svg>} 
          />
          <StatsCard 
            label="Last 7 Days" 
            value={stats.week} 
            isActive={timeFilter === 'week'}
            onClick={() => toggleTimeFilter('week')}
            color="bg-indigo-500/10 text-indigo-600" 
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}/></svg>} 
          />
          <StatsCard 
            label="Last 30 Days" 
            value={stats.month} 
            isActive={timeFilter === 'month'}
            onClick={() => toggleTimeFilter('month')}
            color="bg-orange-500/10 text-orange-600" 
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}/><path d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}/></svg>} 
          />
          <StatsCard 
            label="Total Year" 
            value={stats.year} 
            isActive={timeFilter === 'year'}
            onClick={() => toggleTimeFilter('year')}
            color="bg-rose-500/10 text-rose-600" 
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}/></svg>} 
          />
        </section>

        <section className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 bg-white space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <h3 className="text-xl font-black uppercase tracking-tight">Applications</h3>
              </div>
              <div className="flex flex-1 max-w-md items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                <svg className="w-5 h-5 text-slate-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input 
                  type="text" 
                  placeholder="Search company, role..." 
                  className="bg-transparent border-none outline-none w-full text-sm font-medium"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => setStatusFilter('All')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${statusFilter === 'All' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>All</button>
              {STATUSES.map(s => (
                <button key={s} onClick={() => setStatusFilter(s)} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${statusFilter === s ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{s}</button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            {filteredAndSortedApps.length > 0 ? (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Job Details</th>
                    <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest cursor-pointer" onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}>Applied Date</th>
                    <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">ATS Match</th>
                    <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAndSortedApps.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50/80 transition-all group">
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <p className="font-bold text-slate-900">{app.jobTitle}</p>
                          <p className="text-sm text-slate-500">{app.companyName}</p>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-sm font-medium text-slate-600">{formatDisplayDate(app.appliedDate)}</td>
                      <td className="px-8 py-6">
                        {app.atsReport ? (
                          <button onClick={() => setSelectedReport(app.atsReport!)} className={`px-3 py-1 rounded-xl text-xs font-black ${app.atsReport.score > 75 ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>{app.atsReport.score}%</button>
                        ) : <span className="text-slate-300 text-xs italic">N/A</span>}
                      </td>
                      <td className="px-8 py-6">
                        <select 
                          value={app.status}
                          onChange={(e) => updateAppStatus(app.id, e.target.value as ApplicationStatus)}
                          className={`appearance-none cursor-pointer px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight border-none ${STATUS_COLORS[app.status]}`}
                        >
                          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button onClick={() => deleteApplication(app.id)} className="p-2 text-slate-300 hover:text-red-600 transition-colors"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-20 text-center">
                <p className="text-slate-400 font-medium">No applications found.</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {showProfile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-2xl font-black uppercase">Resume Profile</h2>
              <button onClick={() => setShowProfile(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-8 space-y-6">
              <button onClick={() => resumeUploadRef.current?.click()} disabled={isExtractingPdf} className="w-full py-8 rounded-2xl font-bold border-2 border-dashed border-slate-200 text-slate-400 hover:bg-indigo-50 hover:border-indigo-400 hover:text-indigo-600 transition-all">
                {isExtractingPdf ? 'AI Scanning...' : parseSuccess ? 'Resume Updated!' : 'Upload Resume PDF'}
              </button>
              <textarea className="w-full h-64 p-6 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-mono text-sm" value={userProfile.resumeText} onChange={(e) => setUserProfile({ resumeText: e.target.value })} placeholder="Resume text content..." />
              <button onClick={() => setShowProfile(false)} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all uppercase">Save Profile</button>
            </div>
          </div>
        </div>
      )}

      {selectedReport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 p-10 space-y-8">
            <div className="text-center">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Match Report</h3>
              <div className="text-7xl font-black text-indigo-600">{selectedReport.score}%</div>
            </div>
            <div className="space-y-6">
              <section>
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-3">Strengths</h4>
                <div className="flex flex-wrap gap-2">{selectedReport.strengths.map((s, i) => <span key={i} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold">{s}</span>)}</div>
              </section>
              <section>
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-3">Missing Keywords</h4>
                <div className="flex flex-wrap gap-2">{selectedReport.missingKeywords.map((k, i) => <span key={i} className="px-3 py-1.5 bg-rose-50 text-rose-700 rounded-lg text-xs font-bold">{k}</span>)}</div>
              </section>
              <section>
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-3">AI Suggestion</h4>
                <p className="text-sm text-slate-600 italic leading-relaxed">{selectedReport.suggestions}</p>
              </section>
            </div>
            <button onClick={() => setSelectedReport(null)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest">Close Report</button>
          </div>
        </div>
      )}

      {showForm && (
        <ApplicationForm 
          onClose={() => setShowForm(false)} 
          onSubmit={(data) => setApplications(prev => [{ ...data, id: Math.random().toString(36).substr(2, 9) }, ...prev])} 
          resumeText={userProfile.resumeText}
        />
      )}
    </div>
  );
};

export default App;
