import React from 'react';

interface SidebarProps {
  currentView: 'dashboard' | 'time-logs';
  onNavigate: (view: 'dashboard' | 'time-logs') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
  const navItems = [
    {
      id: 'dashboard' as const,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      label: 'Dashboard'
    },
    {
      id: 'time-logs' as const,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      label: 'Time Logs'
    }
  ];

  return (
    <div className="fixed left-0 top-0 h-full w-16 bg-slate-800 dark:bg-slate-900 border-r border-slate-700 dark:border-slate-600 flex flex-col items-center py-4 z-40">
      <div className="space-y-4">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`
              w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-200
              ${currentView === item.id 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'text-slate-400 hover:text-white hover:bg-slate-700 dark:hover:bg-slate-800'
              }
            `}
            title={item.label}
          >
            {item.icon}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;