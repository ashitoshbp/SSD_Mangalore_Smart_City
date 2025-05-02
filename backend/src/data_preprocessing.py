import pandas as pd
import os
import json
from datetime import datetime

class DataPreprocessor:
    def __init__(self, excel_path=None, csv_path=None):
        """
        Initialize the DataPreprocessor with the path to the data file.
        
        Args:
            excel_path (str, optional): Path to the Excel file containing incident data
            csv_path (str, optional): Path to the CSV file containing incident data
        """
        self.excel_path = excel_path
        self.csv_path = csv_path
        self.data = None
        
    def load_data(self):
        """
        Load data from the Excel or CSV file.
        
        Returns:
            pd.DataFrame: Loaded DataFrame
        """
        if self.csv_path and os.path.exists(self.csv_path):
            print(f"Loading data from {self.csv_path}")
            self.data = pd.read_csv(self.csv_path)
        elif self.excel_path and os.path.exists(self.excel_path):
            print(f"Loading data from {self.excel_path}")
            self.data = pd.read_excel(self.excel_path)
        else:
            raise ValueError("No valid data file path provided")
            
        print(f"Loaded {len(self.data)} records")
        return self.data
    
    def clean_data(self):
        """
        Clean and preprocess the data.
        
        Returns:
            pd.DataFrame: Cleaned DataFrame
        """
        if self.data is None:
            self.load_data()
            
        # Make a copy to avoid modifying the original
        df = self.data.copy()
        
        # Convert column names to lowercase and replace spaces with underscores
        df.columns = [col.lower().replace(' ', '_').replace('.', '').replace('/', '_') for col in df.columns]
        
        # Handle missing values for text fields
        text_columns = ['incident_type', 'location', 'taluk', 'action_remarks', 'closed_remarks', 'info_source']
        for col in text_columns:
            if col in df.columns:
                df[col] = df[col].fillna('Unknown')
        
        # Convert date columns to datetime if they exist
        date_columns = [col for col in df.columns if 'date' in col or 'time' in col or col in ['received_date_time', 'incident_reported_at', 'action_date_time', 'closed_at']]
        for col in date_columns:
            if col in df.columns:
                try:
                    df[col] = pd.to_datetime(df[col], errors='coerce')
                except:
                    print(f"Could not convert {col} to datetime")
        
        # Calculate time differences if both action and incident dates exist
        if 'incident_reported_at' in df.columns and 'action_date_time' in df.columns:
            df['action_time_hours'] = (df['action_date_time'] - df['incident_reported_at']).dt.total_seconds() / 3600
        
        # Calculate time differences if both closed and incident dates exist
        if 'incident_reported_at' in df.columns and 'closed_at' in df.columns:
            df['resolution_time_hours'] = (df['closed_at'] - df['incident_reported_at']).dt.total_seconds() / 3600
            
        # Create a text field that combines relevant information for embedding
        # Include all relevant columns for comprehensive search
        text_columns = [
            'incident_type', 'location', 'taluk', 'action_taken_by', 
            'action_remarks', 'closed_by_officer', 'closed_remarks', 
            'info_source'
        ]
        text_columns = [col for col in text_columns if col in df.columns]
        
        df['combined_text'] = df[text_columns].apply(
            lambda row: ' '.join(str(val) for val in row if pd.notna(val)), 
            axis=1
        )
        
        # Add time information to combined text
        if 'time_taken_to_take_action' in df.columns:
            df['combined_text'] += df['time_taken_to_take_action'].apply(
                lambda x: f" Action time: {x}" if pd.notna(x) else ""
            )
            
        if 'time_taken_to_close' in df.columns:
            df['combined_text'] += df['time_taken_to_close'].apply(
                lambda x: f" Resolution time: {x}" if pd.notna(x) else ""
            )
        
        self.data = df
        print(f"Data cleaned. Shape: {df.shape}")
        return df
    
    def save_processed_data(self, output_path):
        """
        Save the processed data to a CSV file.
        
        Args:
            output_path (str): Path to save the processed data
        """
        if self.data is None:
            raise ValueError("No data to save. Please load and clean data first.")
            
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Save to CSV
        self.data.to_csv(output_path, index=False)
        print(f"Processed data saved to {output_path}")
        
        # Also save a JSON version for easier consumption by the RAG system
        json_path = output_path.replace('.csv', '.json')
        
        # Convert datetime columns to strings for JSON serialization
        json_df = self.data.copy()
        for col in json_df.columns:
            if pd.api.types.is_datetime64_any_dtype(json_df[col]):
                json_df[col] = json_df[col].dt.strftime('%Y-%m-%d %H:%M:%S')
                
        # Save to JSON
        json_df.to_json(json_path, orient='records', date_format='iso')
        print(f"JSON version saved to {json_path}")
        
    def get_data_stats(self):
        """
        Get basic statistics about the data.
        
        Returns:
            dict: Dictionary containing data statistics
        """
        if self.data is None:
            raise ValueError("No data available. Please load data first.")
            
        stats = {
            "total_records": len(self.data),
            "columns": list(self.data.columns),
            "missing_values": self.data.isnull().sum().to_dict(),
        }
        
        # Get incident type distribution if it exists
        if 'incident_type' in self.data.columns:
            stats["incident_types"] = self.data['incident_type'].value_counts().to_dict()
            
        # Get taluk distribution if it exists
        if 'taluk' in self.data.columns:
            stats["taluks"] = self.data['taluk'].value_counts().to_dict()
            
        # Get location distribution if it exists
        if 'location' in self.data.columns:
            stats["locations"] = self.data['location'].value_counts().head(20).to_dict()
            
        return stats

# Example usage
if __name__ == "__main__":
    # Get the directory of the current script
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Navigate to the parent directory (backend) and then to the data directory
    data_dir = os.path.join(os.path.dirname(current_dir), "data")
    
    # Define paths
    excel_path = os.path.join(os.path.dirname(os.path.dirname(current_dir)), "Incident_Report (1).xlsx")
    csv_path = os.path.join(os.path.dirname(os.path.dirname(current_dir)), "modified_dataset.csv")
    output_path = os.path.join(data_dir, "processed_incidents.csv")
    
    # Create an instance of DataPreprocessor
    preprocessor = DataPreprocessor(excel_path=excel_path, csv_path=csv_path)
    
    # Load and clean the data
    preprocessor.load_data()
    preprocessor.clean_data()
    
    # Save the processed data
    preprocessor.save_processed_data(output_path)
    
    # Get and print data statistics
    stats = preprocessor.get_data_stats()
    print("\nData Statistics:")
    print(json.dumps(stats, indent=2))
