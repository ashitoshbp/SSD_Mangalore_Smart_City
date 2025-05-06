"""
LLM Service for Image Analysis
Uses free LLM APIs to enhance incident descriptions, severity assessments, and recommendations
"""
import requests
import json
import os
import base64
from io import BytesIO
from PIL import Image

# Hugging Face API settings
HUGGINGFACE_API_URL = "https://api-inference.huggingface.co/models/"
HUGGINGFACE_API_KEY = "hf_pRNTAqSxCcSfQJhNhHOEtMMjtHiBUXzThPv"  # Set this in your environment variables

# Debug flag - set to True to enable detailed debugging
DEBUG = True

def debug_print(message):
    """Print debug messages if DEBUG is enabled"""
    if DEBUG:
        print(f"[LLM_SERVICE DEBUG] {message}")

# Print API key status at module load time
if HUGGINGFACE_API_KEY:
    debug_print(f"Hugging Face API key found: {HUGGINGFACE_API_KEY[:5]}...{HUGGINGFACE_API_KEY[-5:]}")
else:
    debug_print("No Hugging Face API key found in environment variables")

# Model IDs - using smaller, faster models that work well with the free tier
DESCRIPTION_MODEL = "HuggingFaceH4/zephyr-7b-beta"  # Fast instruction-following model
SEVERITY_MODEL = "google/flan-t5-base"  # Smaller, faster model for classification
RECOMMENDATION_MODEL = "facebook/opt-350m"  # Smaller model for faster recommendations

# Set timeout for API calls
API_TIMEOUT = 15  # seconds - shorter timeout for faster response

def encode_image_to_base64(image):
    """Convert PIL Image to base64 string"""
    try:
        buffered = BytesIO()
        # Make sure image is in RGB mode
        if image.mode != "RGB":
            image = image.convert("RGB")
        # Save as JPEG with reduced quality for smaller payload
        image.save(buffered, format="JPEG", quality=85)
        return base64.b64encode(buffered.getvalue()).decode("utf-8")
    except Exception as e:
        debug_print(f"Error encoding image: {str(e)}")
        return ""

