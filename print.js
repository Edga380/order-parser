window.api.receiveContent((content, contentSummary) => {
  const outputPrint = document.getElementById("output-print");
  // Clear existing content
  outputPrint.innerHTML = "";

  // Constants for page dimensions (in pixels, assuming 96dpi)
  const pageHeight = 11 * 96; // 11 inches
  const marginHeight = 4 * 96; // 3.5-inch margin top and bottom
  const availableHeight = pageHeight - marginHeight;

  // Create a temporary container to measure element heights
  const tempContainer = document.createElement("div");
  tempContainer.style.visibility = "hidden";
  tempContainer.style.position = "absolute";
  tempContainer.style.width = "8.5in";
  tempContainer.innerHTML = content;
  document.body.appendChild(tempContainer);

  // Variables to manage pages
  let currentPage = document.createElement("div");
  currentPage.className = "page";
  outputPrint.appendChild(currentPage);

  let currentHeight = 0;

  Array.from(tempContainer.children).forEach((child) => {
    const clone = child.cloneNode(true);

    // Temporarily add the clone to measure its height
    currentPage.appendChild(clone);
    const cloneHeight = clone.offsetHeight;

    // Check if adding this element exceeds available height
    if (currentHeight + cloneHeight > availableHeight) {
      // Remove the clone from the current page
      currentPage.removeChild(clone);

      // Start a new page only if there are more elements to process
      currentPage = document.createElement("div");
      currentPage.className = "page";
      outputPrint.appendChild(currentPage);

      // Reset current height and add the clone to the new page
      currentHeight = 0;
      currentPage.appendChild(clone);
    }

    // Update the current height
    currentHeight += cloneHeight;

    // If the element is a collection-text marker, start a new page after appending
    const isCollectionTime = clone.classList.contains("collection-text");
    if (isCollectionTime) {
      // Start a new page only if there are more elements to process
      const hasMoreElements = child.nextElementSibling !== null;
      if (hasMoreElements) {
        currentPage = document.createElement("div");
        currentPage.className = "page";
        outputPrint.appendChild(currentPage);
        currentHeight = 0; // Reset current height for the new page
      }
    }
  }); 
  
  // Add contentSummary on a new page  
  if (contentSummary && contentSummary.trim() !== "") {
    currentPage = document.createElement("div");
    currentPage.className = "page";
    outputPrint.appendChild(currentPage);
    currentHeight = 0;

    const summaryContainer = document.createElement("div");
    summaryContainer.style.visibility = "hidden";
    summaryContainer.style.position = "absolute";
    summaryContainer.style.width = "8.5in";
    summaryContainer.innerHTML = contentSummary;
    document.body.appendChild(summaryContainer);

    const addSummaryLabel = (page) => {
      const label = document.createElement("div");
      label.textContent = `Summary Printed(${new Date().getDate()}/${new Date().getMonth()}/${new Date().getFullYear()})`;
      label.style.fontWeight = "bold";
      label.style.fontSize = "1.5rem";
      label.style.marginTop = "4rem";
      label.style.marginBottom = "1rem";
      page.appendChild(label);
      currentHeight += label.offsetHeight;
    };

    // First summary page: add Summary header
    addSummaryLabel(currentPage);

    Array.from(summaryContainer.children).forEach((child) => {
      const clone = child.cloneNode(true);
      currentPage.appendChild(clone);
      const cloneHeight = clone.offsetHeight;

      if (currentHeight + cloneHeight > availableHeight) {
        currentPage.removeChild(clone);
        currentPage = document.createElement("div");
        currentPage.className = "page";
        outputPrint.appendChild(currentPage);
        currentHeight = 0;
        addSummaryLabel(currentPage);
        currentPage.appendChild(clone);
      }

      currentHeight += cloneHeight;
    });

    document.body.removeChild(summaryContainer);
  }

  // Add page numbers
  const pages = outputPrint.querySelectorAll(".page");
  pages.forEach((page, index) => {
    const pageNumber = document.createElement("div");
    pageNumber.className = "page-number";
    pageNumber.textContent = `Page ${index + 1} / ${pages.length}`;
    page.appendChild(pageNumber);
  });

  // Clean up the temporary container
  document.body.removeChild(tempContainer);
});
