const { app: electronApp, BrowserWindow, dialog, ipcMain, clipboard, nativeImage, shell } = require('electron')
const fs = require('node:fs')
const path = require('node:path')
const net = require('node:net')
const crypto = require('node:crypto')
const { pathToFileURL } = require('node:url')

const hasSingleInstanceLock = electronApp.requestSingleInstanceLock()
if (!hasSingleInstanceLock) electronApp.quit()

// This app has no need for GPU-accelerated graphics/video. On low-RAM machines
// (especially ones without a real GPU, which fall back to the heavy SwiftShader
// software renderer) this avoids spinning up a separate GPU process and its
// memory/CPU overhead, noticeably improving responsiveness.
electronApp.disableHardwareAcceleration()

const DEFAULT_PORT = Number(process.env.PORT || 3001)

function findAvailablePort(startPort) {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once('error', () => {
      server.close()
      findAvailablePort(startPort + 1).then(resolve, reject)
    })
    server.listen(startPort, '127.0.0.1', () => {
      const { port } = server.address()
      server.close(() => resolve(port))
    })
  })
}

async function waitForApi(port) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (process.env.API_STARTUP_ERROR) {
      throw new Error(`The Doctor Prescription API could not start: ${process.env.API_STARTUP_ERROR}`)
    }
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`)
      if (response.ok) return
    } catch {
      // The server may need a moment to start.
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  if (process.env.API_STARTUP_ERROR) {
    throw new Error(`The Doctor Prescription API could not start: ${process.env.API_STARTUP_ERROR}`)
  }
  throw new Error('The Doctor Prescription API did not start.')
}

async function createWindow() {
  // Keep the renderer origin stable so its persisted localStorage session survives updates.
  const port = DEFAULT_PORT
  const appPath = electronApp.getAppPath()
  const executableDir = process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(process.execPath)
  const userDataDir = electronApp.getPath('userData')
  const userDataEnvPath = path.join(userDataDir, '.env')
  const envCandidates = electronApp.isPackaged
    ? [
        path.join(executableDir, '.env'),
        path.resolve(executableDir, '..', '.env'),
        userDataEnvPath,
        path.join(appPath, '.env')
      ]
    : [path.join(appPath, '.env')]
  const foundEnvPath = envCandidates.find((candidate) => fs.existsSync(candidate))
  const envPath = foundEnvPath || userDataEnvPath

  // Preserve an existing clinic configuration outside the versioned install directory.
  if (electronApp.isPackaged && foundEnvPath && foundEnvPath !== userDataEnvPath) {
    fs.mkdirSync(userDataDir, { recursive: true })
    fs.copyFileSync(foundEnvPath, userDataEnvPath)
  }

  const dotenv = require(path.join(appPath, 'server', 'node_modules', 'dotenv'))
  const envResult = dotenv.config({ path: envPath, override: true })
  if (envResult.error) {
    const txtEnvPath = path.join(executableDir, '.env.txt')
    if (fs.existsSync(txtEnvPath)) {
      throw new Error(`Found ${txtEnvPath}. Rename it to .env, then restart the application.`)
    }
    throw new Error(`Configuration file not found. Create a file named .env beside Doctor Prescription App.exe: ${path.join(executableDir, '.env')}`)
  }
  const configuredSecret = process.env.JWT_SECRET?.trim()
  if (!configuredSecret || configuredSecret.length < 32 || configuredSecret.includes('change_me') || configuredSecret.includes('PASTE_')) {
    const secretPath = path.join(userDataDir, '.jwt-secret')
    fs.mkdirSync(userDataDir, { recursive: true })
    if (fs.existsSync(secretPath)) {
      const storedSecret = fs.readFileSync(secretPath, 'utf8').trim()
      if (storedSecret.length >= 32 && !storedSecret.includes('change_me') && !storedSecret.includes('PASTE_')) {
        process.env.JWT_SECRET = storedSecret
      }
    }
    if (!process.env.JWT_SECRET) {
      process.env.JWT_SECRET = crypto.randomBytes(48).toString('base64url')
      fs.writeFileSync(secretPath, process.env.JWT_SECRET, { encoding: 'utf8', mode: 0o600 })
    }
  } else {
    process.env.JWT_SECRET = configuredSecret
  }

  process.env.DOTENV_CONFIG_PATH = envPath
  process.env.PORT = String(port)
  process.env.STATIC_DIR = path.join(appPath, 'dist')

  await import(pathToFileURL(path.join(appPath, 'server', 'index.js')).href)
  await waitForApi(port)

  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(appPath, 'electron', 'preload.cjs')
    }
  })

  window.once('ready-to-show', () => window.show())
  await window.loadURL(`http://127.0.0.1:${port}`)
}

