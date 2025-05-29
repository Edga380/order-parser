let excludeDrinks = true;

const homeContainer = document.getElementById("home-container");
const itemsContainer = document.getElementById("items-container");
const addRemoveDisplayItemsContainer = document.getElementById(
  "add-remove-display-items-container"
);
const alertBox = document.getElementById("alert-box");
const alertBoxMessage = document.getElementById("alert-box-message");

document
  .getElementById("parsePdfButton")
  .addEventListener("click", async () => {
    const fileInput = document.getElementById("pdfFile");
    const loadingText = document.getElementById("loadingText");

    if (!fileInput.files || fileInput.files.length === 0) {
      alertBoxMessage.textContent = "Please select a PDF file!";
      alertBox.style.display = "flex";
      return;
    }

    // Show loading text
    loadingText.style.display = "block";

    const files = Array.from(fileInput.files);
    const filesArrayBuffer = await Promise.all(
      files.map(async (file) => await file.arrayBuffer())
    );

    try {
      // Parse the PDF
      const orders = await Promise.all(
        filesArrayBuffer.map(async (arrayBuffer) => {
          return await window.api.parsePDF(arrayBuffer, excludeDrinks);
        })
      );

      // Merge orders by collection time
      let mergedOrders = [];
      orders.forEach((order) => {
        order.forEach((itemData) => {
          const existingOrder = mergedOrders.find(
            (mergedOrder) =>
              mergedOrder.item === itemData.item &&
              mergedOrder.collection === itemData.collection &&
              mergedOrder.date === itemData.date
          );
          if (existingOrder) {
            existingOrder.quantity += itemData.quantity;
          } else {
            mergedOrders.push(itemData);
          }
        });
      });

      // Prepare content for print preview
      let content = "";

      // Sorting logic
      const monthMap = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      mergedOrders
        .sort((a, b) => {
          // Compare dates
          const [dayA, monthA, yearA] = a.date.split(" ");
          const [dayB, monthB, yearB] = b.date.split(" ");

          const yearANum = parseInt(yearA, 10);
          const yearBNum = parseInt(yearB, 10);
          const dayANum = parseInt(dayA, 10);
          const dayBNum = parseInt(dayB, 10);

          if (yearANum !== yearBNum) return yearANum - yearBNum;

          const monthIndexA = monthMap.indexOf(monthA);
          const monthIndexB = monthMap.indexOf(monthB);
          if (monthIndexA !== monthIndexB) return monthIndexA - monthIndexB;

          if (dayANum !== dayBNum) return dayANum - dayBNum;

          // Compare collections
          const collectionComparison = a.collection.localeCompare(b.collection);
          if (collectionComparison !== 0) return collectionComparison;

          // Compare items
          return a.item.localeCompare(b.item);
        })
        .sort((a, b) => a.stationObject.station.localeCompare(b.stationObject.station))
        .forEach((itemData, index, sortedArray) => {
          if (itemData.quantity !== undefined) {
            content += `
            <div class="checkbox-mark-text-container">
              <div class="checkbox-mark"></div>
              <div>${itemData.item} X ${itemData.quantity}</div>
            </div>
          `;
          }

          // Add collection time at the end of each group
          const isLastItemOfCollection =
            index === sortedArray.length - 1 ||
            sortedArray[index + 1].date !== itemData.date ||
            sortedArray[index + 1].collection !== itemData.collection ||
            sortedArray[index + 1].stationObject.station !== itemData.stationObject.station;

          if (isLastItemOfCollection) {
            content += `<div class="collection-text">(COLLECTION: ${itemData.collection} | DATE: ${itemData.date} | ${itemData.stationObject.name})</div>`;
          }
        });

      // Send content to the print preview page
      window.api.openPrintPreview(content);
    } catch (error) {
      alertBoxMessage.textContent = "Error reading PDF: " + error.message;
      alertBox.style.display = "flex";
    } finally {
      // Hide loading text
      loadingText.style.display = "none";
    }
  });

