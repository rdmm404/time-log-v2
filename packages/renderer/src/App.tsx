import './App.css'
import Dashboard from './components/Dashboard'
import { TrayWindow } from './components/TrayWindow'
import { TimerProvider } from './contexts/TimerContext'

function App() {
  // Check if this is the tray window based on the hash
  const isTrayWindow = window.location.hash === '#/tray';

  if (isTrayWindow) {
    return (
      <TimerProvider>
        <div className="p-2">
          <TrayWindow />
        </div>
      </TimerProvider>
    );
  }

  return (
    <TimerProvider>
      <Dashboard />
    </TimerProvider>
  );
}

export default App
