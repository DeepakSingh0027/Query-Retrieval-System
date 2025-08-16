# 📄 Query Retrieval System

A powerful **multi-format document question-answering system** that extracts, processes, and searches through various document types to provide contextually accurate answers using **semantic search** and **LLMs**.

## 🚀 Overview

This system takes **documents** (via URL or file), processes them through a **smart extraction pipeline** (with OCR for scanned content), splits the content into semantic chunks, embeds them into vectors, and retrieves the most relevant chunks for a given question.  
It then sends the context to an **LLM (GPT-4.1/GPT-5.1)** to produce accurate, document-based answers.

## ✨ Key Features

- **Multi-format Support**: PDF, DOCX, PPTX, XLSX, ZIP archives, and images.
- **Smart Extraction Pipeline**:
  - MIME type detection
  - Format-specific extractors
  - OCR for scanned documents & images
  - Fallback conversion for unknown formats
- **Parallel Processing**:
  - Concurrent document extraction
  - Parallel question processing
- **Semantic Search**:
  - Embedding-based similarity search
  - Retrieves relevant chunks even without exact keyword matches
- **Scalable LLM Integration**:
  - Key rotation for LLM API calls
  - JSON-formatted output for easy parsing

## 🛠️ Tech Stack

- **Backend**: Node.js + Express
- **AI / ML**:
  - [Xenova Transformers](https://github.com/xenova/transformers.js) – Embedding generation
  - [GPT-4.1 via GitHub Models API](https://docs.github.com/en/ai) – Answer generation
- **OCR**: [Tesseract.js](https://tesseract.projectnaptha.com/)
- **Document Extraction**:
  - [pdf-parse](https://www.npmjs.com/package/pdf-parse) – PDF text extraction
  - [mammoth](https://github.com/mwilliamson/mammoth.js) – DOCX text extraction
  - [unzipit](https://www.npmjs.com/package/unzipit) – PPTX/DOCX XML parsing
  - [xlsx](https://www.npmjs.com/package/xlsx) – Excel parsing
  - [libreoffice-convert](https://www.npmjs.com/package/libreoffice-convert) – Format conversion
- **Utilities**:
  - axios, fs-extra, uuid, file-type, p-limit, sharp, canvas

## 📦 Installation

### 1️⃣ Clone the repository

```bash
git clone https://github.com/DeepakSingh0027/Query-Retrieval-System.git
```

### 2️⃣ Install dependencies

```bash
npm install
```

### 3️⃣ Post-install rebuild (required for sharp & canvas)

```bash
npm rebuild sharp && npm rebuild canvas
```

### 4️⃣ Install LibreOffice (Required for libreoffice-convert)

**Ubuntu/Debian**

```bash
sudo apt update
sudo apt install libreoffice
```

**MacOS (Homebrew)**

```bash
brew install --cask libreoffice
```

**Windows**

```bash
-Download from LibreOffice Official Website.:https://www.libreoffice.org/download/download/
-Add LibreOffice's program folder path (e.g., C:\Program Files\LibreOffice\program) to your system PATH.
```

### 5️⃣ Environment Variables

Create a .env file in the server directory:
(Note: Already pushed.)

```bash
GITHUB_TOKEN=<your_main_github_api_token>
GITHUB_TOKEN2=<token_2>
GITHUB_TOKEN3=<token_3>
.. up to GITHUB_TOKEN12 if needed
```

### ▶️ Running the Server

```bash
cd server
node server.js
```

### 📂 File Structure

```bash
server/
│── server.js # Main entry point
│── controllers/
│ └── hackrxController.js # Main processing workflow
│── utils/
│ ├── chunkText.js # Chunking logic
│ ├── semanticSearch.js # Embedding & similarity search
│ ├── queryModel.js # LLM integration
│ └── functions/
│ ├── extractor.js # File handling & extraction
│ └── extractor2.js # PDF conversion fallback
│── extractorsUtils/
│ ├── pptExtract.js
│ ├── docxExtract.js
│ └── xlExtract.js
│── package.json
│── .env
(Note: There are more files that supports/helps the main workflow that is not mentioned here.)
```

### 📜 Example Workflow

```bash
1 - User sends API request with:
documents: array of URLs or file paths
questions: array of strings
2 - System:
Detects file type → extracts text (with OCR if needed)
Splits text into semantic chunks
Embeds chunks into vectors
Finds top relevant chunks per question
Sends context to LLM
LLM returns JSON-formatted answers
All answers were merged and send back with JSON response.
```
