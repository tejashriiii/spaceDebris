import { useState } from 'react';
import axios from 'axios';
import './App.css';  // Keep for basic styling

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [resultImage, setResultImage] = useState(null);  // Base64 annotated image
  const [detections, setDetections] = useState([]);  // Array of detections
  const [loading, setLoading] = useState(false);  // For spinner during prediction
  const [error, setError] = useState(null);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setResultImage(null);  // Reset previous results
    setDetections([]);
    setError(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedFile) {
      setError('Please select an image');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);  // 'file' matches backend UploadFile

    try {
      const response = await axios.post('http://127.0.0.1:8000/predict', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResultImage(`data:image/jpeg;base64,${response.data.annotated_image}`);  // Display base64 as img src
      setDetections(response.data.detections);
    } catch (err) {
      setError('Error during prediction: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <h1>Space Debris Detector</h1>
      <form onSubmit={handleSubmit}>
        <input type="file" accept="image/*" onChange={handleFileChange} />
        <button type="submit" disabled={loading}>Detect Debris</button>
      </form>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {resultImage && (
        <div>
          <h2>Detected Image:</h2>
          <img src={resultImage} alt="Annotated Detection" style={{ maxWidth: '100%' }} />
        </div>
      )}
      {detections.length > 0 && (
        <div>
          <h2>Detections:</h2>
          <ul>
            {detections.map((det, index) => (
              <li key={index}>
                Class: {det.class}, Confidence: {(det.confidence * 100).toFixed(2)}%
                <br />
                Box: [{det.box.map(coord => coord.toFixed(0)).join(', ')}]
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;