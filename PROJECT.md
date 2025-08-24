Time Tracker Desktop App – Feature Spec and Implementation Plan (Electron + TypeScript + React)

1. Product scope and goals

- Purpose: Minimal, reliable, local-only desktop time tracker with an ultra-fast start/stop flow, accurate daily totals, and simple exports.
- Platforms: Windows 10+ is the main focus, macOS 12=, Linux (Ubuntu LTS) only if easily achievable.
- Non-goals (initial): Accounts, sync, team features, complex analytics, mobile apps.

2. Prioritized feature list
   P0 (must-have for first release)

- Timer engine: start/stop; single-running session enforcement; live timer; auto-stop on system sleep/lock; crash-safe persistence
- System tray widget with quick start/stop and today’s total
- Global shortcuts (configurable)
- Local database (ACID) with zero data loss design
- Dashboard: today view with live timer and last 7–14 days summary
- Manual editing: add, delete, split, trim, merge sessions; notes on sessions; overlap prevention
- Export: CSV and Excel for a selected date range with daily totals and raw sessions
- Time log visualization: per-day breakdown; basic aggregates for week and month
- Configuration: theme, autostart, reminders, global shortcuts
- Theme: light and dark with system auto-detect

P1 (should-have, core polish)

- Automatic time logging suggestions (reminders): on login, periodic schedule, and when selected apps are opened or become active
- Aggregation ranges: two weeks, 3 months, 6 months, year
- Optional prompt to resume after unlock/resume
- Basic charts (bar/line) for hours per day/week

P2 (nice-to-have / low priority)

- Cloud login + sync
- LLM-powered “are you working?” signals
- Advanced chart types and annotations

3. Architecture overview

- Electron Main Process
  - Responsibilities: window lifecycle, tray, global shortcuts, notifications, power/lock monitoring, autostart, single-instance lock, DB access, process/app detection for reminders, file exports
  - Modules: TimerService, DB, ReminderService, ExportService, SettingsService, TrayService, ShortcutService
- Renderer (React + TypeScript)
  - Views: Dashboard, Logs, Edit Day, Export, Settings
  - State management: Zustand or Redux; React Query for IPC-based data fetching is optional
- Preload
  - contextBridge-exposed, minimal, typed IPC API for renderer; no remote module
- Data storage
  - SQLite (better-sqlite3) in WAL mode at userData/time-tracker.db
  - Reason: ACID, reliability, fast queries, easy migrations
- Time utilities
  - Luxon for robust time zones and DST
- Exports
  - CSV via csv-stringify or native string building
  - Excel via exceljs

4. Data model

- General rules
  - Store timestamps in UTC ISO 8601 (string) and persist original zone offset at session boundaries
  - All calculations for “day” are in the user’s local time zone at export/visualization time
  - Ensure at most one ongoing session (end is null)
  - Write frequently, never buffer solely in memory

TypeScript types (renderer and main share via common package):

```ts
export type UUID = string;

export type SessionSource = "timer" | "manual" | "system";

export interface Session {
  id: UUID;
  startUtc: string; // ISO string in UTC
  endUtc: string | null; // null if ongoing
  startTz: string; // e.g., "America/New_York"
  endTz: string | null; // if null for ongoing, set on stop
  note: string | null;
  source: SessionSource;
  stopReason: "user" | "sleep" | "lock" | "shutdown" | null;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface Settings {
  theme: "system" | "light" | "dark";
  launchOnStartup: boolean;
  autoStopOnSleep: boolean; // default true
  autoStopOnLock: boolean; // default true
  promptResumeOnUnlock: boolean; // default true
  globalShortcutToggle: string; // Electron Accelerator string
  remindOnLogin: boolean;
  periodicReminderEnabled: boolean;
  periodicReminderMinutes: number; // e.g., 60
  appOpenReminderEnabled: boolean;
  appWatchList: string[]; // process names / bundle ids
  respectDoNotDisturb: boolean;
}

export interface SessionEditLog {
  id: UUID;
  sessionId: UUID;
  action: "create" | "stop" | "edit_time" | "edit_note" | "split" | "merge" | "delete";
  previous: string | null; // JSON
  next: string | null; // JSON
  createdAtUtc: string;
}
```

Suggested SQL schema:

