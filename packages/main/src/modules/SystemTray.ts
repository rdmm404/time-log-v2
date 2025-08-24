import type { AppModule } from "../AppModule.js";
import { ModuleContext } from "../ModuleContext.js";
import { Tray, Menu, BrowserWindow, nativeImage, ipcMain } from "electron";
import * as path from "path";
import { createWindowManagerModule } from "./WindowManager.js";
import type { AppInitConfig } from "../AppInitConfig.js";

interface TrayWindowConfig {
  windowManager: ReturnType<typeof createWindowManagerModule>;
  preloadPath: string;
  rendererConfig: { path: string } | URL;
}

class SystemTrayModule implements AppModule {
  private tray: Tray | null = null;
  private trayWindow: BrowserWindow | null = null;
  private windowManager: ReturnType<typeof createWindowManagerModule>;
  private preloadPath: string;
  private rendererConfig: { path: string } | URL;
  private timerState = {
    isRunning: false,
    elapsedTime: 0,
    description: "",
  };

  constructor({
    windowManager,
    preloadPath,
    rendererConfig,
  }: TrayWindowConfig) {
    this.windowManager = windowManager;
    this.preloadPath = preloadPath;
    this.rendererConfig = rendererConfig;
  }

  async enable({ app }: ModuleContext): Promise<void> {
    await app.whenReady();
    await this.createSystemTray();
    this.setupIpcListeners();
    // Request current timer state from main window after setup
    this.requestCurrentTimerState();
  }

  private async createSystemTray(): Promise<void> {
    try {
      // Get the icon path - use the main app icon
      const iconPath = path.join(process.cwd(), "buildResources", "icon.png");

      // Create tray icon
      const trayIcon = nativeImage
        .createFromPath(iconPath)
        .resize({ width: 16, height: 16 });
      this.tray = new Tray(trayIcon);

      // Set initial tooltip
      this.updateTrayTooltip();

      // Create context menu
      this.createContextMenu();

      // Handle tray click events
      this.tray.on("click", () => {
        this.handleTrayClick();
      });

      this.tray.on("right-click", () => {
        if (this.tray) {
          this.tray.popUpContextMenu();
        }
      });
    } catch (error) {
      console.error("Failed to create system tray:", error);
    }
  }

