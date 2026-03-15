import '@expo/metro-runtime';
import './__create/consoleToParent';
import { renderRootComponent } from 'expo-router/build/renderRootComponent';

import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import './__create/reset.css';
import CreateApp from './App';

const SKIA_BOOT_TIMEOUT_MS = 6000;
const SPLASH_STYLE_ID = 'medilink-splash-style';
const SPLASH_ID = 'medilink-splash';

const mountWebSplash = () => {
  if (typeof document === 'undefined') return;
  if (document.getElementById(SPLASH_ID)) return;

  const style = document.createElement('style');
  style.id = SPLASH_STYLE_ID;
  style.textContent = `
    #${SPLASH_ID} {
      position: fixed;
      inset: 0;
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      background: radial-gradient(circle at top, #f8fbff 0%, #f0f6ff 45%, #f8fbff 100%);
      transition: opacity 280ms ease, transform 280ms ease;
    }
    #${SPLASH_ID}.medilink-splash-hide {
      opacity: 0;
      transform: scale(0.98);
      pointer-events: none;
    }
    .medilink-splash-shell {
      padding: 6px;
      border-radius: 28px;
      background: linear-gradient(135deg, #0b7a3d, #ffffff, #c8102e, #000000, #ffffff, #0b7a3d);
      box-shadow: 0 20px 60px rgba(15, 23, 42, 0.18);
    }
    .medilink-splash-card {
      min-width: 320px;
      padding: 36px 40px;
      border-radius: 24px;
      background: #ffffff;
      border: 1px solid rgba(15, 76, 129, 0.12);
      text-align: center;
      font-family: "Nunito Sans", "Inter", sans-serif;
    }
    .medilink-splash-mark {
      width: 72px;
      height: 72px;
      border-radius: 24px;
      background: linear-gradient(135deg, #0f4c81, #1b8f3a);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
      color: #ffffff;
      font-weight: 700;
      font-size: 22px;
      letter-spacing: 0.5px;
    }
    .medilink-splash-title {
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 6px;
    }
    .medilink-splash-subtitle {
      font-size: 13px;
      color: #334155;
      margin-bottom: 16px;
    }
    .medilink-splash-tag {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      border-radius: 999px;
      background: rgba(15, 76, 129, 0.08);
      color: #0f4c81;
      font-size: 12px;
      font-weight: 600;
    }
    @media (prefers-color-scheme: dark) {
      #${SPLASH_ID} {
        background: radial-gradient(circle at top, #0b1220 0%, #0a101b 55%, #0b1220 100%);
      }
      .medilink-splash-shell {
        background: linear-gradient(135deg, #0b7a3d, #ffffff, #c8102e, #000000, #ffffff, #0b7a3d);
        box-shadow: 0 24px 70px rgba(0, 0, 0, 0.45);
      }
      .medilink-splash-card {
        background: #0b1220;
        border: 1px solid rgba(255, 255, 255, 0.08);
      }
      .medilink-splash-title {
        color: #f8fafc;
      }
      .medilink-splash-subtitle {
        color: #cbd5f5;
      }
      .medilink-splash-tag {
        background: rgba(58, 167, 255, 0.12);
        color: #8fd2ff;
      }
    }
  `;
  document.head.appendChild(style);

  const splash = document.createElement('div');
  splash.id = SPLASH_ID;
  splash.innerHTML = `
    <div class="medilink-splash-shell">
      <div class="medilink-splash-card">
        <div class="medilink-splash-mark">M+</div>
        <div class="medilink-splash-title">Medilink Kenya</div>
        <div class="medilink-splash-subtitle">Premium, secure healthcare access</div>
        <div class="medilink-splash-tag">Preparing your experience</div>
      </div>
    </div>
  `;
  document.body.appendChild(splash);
};

const hideWebSplash = () => {
  if (typeof document === 'undefined') return;
  const splash = document.getElementById(SPLASH_ID);
  if (!splash) return;
  splash.classList.add('medilink-splash-hide');
  window.setTimeout(() => {
    splash.remove();
    const style = document.getElementById(SPLASH_STYLE_ID);
    if (style) style.remove();
  }, 320);
};

const bootstrap = async () => {
  mountWebSplash();
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
    window.setTimeout(() => hideWebSplash(), 140);
  }
};

bootstrap();
