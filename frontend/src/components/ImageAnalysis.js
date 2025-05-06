import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import './ImageAnalysis.css';

const ImageAnalysis = () => {
  const [beforeImg, setBeforeImg] = useState(null);
  const [afterImg, setAfterImg] = useState(null);
  const [previewBefore, setPreviewBefore] = useState(null);
  const [previewAfter, setPreviewAfter] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImageChange = (e, setImg, setPreview) => {
    const file = e.target.files[0];
    if (file) {
      setImg(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!beforeImg || !afterImg) {
      setError('Please upload both before and after images.');
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);
    const formData = new FormData();
    formData.append('before', beforeImg);
    formData.append('after', afterImg);
    try {
      const res = await axios.post('http://localhost:5000/analyze-incident-images/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
    } catch (err) {
      setError('Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100
      }
    }
  };

  return (
    <div className="image-analysis-container">
      {/* Background decorations */}
      <div className="bg-decoration bg-circle-1"></div>
      <div className="bg-decoration bg-circle-2"></div>
      <div className="bg-decoration bg-circle-3"></div>
      
      <motion.div 
        className="image-analysis-content"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="image-analysis-header" variants={itemVariants}>
          <h1>Incident Image Analysis</h1>
          <p className="analysis-subtitle">Upload before and after images to analyze incidents and receive AI-powered insights</p>
        </motion.div>

        <motion.div className="image-upload-section" variants={itemVariants}>
          <div className="upload-container">
            <form className="image-upload-form" onSubmit={handleSubmit}>
              <div className="image-upload-row">
                <motion.div 
                  className="upload-card"
                  whileHover={{ y: -5, boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)' }}
                >
                  <div className="upload-header">
                    <h3>Before Incident</h3>
                    <p>Upload image showing the scene before the incident</p>
                  </div>
                  <div className="upload-area">
                    <input 
                      type="file" 
                      id="before-image" 
                      accept="image/*" 
                      onChange={e => handleImageChange(e, setBeforeImg, setPreviewBefore)} 
                      className="file-input"
                    />
                    <label htmlFor="before-image" className="file-label">
                      {previewBefore ? 'Change Image' : 'Choose Image'}
                    </label>
                  </div>
                  {previewBefore && (
                    <div className="preview-container">
                      <img src={previewBefore} alt="Before Preview" className="img-preview" />
                    </div>
                  )}
                </motion.div>

                <motion.div 
                  className="upload-card"
                  whileHover={{ y: -5, boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)' }}
                >
                  <div className="upload-header">
                    <h3>After Incident</h3>
                    <p>Upload image showing the scene after the incident</p>
                  </div>
                  <div className="upload-area">
                    <input 
                      type="file" 
                      id="after-image" 
                      accept="image/*" 
                      onChange={e => handleImageChange(e, setAfterImg, setPreviewAfter)} 
                      className="file-input"
                    />
                    <label htmlFor="after-image" className="file-label">
                      {previewAfter ? 'Change Image' : 'Choose Image'}
                    </label>
                  </div>
                  {previewAfter && (
                    <div className="preview-container">
                      <img src={previewAfter} alt="After Preview" className="img-preview" />
                    </div>
                  )}
                </motion.div>
              </div>

              <motion.button 
                className="analyze-button" 
                type="submit" 
                disabled={loading}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Analyzing...
                  </>
                ) : 'Analyze Images'}
              </motion.button>
              
              {error && <div className="error-message">{error}</div>}
            </form>
          </div>
        </motion.div>

        {result && (
          <motion.div 
            className="analysis-results-section"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 60 }}
          >
            <div className="results-header">
              <h2>Analysis Results</h2>
              <div className="severity-indicator">
                <span className="severity-label">Severity:</span>
                <span className={`severity-badge ${result.severity.toLowerCase()}`}>
                  {result.severity}
                </span>
                <span className="severity-score">({(result.severity_score * 100).toFixed(1)}%)</span>
              </div>
            </div>

            <div className="results-grid">
              <div className="results-card visualization-card">
                <h3>Change Detection</h3>
                <div className="visualization-container">
                  <img 
                    src={`data:image/png;base64,${result.change_visualization}`} 
                    alt="Change Visualization" 
                    className="change-vis-img" 
                  />
                </div>
              </div>

              <div className="results-card incident-card">
                <h3>Incident Analysis</h3>
                <div className="incident-details">
                  <div className="incident-header">
                    <div className="incident-type-container">
                      <span className="result-label">Type:</span>
                      <span className="incident-type-value">{result.incident_type}</span>
                      <span className="confidence-score">({(result.type_confidence * 100).toFixed(1)}% confidence)</span>
                    </div>
                    <div className="severity-display">
                      <div className="severity-meter">
                        <div className={`severity-fill ${result.severity.toLowerCase()}`} style={{width: `${result.severity_score * 100}%`}}></div>
                      </div>
                      <div className="severity-text">
                        <span className="severity-label">Severity:</span>
                        <span className={`severity-badge ${result.severity.toLowerCase()}`}>{result.severity}</span>
                        <span className="severity-score">({(result.severity_score * 100).toFixed(1)}%)</span>
                      </div>
                    </div>
                  </div>
                  <div className="incident-description">
                    <span className="result-label">Description:</span>
                    <p>{result.description}</p>
                  </div>
                </div>
              </div>

              <div className="results-card measures-card">
                <h3>Recommended Actions</h3>
                <div className="measures-container">
                  {result.suggested_measures.map((measure, index) => (
                    <div key={index} className="measure-item">
                      <span className="measure-number">{index + 1}</span>
                      <span className="measure-text">{measure}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default ImageAnalysis;
