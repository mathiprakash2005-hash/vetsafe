"""
Flask Backend for Antibiotic Misuse & MRL Risk Prediction
Connects to Firebase Firestore and provides ML predictions
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore
import joblib
import numpy as np
from datetime import datetime
import os
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Global Firebase initialization flag
firebase_initialized = False
db = None

def initialize_firebase():
    """Initialize Firebase connection using service account credentials"""
    global firebase_initialized, db
    if firebase_initialized:
        return True
    
    try:
        cred = credentials.Certificate('firebase-service-account.json')
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        firebase_initialized = True
        print("\n" + "="*60)
        print("✓ Firebase initialized successfully")
        print("="*60)
        return True
    except Exception as e:
        print("\n" + "="*60)
        print(f"✗ Firebase initialization error: {e}")
        print("="*60)
        return False

# Load trained ML model and preprocessing objects
try:
    model = joblib.load('models/logistic_regression_model.pkl')
    scaler = joblib.load('models/scaler.pkl')
    label_encoders = joblib.load('models/label_encoders.pkl')
    print("✓ ML model and preprocessors loaded successfully")
except Exception as e:
    print(f"✗ Model loading error: {e}")
    model, scaler, label_encoders = None, None, None


def preprocess_data(data):
    """
    Preprocess treatment data for ML model prediction
    
    Args:
        data (dict): Raw treatment data from Firestore or API
    
    Returns:
        np.array: Preprocessed feature array ready for prediction
    """
    try:
        # Extract features in correct order
        features = {
            'animal_type': str(data.get('animal_type', 'chicken')).lower(),
            'antibiotic_type': str(data.get('antibiotic_type', 'amoxicillin')).lower(),
            'dosage_mg': float(data.get('dosage_mg', 0)),
            'duration_days': int(data.get('duration_days', 0)),
            'days_before_sale': int(data.get('days_before_sale', 0)),
            'milk_yield': float(data.get('milk_yield', 0)),
            'previous_violations': int(data.get('previous_violations', 0))
        }
        
        # Encode categorical variables with error handling
        try:
            animal_encoded = label_encoders['animal_type'].transform([features['animal_type']])[0]
        except:
            # If unknown animal type, use first class
            animal_encoded = 0
            
        try:
            antibiotic_encoded = label_encoders['antibiotic_type'].transform([features['antibiotic_type']])[0]
        except:
            # If unknown antibiotic, use first class
            antibiotic_encoded = 0
        
        # Create feature array
        feature_array = np.array([[
            animal_encoded,
            antibiotic_encoded,
            features['dosage_mg'],
            features['duration_days'],
            features['days_before_sale'],
            features['milk_yield'],
            features['previous_violations']
        ]])
        
        # Scale numerical features (columns 2-6)
        feature_array[:, 2:] = scaler.transform(feature_array[:, 2:])
        
        return feature_array
    except Exception as e:
        print(f"[PREPROCESS ERROR] {str(e)}")
        print(f"[DATA] {data}")
        raise


def get_risk_level(probability):
    """
    Determine risk level based on violation probability
    
    Args:
        probability (float): Predicted violation probability (0-1)
    
    Returns:
        str: Risk level (Low, Moderate, High)
    """
    if probability < 0.4:
        return "Low"
    elif probability < 0.7:
        return "Moderate"
    else:
        return "High"


def generate_recommendation(probability, data):
    """
    Generate actionable recommendation based on risk level
    
    Args:
        probability (float): Predicted violation probability
        data (dict): Treatment data
    
    Returns:
        str: Recommendation message
    """
    risk = get_risk_level(probability)
    
    if risk == "Low":
        return "Safe to proceed. Continue monitoring withdrawal period."
    
    elif risk == "Moderate":
        recommendations = []
        
        if data.get('days_before_sale', 0) < 7:
            recommendations.append("Extend withdrawal period by at least 3-5 days")
        
        if data.get('dosage_mg', 0) > 500:
            recommendations.append("Consider reducing dosage in consultation with veterinarian")
        
        if data.get('previous_violations', 0) > 0:
            recommendations.append("Implement stricter monitoring due to previous violations")
        
        return " | ".join(recommendations) if recommendations else "Increase monitoring frequency and extend withdrawal period"
    
    else:  # High risk
        return "⚠️ HIGH RISK: Do NOT sell animal. Consult veterinarian immediately. Extend withdrawal period by minimum 10-14 days and retest."


def predict_single(data):
    """
    Make prediction for a single treatment entry
    
    Args:
        data (dict): Treatment data
    
    Returns:
        dict: Prediction results with probability, risk level, and recommendation
    """
    if not model:
        return {"error": "Model not loaded"}
    
    try:
        # Preprocess data
        features = preprocess_data(data)
        
        # Predict violation probability
        probability = model.predict_proba(features)[0][1]  # Probability of class 1 (violation)
        
        # Get risk level
        risk = get_risk_level(probability)
        
        # Generate recommendation
        recommendation = generate_recommendation(probability, data)
        
        return {
            "violation_probability": round(float(probability) * 100, 2),
            "risk_level": risk,
            "recommendation": recommendation,
            "timestamp": datetime.now().isoformat()
        }
    
    except Exception as e:
        return {"error": str(e)}


@app.route('/predict-all', methods=['GET'])
def predict_all():
    """
    Fetch all treatments from Firestore and predict risk for each
    
    Returns:
        JSON: List of all treatments with predictions
    """
    print("\n[REQUEST] GET /predict-all - Fetching all treatments...")
    try:
        if not firebase_initialized or db is None:
            if not initialize_firebase():
                return jsonify({"success": False, "error": "Firebase not initialized"}), 500
        
        treatments_ref = db.collection('treatments')
        docs = treatments_ref.stream()
        
        results = []
        
        for doc in docs:
            data = doc.to_dict()
            data['id'] = doc.id
            prediction = predict_single(data)
            result = {**data, **prediction}
            results.append(result)
        
        print(f"[SUCCESS] Processed {len(results)} treatments")
        return jsonify({
            "success": True,
            "count": len(results),
            "treatments": results
        }), 200
    
    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/predict', methods=['POST'])
def predict():
    """
    Predict risk for a new treatment entry
    
    Request Body:
        JSON with treatment data (animal_type, antibiotic_type, dosage_mg, etc.)
    
    Returns:
        JSON: Prediction results
    """
    print("\n[REQUEST] POST /predict - New prediction request")
    try:
        data = request.get_json()
        
        if not data:
            print("[ERROR] No data provided")
            return jsonify({"success": False, "error": "No data provided"}), 400
        
        required_fields = ['animal_type', 'antibiotic_type', 'dosage_mg', 'duration_days', 'days_before_sale']
        missing_fields = [field for field in required_fields if field not in data]
        
        if missing_fields:
            print(f"[ERROR] Missing fields: {missing_fields}")
            return jsonify({
                "success": False,
                "error": f"Missing required fields: {', '.join(missing_fields)}"
            }), 400
        
        prediction = predict_single(data)
        
        if "error" in prediction:
            print(f"[ERROR] Prediction failed: {prediction['error']}")
            return jsonify({"success": False, "error": prediction["error"]}), 500
        
        print(f"[SUCCESS] Risk: {prediction['risk_level']}, Probability: {prediction['violation_probability']}")
        return jsonify({"success": True, "input_data": data, **prediction}), 200
    
    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint to verify API is running"""
    return jsonify({
        "status": "healthy",
        "model_loaded": model is not None,
        "firebase_connected": firebase_admin._apps != {},
        "timestamp": datetime.now().isoformat()
    }), 200


