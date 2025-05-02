import React, { useState, useEffect, useRef } from 'react';
import './QueryInterface.css';

const QueryInterface = () => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [modelName, setModelName] = useState('mistral');
  const [availableModels, setAvailableModels] = useState(['mistral', 'llama2']);
  const [stats, setStats] = useState(null);
  const [queryHistory, setQueryHistory] = useState([]);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [numChunks, setNumChunks] = useState(5);
  const [visualizationType, setVisualizationType] = useState('text');
  const [suggestions, setSuggestions] = useState([]);
  
  const textareaRef = useRef(null);

  // Example queries to help users get started
  const exampleQueries = [
    "What are the top 5 longest open flood cases in Mangalore?",
    "Show me all fire incidents in Kankanady closed in under 2 hours",
    "Which areas have the most incidents?",
    "What is the average resolution time for traffic accidents?",
    "Compare the number of incidents between different areas of Mangalore",
    "List all incidents that took more than 24 hours to resolve"
  ];

  // Fetch available models on component mount
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch('http://localhost:8000/models');
        if (response.ok) {
          const data = await response.json();
          setAvailableModels(data.models);
        }
      } catch (error) {
        console.error('Error fetching models:', error);
      }
    };

    const fetchStats = async () => {
      try {
        const response = await fetch('http://localhost:8000/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchModels();
    fetchStats();
    
    // Load query history from localStorage
    const savedHistory = localStorage.getItem('queryHistory');
    if (savedHistory) {
      try {
        setQueryHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Error parsing query history:', e);
      }
    }
  }, []);
  
  // Generate query suggestions based on the current input
  useEffect(() => {
    if (query.trim().length > 3) {
      // Generate suggestions based on the current query
      const generateSuggestions = () => {
        const baseSuggestions = [
          "Show incidents in " + query,
          "Compare " + query + " with other incident types",
          "What's the average resolution time for " + query,
          "List all " + query + " incidents by location"
        ];
        
        // Filter suggestions to only include those relevant to the query
        return baseSuggestions.filter(suggestion => 
          !query.includes(suggestion) && 
          suggestion.toLowerCase() !== query.toLowerCase()
        ).slice(0, 3);
      };
      
      setSuggestions(generateSuggestions());
    } else {
      setSuggestions([]);
    }
  }, [query]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!query.trim()) return;
    
    setIsLoading(true);
    setError(null);
    setResponse(null);
    
    try {
      const response = await fetch('http://localhost:8000/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query,
          num_chunks: numChunks,
          model: modelName
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setResponse(data);
      
      // Add to query history
      const newHistoryItem = {
        id: Date.now(),
        query: query,
        timestamp: new Date().toISOString(),
        model: modelName
      };
      
      const updatedHistory = [newHistoryItem, ...queryHistory].slice(0, 10);
      setQueryHistory(updatedHistory);
      
      // Save to localStorage
      localStorage.setItem('queryHistory', JSON.stringify(updatedHistory));
    } catch (error) {
      setError(error.message || 'An error occurred while processing your query');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleClick = (exampleQuery) => {
    setQuery(exampleQuery);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };
  
  const handleHistoryClick = (historyItem) => {
    setQuery(historyItem.query);
    setModelName(historyItem.model || 'mistral');
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };
  
  const handleVoiceInput = () => {
    // Toggle voice recording state
    setIsVoiceRecording(!isVoiceRecording);
    
    if (!isVoiceRecording) {
      // Start recording
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        
        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setQuery(transcript);
          setIsVoiceRecording(false);
        };
        
        recognition.onerror = (event) => {
          console.error('Speech recognition error', event.error);
          setIsVoiceRecording(false);
        };
        
        recognition.onend = () => {
          setIsVoiceRecording(false);
        };
        
        recognition.start();
      } else {
        alert('Speech recognition is not supported in your browser.');
        setIsVoiceRecording(false);
      }
    }
  };
  
  const handleFeedback = (isPositive) => {
    // In a real app, this would send feedback to the server
    alert(`Thank you for your ${isPositive ? 'positive' : 'negative'} feedback!`);
  };
  
  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };
  
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        alert('Copied to clipboard!');
      })
      .catch(err => {
        console.error('Could not copy text: ', err);
      });
  };

  return (
    <div className="query-interface">
      <div className="query-header">
        <h2>Natural Language Query Interface</h2>
        <p>Ask questions about Mangalore Smart City incidents in plain English</p>
      </div>
      
      <div className="query-container">
        <div className="query-form-container">
          <form onSubmit={handleSubmit} className="query-form">
            <div className="input-group">
              <textarea
                ref={textareaRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask a question about incidents in Mangalore..."
                className="query-input"
                rows={4}
              />
              <button 
                type="button" 
                className={`voice-input-button ${isVoiceRecording ? 'voice-recording' : ''}`}
                onClick={handleVoiceInput}
                title="Voice Input"
              >
                {isVoiceRecording ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3z"/>
                    <path d="M17 12c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                  </svg>
                )}
              </button>
            </div>
            
            {suggestions.length > 0 && (
              <div className="suggestions-container">
                <div className="suggestions-title">Suggestions:</div>
                <div className="suggestions-list">
                  {suggestions.map((suggestion, index) => (
                    <div 
                      key={index} 
                      className="suggestion-chip"
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="form-controls">
              <div className="model-selector">
                <label htmlFor="model-select">Model:</label>
                <select
                  id="model-select"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="model-select"
                >
                  {availableModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>
              
              <button
                type="submit"
                className="submit-button"
                disabled={isLoading || !query.trim()}
              >
                {isLoading ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8Z">
                        <animateTransform 
                          attributeName="transform" 
                          type="rotate" 
                          from="0 12 12" 
                          to="360 12 12" 
                          dur="1s" 
                          repeatCount="indefinite"
                        />
                      </path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M10 20H14V4H10V20ZM4 20H8V12H4V20ZM16 20H20V10H16V20Z"/>
                    </svg>
                    Ask Question
                  </>
                )}
              </button>
            </div>
            
            <div className="query-options">
              <div className="option-item">
                <input 
                  type="checkbox" 
                  id="advanced-options" 
                  checked={showAdvancedOptions}
                  onChange={() => setShowAdvancedOptions(!showAdvancedOptions)}
                />
                <label htmlFor="advanced-options">Advanced Options</label>
              </div>
            </div>
            
            {showAdvancedOptions && (
              <div className="advanced-options" style={{ marginTop: '15px' }}>
                <div className="option-row">
                  <label htmlFor="num-chunks">Number of chunks to retrieve:</label>
                  <input 
                    type="range" 
                    id="num-chunks" 
                    min="1" 
                    max="10" 
                    value={numChunks}
                    onChange={(e) => setNumChunks(parseInt(e.target.value))}
                  />
                  <span>{numChunks}</span>
                </div>
              </div>
            )}
          </form>
          
          <div className="example-queries">
            <h3>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-2.3l-.85-.6A4.997 4.997 0 0 1 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.8 3.16-2.15 4.1z"/>
              </svg>
              Example Queries
            </h3>
            <ul>
              {exampleQueries.map((exampleQuery, index) => (
                <li key={index}>
                  <button
                    onClick={() => handleExampleClick(exampleQuery)}
                    className="example-query-button"
                  >
                    {exampleQuery}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          
          {queryHistory.length > 0 && (
            <div className="query-history">
              <h3>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.23-3.5-2.08V8H12z"/>
                </svg>
                Recent Queries
              </h3>
              <div className="history-list">
                {queryHistory.map((item) => (
                  <div 
                    key={item.id} 
                    className="history-item"
                    onClick={() => handleHistoryClick(item)}
                  >
                    <div className="history-query">{item.query}</div>
                    <div className="history-meta">
                      <span>{new Date(item.timestamp).toLocaleString()}</span>
                      <span>Model: {item.model || 'mistral'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="query-results">
          {isLoading && (
            <div className="loading-indicator">
              <div className="spinner"></div>
              <p>Processing your query...</p>
            </div>
          )}
          
          {error && (
            <div className="error-message">
              <h3>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                Error
              </h3>
              <p>{error}</p>
            </div>
          )}
          
          {response && (
            <div className="response-container">
              <div className="response-answer">
                <h3>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  Answer
                </h3>
                <div className="answer-text">{response.answer}</div>
                <div className="response-meta">
                  <span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                    </svg>
                    {(response.processing_time_ms / 1000).toFixed(2)}s
                  </span>
                  <span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                    Model: {modelName}
                  </span>
                </div>
                
                <div className="feedback-buttons">
                  <button 
                    className="feedback-button positive"
                    onClick={() => handleFeedback(true)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-1.91l-.01-.01L23 10z"/>
                    </svg>
                    Helpful
                  </button>
                  <button 
                    className="feedback-button negative"
                    onClick={() => handleFeedback(false)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v1.91l.01.01L1 14c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/>
                    </svg>
                    Not Helpful
                  </button>
                  <button 
                    className="action-button"
                    onClick={() => copyToClipboard(response.answer)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                    </svg>
                    Copy
                  </button>
                </div>
              </div>
              
              <div className="visualization-toggle">
                <button 
                  className={`viz-button ${visualizationType === 'text' ? 'active' : ''}`}
                  onClick={() => setVisualizationType('text')}
                >
                  Text
                </button>
                <button 
                  className={`viz-button ${visualizationType === 'sources' ? 'active' : ''}`}
                  onClick={() => setVisualizationType('sources')}
                >
                  Sources
                </button>
              </div>
              
              {visualizationType === 'sources' && (
                <div className="relevant-chunks">
                  <h3>
                    Relevant Information Sources ({response.num_chunks_retrieved})
                  </h3>
                  <div className="chunks-list">
                    {response.relevant_chunks.map((chunk, index) => (
                      <div key={index} className="chunk-item">
                        <div className="chunk-content">{chunk.text}</div>
                        <div className="chunk-meta">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                          </svg>
                          <span>Source: Incident #{chunk.metadata.source}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {!isLoading && !error && !response && stats && (
            <div className="dataset-stats">
              <h3>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                </svg>
                Dataset Overview
              </h3>
              <div className="stats-container">
                <div className="stat-item">
                  <div className="stat-value">{stats.total_incidents}</div>
                  <div className="stat-label">Total Incidents</div>
                </div>
                
                <div className="stat-item">
                  <div className="stat-value">{Object.keys(stats.incident_types || {}).length}</div>
                  <div className="stat-label">Incident Types</div>
                </div>
                
                <div className="stat-item">
                  <div className="stat-value">{Object.keys(stats.locations || {}).length}</div>
                  <div className="stat-label">Locations</div>
                </div>
              </div>
              
              <div className="top-incidents">
                <h4>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
                  </svg>
                  Top Incident Types
                </h4>
                <ul>
                  {Object.entries(stats.incident_types || {})
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([type, count], index) => (
                      <li key={index}>
                        <span className="incident-type">{type}</span>
                        <span className="incident-count">{count}</span>
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QueryInterface;
