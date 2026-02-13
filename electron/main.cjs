const { app, BrowserWindow } = require('electron');
const path = require('path');
const { fork } = require('child_process');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow;
let backendProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: false,
    },
  });

  if (isDev) {
    console.log('Running in development mode');
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    console.log('Running in production mode');
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startBackend() {
  if (isDev) {
    console.log('Dev mode: Backend should be running via concurrently');
    return;
  }

  const backendPath = path.join(__dirname, '../mcp-backend/dist/index.js');
  console.log('Starting backend from:', backendPath);

  try {
    backendProcess = fork(backendPath, [], {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });

    backendProcess.on('error', (err) => {
      console.error('Backend error:', err);
    });

    backendProcess.on('exit', (code) => {
      console.log('Backend exited with code:', code);
    });
  } catch (error) {
    console.error('Failed to start backend:', error);
  }
}

app.on('ready', () => {
  startBackend();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  if (backendProcess) {
    console.log('Killing backend process...');
    backendProcess.kill();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
