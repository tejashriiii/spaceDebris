from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from ultralytics import YOLO
import cv2
import numpy as np
from io import BytesIO
from PIL import Image
import base64  # For encoding the annotated image to send back as JSON

app = FastAPI(title="Space Debris Detector API")

model = YOLO("best.pt")  # This loads once when the server starts

@app.get("/")
def root():
    return {"message": "Welcome to Space Debris Detector API"}

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    try:
        # Read the uploaded image file
        contents = await file.read()
        image = Image.open(BytesIO(contents))
        image_np = np.array(image)  # Convert to NumPy array for YOLO

        # Run YOLO prediction
        results = model.predict(source=image_np, conf=0.25)  # conf=0.25 filters low-confidence detections

        # Get the annotated image (with bounding boxes drawn)
        annotated_image = results[0].plot()  # Ultralytics draws boxes, labels, conf
        annotated_image = cv2.cvtColor(annotated_image, cv2.COLOR_BGR2RGB)  # Ensure RGB format

        # Encode annotated image to base64 (so frontend can display it easily)
        _, buffer = cv2.imencode('.jpg', annotated_image)
        img_base64 = base64.b64encode(buffer).decode('utf-8')

        detections = []
        for box in results[0].boxes:
            class_id = int(box.cls) 
            class_name = model.names[class_id] 
            conf = float(box.conf) 
            xyxy = box.xyxy.tolist()[0]  # Bounding box [x1, y1, x2, y2]
            detections.append({
                "class": class_name,
                "confidence": conf,
                "box": xyxy
            })

        return JSONResponse(content={
            "annotated_image": img_base64,
            "detections": detections
        })

    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)