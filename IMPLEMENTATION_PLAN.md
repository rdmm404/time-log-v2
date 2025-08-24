# Time Tracker Desktop App - Implementation Plan

This document tracks the implementation progress of the Time Tracker Desktop App based on the detailed specifications in PROJECT.md.

## Project Overview

**Goal**: Build a minimal, reliable, local-only desktop time tracker with ultra-fast start/stop flow, accurate daily totals, and simple exports.

**Tech Stack**: Electron + TypeScript + React + SQLite + Luxon

**Target Platforms**: Windows 10+, macOS 12+, Linux (Ubuntu LTS)

## Development Phases

### Phase 1: Foundation & Core Infrastructure (P0)
*Essential foundation for the entire application*

- [ ] **Task 1**: Set up project structure and initialize Electron app with TypeScript
  - Initialize npm project with proper folder structure
  - Configure TypeScript for both main and renderer processes
  - Set up basic Electron main/renderer architecture
  - Dependencies: None

- [ ] **Task 2**: Configure build tools (electron-builder, webpack/vite) and package.json
  - Set up bundling for renderer process
  - Configure electron-builder for development and production builds
  - Add npm scripts for dev, build, and package
  - Dependencies: Task 1

- [ ] **Task 3**: Install and configure core dependencies (better-sqlite3, luxon, uuid, zod)
  - Install all required dependencies from PROJECT.md spec
  - Configure native module compilation for better-sqlite3
  - Set up TypeScript types for all dependencies
  - Dependencies: Task 2

- [ ] **Task 4**: Create shared TypeScript types in common/ directory
  - Implement Session, Settings, SessionEditLog interfaces
  - Create API contract types for IPC communication
  - Set up validation schemas with Zod
  - Dependencies: Task 3

- [ ] **Task 5**: Implement database service with SQLite schema and migrations
  - Create SQLite database with WAL mode configuration
  - Implement migration system for schema versioning
  - Add CRUD operations for sessions, settings, edit logs
  - Dependencies: Task 4

- [ ] **Task 6**: Create TimerService for core start/stop functionality
  - Implement timer state machine (Idle ↔ Tracking)
  - Add session start/stop with immediate persistence
  - Ensure single running session enforcement
  - Dependencies: Task 5

- [ ] **Task 7**: Implement power monitor integration for auto-stop on sleep/lock
  - Listen to powerMonitor events (suspend, lock-screen, shutdown)
  - Auto-stop active sessions with appropriate stop reasons
  - Handle crash recovery for incomplete sessions
  - Dependencies: Task 6

- [ ] **Task 8**: Set up IPC communication layer with typed API contracts
  - Create preload script with contextBridge API exposure
  - Implement all IPC channels from the API specification
  - Add error handling and type safety for IPC calls
  - Dependencies: Task 4

### Phase 2: UI Framework & Basic Views (P0)
*Core user interface and system integration*

- [ ] **Task 9**: Create React app structure with routing and state management
  - Set up React with TypeScript in renderer process
  - Configure routing between Dashboard, Logs, Export, Settings
  - Implement state management (Zustand or Redux)
  - Dependencies: Task 8

- [ ] **Task 10**: Implement system tray service with menu and icons
  - Create tray icons for light/dark themes
  - Build tray menu with timer controls and today's total
  - Handle tray click events and menu actions
  - Dependencies: Task 6

- [ ] **Task 11**: Add global shortcut service for timer toggle
  - Implement configurable global shortcuts
  - Add shortcut registration/unregistration logic
  - Handle shortcut conflicts and validation
  - Dependencies: Task 10

- [ ] **Task 12**: Build Dashboard view with live timer and recent days
  - Create main timer interface with start/stop button
  - Display live elapsed time with 1-second updates
  - Show today's summary and recent days overview
  - Dependencies: Task 9

### Phase 3: Core Functionality (P0)
*Essential time tracking features*

- [ ] **Task 13**: Create session CRUD operations with overlap validation
  - Implement overlap detection algorithm
  - Add validation for session start/end times
  - Create atomic transaction handling for edits
  - Dependencies: Task 5

- [ ] **Task 14**: Implement Logs view for session management and editing
  - Create session list with inline editing capabilities
  - Add date picker with quick range selection
  - Display daily totals and session counts
  - Dependencies: Task 12, Task 13

- [ ] **Task 15**: Add manual session creation and editing functionality
  - Build forms for adding/editing sessions
  - Implement time pickers and validation
  - Add note editing capabilities
  - Dependencies: Task 14

- [ ] **Task 16**: Implement session split, merge, and delete operations
  - Create split session at timestamp functionality
  - Add merge for adjacent/overlapping sessions
  - Implement delete with confirmation
  - Dependencies: Task 15

- [ ] **Task 17**: Create export service for CSV and Excel generation
  - Implement CSV export with csv-stringify
  - Add Excel export using exceljs library
  - Support daily totals and raw session reports
  - Dependencies: Task 13

- [ ] **Task 18**: Build Export view with date range and format selection
  - Create export configuration interface
  - Add date range pickers and format options
  - Implement file save dialogs and progress feedback
  - Dependencies: Task 17

### Phase 4: Settings & Theming (P0)
*Application configuration and visual themes*

- [ ] **Task 19**: Implement settings service with OS integration (autostart)
  - Create settings persistence and validation
  - Add OS-specific autostart configuration
  - Implement settings migration system
  - Dependencies: Task 5

- [ ] **Task 20**: Create Settings view with all configuration options
  - Build settings UI for all categories (General, Timer, Reminders, Data)
  - Add form validation and real-time preview
  - Implement settings import/export functionality
  - Dependencies: Task 19

