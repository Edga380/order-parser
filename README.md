# Order Parser

**Order Parser** is a specialized Electron-based application designed to efficiently parse and process order details from PDF files according to specific internal requirements. This tool is built for a particular use case and may not be suitable for general use by other organizations.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Build](#build)
- [Development](#development)
- [Acknowledgments](#acknowledgments)

## Features

- Parse PDF files for order details.
- User-friendly interface built with Electron.
- Cross-platform support (currently configured for Windows).
- Lightweight and fast.

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Edga380/order-parser.git
   cd order-parser
   
2. Install dependencies:
   ```bash
   npm install

## Usage

1. Running the Application in development mode:
   ```bash
   npm run start
   
## Build

1. To build the application for distribution:
   ```bash
   npm run build

The output will be located in the ``dist`` directory as per the configuration in ``package.json``.
   
## Development

### Dependencies
- Electron: Core framework for building cross-platform desktop apps.
- Electron Builder: For packaging and distribution.
- PDF.js: To handle PDF parsing.

### File Structure
- ``main.js``: Entry point of the Electron application.
- ``preload.js``: Preloads scripts for renderer processes.
- ``parseOrderDetails.js``: Core logic for parsing PDF order details.
- ``index.html`` & ``print.html``: HTML templates for the UI.
- ``styles.css``: Stylesheet for the application.

### Scripts
- ``npm run start``: Run the application in development mode.
- ``npm run build``: Build the application for production.

### Acknowledgments
- [Electron](https://www.electronjs.org/)
- [PDF.js](https://mozilla.github.io/pdf.js/)
- [Electron](https://www.electron.build/)