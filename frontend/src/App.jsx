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

  // Handle file selection
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    
    if (file) {
      setSelectedFile(file);
      
      // Create preview URL for the uploaded image
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
      
      // Reset previous results
      setResultImage(null);
      setDetections([]);
      setError(null);
    }
  };

  // Handle form submission
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
      console.log('Sending request to backend...');
      
      const response = await axios.post('http://127.0.0.1:8000/predict', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60 seconds timeout
      });

      console.log('Response received:', response.data);

      // Set the annotated image
      setResultImage(`data:image/jpeg;base64,${response.data.annotated_image}`);
      
      // Set detections
      setDetections(response.data.detections || []);

    } catch (err) {
      console.error('Error:', err);
      
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

  // Clear/reset everything
  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResultImage(null);
    setDetections([]);
    setError(null);
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <h1>🛰️ Space Debris Detection System</h1>
          <p className="subtitle">AI-Powered Orbital Object Classification</p>
        </div>
      </header>

      {/* Info Banner */}
      <div className="info-banner">
        <div className="info-content">
          <span className="info-icon">ℹ️</span>
          <div>
            <strong>About:</strong> This system uses YOLOv8 deep learning model to detect and classify space debris, 
            satellites, and orbital objects in images. Upload an image to analyze.
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        
        {/* Left Panel - Upload Section */}
        <div className="left-panel">
          <div className="panel-card">
            <h2>📤 Upload Image</h2>
            
            <form onSubmit={handleSubmit} className="upload-form">
              <div className="file-input-wrapper">
                <input
                  type="file"
                  id="file-input"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="file-input"
                />
                <label htmlFor="file-input" className="file-input-label">
                  <span className="upload-icon">📁</span>
                  {selectedFile ? selectedFile.name : 'Choose an image...'}
                </label>
              </div>

              {previewUrl && (
                <div className="preview-section">
                  <h3>Preview:</h3>
                  <img src={previewUrl} alt="Preview" className="preview-image" />
                </div>
              )}

              <div className="button-group">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!selectedFile || loading}
                >
                  {loading ? '🔄 Analyzing...' : '🔍 Detect Debris'}
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleReset}
                  disabled={loading}
                >
                  🗑️ Clear
                </button>
              </div>
            </form>

            {error && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}

            {loading && (
              <div className="loading-spinner">
                <div className="spinner"></div>
                <p>Processing image... Please wait.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Results Section */}
        <div className="right-panel">
          <div className="panel-card">
            <h2>📊 Detection Results</h2>

            {!resultImage && !loading && (
              <div className="placeholder">
                <div className="placeholder-icon">🖼️</div>
                <p>Detection results will appear here</p>
                <p className="placeholder-hint">Upload an image and click "Detect Debris" to begin</p>
              </div>
            )}

            {resultImage && (
              <>
                <div className="result-image-section">
                  <h3>Annotated Image:</h3>
                  <img src={resultImage} alt="Detection Result" className="result-image" />
                </div>

                <div className="detections-section">
                  <h3>
                    Detected Objects: 
                    <span className="detection-count">{detections.length}</span>
                  </h3>

                  {detections.length === 0 ? (
                    <p className="no-detections">No debris detected in this image</p>
                  ) : (
                    <div className="detections-list">
                      {detections.map((det, index) => (
                        <div key={index} className="detection-item">
                          <div className="detection-header">
                            <span className="detection-number">#{index + 1}</span>
                            <span className="detection-class">{det.class}</span>
                            <span className={`confidence-badge ${det.confidence > 0.7 ? 'high' : det.confidence > 0.4 ? 'medium' : 'low'}`}>
                              {(det.confidence * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="detection-details">
                            <small>
                              Box: [{det.box.map(coord => coord.toFixed(0)).join(', ')}]
                            </small>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="footer">
        <p>Powered by YOLOv8 | Deep Learning Space Debris Detection</p>
      </footer>
    </div>
  );
}

export default App;