  private createContextMenu(): void {
    if (!this.tray) return;

    const contextMenu = Menu.buildFromTemplate([
      {
        label: this.timerState.isRunning ? "Stop Timer" : "Start Timer",
        click: () => {
          this.toggleTimer();
        },
      },
      {
        type: "separator",
      },
      {
        label: "Show App",
        click: () => {
          this.showMainWindow();
        },
      },
      {
        type: "separator",
      },
      {
        label: "Quit",
        click: () => {
          if (this.trayWindow) {
            this.trayWindow.close();
            this.trayWindow = null;
          }
          process.exit(0);
        },
      },
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  private async handleTrayClick(): Promise<void> {
    if (this.trayWindow && !this.trayWindow.isDestroyed()) {
      // If window exists, toggle its visibility
      if (this.trayWindow.isVisible()) {
        this.trayWindow.hide();
      } else {
        this.showTrayWindow();
      }
    } else {
      // Create and show tray window
      await this.createTrayWindow();
      this.showTrayWindow();
    }
  }

  private async createTrayWindow(): Promise<void> {
    if (this.trayWindow && !this.trayWindow.isDestroyed()) {
      return;
    }

    this.trayWindow = new BrowserWindow({
      width: 300,
      height: 200,
      show: false,
      frame: false,
      resizable: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
        preload: this.preloadPath,
      },
    });

    // Load the tray window content
    if (this.rendererConfig instanceof URL) {
      // Development mode - load from URL with hash
      await this.trayWindow.loadURL(`${this.rendererConfig.href}#/tray`);
    } else {
      // Production mode - load from file with hash
      await this.trayWindow.loadFile(this.rendererConfig.path, {
        hash: "/tray",
      });
    }

    // Hide when focus is lost
    this.trayWindow.on("blur", () => {
      if (this.trayWindow) {
        this.trayWindow.hide();
      }
    });

    this.trayWindow.on("closed", () => {
      this.trayWindow = null;
    });

    // Send current timer state when window is ready
    this.trayWindow.webContents.once("did-finish-load", () => {
      if (this.trayWindow && !this.trayWindow.isDestroyed()) {
        this.trayWindow.webContents.send("timer-state-update", this.timerState);
      }
    });
  }

  private showTrayWindow(): void {
    if (!this.trayWindow || this.trayWindow.isDestroyed()) return;
    if (!this.tray) return;

    const trayBounds = this.tray.getBounds();
    const windowBounds = this.trayWindow.getBounds();

    // Position the window near the tray icon
    const x = Math.round(
      trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2
    );
    const y = Math.round(trayBounds.y + trayBounds.height + 4);

    this.trayWindow.setPosition(x, y, false);
    this.trayWindow.show();
    this.trayWindow.focus();

    // Send current timer state when window becomes visible
    this.trayWindow.webContents.send("timer-state-update", this.timerState);
  }

  private showMainWindow(): void {
    this.windowManager.restoreOrCreateWindow(true);
  }

  private toggleTimer(): void {
    // Send IPC message to main window to toggle timer
    const mainWindow = BrowserWindow.getAllWindows().find(
      (w) => !w.isDestroyed() && w !== this.trayWindow
    );
    if (mainWindow) {
      mainWindow.webContents.send("tray-toggle-timer");
    }
  }

  private updateTrayTooltip(): void {
    if (!this.tray) return;

    const status = this.timerState.isRunning ? "Running" : "Stopped";
    const time = this.formatTime(this.timerState.elapsedTime);
    const description = this.timerState.description
      ? ` - ${this.timerState.description}`
      : "";

    this.tray.setToolTip(
      `Time Tracker - ${status}${time ? ` (${time})` : ""}${description}`
    );
  }

  private updateTrayIcon(): void {
    if (!this.tray) return;

    try {
      const iconPath = path.join(process.cwd(), "buildResources", "icon.png");
      let trayIcon = nativeImage
        .createFromPath(iconPath)
        .resize({ width: 16, height: 16 });

      // If timer is running, we could modify the icon or add an overlay
      // For now, we'll use the same icon but this is where we'd change it
      if (this.timerState.isRunning) {
        // TODO Could add a green dot overlay or change the icon entirely
        // trayIcon = this.addRunningIndicator(trayIcon);
      }

      this.tray.setImage(trayIcon);
    } catch (error) {
      console.error("Failed to update tray icon:", error);
    }
  }

  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  private setupIpcListeners(): void {
    // Listen for timer state updates from the main window
    ipcMain.on("timer-state-changed", (event, timerState) => {
      this.timerState = timerState;
      this.updateTrayTooltip();
      this.updateTrayIcon();
      this.createContextMenu(); // Recreate menu to update start/stop label

      // Update tray window if it exists (regardless of visibility)
      if (this.trayWindow && !this.trayWindow.isDestroyed()) {
        this.trayWindow.webContents.send("timer-state-update", timerState);
      }
    });

    // Handle tray window timer actions
    ipcMain.handle("tray-start-timer", async () => {
      const mainWindow = BrowserWindow.getAllWindows().find(
        (w) => !w.isDestroyed() && w !== this.trayWindow
      );
      if (mainWindow) {
        mainWindow.webContents.send("start-timer-from-tray");
      }
    });

    ipcMain.handle("tray-stop-timer", async () => {
      const mainWindow = BrowserWindow.getAllWindows().find(
        (w) => !w.isDestroyed() && w !== this.trayWindow
      );
      if (mainWindow) {
        mainWindow.webContents.send("stop-timer-from-tray");
      }
    });
  }

  private requestCurrentTimerState(): void {
    // Request current timer state from main window
    const mainWindow = BrowserWindow.getAllWindows().find(
      (w) => !w.isDestroyed() && w !== this.trayWindow
    );
    if (mainWindow) {
      mainWindow.webContents.send("tray-request-current-state");
    }
  }
}

export function createSystemTrayModule(config: TrayWindowConfig) {
  return new SystemTrayModule(config);
}
