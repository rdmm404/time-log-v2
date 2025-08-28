import './App.css'
import Dashboard from './components/Dashboard'
import TimeLogManager from './components/TimeLogManager'
import Sidebar from './components/Sidebar'
import { TrayWindow } from './components/TrayWindow'
import { TimerProvider } from './contexts/TimerContext'
import { useState } from 'react'

function App() {
  // Check if this is the tray window based on the hash
  const isTrayWindow = window.location.hash === '#/tray';
  const [currentView, setCurrentView] = useState<'dashboard' | 'time-logs'>('dashboard');

  if (isTrayWindow) {
    return (
      <TimerProvider>
        <div className="p-2">
          <TrayWindow />
        </div>
      </TimerProvider>
    );
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'time-logs':
        return <TimeLogManager />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <TimerProvider>
      <div className="flex h-screen">
        <Sidebar currentView={currentView} onNavigate={setCurrentView} />
        <div className="flex-1 ml-16">
          {renderCurrentView()}
        </div>
      </div>
    </TimerProvider>
  );
}

export default App