async def get_enhanced_description(before_img, after_img, incident_type, basic_description):
    """
    Get enhanced incident description from LLM using Mistral-7B
    """
    debug_print(f"Starting enhanced description generation for incident type: {incident_type}")
    debug_print(f"Basic description: {basic_description}")
    
    try:
        # Check if API key is available
        if not HUGGINGFACE_API_KEY:
            debug_print("No API key available. Using basic description.")
            return basic_description
            
        # Convert images to base64 for text description (not all models accept images directly)
        debug_print("Converting images to base64")
        before_b64 = encode_image_to_base64(before_img)
        after_b64 = encode_image_to_base64(after_img)
        
        # Create prompt for the LLM using Mistral's instruction format
        debug_print("Creating prompt for description generation")
        prompt = f"""<s>[INST] You are an expert in urban disaster and incident analysis for smart cities. 
        You're examining information about an incident in Mangalore, India.
        
        INCIDENT INFORMATION:
        - Type: {incident_type}
        - Basic analysis: {basic_description}
        
        Your task is to generate a detailed, professional incident description that would be suitable for 
        an emergency management dashboard. Include:
        1. A clear description of what likely happened
        2. The visible extent of damage or impact
        3. Potential implications for urban infrastructure and services
        4. Observed changes between before and after states
        
        Be specific, factual, and avoid speculation. Keep your response under 200 words and focus on 
        what can be reasonably inferred from the information provided. Use professional, technical language 
        appropriate for emergency management officials. [/INST]</s>
        """
        
        debug_print("Prompt created for description generation")
        
        # Make API call to Hugging Face
        debug_print("Preparing API call to Hugging Face")
        headers = {
            "Authorization": f"Bearer {HUGGINGFACE_API_KEY}",
            "Content-Type": "application/json"
        }
        
        # Optimized parameters for Mistral-7B
        payload = {
            "inputs": prompt,
            "parameters": {
                "max_new_tokens": 300,  # Allow for more detailed descriptions
                "temperature": 0.5,     # Lower temperature for more factual responses
                "top_p": 0.95,          # Slightly higher top_p for better quality
                "do_sample": True
                # Removed return_full_text as it might not be supported by all models
            }
        }
        
        debug_print(f"Using model: {DESCRIPTION_MODEL}")
        debug_print(f"API URL: {HUGGINGFACE_API_URL}{DESCRIPTION_MODEL}")
        
        try:    
            # Make the API call with timeout
            debug_print("Sending API request...")
            response = requests.post(
                f"{HUGGINGFACE_API_URL}{DESCRIPTION_MODEL}",
                headers=headers,
                json=payload,
                timeout=API_TIMEOUT
            )
            
            debug_print(f"API response status code: {response.status_code}")
            
            # Handle the response
            if response.status_code == 200:
                debug_print("Received successful response from API")
                try:
                    response_text = response.text
                    debug_print(f"Raw response: {response_text[:100]}...")
                    
                    result = response.json()
                    debug_print(f"Parsed JSON result type: {type(result)}")
                    
                    # Extract the generated text from the response
                    if isinstance(result, list) and len(result) > 0:
                        debug_print("Result is a list with items")
                        # Get the generated text
                        enhanced_description = result[0].get("generated_text", "")
                        debug_print(f"Raw enhanced description: {enhanced_description[:50]}...")
                        
                        # Clean up the response
                        enhanced_description = enhanced_description.strip()
                        
                        # Remove any remaining instruction tags
                        enhanced_description = enhanced_description.replace("[INST]", "")
                        enhanced_description = enhanced_description.replace("[/INST]", "")
                        enhanced_description = enhanced_description.replace("</s>", "")
                        enhanced_description = enhanced_description.strip()
                        
                        debug_print("Successfully generated enhanced description")
                        debug_print(f"Final description: {enhanced_description[:50]}...")
                        return enhanced_description
                    elif isinstance(result, dict):
                        debug_print("Result is a dictionary")
                        # Some models return a dict instead of a list
                        enhanced_description = result.get("generated_text", "")
                        if enhanced_description:
                            debug_print(f"Raw enhanced description from dict: {enhanced_description[:50]}...")
                            
                            # Clean up the response
                            enhanced_description = enhanced_description.strip()
                            enhanced_description = enhanced_description.replace("[INST]", "")
                            enhanced_description = enhanced_description.replace("[/INST]", "")
                            enhanced_description = enhanced_description.replace("</s>", "")
                            enhanced_description = enhanced_description.strip()
                            
                            debug_print("Successfully generated enhanced description from dict")
                            return enhanced_description
                        else:
                            debug_print("No generated_text found in dictionary response")
                            return basic_description
                    else:
                        debug_print(f"Unexpected response format from API: {type(result)}")
                        return basic_description
                except Exception as e:
                    debug_print(f"Error parsing API response: {str(e)}")
                    import traceback
                    debug_print(traceback.format_exc())
                    return basic_description
            elif response.status_code == 503:
                debug_print("Model is loading - this is normal for the first request")
                # The model is still loading, which is normal for the first request
                # Let's wait and try one more time
                import time
                debug_print("Waiting 10 seconds and trying again...")
                time.sleep(10)
                
                try:
                    debug_print("Sending second API request...")
                    response = requests.post(
                        f"{HUGGINGFACE_API_URL}{DESCRIPTION_MODEL}",
                        headers=headers,
                        json=payload,
                        timeout=API_TIMEOUT
                    )
                    
                    if response.status_code == 200:
                        debug_print("Second request succeeded")
                        result = response.json()
                        if isinstance(result, list) and len(result) > 0:
                            enhanced_description = result[0].get("generated_text", "")
                            enhanced_description = enhanced_description.strip()
                            return enhanced_description
                    
                    debug_print("Second request also failed")
                    return basic_description
                except Exception:
                    debug_print("Second request failed with exception")
                    return basic_description
            else:
                debug_print(f"API error: {response.status_code}, {response.text}")
                return basic_description
        except requests.exceptions.Timeout:
            debug_print(f"API request timed out after {API_TIMEOUT} seconds")
            return basic_description
        except requests.exceptions.RequestException as e:
            debug_print(f"API request failed: {str(e)}")
            return basic_description
            
    except Exception as e:
        debug_print(f"Error in get_enhanced_description: {str(e)}")
        import traceback
        debug_print(traceback.format_exc())
        return basic_description

