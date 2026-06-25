const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow;
let nextServerProcess = null;
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#030712', // Zinc-950 matching zinc background
    title: 'HumanOS',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  // Load target URL
  mainWindow.loadURL(url);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // DevTools in dev mode
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Helper to poll the local Next.js server port
function pollServer(url, callback) {
  const check = () => {
    http.get(url, (res) => {
      if (res.statusCode === 200 || res.statusCode === 307 || res.statusCode === 302) {
        callback();
      } else {
        setTimeout(check, 250);
      }
    }).on('error', () => {
      setTimeout(check, 250);
    });
  };
  check();
}

app.whenReady().then(() => {
  const targetUrl = 'http://localhost:3000';

  if (isDev) {
    // In dev, assume Next.js dev server is started concurrently
    pollServer(targetUrl, () => {
      createWindow(targetUrl);
    });
  } else {
    // In production, spawn Next.js start command
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    
    nextServerProcess = spawn(npmCmd, ['run', 'start'], {
      cwd: app.getAppPath(),
      env: { ...process.env, NODE_ENV: 'production' },
      shell: true
    });

    nextServerProcess.stdout.on('data', (data) => {
      console.log(`[Next.js stdout]: ${data}`);
    });

    nextServerProcess.stderr.on('data', (data) => {
      console.error(`[Next.js stderr]: ${data}`);
    });

    pollServer(targetUrl, () => {
      createWindow(targetUrl);
    });
  }
});

// Quit when all windows are closed, and terminate Next.js background server
app.on('window-all-closed', () => {
  if (nextServerProcess) {
    // Clean up Next.js spawned process
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', nextServerProcess.pid, '/f', '/t']);
    } else {
      nextServerProcess.kill('SIGINT');
    }
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow('http://localhost:3000');
  }
});
