import os
import sys
from data_preprocessing import DataPreprocessor
from text_embedding import TextProcessor

def main():
    """
    Main function to run the data preprocessing and text embedding pipeline.
    """
    # Get the directory of the current script
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Navigate to the parent directory (backend) and then to the data directory
    backend_dir = os.path.dirname(current_dir)
    data_dir = os.path.join(backend_dir, "data")
    
    # Ensure data directory exists
    os.makedirs(data_dir, exist_ok=True)
    
    # Define paths
    excel_path = os.path.join(os.path.dirname(backend_dir), "Incident_Report (1).xlsx")
    output_path = os.path.join(data_dir, "processed_incidents.csv")
    json_path = output_path.replace('.csv', '.json')
    vector_store_dir = os.path.join(data_dir, "vector_store")
    
    print(f"Excel path: {excel_path}")
    print(f"Output path: {output_path}")
    
    try:
        # Step 1: Data Preprocessing
        print("\n===== Step 1: Data Preprocessing =====")
        preprocessor = DataPreprocessor(excel_path)
        preprocessor.load_data()
        preprocessor.clean_data()
        preprocessor.save_processed_data(output_path)
        
        # Get and print data statistics
        stats = preprocessor.get_data_stats()
        print("\nData preprocessing completed successfully!")
        print(f"Processed data saved to {output_path}")
        print(f"JSON version saved to {json_path}")
        
        # Step 2: Text Chunking and Embedding
        print("\n===== Step 2: Text Chunking and Embedding =====")
        processor = TextProcessor(json_path)
        processor.load_data()
        processor.create_chunks()
        processor.initialize_embedding_model()
        processor.generate_embeddings()
        processor.create_faiss_index()
        processor.save_processed_data(vector_store_dir)
        
        print("\nAll processing completed successfully!")
        return 0
    except Exception as e:
        print(f"Error during processing: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