async def get_severity_assessment(incident_type, change_percentage, basic_severity):
    """
    Get enhanced severity assessment from LLM using FLAN-T5-XL
    """
    try:
        # Create prompt for the LLM - FLAN-T5 works best with clear, direct prompts
        prompt = f"""
        You are an emergency management expert in Mangalore, India.
        
        Incident details:
        - Type: {incident_type}
        - Percentage of area affected: {change_percentage:.1f}%
        - Initial assessment: {basic_severity}
        
        Consider the following context for Mangalore:
        - Monsoon season can exacerbate flooding and landslides
        - High population density in urban areas increases impact
        - Critical infrastructure like hospitals and schools require priority attention
        - Urban poor communities are often most vulnerable
        
        Based on this information, classify the incident severity as Minor, Moderate, or Severe.
        
        Format your response exactly as: "Severity: [Minor/Moderate/Severe]. Justification: [1-2 sentences explaining your assessment]"
        """
        
        # Make API call to Hugging Face
        headers = {
            "Authorization": f"Bearer {HUGGINGFACE_API_KEY}",
            "Content-Type": "application/json"
        }
        
        # Optimized parameters for FLAN-T5-XL
        payload = {
            "inputs": prompt,
            "parameters": {
                "max_new_tokens": 150,
                "temperature": 0.2,  # Very low temperature for consistent classification
                "top_p": 0.95,
                "do_sample": True,
                "return_full_text": False
            }
        }
        
        # If no API key, return the basic severity
        if not HUGGINGFACE_API_KEY:
            print("No Hugging Face API key provided. Using basic severity.")
            return basic_severity, 0.0
        
        try:
            # Make the API call with timeout
            response = requests.post(
                f"{HUGGINGFACE_API_URL}{SEVERITY_MODEL}",
                headers=headers,
                json=payload,
                timeout=API_TIMEOUT
            )
            
            if response.status_code == 200:
                try:
                    result = response.json()
                    # Extract the generated text
                    if isinstance(result, list) and len(result) > 0:
                        assessment = result[0].get("generated_text", "").strip()
                        print(f"Raw severity assessment: {assessment}")
                        
                        # Parse the severity from the response
                        if "Severity: Minor" in assessment:
                            severity = "Minor"
                            score = 0.25
                        elif "Severity: Moderate" in assessment:
                            severity = "Moderate"
                            score = 0.5
                        elif "Severity: Severe" in assessment:
                            severity = "Severe"
                            score = 0.85
                        else:
                            # Try a more flexible parsing approach
                            assessment_lower = assessment.lower()
                            if "minor" in assessment_lower:
                                severity = "Minor"
                                score = 0.25
                            elif "moderate" in assessment_lower:
                                severity = "Moderate"
                                score = 0.5
                            elif "severe" in assessment_lower or "major" in assessment_lower or "critical" in assessment_lower:
                                severity = "Severe"
                                score = 0.85
                            else:
                                severity = basic_severity
                                score = 0.0
                        
                        print(f"Determined severity: {severity} with score {score}")
                        return severity, score
                    else:
                        print("Unexpected response format from API")
                        return basic_severity, 0.0
                except Exception as e:
                    print(f"Error parsing API response: {str(e)}")
                    return basic_severity, 0.0
            else:
                print(f"API error: {response.status_code}, {response.text}")
                return basic_severity, 0.0
        except requests.exceptions.Timeout:
            print(f"API request timed out after {API_TIMEOUT} seconds")
            return basic_severity, 0.0
        except requests.exceptions.RequestException as e:
            print(f"API request failed: {str(e)}")
            return basic_severity, 0.0
            
    except Exception as e:
        debug_print(f"Error in get_severity_assessment: {str(e)}")
        import traceback
        debug_print(traceback.format_exc())
        return basic_severity, 0.0