@app.route('/', methods=['GET'])
def home():
    """Root endpoint with API documentation"""
    return jsonify({
        "message": "Antibiotic Misuse & MRL Risk Prediction API",
        "endpoints": {
            "/health": "GET - Health check",
            "/predict-all": "GET - Predict risk for all Firestore treatments",
            "/predict": "POST - Predict risk for new treatment data",
            "/api/chat": "POST - AI veterinary chatbot (context-aware Q&A)"
        },
        "version": "1.1.0"
    }), 200


@app.route('/test', methods=['GET'])
def test():
    """Simple test endpoint"""
    return jsonify({"message": "Flask server is working!"}), 200


@app.route("/api/chat", methods=["POST"])
def openrouter_chat():
    """OpenRouter API chat endpoint for VetBot with Tamil language support"""
    print("\n[CHAT] Endpoint called")
    
    try:
        data = request.json
        user_message = data.get("message")
        language = data.get("language", "english")
        
        print("USER MESSAGE:", user_message)
        print("LANGUAGE:", language)
        
        if not user_message:
            print("[ERROR] No message provided")
            return jsonify({"error": "No message provided"}), 400
        
        # Get OpenRouter API key
        api_key = os.environ.get("OPENROUTER_API_KEY")
        if not api_key:
            print("[ERROR] OpenRouter API key not configured")
            return jsonify({"error": "OpenRouter API key not configured"}), 500
        
        if api_key == "your_openrouter_api_key_here":
            print("[ERROR] OpenRouter API key not set (still using placeholder)")
            return jsonify({"error": "OpenRouter API key not configured properly"}), 500
            
        print("API KEY:", api_key[:20] + "..." if len(api_key) > 20 else "[SHORT KEY]")
        
        # Detect if message contains Tamil characters
        has_tamil = any('\u0B80' <= char <= '\u0BFF' for char in user_message)
        
        # Add veterinary system prompt with Tamil support
        if has_tamil or language == "tamil":
            system_prompt = """You are VetBot, an expert AI veterinary assistant specializing in poultry and livestock health. 
            The user is speaking in Tamil. You MUST respond in Tamil language (தமிழ்).
            Provide concise, accurate advice about animal diseases, antibiotic usage, withdrawal periods, and food safety IN TAMIL.
            Always recommend consulting a licensed veterinarian for medical decisions.
            Use simple Tamil words that farmers can understand easily."""
        else:
            system_prompt = """You are VetBot, an expert AI veterinary assistant specializing in poultry and livestock health. 
            Provide concise, accurate advice about animal diseases, antibiotic usage, withdrawal periods, and food safety. 
            Always recommend consulting a licensed veterinarian for medical decisions."""

        print("Making OpenRouter API request...")
        print(f"Model: openrouter/free")
        
        import httpx
        client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key,
            http_client=httpx.Client()
        )

        models = [
            "openai/gpt-4o-mini",
            "mistralai/mistral-7b-instruct",
            "meta-llama/llama-3.1-8b-instruct"
        ]

        last_error = None
        for model in models:
            try:
                print(f"Trying model: {model}")
                completion = client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_message}
                    ]
                )
                response_text = completion.choices[0].message.content
                print(f"[SUCCESS] Response from {model}, length: {len(response_text)}")
                return jsonify({"response": response_text})
            except Exception as e:
                print(f"[FALLBACK] {model} failed: {str(e)}")
                last_error = e
                continue

        print(f"[API ERROR] All models failed. Last error: {str(last_error)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"All models failed: {str(last_error)}"}), 500

    except Exception as e:
        print(f"[CHAT ERROR] General error: {str(e)}")
        print(f"[CHAT ERROR] Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/api/tts", methods=["POST"])
def text_to_speech():
    """Text-to-Speech endpoint using Google TTS for Tamil language"""
    print("\n[TTS] Endpoint called")
    
    try:
        from gtts import gTTS
        from io import BytesIO
        
        data = request.json
        text = data.get("text")
        language = data.get("language", "ta")  # Default to Tamil
        
        print(f"TTS TEXT: {text[:50]}...")
        print(f"TTS LANGUAGE: {language}")
        
        if not text:
            return jsonify({"error": "No text provided"}), 400
        
        # Generate speech using gTTS
        tts = gTTS(text=text, lang=language, slow=False)
        
        # Save to BytesIO buffer
        audio_buffer = BytesIO()
        tts.write_to_fp(audio_buffer)
        audio_buffer.seek(0)
        
        print("[TTS] Audio generated successfully")
        
        # Return audio file
        from flask import send_file
        return send_file(
            audio_buffer,
            mimetype="audio/mpeg",
            as_attachment=False,
            download_name="speech.mp3"
        )
    
    except ImportError:
        print("[TTS ERROR] gTTS not installed")
        return jsonify({
            "error": "gTTS library not installed. Run: pip install gtts"
        }), 500
    
    except Exception as e:
        print(f"[TTS ERROR] {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    print("\n" + "#"*60)
    print("#" + " "*58 + "#")
    print("#  Antibiotic Misuse & MRL Risk Prediction API" + " "*13 + "#")
    print("#" + " "*58 + "#")
    print("#"*60)
    
    # Initialize Firebase on startup
    initialize_firebase()
    
    # Check model status
    if model:
        print("✓ ML Model Status: LOADED")
    else:
        print("✗ ML Model Status: NOT LOADED")
    
    print("\n" + "="*60)
    print("🚀 Starting Flask Server...")
    print("="*60)
    print(f"📍 Server URL: http://localhost:5000")
    print(f"📍 Health Check: http://localhost:5000/health")
    print(f"📍 API Docs: http://localhost:5000/")
    print("="*60 + "\n")
    
    # Run Flask app
    app.run(debug=True, host='0.0.0.0', port=5000)
