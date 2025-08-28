## Project Overview

This is a desktop time tracking application built with Electron, TypeScript, and React. The project is based on the secure Vite Electron Builder boilerplate and follows a monorepo architecture using npm workspaces. The application allows users to track work hours locally with no backend required, featuring a system tray widget, global shortcuts, and local SQLite storage.

## Development Cycle
There are two important documents at the root of this project which you MUST read:
- PROJECT.md: Provides a comprehensive description of the project we're building
- IMPLEMENTATION_PLAN.md: Provides a list of tasks that are either completed or pending

## Task Development
- You should implement tasks as single units of work, and implement each task completely, abiding
to the task steps as specified.
- When taking on a new task, check previous commits for already completed tasks to familiarize yourself with the current state of the codebase.
- Once you consider a task is done, you MUST come back to the user for review.
- ONLY when your changes are approved, you should update the task status as done
- Once a task is completed, create a commit containing all your changes with a meaningful message
- The commit message must be in the following format: P<Phase #>T<Task #>: <commit message>
    - For example, if the task number 9 for phase 3 was just completed, the commit message should be something like this: "P5T3: Update renderer to handle modifying time entries"


## Development Commands

```bash
# Initial setup (creates renderer package and integrates it)
npm run init

# Start development mode with hot-reload
npm start

# Build all packages
npm run build

# Run type checking across all workspaces
npm run typecheck

# Run end-to-end tests using Playwright
npm run test

# Compile executable for distribution
npm run compile

# Lint the renderer package
npm run lint --workspace @app/renderer
```

## Architecture Overview

### Monorepo Structure

The project uses npm workspaces with packages organized under `packages/`:

- **`@app/main`** - Electron main process (Node.js environment)
- **`@app/preload`** - Preload scripts for secure renderer-main communication
- **`@app/renderer`** - React frontend application with TailwindCSS
- **`@app/electron-versions`** - Utility for getting Electron component versions
- **`@app/integrate-renderer`** - Build tool for renderer integration

### Security Architecture

- Context isolation enabled between main and renderer processes
- All Node.js APIs accessed through preload scripts only
- Renderer can import from `@app/preload` via exposed context bridge
- No direct Node.js API access in renderer for security

### Communication Pattern

```
renderer (React) → preload (contextBridge) → main (Electron APIs)
```

## Key Technologies

- **Electron 37.3.0** - Desktop app framework
- **TypeScript** - Primary language across all packages
- **React 19.1.1** - UI framework in renderer
- **TailwindCSS 4.1.12** - Styling framework
- **Vite** - Build tool and bundler
- **Playwright** - E2E testing framework

## Development Workflow

### Adding New Features

1. Determine which package the feature belongs to:

   - UI components → `packages/renderer/src`
   - Electron APIs/system integration → `packages/main/src`
   - Data access/Node.js APIs → `packages/preload/src`

2. Follow the existing module patterns in `packages/main/src/modules/` for new Electron functionality

### Database Integration

The app is designed for local SQLite storage. When implementing database features:

- Add database logic to preload scripts
- Expose database methods through context bridge
- Import and use in renderer components

## Important Notes

- Never access Node.js APIs directly in renderer code
- All inter-process communication must go through preload scripts
- The renderer runs in a browser-like environment with security restrictions
- Environment variables must be prefixed with `VITE_` to be accessible in renderer
- Global shortcuts and system tray functionality belong in the main process