document.getElementById("exclude-drinks").addEventListener("change", () => {
  excludeDrinks = !excludeDrinks;
});

document.getElementById("home-page-button").addEventListener("click", () => {
  homeContainer.style.display = "flex";
  addRemoveDisplayItemsContainer.style.display = "none";
});

document.getElementById("items-page-button").addEventListener("click", () => {
  homeContainer.style.display = "none";
  addRemoveDisplayItemsContainer.style.display = "flex";
});

document
  .getElementById("cancel-delete-item-modal")
  .addEventListener("click", () => {
    const deleteModal = document.getElementById("delete-modal");
    deleteModal.style.display = "none";
  });

document
  .getElementById("confirm-delete-item-modal")
  .addEventListener("click", async () => {
    const deleteModalItemName = document.getElementById(
      "delete-modal-item-name"
    ).textContent;
    const deleteModalItemKey = document.getElementById(
      "delete-modal-item-key"
    ).textContent;

    try {
      await window.api.removeItem(deleteModalItemName, deleteModalItemKey);
    } catch (error) {
      console.error("Error deleting item:", error);
    } finally {
      const deleteModal = document.getElementById("delete-modal");
      deleteModal.style.display = "none";
      const itemsContainer = document.getElementById("items-container");
      itemsContainer.innerHTML = "";
      fetchItemsData();
    }
  });

document
  .getElementById("confirm-alert-box-modal")
  .addEventListener("click", () => {
    alertBox.style.display = "none";
  });

const form = document.querySelector("form");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const output = { key: "", itemName: "" };
  for (const entry of data) {
    const trimEntry = entry[1].trim();
    if (entry[0] === "option") {
      output.key = trimEntry;
    } else if (entry[0] === "inputText") {
      if (trimEntry.trim().length <= 0) {
        alertBoxMessage.textContent = "Input field can not be empty!"
        alertBox.style.display = "flex";
        return;
      }
      output.itemName = trimEntry;
    }
  }

  const response = await window.api.addItem(output.itemName, output.key);
  if (response) {
    const itemsContainer = document.getElementById("items-container");
    itemsContainer.innerHTML = "";
    fetchItemsData();
    const addItemInputText = document.getElementById("add-item-input-text");
    addItemInputText.value = "";
    return;
  }
  alertBoxMessage.textContent = "Item already exist!"
  alertBox.style.display = "flex";
});

async function fetchItemsData() {
  const fetchedItems = await window.api.getItems();

  let currentItemsList = document.createElement("div");
  currentItemsList.className = "items-list-container";

  for (let i = 1; i < Object.keys(fetchedItems).length; i++) {
    const itemList = document.createElement("div");
    itemList.className = "items-list";

    const keyName = fetchedItems[Object.keys(fetchedItems)[i]].name;
    const key = Object.keys(fetchedItems)[i];

    const itemListName = document.createElement("div");
    itemListName.className = "items-list-name";
    itemListName.textContent = `${keyName}`;

    currentItemsList.appendChild(itemListName);
    currentItemsList.appendChild(itemList);

    fetchedItems[Object.keys(fetchedItems)[i]].items.forEach((item) => {
      const itemElement = document.createElement("div");
      itemElement.className = "item-container";
      itemElement.textContent = item;

      const itemElementRemoveButton = document.createElement("button");
      itemElementRemoveButton.className = "item-remove-button";
      itemElementRemoveButton.textContent = "x";
      itemElementRemoveButton.addEventListener("click", () => {
        const deleteModalItemName = document.getElementById(
          "delete-modal-item-name"
        );
        deleteModalItemName.textContent = `${item}`;
        const deleteModalItemKey = document.getElementById(
          "delete-modal-item-key"
        );
        deleteModalItemKey.textContent = `${key}`;
        const deleteModal = document.getElementById("delete-modal");
        deleteModal.style.display = "flex";
      });

      itemElement.appendChild(itemElementRemoveButton);
      itemList.appendChild(itemElement);
    });
  }

  itemsContainer.appendChild(currentItemsList);
}

fetchItemsData();
