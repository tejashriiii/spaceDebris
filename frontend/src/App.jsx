import { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [resultImage, setResultImage] = useState(null);
  const [detections, setDetections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    
    if (file) {
      setSelectedFile(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
      
      setResultImage(null);
      setDetections([]);
      setError(null);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!selectedFile) {
      setError('Please select an image first');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await axios.post('http://127.0.0.1:8000/predict', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000,
      });

      setResultImage(`data:image/jpeg;base64,${response.data.annotated_image}`);
      setDetections(response.data.detections || []);

    } catch (err) {
      if (err.code === 'ECONNABORTED') {
        setError('Request timeout. The model is taking too long to respond.');
      } else if (err.response) {
        setError(`Server error: ${err.response.data.detail || err.response.statusText}`);
      } else if (err.request) {
        setError('Network error: Cannot connect to backend. Make sure the server is running on http://127.0.0.1:8000');
      } else {
        setError(`Error: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResultImage(null);
    setDetections([]);
    setError(null);
  };

  return (
    <div className="app">
      {/* Header with GitHub Link */}
      <header className="header">
        <h1>Space Debris Detection System</h1>
        <a 
          href="https://github.com/tejashriiii/spaceDebris" 
          target="_blank" 
          rel="noopener noreferrer"
          className="github-link"
          aria-label="View on GitHub"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
        </a>
      </header>

      {/* Info Bar */}
      <div className="info-bar">
        <p>This is a YOLOv8n model trained to detect space debris and satellites in Earth's orbit using Synthetic Aperture Radar (SAR) imagery. The model classifies 11 different types of orbital objects including satellites, debris, and spacecraft components with real-time detection capabilities.</p>
      </div>

      {/* Main Grid */}
      <div className="main-container">
        {/* Left Side - Upload */}
        <div className="left-panel">
          <form onSubmit={handleSubmit} className="upload-form">
            <div className="upload-zone">
              <input
                type="file"
                id="file-upload"
                accept="image/*"
                onChange={handleFileChange}
                className="file-input"
              />
              <label htmlFor="file-upload" className="file-label">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <span>Choose Image File</span>
              </label>
              {selectedFile && (
                <div className="filename">{selectedFile.name}</div>
              )}
            </div>

            {previewUrl && (
              <div className="preview-box">
                <div className="image-container">
                  <img src={previewUrl} alt="Original" />
                </div>
                <div className="image-label">Original Image</div>
              </div>
            )}

            {!previewUrl && (
              <div className="preview-placeholder">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                <p>No image selected</p>
              </div>
            )}

            <div className="button-group">
              <button type="submit" className="btn-detect" disabled={!selectedFile || loading}>
                {loading ? 'Processing...' : 'Run Detection'}
              </button>
              <button type="button" className="btn-clear" onClick={handleReset} disabled={loading}>
                Clear
              </button>
            </div>

            {error && (
              <div className="error-box">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>{error}</span>
              </div>
            )}

            {loading && (
              <div className="loading-box">
                <div className="loading-spinner"></div>
                <p>Analyzing image with YOLOv8...</p>
              </div>
            )}
          </form>
        </div>

        {/* Right Side - Results */}
        <div className="right-panel">
          {!resultImage && !loading && (
            <div className="empty-state">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
              <p>Detection results will appear here</p>
              <p className="hint">Upload an image and run detection to begin analysis</p>
            </div>
          )}

          {resultImage && (
            <div className="results-container">
              <div className="result-image-section">
                <div className="image-container">
                  <img src={resultImage} alt="Detected" />
                </div>
                <div className="image-label">
                  Detected Objects: {detections.length}
                </div>
              </div>

              {detections.length > 0 && (
                <div className="detections-grid">
                  {detections.map((det, index) => (
                    <div key={index} className="detection-card">
                      <div className="card-header">
                        <span className="card-number">#{index + 1}</span>
                        <span className="card-class">{det.class}</span>
                      </div>
                      <div className="card-body">
                        <div className="confidence-section">
                          <span className="confidence-label">Confidence</span>
                          <span className="confidence-value">{(det.confidence * 100).toFixed(1)}%</span>
                        </div>
                        <div className="confidence-bar">
                          <div 
                            className="confidence-fill" 
                            style={{ width: `${det.confidence * 100}%` }}
                          />
                        </div>
                        <div className="bbox-section">
                          <span className="bbox-label">Coordinates</span>
                          <span className="bbox-value">
                            [{det.box.map(c => c.toFixed(0)).join(', ')}]
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {detections.length === 0 && (
                <div className="no-detections">
                  <p>No objects detected in this image</p>
                  <p>The model did not find any debris or satellites with sufficient confidence</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;