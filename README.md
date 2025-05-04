# Mangalore Smart City Incident RAG System

A full-stack smart city analytics platform for Mangalore, featuring:
- **Natural Language Querying** of incident data using Retrieval-Augmented Generation (RAG)
- **Professional, animated React frontend** with map, dashboard, analytics, and team info
- **Robust Python backend** (FastAPI & Flask) with vector search, analytics, and API endpoints

---

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