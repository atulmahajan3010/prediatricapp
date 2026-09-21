const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  print: () => ipcRenderer.invoke('print-page'),
  sharePrescriptionImage: (payload) => ipcRenderer.invoke('share-prescription-image', payload),
  shareDocumentFile: (payload) => ipcRenderer.invoke('share-document-file', payload)
})