```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;

CREATE TABLE IF NOT EXISTS migrations (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  run_at_utc TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  start_utc TEXT NOT NULL,
  end_utc TEXT,
  start_tz TEXT NOT NULL,
  end_tz TEXT,
  note TEXT,
  source TEXT NOT NULL,
  stop_reason TEXT,
  created_at_utc TEXT NOT NULL,
  updated_at_utc TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_start ON sessions (start_utc);
CREATE INDEX IF NOT EXISTS idx_sessions_end ON sessions (end_utc);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS session_edit_log (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  action TEXT NOT NULL,
  previous TEXT,
  next TEXT,
  created_at_utc TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
);
```

5. Timer engine and OS integration (P0)

- State machine
  - Idle -> Tracking -> Idle
  - Only one tracking session at a time; start inserts a session with end=null; stop sets end
- Start session
  - Validate no ongoing session
  - Insert session with startUtc=now, startTz=current IANA, source="timer"
  - Persist immediately
  - Update tray label and UI
- Stop session
  - If ongoing, set endUtc=now and endTz=current IANA; stopReason based on trigger (user/sleep/lock/shutdown)
  - Validate duration > 0; if end <= start, clamp by 1 second
  - Persist; update tray/UI
- Auto-stop on sleep/lock
  - Use powerMonitor events:
    - suspend, lock-screen, shutdown -> stop if tracking with stopReason
    - On resume/unlock: if promptResumeOnUnlock, show notification to resume
  - If an event arrives and DB write fails, retry up to N times; log failure and keep a JSON failover file in userData to reconcile next launch
- Crash-safe behavior
  - On start, also write a heartbeat row or simply rely on end=null session; on app relaunch:
    - If there’s an end=null session, ask user whether to end it at the recorded last-known timestamp (app quit time not guaranteed), or at now, or discard tail with edit. Default: end at last lock/suspend/shutdown time if present; else end at app relaunch time.
  - Ensure app.requestSingleInstanceLock; second instance focuses first
- Edge cases
  - Session crossing midnight: allowed; visualization will split into day buckets
  - DST transitions: store UTC and zone; convert for views/exports
  - System clock changes: computations in UTC mitigate risk

6. System tray and global shortcuts (P0)

- Tray menu
  - Header: Today: 3h 42m
  - Toggle item: Start Tracking / Stop Tracking
  - Open App
  - Add Manual Entry…
  - Preferences…
  - Quit
- Icon variants for light/dark; macOS template icon
- Global shortcut
  - Default: macOS: Cmd+Ctrl+T; Windows/Linux: Ctrl+Alt+T
  - Toggle start/stop
  - Editable in Settings; validate Accelerator string; if registration fails, warn and keep previous

7. Reminders / suggestions (P1, but included in core requirements)

- On login/app start
  - If remindOnLogin && not tracking, show notification with Start now / Snooze 30m / Disable
- Periodic
  - If periodicReminderEnabled and not tracking, show notification every periodicReminderMinutes; support Snooze X minutes (persist snoozeUntil)
- App open/active
  - If appOpenReminderEnabled, watch for configured apps
  - Implementation: use ps-list at 10–15s intervals to detect processes by name; optionally use active-win to react when a watched app becomes foreground
  - When a watched app appears/activates and not tracking, show Start now notification
- Respect Do Not Disturb if enabled (best-effort per OS; if not detectable, setting is advisory)
- All reminders are suppressed while tracking or within snooze window

8. Dashboard (P0)

- Content
  - Live timer block: large Start/Stop button, elapsed time
  - Today summary: total hours, number of sessions, last start/stop times
  - Recent days: list or compact cards for last 7–14 days with daily totals
  - Quick actions: Add manual session, Edit today, Export
- Performance: daily totals computed via a query; memoize in renderer

9. Time log visualization (P0)

- Day view
  - Timeline list of sessions with start–end, duration, and notes
  - Controls to edit: split at time, trim start/end, merge adjacent if contiguous or within N minutes
- Aggregates
  - Period pickers: This week, Last week, This month, Last month (P0)
  - Extended ranges (P1): 2 weeks, 3/6 months, year
  - Show total hours and average per day
- Charts (P1)
  - Simple bar chart of hours/day for the selected period using Chart.js (optional)

