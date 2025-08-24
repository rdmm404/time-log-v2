import './App.css'
import TimerApp from './components/TimerApp'
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
    <div className="min-h-screen flex items-center justify-center p-8 bg-white dark:bg-slate-900">
      <TimerApp />
    </div>
  );
}

export default App
