const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  parsePDF: (arrayBuffer, excludeDrinks) =>
    ipcRenderer.invoke("parse-pdf", arrayBuffer, excludeDrinks),

  getItems: () => ipcRenderer.invoke("get-items"),

  addItem: (itemName, key) => ipcRenderer.invoke("add-item", itemName, key),

  removeItem: (itemName, key) =>
    ipcRenderer.invoke("remove-item", itemName, key),

  openPrintPreview: ({content, contentSummary}) =>
    ipcRenderer.send("open-print-preview", {content, contentSummary}),

  receiveContent: (callback) =>{
    const listener = (event, {content, contentSummary}) => {
      callback(content, contentSummary)
    }
    ipcRenderer.removeAllListeners("set-content");
    ipcRenderer.on("set-content", listener)}
});