10. Time log edits (P0)

- Operations
  - Add manual session: choose date, start, end, note
  - Edit session times and notes
  - Split session at a timestamp
  - Merge adjacent sessions (same day or cross-midnight allowed; this affects day bucketing)
  - Delete session
- Validation
  - No overlaps after any operation
  - Start < End; enforce min duration (>= 1 minute by default)
  - If an edit causes overlap, prompt to auto-trim/merge or cancel
- Persistence
  - All changes wrapped in transactions
  - Append to session_edit_log for auditability
- Undo (optional P1)
  - Single-level undo via last edit log entry

11. Export (P0)

- Formats: CSV, XLSX
- Range: pick presets (this week, last week, this month, last month, custom start/end)
- Reports
  - Daily totals: date, total hours (decimal and HH:MM), session count
  - Raw sessions: start local, end local, duration, note, source
- Options
  - Round durations to nearest N minutes (5/10/15) off by default
  - Include notes toggle
  - File naming: time-tracker*{report}*{YYYYMMDD-HHmm}.csv/xlsx
- Implementation
  - Choose via dialog (renderer invokes main through IPC)
  - Excel using exceljs; CSV via manual join or csv-stringify
  - Confirm success or show error

12. Settings and configuration (P0)

- General
  - Theme: system/light/dark
  - Launch on startup (macOS: login item; Windows: registry; Linux: .desktop autostart)
- Timer
  - Auto-stop on sleep/lock (on by default)
  - Prompt to resume on unlock (on by default)
  - Global shortcut toggle (editable)
- Reminders
  - Remind on login (on by default)
  - Periodic reminders: enabled + minutes (default off)
  - App-open reminders: enabled + watch list (empty by default)
  - Respect DND (on by default)
- Data
  - Export defaults (folder suggestions)
  - Reset data (danger zone; requires confirm phrase)
- Validation persisted via Zod before save

13. Theming (P0)

- Two themes: light/dark; default: follow system
- Implementation
  - CSS variables with a small token set (background, text, primary, accent, border, muted)
  - Persist selection; listen to native theme updates for system

14. IPC contracts (typed)
    Expose via preload an api object with Promise-returning methods. All calls return Result types or throw structured errors.

```ts
export interface StartSessionPayload {
  note?: string;
}
export interface StopSessionPayload {
  reason?: "user" | "sleep" | "lock" | "shutdown";
}
export interface ManualSessionPayload {
  startLocal: string; // ISO in local zone
  endLocal: string; // ISO in local zone
  note?: string;
}

export interface Api {
  // Timer
  startSession: (p?: StartSessionPayload) => Promise<Session>;
  stopSession: (p?: StopSessionPayload) => Promise<Session>;
  getOngoingSession: () => Promise<Session | null>;

  // Sessions
  listSessionsInRange: (startUtc: string, endUtc: string) => Promise<Session[]>;
  addManualSession: (p: ManualSessionPayload) => Promise<Session>;
  editSessionTime: (id: string, nextStartLocal: string, nextEndLocal: string) => Promise<Session>;
  editSessionNote: (id: string, note: string | null) => Promise<Session>;
  splitSession: (id: string, splitLocal: string) => Promise<{ a: Session; b: Session }>;
  mergeSessions: (ids: string[]) => Promise<Session>;
  deleteSession: (id: string) => Promise<void>;

  // Aggregates
  getDailyTotals: (startUtc: string, endUtc: string) => Promise<{ dateLocal: string; totalMs: number; sessionCount: number }[]>;

  // Export
  exportReport: (options: {
    kind: "dailyTotals" | "rawSessions";
    startUtc: string;
    endUtc: string;
    format: "csv" | "xlsx";
    roundMinutes?: number;
    includeNotes?: boolean;
    savePath?: string;
  }) => Promise<{ path: string }>;

  // Settings
  getSettings: () => Promise<Settings>;
  updateSettings: (patch: Partial<Settings>) => Promise<Settings>;

  // Utility
  openSettings: () => Promise<void>;
  openLogs: () => Promise<void>;
}
```

Channel naming (main listens): app:startSession, app:stopSession, app:listSessions, app:export, app:getSettings, app:updateSettings, etc. Use one request/response channel per method, or one generic invoke with method names. Prefer ipcRenderer.invoke for request/response and contextIsolation for safety.

