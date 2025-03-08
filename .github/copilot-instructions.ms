We use Tailwind class names instead of CSS files.
We use MUI React UI components for consistent look and feel.
Application should be usable on both desktop as well as mobile so we use responsive design.

The folder structure is the following:
- `src/app` contains the pages and layouts
- `src/components` contains the UI components like Editor, MenuBar, Toolbar, ResourcePalette, PropertiesPanel, custom diagram Nodes etc.
- `src/config` contains generic website configuration files
- `src/hooks` contains custom React hooks, like useAutoSave, useMindMap, useKeyboardShortcuts, useUserSettings, etc.
- `src/lib` contains generic libraries, like Storage for handling Blob storage operations
- `src/model` contains data models
- `src/pages/api` contains the backend REST API implementations for auth, diagrams, user-settings
- `src/public` contains public files
- `src/services` contains services like DiagramService, Logger, SettingsService etc.
- `src/utils` contains generic utilities like NodeUtils and AuthUtils.