# routes.py for image analysis endpoints
from fastapi import APIRouter, UploadFile, File
from fastapi.responses import JSONResponse
from .services import analyze_incident_images

router = APIRouter()

@router.post("/analyze-incident-images/")
async def analyze_incident_images_endpoint(before: UploadFile = File(...), after: UploadFile = File(...)):
    """Endpoint to analyze before/after incident images."""
    result = await analyze_incident_images(before, after)
    return JSONResponse(content=result)
