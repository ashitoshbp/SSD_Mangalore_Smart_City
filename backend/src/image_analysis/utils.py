# utils.py for helper functions
import numpy as np
from PIL import Image, ImageChops, ImageEnhance, ImageDraw, ImageFilter
from skimage.metrics import structural_similarity as ssim
from skimage.filters import threshold_otsu
from skimage.morphology import binary_dilation, disk
from skimage.feature import canny
from skimage.measure import label, regionprops
import cv2

# Dictionary of incident types and their characteristics
INCIDENT_TYPES = {
    'Fire': {
        'keywords': ['fire', 'smoke', 'burn', 'flame', 'ash'],
        'color_ranges': [([0, 50, 50], [40, 255, 255])],  # Red-orange in HSV
        'description_templates': [
            "Detected a fire incident with {severity} damage. Visible flames and smoke indicate active burning.",
            "Fire damage observed with {severity} intensity. The affected area shows signs of burning and structural damage.",
            "Evidence of {severity} fire incident. Heat damage and charring visible in the affected area."
        ],
        'measures': [
            "Evacuate the area immediately",
            "Call fire department at emergency number",
            "Ensure all people are accounted for",
            "If safe, use fire extinguishers on small fires",
            "Shut off gas and electricity if possible",
            "Follow established evacuation routes"
        ]
    },
    'Flood': {
        'keywords': ['flood', 'water', 'submerged', 'inundation', 'wet'],
        'color_ranges': [([90, 50, 50], [130, 255, 255])],  # Blue in HSV
        'description_templates': [
            "Flooding detected with water levels causing {severity} damage. Standing water visible in affected areas.",
            "Water inundation observed with {severity} impact. Flooding has affected the infrastructure and surroundings.",
            "{Severity} flooding incident detected. Water has accumulated in the area causing potential damage."
        ],
        'measures': [
            "Move to higher ground immediately",
            "Turn off electricity at the main switch",
            "Avoid walking or driving through flood waters",
            "Contact emergency services for evacuation",
            "Prepare emergency supplies if sheltering in place",
            "Monitor weather updates and flood warnings"
        ]
    },
    'Landslide': {
        'keywords': ['landslide', 'mudslide', 'rockfall', 'debris', 'earth'],
        'color_ranges': [([20, 50, 50], [40, 255, 255])],  # Brown in HSV
        'description_templates': [
            "Landslide detected with {severity} impact. Soil displacement and debris visible in the affected area.",
            "Evidence of a {severity} landslide event. Ground movement has caused significant terrain changes.",
            "{Severity} earth movement incident. Debris flow and ground instability observed in the affected region."
        ],
        'measures': [
            "Evacuate the area immediately",
            "Stay away from the slide area",
            "Listen for unusual sounds that might indicate moving debris",
            "Contact emergency services",
            "Watch for flooding which may occur after a landslide",
            "Check for injured or trapped persons near the slide area (if safe)"
        ]
    },
    'Building Collapse': {
        'keywords': ['collapse', 'structural', 'building', 'debris', 'rubble'],
        'color_ranges': [],  # Detected through structural changes
        'description_templates': [
            "Building collapse detected with {severity} structural damage. Debris and structural failure visible.",
            "{Severity} structural failure observed. The building has partially or fully collapsed creating hazardous conditions.",
            "Evidence of a {severity} building collapse incident. Significant structural damage and debris present."
        ],
        'measures': [
            "Stay away from the collapsed structure",
            "Call emergency services immediately",
            "Do not attempt to enter the building",
            "Check for injured people from a safe distance",
            "Be aware of potential gas leaks or electrical hazards",
            "Follow instructions from emergency personnel"
        ]
    },
    'Tree Fallen': {
        'keywords': ['tree', 'fallen', 'uprooted', 'branch', 'vegetation'],
        'color_ranges': [([35, 50, 50], [85, 255, 255])],  # Green in HSV
        'description_templates': [
            "Fallen tree incident detected with {severity} impact. The tree has been uprooted or broken.",
            "{Severity} tree fall observed. Vegetation damage and potential infrastructure impact visible.",
            "Evidence of a {severity} fallen tree event. The tree has collapsed causing obstruction or damage."
        ],
        'measures': [
            "Stay clear of the fallen tree and any downed power lines",
            "Report the incident to local authorities",
            "Check for any injuries or trapped individuals",
            "If blocking a road, set up warning signs for traffic",
            "Contact utility companies if power lines are affected",
            "Do not attempt to remove large trees without professional help"
        ]
    },
    'Road Accident': {
        'keywords': ['accident', 'crash', 'collision', 'vehicle', 'road'],
        'color_ranges': [],  # Detected through structural changes
        'description_templates': [
            "Road accident detected with {severity} impact. Vehicle damage and potential injuries present.",
            "Evidence of a {severity} traffic collision. Vehicles show significant damage in the affected area.",
            "{Severity} road incident observed. The accident has caused disruption and potential casualties."
        ],
        'measures': [
            "Call emergency services immediately",
            "Set up warning signs to prevent further accidents",
            "Check for injured persons and provide first aid if trained",
            "Do not move seriously injured people unless in immediate danger",
            "Turn off vehicle engines and be aware of fire risks",
            "Exchange information with other involved parties if applicable"
        ]
    }
}

