const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');
const fs = require('node:fs');
const { FileStore } = require('metro-cache');
const bufferEntry = require.resolve('buffer/');

const { reportErrorToRemote } = require('./__create/report-error-to-remote');
const {
  handleResolveRequestError,
  VIRTUAL_ROOT,
  VIRTUAL_ROOT_UNRESOLVED,
} = require('./__create/handle-resolve-request-error');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

/* -------------------------------------------------------------------------- */
/*                                   ALIASES                                  */
/* -------------------------------------------------------------------------- */

const WEB_ALIASES = {
  'expo-secure-store': path.resolve(__dirname, './polyfills/web/secureStore.web.ts'),
  'react-native-webview': path.resolve(__dirname, './polyfills/web/webview.web.tsx'),
  'react-native-safe-area-context': path.resolve(
    __dirname,
    './polyfills/web/safeAreaContext.web.jsx'
  ),
  'react-native-web/dist/exports/SafeAreaView': path.resolve(
    __dirname,
    './polyfills/web/SafeAreaView.web.jsx'
  ),
  'react-native-web/dist/exports/Alert': path.resolve(
    __dirname,
    './polyfills/web/alerts.web.tsx'
  ),
  'react-native-web/dist/exports/RefreshControl': path.resolve(
    __dirname,
    './polyfills/web/refreshControl.web.tsx'
  ),
  'expo-status-bar': path.resolve(__dirname, './polyfills/web/statusBar.web.jsx'),
  'expo-location': path.resolve(__dirname, './polyfills/web/location.web.ts'),
  './layouts/Tabs': path.resolve(__dirname, './polyfills/web/tabbar.web.jsx'),
  'expo-notifications': path.resolve(__dirname, './polyfills/web/notifications.web.tsx'),
  'expo-contacts': path.resolve(__dirname, './polyfills/web/contacts.web.ts'),
  'react-native-web/dist/exports/ScrollView': path.resolve(
    __dirname,
    './polyfills/web/scrollview.web.jsx'
  ),
  'expo-sharing': path.resolve(__dirname, './polyfills/web/sharing.web.ts'),
  'expo-print': path.resolve(__dirname, './polyfills/web/print.web.ts'),
  '@react-native-community/datetimepicker': path.resolve(
    __dirname,
    './polyfills/web/datetimepicker.web.jsx'
  ),
};

const SHARED_ALIASES = {
  'expo-image': path.resolve(__dirname, './polyfills/shared/expo-image.tsx'),
  buffer: bufferEntry,
  'buffer/': bufferEntry,
};

const NATIVE_ALIASES = {
  './Libraries/Components/SafeAreaView/SafeAreaView': path.resolve(
    __dirname,
    './polyfills/native/SafeAreaView.native.jsx'
  ),
};

/* -------------------------------------------------------------------------- */
/*                              WATCH FOLDERS                                 */
/* -------------------------------------------------------------------------- */

fs.mkdirSync(VIRTUAL_ROOT_UNRESOLVED, { recursive: true });

config.watchFolders = [
  ...config.watchFolders,
  VIRTUAL_ROOT,
  VIRTUAL_ROOT_UNRESOLVED,
];

/* -------------------------------------------------------------------------- */
/*                              MODULE RESOLUTION                              */
/* -------------------------------------------------------------------------- */

config.resolver.resolveRequest = (context, moduleName, platform) => {
  try {
    // Normalize deprecated subpath imports used by some dependencies.
    // This avoids package "exports" warnings such as:
    // "event-target-shim/index" not exported under "./index".
    if (moduleName === 'event-target-shim/index') {
      moduleName = 'event-target-shim';
    }

    // Shared aliases must run before the polyfill-origin bypass below.
    // Otherwise imports inside polyfill files (for example "buffer")
    // can be resolved as Node core modules instead of npm packages.
    if (SHARED_ALIASES[moduleName]) {
      return context.resolveRequest(
        context,
        SHARED_ALIASES[moduleName],
        platform
      );
    }

    // Allow Metro to resolve polyfill internals normally
    if (
      context.originModulePath.startsWith(`${__dirname}/polyfills/native`) ||
      context.originModulePath.startsWith(`${__dirname}/polyfills/web`) ||
      context.originModulePath.startsWith(`${__dirname}/polyfills/shared`)
    ) {
      return context.resolveRequest(context, moduleName, platform);
    }

    // Expo Google Fonts wildcard
    if (
      moduleName.startsWith('@expo-google-fonts/') &&
      moduleName !== '@expo-google-fonts/dev'
    ) {
      return context.resolveRequest(
        context,
        '@expo-google-fonts/dev',
        platform
      );
    }

    // Web-only aliases
    if (platform === 'web' && WEB_ALIASES[moduleName]) {
      return context.resolveRequest(
        context,
        WEB_ALIASES[moduleName],
        platform
      );
    }

    // Native-only aliases
    if (platform !== 'web' && NATIVE_ALIASES[moduleName]) {
      return context.resolveRequest(
        context,
        NATIVE_ALIASES[moduleName],
        platform
      );
    }

    return context.resolveRequest(context, moduleName, platform);
  } catch (error) {
    return handleResolveRequestError({
      error,
      context,
      platform,
      moduleName,
    });
  }
};

/* -------------------------------------------------------------------------- */
/*                                   CACHING                                  */
/* -------------------------------------------------------------------------- */

const cacheDir = path.join(__dirname, 'caches');
fs.mkdirSync(cacheDir, { recursive: true });

config.cacheStores = () => [
  new FileStore({
    root: path.join(cacheDir, '.metro-cache'),
  }),
];

// ✅ DO NOT set fileMapCacheDirectory (removed from Metro)
// config.fileMapCacheDirectory ❌ REMOVED

config.resetCache = false;

/* -------------------------------------------------------------------------- */
/*                                  REPORTER                                  */
/* -------------------------------------------------------------------------- */

const originalReporterUpdate = config.reporter?.update?.bind(config.reporter);
config.reporter = {
  ...config.reporter,
  update(event) {
    originalReporterUpdate?.(event);

    const reportableErrors = new Set([
      'error',
      'bundling_error',
      'cache_read_error',
      'hmr_client_error',
      'transformer_load_failed',
    ]);

    const hasReportingEnv =
      process.env.EXPO_PUBLIC_LOGS_ENDPOINT &&
      process.env.EXPO_PUBLIC_PROJECT_GROUP_ID &&
      process.env.EXPO_PUBLIC_CREATE_TEMP_API_KEY;

    if (hasReportingEnv && reportableErrors.has(event.type)) {
      reportErrorToRemote({ error: event.error }).catch(() => {
        // ignore reporting failures
      });
    }

    return event;
  },
};

module.exports = config;