ipcMain.handle('print-page', async (event) => {
  const printWindow = BrowserWindow.fromWebContents(event.sender)
  if (!printWindow || printWindow.isDestroyed()) {
    return { success: false, error: 'Print window is unavailable.' }
  }

  try {
    const pdf = await printWindow.webContents.printToPDF({
      printBackground: true,
      preferCSSPageSize: true,
      pageSize: 'A4'
    })
    const pdfPath = path.join(electronApp.getPath('temp'), `doctor-prescription-${Date.now()}.pdf`)
    fs.writeFileSync(pdfPath, pdf)

    const previewWindow = new BrowserWindow({
      width: 1100,
      height: 850,
      minWidth: 700,
      minHeight: 500,
      title: 'Print Preview - Doctor Prescription App',
      parent: printWindow,
      autoHideMenuBar: true,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false
      }
    })

    previewWindow.once('closed', () => {
      fs.rm(pdfPath, { force: true }, () => {})
    })
    await previewWindow.loadURL(pathToFileURL(pdfPath).href)
    previewWindow.show()
    return { success: true }
  } catch (error) {
    console.error('Print preview failed', error)
    dialog.showErrorBox('Print preview failed', error.message)
    return { success: false, error: error.message }
  }
})

function refocusWindow(window) {
  if (!window || window.isDestroyed()) return
  // shell.openExternal/showItemInFolder hand OS focus to another app. In the packaged
  // build (unlike a plain browser tab) Windows blocks a background process from
  // stealing focus back via window.focus() alone, so force-activate with app.focus.
  const reclaimFocus = () => {
    if (window.isDestroyed()) return
    if (window.isMinimized()) window.restore()
    window.show()
    window.moveTop()
    if (typeof electronApp.focus === 'function') electronApp.focus({ steal: true })
    window.focus()
    window.webContents.focus()
  }
  setTimeout(reclaimFocus, 400)
  // WhatsApp (desktop app or browser) can grab focus again shortly after it opens,
  // so make a second attempt once it has finished launching.
  setTimeout(reclaimFocus, 1500)
}

ipcMain.handle('share-prescription-image', async (event, { number, dataUrl }) => {
  const senderWindow = BrowserWindow.fromWebContents(event.sender)
  try {
    const normalized = String(number || '').replace(/\D/g, '')
    if (!normalized || !dataUrl) return { success: false, error: 'A WhatsApp number and prescription image are required.' }
    const image = nativeImage.createFromDataURL(dataUrl)
    if (typeof clipboard.writeImage === 'function') {
      clipboard.writeImage(image)
    } else if (typeof clipboard.write === 'function') {
      clipboard.write({ image })
    } else {
      return { success: false, error: 'This desktop runtime cannot copy prescription images to the clipboard.' }
    }
    await shell.openExternal(`https://wa.me/${normalized}`)
    return { success: true }
  } catch (error) {
    console.error('Prescription image sharing failed', error)
    return { success: false, error: error.message }
  } finally {
    refocusWindow(senderWindow)
  }
})

ipcMain.handle('share-document-file', async (event, { number, dataUrl, fileName, mimeType, message }) => {
  const senderWindow = BrowserWindow.fromWebContents(event.sender)
  try {
    const normalized = String(number || '').replace(/\D/g, '')
    if (!normalized || !dataUrl) return { success: false, error: 'A WhatsApp number and document are required.' }

    const extension = mimeType === 'application/pdf' ? 'pdf' : 'png'
    const targetFileName = fileName || `document.${extension}`
    const outputDir = path.join(electronApp.getPath('temp'), 'doctor-prescription-shares')
    fs.mkdirSync(outputDir, { recursive: true })
    const outputPath = path.join(outputDir, `share-${Date.now()}-${targetFileName}`)

    const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl
    fs.writeFileSync(outputPath, Buffer.from(base64, 'base64'))

    if (typeof clipboard.writeImage === 'function' && mimeType !== 'application/pdf') {
      clipboard.writeImage(nativeImage.createFromDataURL(dataUrl))
    }

    const shareMessage = message || 'Please find the attached document.'
    const pasteHint = mimeType !== 'application/pdf'
      ? '\n\nImage copied to clipboard. Paste it into the WhatsApp chat to send it.'
      : '\n\nThe PDF file has been saved to your temp folder. Open it and attach it manually in WhatsApp.'

    await shell.openExternal(`https://api.whatsapp.com/send?phone=${normalized}&text=${encodeURIComponent(shareMessage + pasteHint)}`)
      .catch(() => shell.openExternal(`https://wa.me/${normalized}?text=${encodeURIComponent(shareMessage + pasteHint)}`))

    if (typeof shell.showItemInFolder === 'function') {
      shell.showItemInFolder(outputPath)
    }

    return { success: true, outputPath }
  } catch (error) {
    console.error('Document sharing failed', error)
    return { success: false, error: error.message }
  } finally {
    refocusWindow(senderWindow)
  }
})

if (hasSingleInstanceLock) {
  electronApp.whenReady().then(createWindow).catch((error) => {
    console.error(error)
    fs.writeFileSync(path.join(electronApp.getPath('userData'), 'startup-error.log'), error.stack || error.message)
    dialog.showErrorBox('Doctor Prescription App could not start', error.message)
    electronApp.quit()
  })
}

electronApp.on('window-all-closed', () => {
  electronApp.quit()
})