15. Main process services

- DBService (better-sqlite3)
  - Methods for CRUD and transactional operations
  - Migrations runner idempotent
- TimerService
  - Holds in-memory “ongoing session id” mirror; always authoritative from DB
  - Subscribes to powerMonitor events: suspend, resume, lock-screen, unlock-screen, shutdown
  - Stop on suspend/lock/shutdown; on resume/unlock optionally prompt to resume
- TrayService
  - Creates tray, updates label with today total and state
  - Handles menu actions; calls TimerService
- ShortcutService
  - Registers/unregisters globalShortcut; handles conflicts
- ReminderService (P1)
  - Periodic interval scheduler
  - App watch via ps-list and active-win (if available). Throttle checks to avoid CPU spikes
  - Snooze state persisted in settings or a small reminders table
- ExportService
  - Reads sessions, aggregates, generates CSV/XLSX, writes file
- SettingsService
  - Loads, validates, persists; sets OS autostart settings on change (macOS: app.setLoginItemSettings; Windows: setAppUserModelId and login settings; Linux: auto-launch package)
- Logging
  - Write to a log file in userData/logs; capture errors for support

16. UI views and flows

- Navigation
  - Left sidebar or top tabs: Dashboard, Logs, Export, Settings
- Dashboard
  - Big primary button: Start/Stop
  - Live timer: HH:MM:SS
  - Today card: total, sessions count
  - Recent days: list with totals; clicking a day opens Logs on that date
- Logs
  - Date picker with quick ranges
  - Day list of sessions; inline edit buttons
  - Buttons: Add Session, Split, Merge, Delete
  - Conflict handling dialog if overlaps
- Export
  - Range picker + format + options
  - Generate and Save
- Settings
  - General: theme, autostart
  - Timer: auto stop behaviors, resume prompt, shortcut recorder
  - Reminders: toggles, intervals, app watch list (add by process name)
  - Data: reset, open data folder

17. Reliability and integrity

- Single instance: app.requestSingleInstanceLock
- Frequent persistence: session start writes immediately; stop writes immediately; no long-running memory-only state
- On unexpected exit with end=null:
  - On next launch, show a reconciliation dialog: end at last known event or at relaunch time
- Transactions: wrap edits/merges/splits to ensure no overlaps at commit time; re-check constraints after any calculation
- Overlap prevention algorithm
  - When adding/editing, fetch overlapping sessions within [start, end]
  - If overlaps found:
    - Option A: reject and prompt
    - Option B (when merging): auto-trim or merge into a single continuous block after user confirmation

18. Day and aggregate calculations

- Day bucketing
  - Convert session intervals to user’s current local time zone for display
  - When splitting across midnight, attribute milliseconds to each local day
- Daily totals query approach
  - Fetch sessions intersecting [start, end]
  - For each, split by day boundaries in code, sum durations per day
  - Cache results in renderer while filtering
- Weekly/monthly ranges derived from local calendar rules (Mon/Sun start configurable later)

19. Notifications

- Use new Notification in main (or renderer with main gating)
- On Windows, ensure appUserModelId is set for actionable notifications
- Actions: Start now, Snooze, Open App
- Respect “respectDoNotDisturb” where detectable; otherwise skip if user enables this option

20. Third-party dependencies

- better-sqlite3 (DB)
- uuid (ids)
- luxon (dates/time zones)
- zod (settings validation)
- exceljs (xlsx export)
- ps-list (process detection for reminders)
- active-win (optional, foreground app detection; falls back to ps-list only)
- zustand (state) or redux-toolkit
- chart.js (optional P1)
- electron-builder (packaging)
- auto-launch (Linux) if needed

21. Packaging and distribution

- electron-builder targets
  - mac: dmg + zip, hardened runtime, notarization (if signing is desired)
  - win: nsis
  - linux: AppImage/deb
- AppId/ProductName: com.example.timetracker / Time Tracker
- No auto-updater in P0 (can add later)

22. Security hardening

- contextIsolation: true, sandbox: true for renderer
- disable remote module
- Content-Security-Policy: file and self only
- Preload exposes a narrow, typed API surface
- Validate all inputs (edits, manual sessions, settings) with Zod

