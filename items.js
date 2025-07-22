const fs = require("fs");
const path = require("path");
const { app } = require("electron");

const defaultDataPath = path.join(app.getAppPath(), "data.json");
const userDataPath = path.join(app.getPath("userData"), "data.json");

if(!fs.existsSync(userDataPath)){
  fs.copyFileSync(defaultDataPath, userDataPath);
}

async function getItems() {
  const jsonData = JSON.parse(fs.readFileSync(userDataPath, "utf-8"));
  return jsonData;
}

async function addItem(itemName, key) {
  const jsonData = await getItems();

  if (jsonData[key].items.some((item) => item === itemName)) {
    return false;
  }

  jsonData[key].items.push(itemName);

  jsonData[key].items.sort((a, b) => a.localeCompare(b));

  fs.writeFileSync(userDataPath, JSON.stringify(jsonData, null, 2));

  return true;
}

async function removeItem(itemName, key) {
  const jsonData = await getItems();

  for (let i = 0; i < jsonData[key].items.length; i++) {
    if (jsonData[key].items[i] === itemName) {
      jsonData[key].items.splice(i, 1);
      fs.writeFileSync(userDataPath, JSON.stringify(jsonData, null, 2));
    }
  }
}

module.exports = { getItems, addItem, removeItem };
