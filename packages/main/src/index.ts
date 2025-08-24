import type {AppInitConfig} from './AppInitConfig.js';
import {createModuleRunner} from './ModuleRunner.js';
import {disallowMultipleAppInstance} from './modules/SingleInstanceApp.js';
import {createWindowManagerModule} from './modules/WindowManager.js';
import {terminateAppOnLastWindowClose} from './modules/ApplicationTerminatorOnLastWindowClose.js';
import {hardwareAccelerationMode} from './modules/HardwareAccelerationModule.js';
import {autoUpdater} from './modules/AutoUpdater.js';
import {allowInternalOrigins} from './modules/BlockNotAllowdOrigins.js';
import {allowExternalUrls} from './modules/ExternalUrls.js';
import {createDatabaseModule} from './modules/DatabaseModule.js';
import {createSystemTrayModule} from './modules/SystemTray.js';
import {TimeLogService} from './services/TimeLogService.js';
import {setupDatabaseHandlers} from './handlers/DatabaseHandlers.js';


export async function initApp(initConfig: AppInitConfig) {
  // Initialize database first
  const databaseModule = createDatabaseModule();
  const windowManager = createWindowManagerModule({initConfig, openDevTools: import.meta.env.DEV});
  
  const moduleRunner = createModuleRunner()
    .init(windowManager)
    .init(disallowMultipleAppInstance())
    .init(terminateAppOnLastWindowClose())
    .init(hardwareAccelerationMode({enable: false}))
    .init(autoUpdater())
    .init(databaseModule)
    .init(createSystemTrayModule({ 
      windowManager, 
      preloadPath: initConfig.preload.path,
      rendererConfig: initConfig.renderer 
    }))

    // Install DevTools extension if needed
    // .init(chromeDevToolsExtension({extension: 'VUEJS3_DEVTOOLS'}))

    // Security
    .init(allowInternalOrigins(
      new Set(initConfig.renderer instanceof URL ? [initConfig.renderer.origin] : []),
    ))
    .init(allowExternalUrls(
      new Set(
        initConfig.renderer instanceof URL
          ? [
            'https://vite.dev',
            'https://developer.mozilla.org',
            'https://solidjs.com',
            'https://qwik.dev',
            'https://lit.dev',
            'https://react.dev',
            'https://preactjs.com',
            'https://www.typescriptlang.org',
            'https://vuejs.org',
          ]
          : [],
      )),
    );

  await moduleRunner;

  // Setup database handlers after initialization
  const database = databaseModule.getDatabase();
  const timeLogService = new TimeLogService(database);
  setupDatabaseHandlers(timeLogService);
}