23. Performance

- DB operations are short-lived and synchronous (better-sqlite3)
- ps-list polling at 10–15s; skip if watch list empty
- Avoid heavy re-renders; memoize aggregates; virtualize long day lists if needed
- Timer UI tick at 1s; do not write to DB every second

24. Defaults

- Theme: system
- Launch on startup: off
- Auto-stop on sleep/lock: on
- Prompt resume on unlock: on
- Remind on login: on
- Periodic reminders: off (60 min default when enabled)
- App-open reminders: off
- Global shortcut: platform default (Cmd+Ctrl+T mac, Ctrl+Alt+T others)

25. Acceptance criteria (high-level)

- Start/Stop always works from main window, tray, and global shortcut
- System sleep/lock stops an active session within 1s and persists it
- No overlapping sessions can exist after any operation
- Today’s total updates within 1s of change
- Export produces correct totals for boundary conditions (midnight crossing, DST)
- Settings persist across restarts; global shortcut remains registered if valid
- Reminders behave per configuration and never fire while tracking

26. Development plan (phases)

- Phase 1 (P0 core)
  - App shell, single instance, DB layer and migrations
  - TimerService with start/stop, powerMonitor handlers
  - Tray and global shortcut toggle
  - Dashboard with live timer and today + recent days
  - Logs view with CRUD edits and overlap validation
  - Export CSV/XLSX for daily totals and raw sessions
  - Settings (theme, autostart, auto-stop, shortcut)
  - Theming (light/dark)
- Phase 2 (P1)
  - Reminders: login, periodic, app-open (ps-list + optional active-win)
  - Extended aggregation ranges and simple charts
  - Prompt to resume after unlock
- Phase 3 (P2)
  - Cloud login + sync foundations (abstract DB repo)
  - Advanced analytics/LLM

27. File and folder structure (suggested)

- root/
  - package.json
  - electron/
    - main.ts
    - preload.ts
    - services/
      - db.ts
      - timer.ts
      - tray.ts
      - shortcuts.ts
      - reminders.ts
      - settings.ts
      - export.ts
      - logging.ts
    - ipc/
      - api.ts
      - channels.ts
  - src/ (renderer)
    - index.tsx
    - app/
      - store/
      - routes/
      - components/
      - views/
        - Dashboard/
        - Logs/
        - Export/
        - Settings/
    - theme/
      - tokens.css
      - global.css
    - utils/
      - time.ts
      - ipcClient.ts
  - common/
    - types.ts
    - validation.ts
  - build/
  - assets/
    - tray/
      - iconTemplate.png
      - iconLight.png
      - iconDark.png

28. Key algorithms (sketch)

- Overlap detection on edit/add

```ts
function hasOverlap(sessions: { start: Date; end: Date; id: string }[], candidate: { start: Date; end: Date; id?: string }): boolean {
  return sessions.some((s) => {
    if (candidate.id && s.id === candidate.id) return false;
    return candidate.start < s.end && candidate.end > s.start;
  });
}
```

- Split sessions across day boundaries for totals

```ts
function splitByLocalDays(startUtc: string, endUtc: string, zone: string): { dateLocal: string; ms: number }[] {
  // Convert to Luxon DateTimes in the desired zone and walk midnight boundaries
  // Return an array with yyyy-MM-dd keys and milliseconds per day
  return [];
}
```

29. Testing strategy

- Unit tests: timer start/stop, overlap logic, day-splitting and DST boundaries
- Integration: DB migrations, edit operations transactional behavior
- E2E: Playwright for Electron to validate tray start/stop, global shortcut, reminders (where feasible)
- Manual scenarios: sleep/lock on each OS, exported totals verification

30. Risks and mitigations

- Process detection variance on Linux/macOS/Windows
  - Mitigate with ps-list polling and feature toggle; optional active-win
- Notifications behavior differences
  - Provide in-app banners if notifications are blocked
- DST and time zone correctness
  - Use Luxon and store UTC + zone; test DST edges
- DB write failures
  - Retry with backoff and write a failover JSON record to reconcile

This spec should enable an Electron developer to implement the app end-to-end with predictable behavior across platforms, emphasizing reliability, minimal UI, and accurate daily totals.