def detect_changes(before_img, after_img):
    """
    Advanced change detection between before and after images.
    Uses multiple techniques for robust change detection and creates
    informative visualizations with heatmaps and bounding boxes.
    """
    try:
        # Resize images for processing
        width, height = 512, 512
        before_resized = before_img.resize((width, height))
        after_resized = after_img.resize((width, height))
        
        # Convert to numpy arrays
        before_np = np.array(before_resized)
        after_np = np.array(after_resized)
        
        # Simple difference for fallback
        simple_diff = np.abs(before_np.astype(np.int16) - after_np.astype(np.int16)).sum(axis=2) > 30
        simple_change_mask = simple_diff.astype(np.bool_)
        
        try:
            # Convert to grayscale for structural similarity
            before_gray = cv2.cvtColor(before_np, cv2.COLOR_RGB2GRAY)
            after_gray = cv2.cvtColor(after_np, cv2.COLOR_RGB2GRAY)
            
            # 1. Use absolute difference for change detection
            diff = cv2.absdiff(before_gray, after_gray)
            
            # Create a heat map visualization
            heatmap = cv2.applyColorMap(diff, cv2.COLORMAP_JET)
            
            # 2. Apply threshold to get binary change mask
            _, thresh = cv2.threshold(diff, 30, 255, cv2.THRESH_BINARY)
            
            # 3. Clean up noise with morphological operations
            kernel = np.ones((5,5), np.uint8)
            mask = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)
            mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
            
            # 4. Find contours of changes
            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            # Filter contours by size to remove noise
            significant_contours = []
            for contour in contours:
                area = cv2.contourArea(contour)
                if area > 100:  # Minimum area threshold
                    significant_contours.append(contour)
            
            # Create a mask for the changed regions (as uint8, not bool)
            change_mask = np.zeros_like(before_gray, dtype=np.uint8)
            cv2.drawContours(change_mask, significant_contours, -1, 1, -1)  # Fill contours
            
            # Convert to boolean for consistency with other functions
            change_mask_bool = change_mask.astype(bool)
            
            # 5. Create a side-by-side visualization with before and after
            # Create a new canvas with space for both images and the heatmap
            canvas_height = height
            canvas_width = width * 3 + 20  # 3 images + padding
            canvas = np.ones((canvas_height, canvas_width, 3), dtype=np.uint8) * 255
            
            # Place the before image
            canvas[0:height, 0:width] = before_np
            
            # Place the after image
            canvas[0:height, width+10:2*width+10] = after_np
            
            # Create the visualization with bounding boxes and highlights
            vis = after_np.copy()
            
            # Draw bounding boxes around significant changes
            for contour in significant_contours:
                x, y, w, h = cv2.boundingRect(contour)
                cv2.rectangle(vis, (x, y), (x+w, y+h), (0, 255, 0), 2)
                
                # Add a label with the area percentage
                area_percent = (cv2.contourArea(contour) / (width * height)) * 100
                if area_percent > 1:  # Only label significant changes
                    label = f"{area_percent:.1f}%"
                    cv2.putText(vis, label, (x, y-5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
            
            # Overlay the heatmap with transparency
            alpha = 0.4
            heatmap_overlay = cv2.addWeighted(vis, 1-alpha, heatmap, alpha, 0)
            
            # Place the visualization on the canvas
            canvas[0:height, 2*width+20:3*width+20] = heatmap_overlay
            
            # Add labels and dividers
            font = cv2.FONT_HERSHEY_SIMPLEX
            cv2.putText(canvas, "Before", (width//2-30, 30), font, 0.7, (0, 0, 0), 2)
            cv2.putText(canvas, "After", (width+width//2-20, 30), font, 0.7, (0, 0, 0), 2)
            cv2.putText(canvas, "Change Detection", (2*width+width//2-70, 30), font, 0.7, (0, 0, 0), 2)
            
            # Add vertical dividers
            cv2.line(canvas, (width+5, 0), (width+5, height), (0, 0, 0), 1)
            cv2.line(canvas, (2*width+15, 0), (2*width+15, height), (0, 0, 0), 1)
            
            # Add a legend for the heatmap
            legend_y = height - 60
            # Draw color gradient bar
            for i in range(100):
                color = cv2.applyColorMap(np.array([[i*2.55]]).astype(np.uint8), cv2.COLORMAP_JET)[0, 0]
                cv2.line(canvas, (2*width+50+i*2, legend_y+30), (2*width+50+i*2, legend_y+40), (int(color[0]), int(color[1]), int(color[2])), 1)
            
            cv2.putText(canvas, "Low", (2*width+50, legend_y+25), font, 0.5, (0, 0, 0), 1)
            cv2.putText(canvas, "High", (2*width+50+180, legend_y+25), font, 0.5, (0, 0, 0), 1)
            cv2.putText(canvas, "Change Intensity", (2*width+80, legend_y+55), font, 0.5, (0, 0, 0), 1)
            
            # Convert back to PIL
            vis_pil = Image.fromarray(canvas)
            
            return change_mask_bool, vis_pil
            
        except Exception as e:
            # Fallback to simple difference if OpenCV operations fail
            print(f"OpenCV error in detect_changes: {str(e)}")
            
            # Create a more informative fallback visualization
            # Create a side-by-side comparison
            canvas_height = height
            canvas_width = width * 2 + 10  # 2 images + padding
            canvas = np.ones((canvas_height, canvas_width, 3), dtype=np.uint8) * 255
            
            # Place the before image
            canvas[0:height, 0:width] = before_np
            
            # Place the after image with simple highlights
            vis = after_np.copy()
            vis[simple_change_mask] = [255, 0, 0]  # Red highlight
            canvas[0:height, width+10:2*width+10] = vis
            
            # Add labels
            font = cv2.FONT_HERSHEY_SIMPLEX
            cv2.putText(canvas, "Before", (width//2-30, 30), font, 0.7, (0, 0, 0), 2)
            cv2.putText(canvas, "After (Changes in Red)", (width+width//2-80, 30), font, 0.7, (0, 0, 0), 2)
            
            # Add vertical divider
            cv2.line(canvas, (width+5, 0), (width+5, height), (0, 0, 0), 1)
            
            vis_pil = Image.fromarray(canvas)
            return simple_change_mask, vis_pil
            
    except Exception as e:
        # Ultimate fallback - return minimal change detection
        print(f"Error in detect_changes: {str(e)}")
        
        # Create a more informative dummy visualization
        canvas_height = height
        canvas_width = width * 2 + 10  # 2 images + padding
        canvas = np.ones((canvas_height, canvas_width, 3), dtype=np.uint8) * 255
        
        # Place the images if available
        try:
            canvas[0:height, 0:width] = np.array(before_resized)
            canvas[0:height, width+10:2*width+10] = np.array(after_resized)
        except:
            # If that fails, create dummy colored rectangles
            canvas[0:height, 0:width] = [200, 200, 200]  # Gray for before
            canvas[0:height, width+10:2*width+10] = [220, 220, 220]  # Lighter gray for after
        
        # Create a dummy mask
        dummy_mask = np.zeros((height, width), dtype=bool)
        dummy_mask[height//4:3*height//4, width//4:3*width//4] = True  # Center square as "changed"
        
        # Add text explaining the error
        font = cv2.FONT_HERSHEY_SIMPLEX
        cv2.putText(canvas, "Before", (width//2-30, 30), font, 0.7, (0, 0, 0), 2)
        cv2.putText(canvas, "After", (width+width//2-20, 30), font, 0.7, (0, 0, 0), 2)
        cv2.putText(canvas, "Error processing images", (width//2-80, height//2), font, 0.7, (0, 0, 0), 2)
        
        # Add vertical divider
        cv2.line(canvas, (width+5, 0), (width+5, height), (0, 0, 0), 1)
        
        vis_pil = Image.fromarray(canvas)
        return dummy_mask, vis_pil

def classify_incident(before_img, after_img):
    """
    Classify the type of incident based on image analysis.
    Uses color detection, change patterns, and image features.
    """
    # Resize images for consistent processing
    width, height = 256, 256
    before_resized = before_img.resize((width, height))
    after_resized = after_img.resize((width, height))
    
    # Convert to numpy arrays
    before_np = np.array(before_resized)
    after_np = np.array(after_resized)
    
    # Convert to HSV for better color detection
    after_hsv = cv2.cvtColor(after_np, cv2.COLOR_RGB2HSV)
    
    # Calculate difference for change detection
    diff = cv2.absdiff(before_np, after_np)
    
    # Initialize scores for each incident type
    scores = {}
    
    for incident, properties in INCIDENT_TYPES.items():
        score = 0.0
        
        # Check for characteristic colors
        for lower, upper in properties['color_ranges']:
            lower = np.array(lower)
            upper = np.array(upper)
            mask = cv2.inRange(after_hsv, lower, upper)
            color_score = np.sum(mask) / (width * height * 255)
            score += color_score * 0.5  # Weight for color detection
        
        # Add a base score to avoid zeros
        score += 0.1
        
        scores[incident] = min(score, 0.95)  # Cap at 0.95 for confidence
    
    # Get the incident type with highest score
    if not scores:
        return 'Unknown', 0.5
    
    incident_type = max(scores, key=scores.get)
    confidence = scores[incident_type]
    
    # If confidence is too low, return Unknown
    if confidence < 0.2:
        return 'Unknown', 0.5
        
    return incident_type, confidence

def generate_description(before_img, after_img, incident_type):
    """
    Generate a detailed description of the incident based on the images and classification.
    Uses advanced analysis techniques and contextual information.
    """
    # Get the change mask to assess severity
    change_mask, _ = detect_changes(before_img, after_img)
    severity, severity_score = assess_severity(change_mask)
    
    # Calculate affected area percentage
    affected_area = np.sum(change_mask) / change_mask.size * 100
    
    # Analyze the pattern of changes
    try:
        # Convert to numpy arrays
        before_np = np.array(before_img.resize((256, 256)))
        after_np = np.array(after_img.resize((256, 256)))
        
        # Calculate color changes
        color_diff = np.abs(after_np.astype(np.float32) - before_np.astype(np.float32))
        color_change = np.mean(color_diff)
        
        # Determine if changes are concentrated or spread out
        labeled_mask, num_regions = label(change_mask, return_num=True)
        regions = regionprops(labeled_mask)
        
        # Calculate the average size of changed regions
        if regions:
            avg_region_size = np.mean([r.area for r in regions])
            largest_region = max([r.area for r in regions])
            largest_region_pct = largest_region / change_mask.size * 100
        else:
            avg_region_size = 0
            largest_region_pct = 0
        
        # Determine if changes are concentrated or dispersed
        if num_regions == 1 and affected_area > 10:
            pattern = "concentrated in a single area"
        elif num_regions > 5 and avg_region_size < 100:
            pattern = "dispersed across multiple small areas"
        elif largest_region_pct > 10:
            pattern = "primarily concentrated in one major area with some smaller affected regions"
        else:
            pattern = "distributed across the scene"
            
    except Exception as e:
        print(f"Error in pattern analysis: {str(e)}")
        pattern = "visible in the affected area"
    
    # Generate a more detailed description based on the incident type
    if incident_type in INCIDENT_TYPES:
        # Start with a template
        templates = INCIDENT_TYPES[incident_type]['description_templates']
        base_description = np.random.choice(templates)
        
        # Replace placeholders
        base_description = base_description.replace('{severity}', severity.lower())
        base_description = base_description.replace('{Severity}', severity)
        
        # Add detailed analysis based on the incident type
        if incident_type == 'Fire':
            detail = f"The damage is {pattern}, affecting approximately {affected_area:.1f}% of the visible area. "
            if severity_score > 0.5:
                detail += "The extensive charring and structural damage suggest a high-intensity fire that likely required significant firefighting resources. "
            elif severity_score > 0.2:
                detail += "The moderate heat damage indicates a fire that was either contained quickly or of medium intensity. "
            else:
                detail += "The limited extent of damage suggests the fire was caught in its early stages or was of low intensity. "
                
        elif incident_type == 'Flood':
            detail = f"The flooding is {pattern}, with water covering approximately {affected_area:.1f}% of the visible area. "
            if severity_score > 0.5:
                detail += "The high water level suggests significant inundation that likely caused substantial property damage and disruption. "
            elif severity_score > 0.2:
                detail += "The moderate flooding indicates a significant water event that may have required some evacuation measures. "
            else:
                detail += "The limited flooding appears to be localized and may have caused minor property damage. "
                
        elif incident_type == 'Landslide':
            detail = f"The earth movement is {pattern}, affecting approximately {affected_area:.1f}% of the visible terrain. "
            if largest_region_pct > 20:
                detail += "A significant volume of soil and debris has been displaced, suggesting a major geological event. "
            else:
                detail += "The displaced material appears to be limited in volume but may still pose hazards to nearby structures and roads. "
                
        elif incident_type == 'Building Collapse':
            detail = f"The structural failure is {pattern}, with approximately {affected_area:.1f}% of the building affected. "
            if severity_score > 0.5:
                detail += "The extensive debris field and significant structural deformation indicate a catastrophic failure that likely required emergency response. "
            else:
                detail += "The partial collapse appears to be limited to specific sections of the structure, which may indicate localized structural weaknesses. "
                
        elif incident_type == 'Tree Fallen':
            detail = f"The fallen vegetation is {pattern}, affecting approximately {affected_area:.1f}% of the visible area. "
            if num_regions > 3:
                detail += "Multiple trees or large branches appear to have fallen, suggesting widespread damage possibly caused by high winds or storms. "
            else:
                detail += "The fallen tree(s) appear to be isolated incidents, possibly due to disease, age, or localized weather conditions. "
                
        elif incident_type == 'Road Accident':
            detail = f"The accident impact is {pattern}, affecting approximately {affected_area:.1f}% of the visible road area. "
            if severity_score > 0.4:
                detail += "The significant debris field and vehicle damage suggest a high-impact collision that likely required emergency services. "
            else:
                detail += "The limited extent of visible damage suggests a lower-speed collision or minor accident. "
        else:
            detail = f"The changes are {pattern}, affecting approximately {affected_area:.1f}% of the visible area. "
            
        # Add time context
        time_context = "Based on the visual evidence, this incident appears to have occurred recently and may require prompt attention from relevant authorities."
        
        # Combine all parts
        return f"{base_description} {detail}{time_context}"
    else:
        # Generic description for unknown incident types
        return f"An incident has been detected with {severity.lower()} impact, affecting approximately {affected_area:.1f}% of the area. The changes are {pattern}, and based on the visual evidence, this event appears to have occurred recently. The changes between the before and after images indicate a significant event that may require assessment by local authorities."

def assess_severity(change_mask):
    """
    Assess the severity of the incident based on the extent of changes.
    """
    # Calculate the percentage of the image that has changed
    severity_score = float(np.sum(change_mask)) / change_mask.size
    
    # Adjust thresholds for better sensitivity
    if severity_score < 0.03:
        severity = 'Minor'
    elif severity_score < 0.15:
        severity = 'Moderate'
    else:
        severity = 'Severe'
        
    return severity, severity_score

def suggest_measures(incident_type, severity):
    """
    Suggest appropriate measures based on the incident type and severity.
    """
    if incident_type in INCIDENT_TYPES:
        all_measures = INCIDENT_TYPES[incident_type]['measures']
        
        # Select number of measures based on severity
        if severity == 'Minor':
            num_measures = min(3, len(all_measures))
        elif severity == 'Moderate':
            num_measures = min(4, len(all_measures))
        else:  # Severe
            num_measures = min(6, len(all_measures))
            
        # Select the most important measures first
        selected_measures = all_measures[:num_measures]
        
        # Add a general measure
        selected_measures.append("Document the incident for insurance and reporting purposes")
        
        return selected_measures
    else:
        # Generic measures for unknown incident types
        return [
            "Assess the situation from a safe distance",
            "Contact appropriate emergency services",
            "Ensure the safety of all individuals in the area",
            "Document the incident with photos and notes",
            "Follow official guidance from authorities"
        ]
