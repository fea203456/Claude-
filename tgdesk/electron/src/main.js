// TgMod desktop shell: serves the built web client locally and wraps it in a window with a tray icon,
// a global shortcut, an unread badge, a splash screen and the "bypass blocking" route finder.
const {app, BrowserWindow, Tray, Menu, globalShortcut, ipcMain, nativeImage, shell, session} = require('electron');
const path = require('path');
const {startStaticServer} = require('./staticServer');
const unblock = require('./unblock');

const PORT = 47390;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const SHORTCUT = 'CommandOrControl+Alt+M';
const ASSETS = path.join(__dirname, '..', 'assets');
const WEB_ROOT = path.join(__dirname, '..', 'app');

// * a portable build keeps its data next to the .exe instead of in AppData
if(process.env.PORTABLE_EXECUTABLE_DIR) {
  app.setPath('userData', path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'TgMod Data'));
}

const configFile = () => path.join(app.getPath('userData'), 'tgmod-desktop.json');
const readConfig = () => unblock.readJson(configFile(), {unblock: true});
const writeConfig = (config) => unblock.writeJson(configFile(), config);

// * the route found on the previous launch, applied before Chromium starts its network service
const startConfig = readConfig();
if(startConfig.unblock && startConfig.route?.state === 'mapped' && startConfig.route.ip) {
  app.commandLine.appendSwitch('host-resolver-rules', unblock.hostResolverRules(startConfig.route.ip));
}

let mainWindow;
let splashWindow;
let tray;
let quitting = false;
let unreadCount = 0;
let routeStatus = startConfig.unblock ? (startConfig.route ?? {state: 'scanning'}) : {state: 'off'};

if(!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => showMain());
}

function showMain() {
  if(!mainWindow) return;
  if(mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function toggleMain() {
  if(!mainWindow) return;
  if(mainWindow.isVisible() && mainWindow.isFocused()) mainWindow.hide();
  else showMain();
}

function createSplash() {
  splashWindow = new BrowserWindow({
    width: 340,
    height: 380,
    frame: false,
    resizable: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    icon: path.join(ASSETS, 'icon.png'),
    webPreferences: {contextIsolation: true, sandbox: true}
  });
  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  splashWindow.once('ready-to-show', () => splashWindow?.show());
  splashWindow.on('closed', () => splashWindow = undefined);
}

function setSplashText(text) {
  splashWindow?.webContents.executeJavaScript(`window.setStatus && window.setStatus(${JSON.stringify(text)})`).catch(() => {});
}

function createMain() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 380,
    minHeight: 500,
    show: false,
    title: 'TgMod',
    backgroundColor: '#0e0b1f',
    icon: path.join(ASSETS, 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      spellcheck: true
    }
  });

  mainWindow.removeMenu();
  mainWindow.loadURL(ORIGIN + '/');

  mainWindow.once('ready-to-show', () => {
    splashWindow?.close();
    mainWindow.show();
  });

  // * links leave for the browser, the app stays on its own origin
  mainWindow.webContents.setWindowOpenHandler(({url}) => {
    if(/^https?:\/\//.test(url)) shell.openExternal(url);
    return {action: 'deny'};
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if(!url.startsWith(ORIGIN)) {
      event.preventDefault();
      if(/^https?:\/\//.test(url)) shell.openExternal(url);
    }
  });

  // * the client puts the unread count in the title: "(3) Telegram Web"
  mainWindow.on('page-title-updated', (event, title) => {
    event.preventDefault();
    const match = /^\((\d+)\)/.exec(title);
    setUnread(match ? +match[1] : 0);
    mainWindow.setTitle(match ? `(${match[1]}) TgMod` : 'TgMod');
  });

  mainWindow.on('close', (event) => {
    if(!quitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function setUnread(count) {
  if(count === unreadCount) return;
  unreadCount = count;
  if(process.platform === 'win32') {
    const name = count === 0 ? undefined : (count > 9 ? 'badge-9plus.png' : `badge-${count}.png`);
    mainWindow?.setOverlayIcon(name ? nativeImage.createFromPath(path.join(ASSETS, 'badges', name)) : null, name ? `${count}` : '');
  } else {
    app.setBadgeCount(count);
  }
  tray?.setToolTip(count ? `TgMod — ${count}` : 'TgMod');
  tray?.setImage(trayImage());
}

function trayImage() {
  const file = unreadCount ? 'tray-unread.png' : 'tray.png';
  return nativeImage.createFromPath(path.join(ASSETS, file));
}

function createTray() {
  tray = new Tray(trayImage());
  tray.setToolTip('TgMod');
  tray.setContextMenu(Menu.buildFromTemplate([
    {label: 'Открыть TgMod', click: showMain},
    {type: 'separator'},
    {label: 'Выход', click: () => { quitting = true; app.quit(); }}
  ]));
  tray.on('click', toggleMain);
}

async function updateRoute({force} = {}) {
  const config = readConfig();
  if(!config.unblock) {
    routeStatus = {state: 'off'};
    return {status: routeStatus, changed: false};
  }

  routeStatus = {state: 'scanning'};
  const route = await unblock.findRoute({lastIp: force ? undefined : config.route?.ip});
  const appliedIp = startConfig.unblock && startConfig.route?.state === 'mapped' ? startConfig.route.ip : undefined;
  const neededIp = route.state === 'mapped' ? route.ip : undefined;
  writeConfig({...config, route});
  routeStatus = route;
  return {status: route, changed: appliedIp !== neededIp && route.state !== 'failed'};
}

function relaunch() {
  quitting = true;
  app.relaunch();
  app.exit(0);
}

ipcMain.handle('tgmod:getUnblockStatus', () => routeStatus);
ipcMain.handle('tgmod:setUnblockEnabled', (event, enabled) => {
  writeConfig({...readConfig(), unblock: !!enabled});
  routeStatus = enabled ? (readConfig().route ?? {state: 'scanning'}) : {state: 'off'};
});
ipcMain.handle('tgmod:rescanUnblock', async() => (await updateRoute({force: true})).status);
ipcMain.on('tgmod:restart', relaunch);

app.whenReady().then(async() => {
  // * notifications, the microphone and the camera for calls; nothing for other origins
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
    const allowed = ['notifications', 'media', 'clipboard-sanitized-write', 'fullscreen', 'display-capture'];
    callback(details.requestingUrl?.startsWith(ORIGIN) && allowed.includes(permission));
  });

  createSplash();

  try {
    await startStaticServer(WEB_ROOT, PORT);
  } catch(err) {
    // * another copy is already serving: the single instance lock makes this rare
    console.error('tgmod: static server failed', err);
  }

  if(readConfig().unblock) {
    setSplashText('Проверяем подключение…');
    const timeout = new Promise((resolve) => setTimeout(() => resolve({changed: false}), 20000));
    const {changed} = await Promise.race([updateRoute(), timeout]);
    if(changed) {
      setSplashText('Найден рабочий адрес, перезапуск…');
      relaunch();
      return;
    }
  }

  setSplashText('Загрузка…');
  createMain();
  createTray();
  globalShortcut.register(SHORTCUT, toggleMain);
});

app.on('before-quit', () => quitting = true);
app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => {
  if(process.platform !== 'darwin' && quitting) app.quit();
});
