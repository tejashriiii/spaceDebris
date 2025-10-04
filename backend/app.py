from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
import cv2
import numpy as np
from io import BytesIO
from PIL import Image
import base64
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Space Debris Detector API",
    description="API for detecting space debris in images using YOLOv8",
    version="1.0.0"
)

# CORS Configuration - Allow your frontend to access the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",      # Vite default
        "http://127.0.0.1:5173",      # Alternative localhost
        "http://localhost:3000",      # React default
        "http://127.0.0.1:3000",      # Alternative
        "*"                           # Allow all (remove in production)
    ],
    allow_credentials=True,
    allow_methods=["*"],              # Allow all HTTP methods
    allow_headers=["*"],              # Allow all headers
)

# Load YOLO model at startup
logger.info("Loading YOLOv8 model...")
try:
    model = YOLO("best.pt", task='detect')
    logger.info(" Model loaded successfully!")
except Exception as e:
    logger.error(f" Failed to load model: {e}")
    model = None

@app.on_event("startup")
async def startup_event():
    """Run on server startup"""
    logger.info(" Space Debris Detection API is starting...")
    if model:
        logger.info(f" Model can detect: {list(model.names.values())}")

@app.get("/")
def root():
    """Root endpoint - health check"""
    return {
        "message": "Welcome to Space Debris Detector API",
        "status": "online",
        "model_loaded": model is not None,
        "endpoints": {
            "predict": "/predict (POST)",
            "health": "/health (GET)"
        }
    }

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "classes": list(model.names.values()) if model else []
    }

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    """
    Predict space debris in uploaded image
    
    Args:
        file: Image file (jpg, png, etc.)
    
    Returns:
        JSON with annotated_image (base64) and detections list
    """
    
    # Check if model is loaded
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    # Validate file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    logger.info(f"Processing image: {file.filename}")
    
    try:
        # Read and convert image
        contents = await file.read()
        image = Image.open(BytesIO(contents))
        
        # Convert to RGB if necessary (handles RGBA, grayscale, etc.)
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Convert to numpy array for YOLO
        image_np = np.array(image)
        
        logger.info("Running YOLO prediction...")
        
        # Run prediction
        results = model.predict(
            source=image_np,
            conf=0.25,           # Confidence threshold
            iou=0.45,            # IoU threshold for NMS
            device='cpu',        # Use 'cuda' if you have GPU
            verbose=False        # Suppress YOLO output
        )
        
        # Get result object
        result = results[0]
        
        # Get annotated image with boxes drawn
        annotated_image = result.plot()  # Returns BGR image with boxes
        
        # Convert BGR to RGB for proper display
        annotated_image_rgb = cv2.cvtColor(annotated_image, cv2.COLOR_BGR2RGB)
        
        # Encode to JPEG and then to base64
        success, buffer = cv2.imencode('.jpg', annotated_image_rgb)
        if not success:
            raise Exception("Failed to encode image")
        
        img_base64 = base64.b64encode(buffer).decode('utf-8')
        
        # Extract detection information
        detections = []
        if result.boxes is not None and len(result.boxes) > 0:
            for box in result.boxes:
                class_id = int(box.cls[0])
                class_name = model.names[class_id]
                confidence = float(box.conf[0])
                bbox = box.xyxy[0].tolist()  # [x1, y1, x2, y2]
                
                detections.append({
                    "class": class_name,
                    "confidence": confidence,
                    "box": bbox
                })
            
            logger.info(f"Found {len(detections)} objects")
        else:
            logger.info("No objects detected")
        
        # Return response
        return JSONResponse(content={
            "success": True,
            "annotated_image": img_base64,
            "detections": detections,
            "num_detections": len(detections),
            "image_size": list(image.size)
        })
    
    except Exception as e:
        logger.error(f"Error during prediction: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@app.get("/model-info")
def model_info():
    """Get information about the loaded model"""
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    return {
        "model_type": "YOLOv8",
        "classes": model.names,
        "num_classes": len(model.names)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)