async def get_enhanced_recommendations(incident_type, severity, basic_recommendations):
    """
    Get enhanced recommendations from LLM using Mistral-7B
    """
    try:
        # Create prompt for the LLM using Mistral's instruction format
        recommendations_str = "\n".join([f"- {rec}" for rec in basic_recommendations])
        prompt = f"""<s>[INST] You are an emergency management expert specializing in urban incidents in Mangalore, India.
        
        INCIDENT DETAILS:
        - Type: {incident_type}
        - Severity: {severity}
        
        CURRENT RECOMMENDATIONS:
        {recommendations_str}
        
        Your task is to enhance these recommendations to make them more specific, actionable, and appropriate for Mangalore's context.
        
        Consider these local factors:
        - Monsoon season (June-September) brings heavy rainfall
        - Dense urban areas with mixed formal and informal settlements
        - Limited emergency response resources compared to developed nations
        - Need for community-based response in addition to government action
        - Local materials and techniques that may be more readily available
        
        Provide 5-7 specific, actionable recommendations that:
        1. Start with strong action verbs
        2. Include specific timeframes where appropriate (immediate, within 24 hours, etc.)
        3. Consider both immediate response and longer-term recovery
        4. Are feasible with locally available resources
        5. Address the specific incident type and severity level
        
        Format each recommendation as a bullet point. [/INST]</s>
        """
        
        # Make API call to Hugging Face
        headers = {
            "Authorization": f"Bearer {HUGGINGFACE_API_KEY}",
            "Content-Type": "application/json"
        }
        
        # Optimized parameters for Mistral-7B
        payload = {
            "inputs": prompt,
            "parameters": {
                "max_new_tokens": 400,  # Allow for more detailed recommendations
                "temperature": 0.6,     # Balanced temperature for creative but relevant recommendations
                "top_p": 0.95,
                "do_sample": True,
                "return_full_text": False
            }
        }
        
        # If no API key, return the basic recommendations
        if not HUGGINGFACE_API_KEY:
            print("No Hugging Face API key provided. Using basic recommendations.")
            return basic_recommendations
        
        try:
            # Make the API call with timeout
            response = requests.post(
                f"{HUGGINGFACE_API_URL}{RECOMMENDATION_MODEL}",
                headers=headers,
                json=payload,
                timeout=API_TIMEOUT
            )
            
            if response.status_code == 200:
                try:
                    result = response.json()
                    # Extract the generated text
                    if isinstance(result, list) and len(result) > 0:
                        recommendations_text = result[0].get("generated_text", "")
                        
                        # Clean up the response
                        recommendations_text = recommendations_text.strip()
                        recommendations_text = recommendations_text.replace("[INST]", "")
                        recommendations_text = recommendations_text.replace("[/INST]", "")
                        recommendations_text = recommendations_text.replace("</s>", "")
                        
                        print("Successfully generated enhanced recommendations")
                        
                        # Parse bullet points from the response
                        enhanced_recommendations = []
                        for line in recommendations_text.split("\n"):
                            line = line.strip()
                            # Match various bullet point formats
                            if line.startswith("- ") or line.startswith("* ") or line.startswith("• "):
                                recommendation = line[2:].strip()
                                if recommendation:
                                    enhanced_recommendations.append(recommendation)
                            # Also try to match numbered bullets like "1. "
                            elif len(line) > 3 and line[0].isdigit() and line[1:3] in (". ", ") "):
                                recommendation = line[3:].strip()
                                if recommendation:
                                    enhanced_recommendations.append(recommendation)
                        
                        # If we couldn't parse any recommendations, try to split by sentences
                        if not enhanced_recommendations and len(recommendations_text) > 10:
                            import re
                            sentences = re.split(r'(?<=[.!?])\s+', recommendations_text)
                            enhanced_recommendations = [s.strip() for s in sentences if len(s.strip()) > 15]
                        
                        # If we still couldn't parse any recommendations, return the basic ones
                        if not enhanced_recommendations:
                            print("Could not parse recommendations from response")
                            return basic_recommendations
                        
                        # Ensure each recommendation starts with an action verb if possible
                        for i, rec in enumerate(enhanced_recommendations):
                            # If it doesn't start with a verb, try to find one in the basic recommendations
                            if not any(rec.lower().startswith(verb) for verb in ["deploy", "evacuate", "assess", "establish", "provide", "coordinate", "implement", "monitor", "conduct", "secure", "activate", "clear", "restore", "mobilize"]):
                                for basic_rec in basic_recommendations:
                                    if any(basic_rec.lower().startswith(verb) for verb in ["deploy", "evacuate", "assess", "establish", "provide", "coordinate", "implement", "monitor", "conduct", "secure", "activate", "clear", "restore", "mobilize"]):
                                        verb = basic_rec.split()[0]
                                        enhanced_recommendations[i] = f"{verb} {rec}"
                                        break
                        
                        # Limit to 7 recommendations
                        return enhanced_recommendations[:7]
                    else:
                        print("Unexpected response format from API")
                        return basic_recommendations
                except Exception as e:
                    print(f"Error parsing API response: {str(e)}")
                    return basic_recommendations
            else:
                print(f"API error: {response.status_code}, {response.text}")
                return basic_recommendations
        except requests.exceptions.Timeout:
            print(f"API request timed out after {API_TIMEOUT} seconds")
            return basic_recommendations
        except requests.exceptions.RequestException as e:
            print(f"API request failed: {str(e)}")
            return basic_recommendations
            
    except Exception as e:
        debug_print(f"Error in get_enhanced_recommendations: {str(e)}")
        import traceback
        debug_print(traceback.format_exc())
        return basic_recommendations
