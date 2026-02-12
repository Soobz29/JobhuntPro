
import React, { useState } from 'react';
import { JobApplication, JobPlatform, ApplicationStatus, AtsReport } from '../types';
import { PLATFORMS, STATUSES } from '../constants';
import { analyzeAtsMatch, scrapeJobDescription } from '../services/geminiService';

interface ApplicationFormProps {
  onSubmit: (app: Omit<JobApplication, 'id'>) => void;
  onClose: () => void;
  resumeText?: string;
}

export const ApplicationForm: React.FC<ApplicationFormProps> = ({ onSubmit, onClose, resumeText }) => {
  const getLocalTodayStr = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const localNow = new Date(now.getTime() - (offset * 60 * 1000));
    return localNow.toISOString().split('T')[0];
  };

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [formData, setFormData] = useState({
    jobTitle: '',
    companyName: '',
    platform: 'LinkedIn' as JobPlatform,
    status: 'Applied' as ApplicationStatus,
    appliedDate: getLocalTodayStr(),
    jobUrl: '',
    location: '',
    notes: '',
    jobDescription: '',
    atsReport: undefined as AtsReport | undefined
  });

  const handleFetchDescription = async () => {
    if (!formData.jobUrl) {
      alert("Please provide a valid Job URL first.");
      return;
    }

    setIsScraping(true);
    try {
      const pulledDescription = await scrapeJobDescription(formData.jobUrl);
      if (pulledDescription) {
        setFormData(prev => ({ ...prev, jobDescription: pulledDescription }));
      }
    } catch (err) {
      alert("Could not pull content automatically. Please copy-paste it manually.");
    } finally {
      setIsScraping(false);
    }
  };

  const handleAiScan = async () => {
    if (!resumeText) {
      alert("Please save your resume in the Profile section first!");
      return;
    }
    if (!formData.jobDescription) {
      alert("Please provide the Job Description first (paste it or use 'Fetch from URL').");
      return;
    }

    setIsAnalyzing(true);
    const report = await analyzeAtsMatch(resumeText, formData.jobDescription);
    if (report) {
      setFormData(prev => ({ ...prev, atsReport: report }));
    } else {
      alert("Failed to analyze. Check your API key or connection.");
    }
    setIsAnalyzing(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Track New Application</h2>
            <p className="text-sm text-slate-500">Record your progress and check ATS compatibility.</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Top Section: Link & Automated Pulling */}
            <div className="md:col-span-2 space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Job Link (URL)</label>
                <div className="flex gap-2">
                  <input 
                    type="url"
                    className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl outline-none transition-all text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    value={formData.jobUrl}
                    onChange={e => setFormData({...formData, jobUrl: e.target.value})}
                    placeholder="https://www.linkedin.com/jobs/..."
                  />
                  <button 
                    type="button"
                    onClick={handleFetchDescription}
                    disabled={isScraping || !formData.jobUrl}
                    className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-black disabled:opacity-50 transition-all flex items-center space-x-2 whitespace-nowrap"
                  >
                    {isScraping ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    )}
                    <span>{isScraping ? 'Fetching...' : 'Fetch Description'}</span>
                  </button>
                </div>
              </div>

              <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                  <label className="block text-sm font-bold text-indigo-900 mb-2 flex items-center justify-between">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Job Description
                    </div>
                    {isScraping && <span className="text-[10px] uppercase tracking-widest animate-pulse">AI Agent is visiting site...</span>}
                  </label>
                  <textarea 
                    className="w-full px-4 py-3 bg-white border border-indigo-200 rounded-xl outline-none h-32 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all"
                    value={formData.jobDescription}
                    onChange={e => setFormData({...formData, jobDescription: e.target.value})}
                    placeholder="The AI will populate this when you click 'Fetch Description', or you can paste it here..."
                  />
                  <button 
                    type="button"
                    onClick={handleAiScan}
                    disabled={isAnalyzing || !formData.jobDescription}
                    className="mt-3 w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center space-x-2 shadow-lg shadow-indigo-200"
                  >
                    {isAnalyzing ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div><span>Analyzing Compatibility...</span></>
                    ) : (
                      <><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M13 7H7v6h6V7z"/><path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 110-2h1V5a2 2 0 012-2h2V2zM5 5v10h10V5H5z" clipRule="evenodd"/></svg><span>Scan for ATS Match</span></>
                    )}
                  </button>
                  
                  {formData.atsReport && (
                    <div className="mt-4 p-4 bg-white rounded-xl border border-indigo-100 animate-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-slate-700">Match Score</span>
                        <span className={`text-lg font-black ${formData.atsReport.score > 70 ? 'text-emerald-600' : 'text-orange-600'}`}>
                          {formData.atsReport.score}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className={`h-2 rounded-full transition-all duration-1000 ${formData.atsReport.score > 70 ? 'bg-emerald-500' : 'bg-orange-500'}`} style={{ width: `${formData.atsReport.score}%` }}></div>
                      </div>
                    </div>
                  )}
               </div>
            </div>

            {/* Core Details */}
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-slate-700">Job Title*</label>
              <input 
                required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900"
                value={formData.jobTitle}
                onChange={e => setFormData({...formData, jobTitle: e.target.value})}
                placeholder="e.g. Frontend Developer"
              />
            </div>
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-slate-700">Company Name*</label>
              <input 
                required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900"
                value={formData.companyName}
                onChange={e => setFormData({...formData, companyName: e.target.value})}
                placeholder="e.g. Acme Corp"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4 col-span-1 md:col-span-2">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Platform</label>
                <select 
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white transition-all text-slate-900 appearance-none"
                  value={formData.platform}
                  onChange={e => setFormData({...formData, platform: e.target.value as JobPlatform})}
                >
                  {PLATFORMS.map(p => <option key={p} value={p} className="text-slate-900">{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Status</label>
                <select 
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white transition-all text-slate-900 appearance-none"
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value as ApplicationStatus})}
                >
                  {STATUSES.map(s => <option key={s} value={s} className="text-slate-900">{s}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Applied Date</label>
              <input 
                type="date"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none transition-all text-slate-900"
                value={formData.appliedDate}
                onChange={e => setFormData({...formData, appliedDate: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Location</label>
              <input 
                type="text"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none transition-all text-slate-900"
                value={formData.location}
                onChange={e => setFormData({...formData, location: e.target.value})}
                placeholder="Remote / New York"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex gap-4 sticky bottom-0 bg-white pb-2">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="flex-1 px-6 py-3 bg-indigo-600 rounded-xl font-bold text-white hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95"
            >
              Save Application
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
