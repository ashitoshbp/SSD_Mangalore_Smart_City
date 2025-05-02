# Mangalore Smart City Incident RAG System

This project implements a Natural Language Querying system for the Mangalore Smart City Incident dataset using Retrieval-Augmented Generation (RAG) with Ollama and LangChain.

## System Architecture

The system consists of the following components:

1. **Data Preprocessing** (Pandas)
   - Loads and cleans the incident data from Excel
   - Converts to structured format for further processing

2. **Text Chunking & Embedding** (LangChain + Sentence Transformers)
   - Splits incident records into manageable chunks
   - Generates embeddings using Sentence Transformers

3. **Vector Store** (FAISS)
   - Stores and indexes the embeddings for efficient retrieval

4. **Retriever** (LangChain's RetrieverQA with Ollama)
   - Retrieves relevant chunks based on user queries
   - Generates answers using Ollama LLM

5. **API Backend** (FastAPI)
   - Provides endpoints for querying the system
   - Handles request/response formatting

## Setup and Installation

1. Create a virtual environment:
   ```
   python -m venv venv
   .\venv\Scripts\activate
   ```

2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Ensure Ollama is installed and running on your system.

## Running the System

You can run the entire pipeline or individual components using the `run_pipeline.py` script:

```
# Run the entire pipeline
python src/run_pipeline.py --all

# Run only data preprocessing
python src/run_pipeline.py --preprocess

# Run only text embedding
python src/run_pipeline.py --embed

# Test a sample query
python src/run_pipeline.py --test-query

# Start the API server
python src/run_pipeline.py --start-api
```

## API Endpoints

Once the API server is running, the following endpoints are available:

- `GET /`: Root endpoint with API information
- `GET /health`: Health check endpoint
- `POST /query`: Process a natural language query
- `GET /models`: List available Ollama models
- `GET /stats`: Get statistics about the incident data

## Example Queries

The system can answer questions like:

- "What are the top 5 longest open flood cases in Mangalore?"
- "Show me all fire incidents in Kankanady closed in under 2 hours"
- "Which areas have the most incidents?"
- "What is the average resolution time for traffic accidents?"

## Project Structure

```
backend/
├── data/                  # Data directory
│   ├── processed_incidents.csv
│   ├── processed_incidents.json
│   └── vector_store/      # Vector store files
├── src/                   # Source code
│   ├── data_preprocessing.py
│   ├── text_embedding.py
│   ├── retriever.py
│   ├── api.py
│   ├── main.py
│   └── run_pipeline.py
├── venv/                  # Virtual environment
├── requirements.txt       # Dependencies
└── README.md              # This file
```

## Next Steps

1. Implement a frontend UI using React, Vue, or basic HTML/JS
2. Add authentication and rate limiting to the API
3. Implement caching for common queries
4. Add more advanced query capabilities
