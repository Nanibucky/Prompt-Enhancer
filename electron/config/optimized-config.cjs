// electron/config/optimized-config.cjs
const { app } = require('electron');
const path = require('path');

const getOptimizedConfig = () => {
  return {
    performance: {
      enableAppCache: true,
      disableHardwareAcceleration: false,
      disableWebSecurity: false,
      transparentWindow: false,
      disableHttpCache: false,
    },
    security: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
    },
    window: {
      defaultWidth: 650,
      defaultHeight: 600,
      backgroundColor: '#ffffff',
      useContentSize: true,
      transparent: false,
      show: false,
      frame: true,
      alwaysOnTop: true,
      skipTaskbar: false,
    },
    webPreferences: {
      preload: path.join(__dirname, '../preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
      webSecurity: true,
      devTools: !app.isPackaged,
    },
  };
};

const configureElectronApp = () => {
  // Disable security warnings in development
  if (!app.isPackaged) {
    process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
  }

  // Enable performance optimizations
  app.commandLine.appendSwitch('disable-renderer-backgrounding');
  app.commandLine.appendSwitch('disable-background-timer-throttling');
  app.commandLine.appendSwitch('disable-http-cache');

  // GPU optimizations
  app.commandLine.appendSwitch('enable-gpu-rasterization');
  app.commandLine.appendSwitch('enable-zero-copy');
  app.commandLine.appendSwitch('ignore-gpu-blacklist');

  // Memory optimizations
  app.commandLine.appendSwitch('js-flags', '--max-old-space-size=8192');

  // Network optimizations
  app.commandLine.appendSwitch('enable-experimental-web-platform-features');
  app.commandLine.appendSwitch('enable-quic');
  app.commandLine.appendSwitch('enable-tcp-fast-open');

  // Security enhancements
  app.commandLine.appendSwitch('disable-site-isolation-trials');
  app.commandLine.appendSwitch('enable-strict-mixed-content-checking');

  // Application performance optimizations
  app.commandLine.appendSwitch('in-process-gpu');
  app.commandLine.appendSwitch('no-sandbox');

  // Disable unnecessary features
  app.commandLine.appendSwitch('disable-breakpad');
  app.commandLine.appendSwitch('disable-print-preview');
  app.commandLine.appendSwitch('disable-metrics');
  app.commandLine.appendSwitch('disable-logging');
};

const optimizeWindowCreation = (config = {}) => {
  const defaultConfig = getOptimizedConfig();

  return {
    width: config.defaultWidth || defaultConfig.window.defaultWidth,
    height: config.defaultHeight || defaultConfig.window.defaultHeight,
    backgroundColor: config.backgroundColor || defaultConfig.window.backgroundColor,
    useContentSize: true,
    transparent: false,
    show: false,
    frame: true,
    alwaysOnTop: config.alwaysOnTop !== undefined ? config.alwaysOnTop : true,
    skipTaskbar: false,
    webPreferences: {
      preload: config.webPreferences?.preload || defaultConfig.webPreferences.preload,
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
      webSecurity: true,
      devTools: !app.isPackaged,
      v8CacheOptions: 'code',
      enableBlinkFeatures: 'OverlayScrollbars',
      disableDialogs: true,
      ...config.webPreferences
    },
    ...config,
  };
};

const setupWindowOptimizations = (window) => {
  // Optimize rendering performance
  window.webContents.setFrameRate(60);
  window.webContents.setBackgroundThrottling(false);

  // Disable visual effects
  window.webContents.setVisualZoomLevelLimits(1, 1);
  window.webContents.setUserAgent(window.webContents.getUserAgent().replace('Electron', ''));

  // Optimize focus behavior
  window.setAlwaysOnTop(true, 'screen-saver');
  window.setVisibleOnAllWorkspaces(true);

  // Optimize paint events
  window.webContents.on('paint', (event, dirty, image) => {
    // Paint optimization could be added here if needed
  });

  // Memory management
  window.webContents.on('render-process-gone', (event, details) => {
    console.error('Renderer process crashed', details);
    window.reload();
  });

  window.webContents.on('unresponsive', () => {
    console.error('Renderer process unresponsive');
    window.reload();
  });

  window.webContents.on('did-finish-load', () => {
    if (window.webContents.navigationHistory) {
      window.webContents.navigationHistory.clear();
    }
  });

  // Optimize garbage collection
  window.webContents.on('destroyed', () => {
    global.gc && global.gc();
  });

  return window;
};

module.exports = {
  getOptimizedConfig,
  configureElectronApp,
  optimizeWindowCreation,
  setupWindowOptimizations
};