- [ ] **Task 21**: Implement light/dark theme system with CSS variables
  - Create CSS variable-based theming system
  - Add system theme detection and switching
  - Implement theme persistence in settings
  - Dependencies: Task 20

- [ ] **Task 22**: Add crash recovery for incomplete sessions
  - Implement session reconciliation on app restart
  - Create recovery dialog for user decision
  - Add heartbeat tracking for better recovery
  - Dependencies: Task 7

- [ ] **Task 23**: Implement single instance enforcement
  - Use app.requestSingleInstanceLock()
  - Handle second instance focus behavior
  - Ensure proper cleanup on app exit
  - Dependencies: Task 6

- [ ] **Task 24**: Add daily totals calculation with timezone handling
  - Implement day boundary splitting algorithm
  - Handle DST transitions correctly
  - Create efficient aggregation queries
  - Dependencies: Task 13

### Phase 5: Advanced Features (P1)
*Enhancement features for improved user experience*

- [ ] **Task 25**: Create reminder service for login/periodic/app-open notifications
  - Implement login reminder system
  - Add periodic reminder scheduling with snooze
  - Create notification service with cross-platform support
  - Dependencies: Task 19

- [ ] **Task 26**: Implement process monitoring for app-based reminders
  - Add ps-list integration for process detection
  - Implement active-win for foreground app detection
  - Create efficient polling system with configurable intervals
  - Dependencies: Task 25

- [ ] **Task 27**: Add resume prompt functionality after unlock
  - Detect system unlock events
  - Show resume session notification
  - Implement resume decision persistence
  - Dependencies: Task 22

- [ ] **Task 28**: Implement session edit logging for auditability
  - Create comprehensive edit history tracking
  - Add session_edit_log table operations
  - Implement optional undo functionality
  - Dependencies: Task 16

- [ ] **Task 29**: Add extended date range aggregations (2 weeks, 3/6 months, year)
  - Extend period selection options
  - Implement efficient aggregation for large date ranges
  - Add performance optimization for year-long queries
  - Dependencies: Task 24

- [ ] **Task 30**: Integrate Chart.js for basic visualization
  - Add bar/line charts for daily/weekly totals
  - Implement responsive chart sizing
  - Create chart export functionality
  - Dependencies: Task 29

### Phase 6: Polish & Distribution (P0-P1)
*Production readiness and deployment*

- [ ] **Task 31**: Configure electron-builder for cross-platform packaging
  - Set up build configurations for Windows/macOS/Linux
  - Configure code signing and notarization (if applicable)
  - Add auto-updater infrastructure preparation
  - Dependencies: Task 2

- [ ] **Task 32**: Implement security hardening (CSP, context isolation, input validation)
  - Enable context isolation and disable remote module
  - Add Content Security Policy headers
  - Implement comprehensive input validation with Zod
  - Dependencies: Task 8

- [ ] **Task 33**: Add comprehensive error handling and logging
  - Implement structured logging to userData/logs
  - Add error boundary components in React
  - Create crash reporting and error recovery
  - Dependencies: Task 32

- [ ] **Task 34**: Create unit tests for core timer and overlap logic
  - Test timer state machine transitions
  - Validate overlap detection algorithms
  - Test timezone and DST handling
  - Dependencies: Task 33

- [ ] **Task 35**: Add integration tests for database operations
  - Test migration system and schema changes
  - Validate transaction handling and rollbacks
  - Test concurrent access patterns
  - Dependencies: Task 34

- [ ] **Task 36**: Implement E2E tests with Playwright for key user flows
  - Test complete start/stop timer workflows
  - Validate tray and global shortcut functionality
  - Test export and settings operations
  - Dependencies: Task 35

- [ ] **Task 37**: Performance optimization and memory usage validation
  - Profile and optimize database queries
  - Reduce memory footprint and prevent leaks
  - Optimize renderer performance and bundle size
  - Dependencies: Task 36

- [ ] **Task 38**: Final testing on all target platforms (Windows, macOS, Linux)
  - Comprehensive cross-platform testing
  - Validate platform-specific features (autostart, notifications)
  - Test packaging and installation processes
  - Dependencies: Task 37

## Priority Levels

- **P0 (Must-have)**: Tasks 1-24, 31-33 - Core functionality for first release
- **P1 (Should-have)**: Tasks 25-30, 34-38 - Polish and advanced features
- **P2 (Nice-to-have)**: Future enhancements not included in this plan

## Key Milestones

1. **MVP Ready** (End of Phase 3): Basic timer with start/stop, session management, and export
2. **Feature Complete** (End of Phase 4): All P0 features implemented with theming and settings
3. **Enhanced Version** (End of Phase 5): P1 features including reminders and visualization
4. **Production Ready** (End of Phase 6): Fully tested, secured, and packaged application

## Acceptance Criteria

- [ ] Start/Stop always works from main window, tray, and global shortcut
- [ ] System sleep/lock stops active session within 1s and persists it
- [ ] No overlapping sessions can exist after any operation
- [ ] Today's total updates within 1s of change
- [ ] Export produces correct totals for boundary conditions (midnight crossing, DST)
- [ ] Settings persist across restarts; global shortcut remains registered if valid
- [ ] Reminders behave per configuration and never fire while tracking

## Progress Tracking

**Overall Progress**: 0/38 tasks completed (0%)

**Phase 1**: 0/8 tasks completed (0%)
**Phase 2**: 0/4 tasks completed (0%)
**Phase 3**: 0/6 tasks completed (0%)
**Phase 4**: 0/6 tasks completed (0%)
**Phase 5**: 0/6 tasks completed (0%)
**Phase 6**: 0/8 tasks completed (0%)

---

*Last Updated: 2025-08-16*
*Next Task: Begin with Task 1 - Set up project structure and initialize Electron app with TypeScript*