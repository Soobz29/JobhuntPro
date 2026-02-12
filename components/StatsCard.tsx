
import React from 'react';

interface StatsCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
  isActive?: boolean;
}

export const StatsCard: React.FC<StatsCardProps> = ({ label, value, icon, color, onClick, isActive }) => {
  return (
    <div 
      onClick={onClick}
      className={`bg-white p-6 rounded-2xl shadow-sm border transition-all duration-200 cursor-pointer group hover:shadow-md hover:-translate-y-1 flex items-center space-x-4 ${
        isActive 
          ? 'border-indigo-600 ring-4 ring-indigo-500/10 shadow-indigo-100' 
          : 'border-slate-100'
      }`}
    >
      <div className={`p-3 rounded-xl transition-colors ${color} ${isActive ? 'ring-2 ring-offset-2 ring-indigo-100' : ''}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-600 transition-colors">{label}</p>
        <p className="text-3xl font-black text-slate-900 leading-none mt-1">{value}</p>
      </div>
      {isActive && (
        <div className="absolute top-3 right-3">
          <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div>
        </div>
      )}
    </div>
  );
};
