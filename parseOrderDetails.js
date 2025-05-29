const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
const { getItems } = require("./items");

async function extractTextFromPDF(arrayBuffer) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = "";

  for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex++) {
    const page = await pdf.getPage(pageIndex);
    const content = await page.getTextContent();

    const pageText = content.items.map((item) => item.str).join(" ");
    fullText += pageText + ` PAGE_BREAK==`;
  }

  return fullText;
}

async function parseOrderDetails(extractedText, excludeDrinks) {
  const jsonData = await getItems();
  const orderRegex = /(?<!\S)\d(?!\s*\/)\s+(.+?)(?=\s+#\d+)/g;

  const excludedDrinks = jsonData.excludedDrinks.items;
  const excludedText = jsonData.excludedText.items;
  const stationOneItems = jsonData.stationOneItems.items;
  const stationTwoItems = jsonData.stationTwoItems.items;

  // Replace/Remove text
  let excludedExtractedText = removeReplaceText(extractedText, excludedText);

  const orderCounts = {};

  let collectionTime = getCollectionTime(excludedExtractedText);

  let date = getOrderDate(excludedExtractedText);

  let match;
  let lastMatch;
  let lastMatchQuantity;
  let pageBreakMatch;

  while ((match = orderRegex.exec(excludedExtractedText)) !== null) {
    let orderName = match[1].trim();
    let itemQuantity = parseInt(
      match[0].trim().replace(/\s+/g, " ").split(" ")[0]
    );

    orderName = orderName.replace(/\s+/g, " ").trim();

    const itemStationOne = stationOneItems.some((item) => item === orderName);
    const itemStationTwo = stationTwoItems.some((item) => item === orderName);

    if (
      excludeDrinks &&
      excludedDrinks.some((excluded) => orderName.includes(excluded))
    ) {
      continue;
    }

    if (orderCounts[orderName]) {
      orderCounts[orderName].quantity += itemQuantity;
    } else {
      orderCounts[orderName] = {
        quantity: itemQuantity,
        item: orderName,
        collection: collectionTime,
        date: date,
        stationObject: itemStationOne
          ? {station: "stationOneItem", name: "Western Side"}
          : itemStationTwo
          ? {station: "stationTwoItem", name: "Chinese Side"}
          : {station: "unknownItems", name: "Unknown items"},
      };
    }

    const pageBreakRegex = /PAGE_BREAK==(-\s+\D+)/;

    if (
      (pageBreakMatch = pageBreakRegex.exec(excludedExtractedText)) !== null
    ) {
      let removeNameSurname = pageBreakMatch[1]
        .trim()
        .replace(/\s+/g, " ")
        .split(" ");
      
      const allowedWords = jsonData.jumpItems.items;

      removeNameSurname = removeNameSurname.filter((entry) =>
        allowedWords.includes(entry)
      );

      if (match.index > pageBreakMatch.index) {
        excludedExtractedText = excludedExtractedText.replace(
          /PAGE_BREAK==-/,
          "PAGE_BREAK_DONE"
        );

        if (orderCounts[lastMatch]) {
          orderCounts[lastMatch].quantity -= lastMatchQuantity;
          if (orderCounts[lastMatch].quantity === 0) {
            delete orderCounts[lastMatch];
          }
          const reconstructedItemName =
            lastMatch + " " + removeNameSurname.join(" ");

          if (orderCounts[reconstructedItemName]) {
            orderCounts[reconstructedItemName].quantity += lastMatchQuantity;
          } else {
            const itemStationOne = stationOneItems.some(
              (item) => item === reconstructedItemName
            );
            const itemStationTwo = stationTwoItems.some(
              (item) => item === reconstructedItemName
            );
            orderCounts[reconstructedItemName] = {
              quantity: lastMatchQuantity,
              item: itemStationOne || itemStationTwo ? reconstructedItemName : lastMatch + " " + pageBreakMatch[1].trim().replace(/\s+/g, " "),
              collection: collectionTime,
              date: date,
              stationObject: itemStationOne
              ? {station: "stationOneItem", name: "Western Side"}
              : itemStationTwo
              ? {station: "stationTwoItem", name: "Chinese Side"}
              : {station: "unknownItems", name: "Unknown items"},
            };
          }
        }
      }
    }

    lastMatch = match[1].trim();
    lastMatchQuantity = itemQuantity;
  }

  const orders = Object.values(orderCounts);

  orders.sort((a, b) => a.item.localeCompare(b.item));

  return orders;
}

function removeReplaceText(extractedText, excludedText) {
  const excludedTextRegex = new RegExp(excludedText.join("|"), "gi");

  return extractedText
  .replace(excludedTextRegex, "")
  .replace(/Seasonal vegetables & tofu/g, "Vegetables & tofu")
  .replace(/6 Tiger Prawns/g, "Prawns")
  .replace(/\s+/g, " ")
  .replace(/\d\s\parts to be packed/g, "")
  .replace(
    /\d\s\Items with \* have additional notes. Items with \+ have options. See full items list./g,
    "/"
  ).replace(/Total Items:\s\d+/, "");
}

function getCollectionTime(excludedExtractedText) {
  // Regular expression to match "Collection" followed by a time
  const collectionTimePattern = /Collection:\s+(\d{1,2}[:]\d{2})/i;

  // Check if "Collection" and time exist in the extracted text
  const collectionMatch = excludedExtractedText.match(collectionTimePattern);
  if (collectionMatch && collectionMatch[1]) {
    return collectionMatch[1];
  }
}

function getOrderDate(excludedExtractedText) {
  // Regular expression to match "Date" followed by a time
  const datePattern = /Date:\s+(\d{1,2}\s+[A-Za-z]{3}\s+\d{2})/i;

  // Check if "Date" exist in the extracted text
  const dateMatch = excludedExtractedText.match(datePattern);
  if (dateMatch && dateMatch[1]) {
    return dateMatch[1];
  }
}

async function parsePDF(arrayBuffer, excludeDrinks) {
  const extractedText = await extractTextFromPDF(arrayBuffer);
  return parseOrderDetails(extractedText, excludeDrinks);
}

module.exports = { parsePDF };
