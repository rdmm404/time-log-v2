import './App.css'
import Dashboard from './components/Dashboard'
import TimeLogManager from './components/TimeLogManager'
import ProjectManager from './components/ProjectManager'
import Sidebar from './components/Sidebar'
import { TrayWindow } from './components/TrayWindow'
import { TimerProvider } from './contexts/TimerContext'
import { ProjectProvider } from './contexts/ProjectContext'
import { useState } from 'react'

function App() {
  // Check if this is the tray window based on the hash
  const isTrayWindow = window.location.hash === '#/tray';
  const [currentView, setCurrentView] = useState<'dashboard' | 'time-logs' | 'projects'>('dashboard');

  if (isTrayWindow) {
    return (
      <ProjectProvider>
        <TimerProvider>
          <div className="p-2">
            <TrayWindow />
          </div>
        </TimerProvider>
      </ProjectProvider>
    );
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'time-logs':
        return <TimeLogManager />;
      case 'projects':
        return <ProjectManager />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <ProjectProvider>
      <TimerProvider>
        <div className="flex h-screen">
          <Sidebar currentView={currentView} onNavigate={setCurrentView} />
          <div className="flex-1 ml-16">
            {renderCurrentView()}
          </div>
        </div>
      </TimerProvider>
    </ProjectProvider>
  );
}

export default App
