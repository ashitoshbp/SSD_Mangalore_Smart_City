import os
import json
import faiss
import numpy as np
from typing import List, Dict, Any, Optional
from langchain_community.llms import Ollama
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain

class IncidentRetriever:
    def __init__(self, vector_store_dir: str, model_name: str = "mistral"):
        """
        Initialize the IncidentRetriever with the vector store directory and Ollama model.
        
        Args:
            vector_store_dir (str): Directory containing the vector store
            model_name (str): Name of the Ollama model to use
        """
        self.vector_store_dir = vector_store_dir
        self.model_name = model_name
        self.chunks = None
        self.index = None
        self.embedding_model = None
        self.llm = None
        
    def load_resources(self):
        """
        Load all necessary resources: chunks, index, embedding model, and LLM.
        """
        print("Loading resources...")
        
        # Load chunks
        chunks_path = os.path.join(self.vector_store_dir, "chunks.json")
        with open(chunks_path, 'r') as f:
            self.chunks = json.load(f)
        print(f"Loaded {len(self.chunks)} chunks")
        
        # Load FAISS index
        index_path = os.path.join(self.vector_store_dir, "faiss_index.bin")
        self.index = faiss.read_index(index_path)
        print(f"Loaded FAISS index with {self.index.ntotal} vectors")
        
        # Load embedding model
        print("Loading embedding model...")
        self.embedding_model = HuggingFaceEmbeddings(
            model_name="all-MiniLM-L6-v2",
            model_kwargs={'device': 'cpu'},
            encode_kwargs={'normalize_embeddings': True}
        )
        print("Embedding model loaded")
        
        # Initialize Ollama LLM
        print(f"Initializing Ollama with model {self.model_name}...")
        self.llm = Ollama(model=self.model_name)
        print("Ollama initialized")
        
    def retrieve_relevant_chunks(self, query: str, k: int = 5) -> List[Dict]:
        """
        Retrieve the k most relevant chunks for a query.
        
        Args:
            query (str): The query string
            k (int): Number of chunks to retrieve
            
        Returns:
            List[Dict]: List of relevant chunks with metadata
        """
        if self.index is None or self.chunks is None or self.embedding_model is None:
            self.load_resources()
            
        # Generate embedding for the query
        query_embedding = self.embedding_model.embed_query(query)
        
        # Search the index
        distances, indices = self.index.search(
            np.array([query_embedding]).astype('float32'), 
            k=min(k, len(self.chunks))
        )
        
        # Get the relevant chunks
        relevant_chunks = [self.chunks[idx] for idx in indices[0]]
        
        return relevant_chunks
    
    def generate_answer(self, query: str, relevant_chunks: List[Dict]) -> str:
        """
        Generate an answer to the query using the relevant chunks and Ollama.
        
        Args:
            query (str): The query string
            relevant_chunks (List[Dict]): List of relevant chunks
            
        Returns:
            str: Generated answer
        """
        if self.llm is None:
            self.load_resources()
            
        # Prepare context from chunks
        context = "\n\n".join([chunk["text"] for chunk in relevant_chunks])
        
        # Create prompt template
        template = """
        You are an AI assistant for the Mangalore Smart City Incident Management System.
        
        Use the following incident data to answer the user's question. The data includes information about various incidents in Mangalore, including landslides, floods, tree falls, and other emergencies.
        
        INCIDENT DATA:
        {context}
        
        USER QUESTION: {query}
        
        Provide a clear, concise, and accurate answer based only on the information provided above. Include relevant statistics or data points if available.
        
        If the question asks about time-related information (like resolution times, response times, etc.), be sure to include that in your answer.
        
        If the question asks about specific locations or taluks, provide that geographic information in your answer.
        
        If the question asks for a comparison between different incident types, locations, or time periods, structure your answer to clearly show the comparison.
        
        If you don't know the answer or the information is not in the provided data, say "I don't have enough information to answer this question."
        
        ANSWER:
        """
        
        prompt = PromptTemplate(
            input_variables=["context", "query"],
            template=template
        )
        
        # Create chain
        chain = LLMChain(llm=self.llm, prompt=prompt)
        
        # Run chain
        response = chain.run(context=context, query=query)
        
        return response
    
    def process_query(self, query: str, k: int = 5) -> Dict[str, Any]:
        """
        Process a query and return the answer along with relevant chunks.
        
        Args:
            query (str): The query string
            k (int): Number of chunks to retrieve
            
        Returns:
            Dict[str, Any]: Dictionary containing the answer and relevant chunks
        """
        # Retrieve relevant chunks
        relevant_chunks = self.retrieve_relevant_chunks(query, k)
        
        # Generate answer
        answer = self.generate_answer(query, relevant_chunks)
        
        # Prepare response
        response = {
            "query": query,
            "answer": answer,
            "relevant_chunks": relevant_chunks,
            "num_chunks_retrieved": len(relevant_chunks)
        }
        
        return response

# Example usage
if __name__ == "__main__":
    # Get the directory of the current script
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Navigate to the parent directory (backend) and then to the data directory
    data_dir = os.path.join(os.path.dirname(current_dir), "data")
    vector_store_dir = os.path.join(data_dir, "vector_store")
    
    # Create an instance of IncidentRetriever
    retriever = IncidentRetriever(vector_store_dir, model_name="mistral")
    
    # Load resources
    retriever.load_resources()
    
    # Process a sample query
    query = "What are the top 3 most common incident types in Mangalore?"
    response = retriever.process_query(query, k=10)
    
    print(f"\nQuery: {query}")
    print(f"Answer: {response['answer']}")
    print(f"Number of relevant chunks: {response['num_chunks_retrieved']}")
