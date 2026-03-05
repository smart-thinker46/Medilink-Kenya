import '@expo/metro-runtime';
import './__create/consoleToParent';
import { renderRootComponent } from 'expo-router/build/renderRootComponent';

import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import './__create/reset.css';
import CreateApp from './App';

const SKIA_BOOT_TIMEOUT_MS = 6000;

const bootstrap = async () => {
  try {
    await Promise.race([
      LoadSkiaWeb(),
      new Promise((resolve) => setTimeout(resolve, SKIA_BOOT_TIMEOUT_MS)),
    ]);
  } catch (error) {
    // Never block first paint on optional Skia web boot.
    console.error('Skia web initialization failed. Continuing app bootstrap.', error);
  } finally {
    renderRootComponent(CreateApp);
  }
};

bootstrap();
