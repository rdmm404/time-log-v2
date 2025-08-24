import {AppModule} from '../AppModule.js';
import {ModuleContext} from '../ModuleContext.js';

class ApplicationTerminatorOnLastWindowClose implements AppModule {
  enable({app}: ModuleContext): Promise<void> | void {
    app.on('window-all-closed', () => {
      // On macOS, apps typically stay running even when all windows are closed
      // With a system tray, we want this behavior on all platforms
      if (process.platform !== 'darwin') {
        // Don't quit - let the system tray keep the app running
        // The user can quit from the tray context menu
      }
    });
  }
}


export function terminateAppOnLastWindowClose(...args: ConstructorParameters<typeof ApplicationTerminatorOnLastWindowClose>) {
  return new ApplicationTerminatorOnLastWindowClose(...args);
}
