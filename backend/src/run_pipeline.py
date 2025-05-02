import os
import sys
import argparse
import subprocess
from data_preprocessing import DataPreprocessor
from text_embedding import TextProcessor
from retriever import IncidentRetriever

def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description="Run the RAG pipeline for incident data")
    parser.add_argument("--preprocess", action="store_true", help="Run data preprocessing step")
    parser.add_argument("--embed", action="store_true", help="Run text embedding step")
    parser.add_argument("--test-query", action="store_true", help="Test a sample query")
    parser.add_argument("--start-api", action="store_true", help="Start the API server")
    parser.add_argument("--all", action="store_true", help="Run all steps")
    
    return parser.parse_args()

def run_preprocessing():
    """Run the data preprocessing step"""
    print("\n===== Step 1: Data Preprocessing =====")
    
    # Get paths
    current_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(current_dir)
    data_dir = os.path.join(backend_dir, "data")
    csv_path = os.path.join(os.path.dirname(backend_dir), "modified_dataset.csv")
    output_path = os.path.join(data_dir, "processed_incidents.csv")
    
    # Ensure data directory exists
    os.makedirs(data_dir, exist_ok=True)
    
    # Create preprocessor and run
    preprocessor = DataPreprocessor(csv_path=csv_path)
    preprocessor.load_data()
    preprocessor.clean_data()
    preprocessor.save_processed_data(output_path)
    
    # Print stats
    stats = preprocessor.get_data_stats()
    print("\nData preprocessing completed successfully!")
    print(f"Processed data saved to {output_path}")
    print(f"JSON version saved to {output_path.replace('.csv', '.json')}")
    print("\nDataset Statistics:")
    print(f"Total incidents: {stats['total_records']}")
    print(f"Incident types: {', '.join(list(stats['incident_types'].keys())[:5])}...")
    
    # Get date range if available in the stats
    if 'date_range' in stats:
        print(f"Date range: {stats['date_range'][0]} to {stats['date_range'][1]}")
    
    return output_path.replace('.csv', '.json')

def run_embedding(json_path):
    """Run the text embedding step"""
    print("\n===== Step 2: Text Chunking and Embedding =====")
    
    # Get paths
    current_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(os.path.dirname(current_dir), "data")
    vector_store_dir = os.path.join(data_dir, "vector_store")
    
    # Create processor and run
    processor = TextProcessor(json_path)
    processor.load_data()
    processor.create_chunks()
    processor.initialize_embedding_model()
    processor.generate_embeddings()
    processor.create_faiss_index()
    processor.save_processed_data(vector_store_dir)
    
    print("\nText embedding completed successfully!")
    print(f"Vector store saved to {vector_store_dir}")
    
    return vector_store_dir

def test_query(vector_store_dir):
    """Test a sample query"""
    print("\n===== Step 3: Testing Query =====")
    
    # Create retriever and run a test query
    retriever = IncidentRetriever(vector_store_dir, model_name="mistral")
    retriever.load_resources()
    
    # Process sample queries
    test_queries = [
        "What are the top 3 most common incident types in Mangalore?",
        "Which taluk has the highest number of incidents?",
        "What is the average time taken to resolve incidents?",
        "How many incidents were reported in the last month of the dataset?"
    ]
    
    for query in test_queries:
        print(f"\nProcessing query: '{query}'")
        response = retriever.process_query(query, k=10)
        
        print(f"\nAnswer: {response['answer']}")
        print(f"Number of relevant chunks: {response['num_chunks_retrieved']}")
        print("-" * 50)
    
    return True

def start_api():
    """Start the API server"""
    print("\n===== Step 4: Starting API Server =====")
    print("Starting FastAPI server on http://localhost:8000")
    print("Press Ctrl+C to stop the server")
    
    # Start the API server using uvicorn
    subprocess.run(["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000", "--reload"], 
                  cwd=os.path.dirname(os.path.abspath(__file__)))

def main():
    """Main function to run the pipeline"""
    args = parse_args()
    
    # If --all is specified, run all steps
    if args.all:
        args.preprocess = True
        args.embed = True
        args.test_query = True
        args.start_api = True
    
    # If no args are specified, show help
    if not any([args.preprocess, args.embed, args.test_query, args.start_api]):
        print("No steps specified. Use --help to see available options.")
        return 1
    
    try:
        json_path = None
        vector_store_dir = None
        
        # Run data preprocessing if specified
        if args.preprocess:
            json_path = run_preprocessing()
        
        # Get JSON path if not from preprocessing
        if json_path is None and (args.embed or args.test_query or args.start_api):
            current_dir = os.path.dirname(os.path.abspath(__file__))
            data_dir = os.path.join(os.path.dirname(current_dir), "data")
            json_path = os.path.join(data_dir, "processed_incidents.json")
        
        # Run text embedding if specified
        if args.embed:
            vector_store_dir = run_embedding(json_path)
        
        # Get vector store dir if not from embedding
        if vector_store_dir is None and (args.test_query or args.start_api):
            current_dir = os.path.dirname(os.path.abspath(__file__))
            data_dir = os.path.join(os.path.dirname(current_dir), "data")
            vector_store_dir = os.path.join(data_dir, "vector_store")
        
        # Test query if specified
        if args.test_query:
            test_query(vector_store_dir)
        
        # Start API if specified
        if args.start_api:
            start_api()
        
        return 0
    except Exception as e:
        print(f"Error during pipeline: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())
