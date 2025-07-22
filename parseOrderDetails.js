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
  const pageBreakRegex = /PAGE_BREAK==(-\s+\D+)/;

  const excludedDrinks = jsonData.excludedDrinks.items;
  const excludedText = jsonData.excludedText.items;
  const stationOneItems = jsonData.stationOneItems.items;
  const stationTwoItems = jsonData.stationTwoItems.items;

  // Replace/Remove text
  let excludedExtractedText = removeReplaceText(extractedText, excludedText);

  const orderCounts = {};
  const collectionTime = getCollectionTime(excludedExtractedText);
  const date = getOrderDate(excludedExtractedText);

  let match;
  let lastMatch;
  let lastMatchQuantity;
  let lastMatchItemStationOne;
  let lastMatchItemStationTwo
  let pageBreakMatch;

  while ((match = orderRegex.exec(excludedExtractedText)) !== null) {
    let orderName = match[1].trim().replace(/\s+/g, " ");
    let itemQuantity = parseInt(match[0].trim().split(" ")[0]);

    const itemStationOne = stationOneItems.includes(orderName);
    const itemStationTwo = stationTwoItems.includes(orderName);

    if (
      excludeDrinks &&
      excludedDrinks.some((excluded) => orderName.includes(excluded))
    ) {
      continue;
    }

    const bothSidesST1 = "WS";
    const bothSidesST2 = "CS";

    const hasBothSides = 
      orderCounts[`${orderName} + ${bothSidesST1}`] && 
      orderCounts[`${orderName} + ${bothSidesST2}`]

    if (orderCounts[orderName] || hasBothSides) {
      if (itemStationOne && itemStationTwo) {
        if (orderCounts[`${orderName} + ${bothSidesST1}`])
          orderCounts[`${orderName} + ${bothSidesST1}`].quantity += itemQuantity;
        if (orderCounts[`${orderName} + ${bothSidesST2}`])
          orderCounts[`${orderName} + ${bothSidesST2}`].quantity += itemQuantity;
      } else if (orderCounts[orderName]) {
        orderCounts[orderName].quantity += itemQuantity;
      }
    } else {
      if(itemStationOne && itemStationTwo){
        orderCounts[`${orderName} + ${bothSidesST1}`] = {
          quantity: itemQuantity,
          item: `${orderName} + ${bothSidesST1}`,
          collection: collectionTime,
          date: date,
          stationObject: {station: "stationOneItem", name: "Western Side"}
        };
        orderCounts[`${orderName} + ${bothSidesST2}`] = {
          quantity: itemQuantity,
          item: `${orderName} + ${bothSidesST2}`,
          collection: collectionTime,
          date: date,
          stationObject: {station: "stationTwoItem", name: "Chinese Side"}
        };
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
    }

    if ((pageBreakMatch = pageBreakRegex.exec(excludedExtractedText)) !== null) {
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

        const hadBothSidesLast = 
          orderCounts[`${lastMatch} + ${bothSidesST1}`] && 
          orderCounts[`${lastMatch} + ${bothSidesST2}`]

        if (orderCounts[lastMatch] || hadBothSidesLast) {
          if (lastMatchItemStationOne && lastMatchItemStationTwo) {
            if (orderCounts[`${lastMatch} + ${bothSidesST1}`])
              orderCounts[`${lastMatch} + ${bothSidesST1}`].quantity -= lastMatchQuantity;
            if (orderCounts[`${lastMatch} + ${bothSidesST2}`])
              orderCounts[`${lastMatch} + ${bothSidesST2}`].quantity -= lastMatchQuantity;

            if (
              orderCounts[`${lastMatch} + ${bothSidesST1}`] &&
              orderCounts[`${lastMatch} + ${bothSidesST1}`].quantity === 0
            )
              delete orderCounts[`${lastMatch} + ${bothSidesST1}`];

            if (
              orderCounts[`${lastMatch} + ${bothSidesST2}`] &&
              orderCounts[`${lastMatch} + ${bothSidesST2}`].quantity === 0
            )
              delete orderCounts[`${lastMatch} + ${bothSidesST2}`];
          } else if (orderCounts[lastMatch]) {
            orderCounts[lastMatch].quantity -= lastMatchQuantity;
            if (orderCounts[lastMatch].quantity === 0) {
              delete orderCounts[lastMatch];
            }
          }
          const reconstructedItemName = `${lastMatch} ${removeNameSurname.join(" ")}`;
          const itemStationOneNew = stationOneItems.includes(reconstructedItemName);
          const itemStationTwoNew = stationTwoItems.includes(reconstructedItemName);
          const hasReconstructedBothSides = 
            orderCounts[`${reconstructedItemName} + ${bothSidesST1}`] &&
            orderCounts[`${reconstructedItemName} + ${bothSidesST2}`];

          if (orderCounts[reconstructedItemName] || hasReconstructedBothSides) {
            if (itemStationOneNew && itemStationTwoNew) {
              if (orderCounts[`${reconstructedItemName} + ${bothSidesST1}`])
                orderCounts[`${reconstructedItemName} + ${bothSidesST1}`].quantity += lastMatchQuantity;
              if (orderCounts[`${reconstructedItemName} + ${bothSidesST2}`])
                orderCounts[`${reconstructedItemName} + ${bothSidesST2}`].quantity += lastMatchQuantity;
            } else if (orderCounts[reconstructedItemName]) {
              orderCounts[reconstructedItemName].quantity += lastMatchQuantity;
            }
          } else {
            orderCounts[reconstructedItemName] = {
              quantity: lastMatchQuantity,
              item: reconstructedItemName,
              collection: collectionTime,
              date: date,
              stationObject: itemStationOneNew
              ? {station: "stationOneItem", name: "Western Side"}
              : itemStationTwoNew
              ? {station: "stationTwoItem", name: "Chinese Side"}
              : {station: "unknownItems", name: "Unknown items"},
            };
          }
        }
      }
    }

    lastMatch = orderName;
    lastMatchQuantity = itemQuantity;
    lastMatchItemStationOne = itemStationOne;
    lastMatchItemStationTwo = itemStationTwo;
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
