# services.py for handling service logic
import asyncio
import base64
from io import BytesIO
from PIL import Image
from .utils import detect_changes, classify_incident, generate_description, assess_severity, suggest_measures
from .llm_service import get_enhanced_description, get_severity_assessment, get_enhanced_recommendations

async def analyze_incident_images(before_file, after_file):
    try:
        # Load images - handle different file object types
        try:
            # Try to open directly (for werkzeug FileStorage objects)
            before_img = Image.open(before_file)
            after_img = Image.open(after_file)
        except AttributeError:
            # If that fails, try accessing the file attribute
            try:
                before_img = Image.open(before_file.file)
                after_img = Image.open(after_file.file)
            except AttributeError:
                # Last resort - try to read the file and create an in-memory file
                before_data = await before_file.read() if hasattr(before_file, 'read') else before_file.read()
                after_data = await after_file.read() if hasattr(after_file, 'read') else after_file.read()
                before_img = Image.open(BytesIO(before_data))
                after_img = Image.open(BytesIO(after_data))
        
        # Ensure images are in RGB mode
        before_img = before_img.convert('RGB')
        after_img = after_img.convert('RGB')
        
        print("Successfully loaded images")
    except Exception as e:
        print(f"Error loading images: {str(e)}")
        raise Exception(f"Failed to load images: {str(e)}")
    
    
    # Detect changes
    change_mask, change_vis = detect_changes(before_img, after_img)
    
    # Classify incident
    incident_type, type_confidence = classify_incident(before_img, after_img)
    
    # Generate basic description
    basic_description = generate_description(before_img, after_img, incident_type)
    
    # Assess basic severity
    basic_severity, basic_severity_score = assess_severity(change_mask)
    
    # Calculate affected area percentage for LLM context
    affected_area = float(change_mask.sum()) / change_mask.size * 100
    
    # Suggest basic measures
    basic_measures = suggest_measures(incident_type, basic_severity)
    
    # Print debug info
    print(f"Starting LLM enhancements for incident type: {incident_type}")
    print(f"Basic description: {basic_description[:50]}...")
    print(f"Basic severity: {basic_severity}, score: {basic_severity_score}")
    print(f"Basic measures: {basic_measures}")
    
    # Run LLM enhancements in parallel with proper error handling
    try:
        # Create tasks for parallel execution
        enhanced_description_task = asyncio.create_task(
            get_enhanced_description(before_img, after_img, incident_type, basic_description)
        )
        
        enhanced_severity_task = asyncio.create_task(
            get_severity_assessment(incident_type, affected_area, basic_severity)
        )
        
        enhanced_recommendations_task = asyncio.create_task(
            get_enhanced_recommendations(incident_type, basic_severity, basic_measures)
        )
        
        # Wait for all LLM enhancements to complete with timeout
        description = await asyncio.wait_for(enhanced_description_task, timeout=30)
        print(f"Enhanced description received: {description[:50]}...")
        
        severity_result = await asyncio.wait_for(enhanced_severity_task, timeout=30)
        severity, llm_severity_score = severity_result
        print(f"Enhanced severity received: {severity}, score: {llm_severity_score}")
        
        measures = await asyncio.wait_for(enhanced_recommendations_task, timeout=30)
        print(f"Enhanced measures received: {measures}")
    except asyncio.TimeoutError:
        print("LLM enhancement timed out - using basic results")
        description = basic_description
        severity = basic_severity
        llm_severity_score = basic_severity_score
        measures = basic_measures
    except Exception as e:
        print(f"Error in LLM enhancements: {str(e)}")
        import traceback
        print(traceback.format_exc())
        description = basic_description
        severity = basic_severity
        llm_severity_score = basic_severity_score
        measures = basic_measures
    
    # Use the LLM severity score if available, otherwise use the basic one
    severity_score = llm_severity_score if llm_severity_score > 0 else basic_severity_score
    
    # If LLM enhancements failed, fall back to basic versions
    if not description:
        description = basic_description
    if not severity:
        severity = basic_severity
        severity_score = basic_severity_score
    if not measures:
        measures = basic_measures
    
    # Convert visualization to base64 for sending in response
    buffered = BytesIO()
    change_vis.save(buffered, format="PNG")
    change_vis_b64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
    
    # Return results
    return {
        "incident_type": incident_type,
        "type_confidence": type_confidence,
        "description": description,
        "severity": severity,
        "severity_score": severity_score,
        "suggested_measures": measures,
        "change_visualization": change_vis_b64
    }
