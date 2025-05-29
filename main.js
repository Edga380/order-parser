const { app, BrowserWindow, ipcMain, screen, Menu } = require("electron");
const path = require("path");
const { parsePDF } = require("./parseOrderDetails");
const { getItems, addItem, removeItem } = require("./items");

let mainWindow;
let printWindow;

app.on("ready", () => {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    title: "Main Page",
    width: width,
    height: height,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.maximize();

  mainWindow.loadFile("index.html");

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Create a custom menu
  const mainMenuTemplate = [
    {
      label: "File",
      submenu: [{ role: "quit" }],
    },
  ];

  // Build and set the menu
  const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
  mainWindow.setMenu(mainMenu);
});

ipcMain.on("open-print-preview", (event, content) => {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  printWindow = new BrowserWindow({
    title: "Print Preview Page",
    width: width,
    height: height,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  printWindow.maximize();

  printWindow.loadFile("print.html");

  printWindow.webContents.once("did-finish-load", () => {
    printWindow.webContents.send("set-content", content);
  });

  printWindow.on("closed", () => {
    printWindow = null;
  });

  // Create a custom print page menu
  const printMenuTemplate = [
    {
      label: "File",
      submenu: [{ role: "quit" }],
    },
    {
      label: "Print",
      click: () => {
        if (printWindow) {
          printWindow.webContents.executeJavaScript("window.print();");
        }
      },
    },
  ];

  // Build and set the menu
  const printMenu = Menu.buildFromTemplate(printMenuTemplate);
  printWindow.setMenu(printMenu);
});

// Handle IPC calls
ipcMain.handle("parse-pdf", async (_, arrayBuffer, excludeDrinks) => {
  return parsePDF(arrayBuffer, excludeDrinks);
});
ipcMain.handle("get-items", async () => {
  return getItems();
});
ipcMain.handle("add-item", async (_, itemName, key) => {
  return addItem(itemName, key);
});
ipcMain.handle("remove-item", async (_, itemName, key) => {
  return removeItem(itemName, key);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
