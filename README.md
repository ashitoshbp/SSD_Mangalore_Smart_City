# Mangalore Smart City Incident RAG System

A full-stack smart city analytics platform for Mangalore, featuring:
- **Natural Language Querying** of incident data using Retrieval-Augmented Generation (RAG)
- **Professional, animated React frontend** with map, dashboard, analytics, and team info
- **Robust Python backend** (FastAPI & Flask) with vector search, analytics, and API endpoints

## Screenshots of implementation
---![Screenshot 2025-05-13 151132](https://github.com/user-attachments/assets/f406fd53-8b0f-4f85-a1b2-552609f12225)

## The map represenatation
![Screenshot 2025-05-13 152107](https://github.com/user-attachments/assets/89ed90ca-5da8-4a3e-baad-e99967f02362)
![Screenshot 2025-05-13 152216](https://github.com/user-attachments/assets/509a7169-7a63-44fa-ac19-6a10075e04e4)

## Dashboard Integration with UI
![Screenshot 2025-05-13 152256](https://github.com/user-attachments/assets/5e06122d-5d3f-49be-aaad-8eb6bf0a35de)
![Screenshot 2025-05-13 152317](https://github.com/user-attachments/assets/85177934-9217-4f28-a7e8-2e6456c6d2cf)
![Screenshot 2025-05-13 152326](https://github.com/user-attachments/assets/ad1c9cc2-1413-466f-a6f8-0f7ce42b0ba5)

## Natural Language Query for question answering
![Screenshot 2025-05-13 152758](https://github.com/user-attachments/assets/20b31ba3-0219-4872-a2d2-6179f6b5ed4f)
![Screenshot 2025-05-13 152747](https://github.com/user-attachments/assets/3af926be-a9cc-4cca-9d04-e4232e7f8c2d)

## Image Comparison
![Screenshot 2025-05-13 152649](https://github.com/user-attachments/assets/47227296-9f92-4b6c-bcc9-39229282fda5)
![Screenshot 2025-05-13 152708](https://github.com/user-attachments/assets/c5114b64-494a-47a0-bfd0-f72059785d46)

## Team 
![Screenshot 2025-05-13 152722](https://github.com/user-attachments/assets/544577e1-1c6a-4264-a830-76fea80f11bf)


## Table of Contents
- [Project Overview](#project-overview)
- [System Architecture](#system-architecture)
- [Backend Setup & Usage](#backend-setup--usage)
- [Frontend Setup & Usage](#frontend-setup--usage)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [Troubleshooting](#troubleshooting)
- [Team](#team)

---

## Project Overview
This project implements a smart system for querying and visualizing incident data for Mangalore Smart City. Users can:
- Search and analyze incidents with natural language queries (powered by RAG and Ollama LLM)
- Visualize incident locations, stats, and trends on an interactive map and dashboard
- Explore analytics, charts, and insights for urban management

---

## System Architecture
- **Backend**: Python (FastAPI, Flask, LangChain, FAISS, Sentence Transformers)
- **Frontend**: React (with framer-motion, Leaflet, Chart.js, AOS, Axios)
- **Data**: CSV/GeoJSON for incident and map data

**Key Components:**
1. **Data Preprocessing**: Cleans and structures incident data
2. **Text Chunking & Embedding**: Splits records, generates embeddings
3. **Vector Store**: FAISS for similarity search
4. **Retriever**: LangChain RetrieverQA with Ollama LLM
5. **API Backend**: FastAPI endpoints for queries, stats, and analytics
6. **Frontend**: React SPA with animated UI, map, dashboard, analytics, and about/team pages

---

## Backend Setup & Usage
### 1. Prerequisites
- Python 3.9+
- [Ollama](https://ollama.com/) installed and running (for LLM-powered RAG)

### 2. Setup (Windows)
```powershell
# From the backend directory:
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Running the Backend
You can run the entire pipeline or individual components:
```powershell
# Run all steps (preprocess, embed, serve API)
python src/run_pipeline.py --all

# Run only data preprocessing
python src/run_pipeline.py --preprocess

# Run only text embedding
python src/run_pipeline.py --embed

# Test a sample query
python src/run_pipeline.py --test-query

# Start the API server (FastAPI)
python src/run_pipeline.py --start-api
```

#### Flask App (Map & Analytics API)
```powershell
# Run Flask API for map/dashboard endpoints
python app.py
# By default, runs at http://localhost:5000
```

### 4. Backend Dependencies
See `backend/requirements.txt` for full list. Key packages:
- pandas, openpyxl, numpy
- langchain, langchain-community
- faiss-cpu, sentence-transformers
- fastapi, uvicorn
- flask, flask-cors
- python-dotenv, pydantic

---

## Frontend Setup & Usage
### 1. Prerequisites
- Node.js (v18+ recommended)
- npm (comes with Node.js)

### 2. Setup
```powershell
# From the frontend directory:
npm install
```

### 3. Running the Frontend
```powershell
npm start
# Runs at http://localhost:3000 by default
```

### 4. Build for Production
```powershell
npm run build
```

### 5. Frontend Dependencies
See `frontend/package.json` for full list. Key packages:
- react, react-dom, react-scripts
- leaflet, react-leaflet
- chart.js, react-chartjs-2
- aos, framer-motion
- axios

---

## Project Structure
```text
Smart System Design/
├── backend/
│   ├── app.py                # Flask API (map, analytics)
│   ├── src/                  # FastAPI, RAG pipeline, utils
│   ├── data/                 # Data files (CSV, GeoJSON, vector store)
│   ├── requirements.txt      # Backend dependencies
│   └── ...
├── frontend/
│   ├── public/               # Static assets, team photos, NITK logo
│   ├── src/                  # React components (Map, Dashboard, About, etc.)
│   ├── package.json          # Frontend dependencies
│   └── ...
├── modified_dataset.csv      # Main incident data
├── README.md                 # This file
└── ...
```

---

## API Endpoints
### FastAPI (RAG System)
- `GET /` – Root API info
- `GET /health` – Health check
- `POST /query` – Query incident data (natural language)
- `GET /models` – List available Ollama models
- `GET /stats` – Incident data stats

### Flask (Map & Analytics)
- `GET /incidents` – List all incidents
- `GET /incident_types` – All incident types
- `GET /locations` – All locations
- `GET /dashboard/kpi` – Dashboard KPIs
- `GET /dashboard/trends` – Temporal trends
- `GET /dashboard/breakdown` – Incident breakdowns
- `GET /dashboard/analytics` – Response analytics
- `GET /incident/details` – Incident details
- `GET /map/incidents` – Incidents for map
- `GET /map/taluks` – Taluk GeoJSON
- `GET /map/taluk_stats/<taluk>` – Taluk stats

---

## Troubleshooting
- **Ollama not found**: Ensure Ollama is installed and running before backend queries
- **Port conflicts**: Default ports are 8000 (FastAPI), 5000 (Flask), 3000 (React)
- **CORS errors**: Both APIs allow all origins in development
- **Data not loading**: Check `modified_dataset.csv` and data paths in backend

---

## Team
- **Ashitosh Phadatare** (211AI007)
- **Darshan RK** (211AI015)
- **Mauli Mehulkumar Patel** (211AI024)
- **Varun Arya** (211AI038)

Team photos and NITK logo are in `frontend/public/`.

---

## Acknowledgements
- National Institute of Technology Karnataka (NITK)
- Guided by Dr. Geetha V.
- Built for Smart System Design (SSD) course

---

For questions, open an issue or contact the team.
