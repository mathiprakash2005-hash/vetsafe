# VET_CORE — Backend API

Flask REST API for antibiotic misuse and MRL (Maximum Residue Limit) risk prediction using Machine Learning.

## 🚀 Features

- **Firebase Firestore Integration**: Fetch treatment data from cloud database
- **ML Predictions**: Logistic Regression model for violation risk assessment
- **Risk Classification**: Low (0–0.4), Moderate (0.4–0.7), High (0.7–1.0)
- **Smart Recommendations**: Actionable advice based on risk level
- **Tamil TTS Support**: Text-to-speech endpoint for VetBot AI chatbot
- **RESTful API**: Clean endpoints for frontend integration

## 🛠️ Setup

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Environment Variables

Create a `.env` file in the `backend/` directory:

```env
FIREBASE_SERVICE_ACCOUNT=firebase-service-account.json
ANTHROPIC_API_KEY=<your-claude-api-key>
```

> ⚠️ Never commit `.env` or `firebase-service-account.json` to version control.

### 3. Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Project Settings > Service Accounts
3. Click **Generate New Private Key**
4. Save as `firebase-service-account.json` in `backend/`
5. Add `firebase-service-account.json` to `.gitignore`

### 4. ML Models

Place trained models in the `models/` directory:
- `logistic_regression_model.pkl`
- `scaler.pkl`
- `label_encoders.pkl`

### 5. Run the Server

```bash
python app.py
```

Server runs on `http://localhost:5000`

## 📡 API Endpoints

### Health Check
```
GET /health
```
```json
{
  "status": "healthy",
  "model_loaded": true,
  "firebase_connected": true,
  "timestamp": "2024-01-15T10:30:00"
}
```

### Predict All Treatments
```
GET /predict-all
```
```json
{
  "success": true,
  "count": 10,
  "treatments": [
    {
      "id": "treatment_001",
      "animal_type": "chicken",
      "antibiotic_type": "amoxicillin",
      "violation_probability": 0.78,
      "risk_level": "High",
      "recommendation": "⚠️ HIGH RISK: Do NOT sell animal..."
    }
  ]
}
```

### Predict Single Treatment
```
POST /predict
Content-Type: application/json
```
**Request:**
```json
{
  "animal_type": "chicken",
  "antibiotic_type": "amoxicillin",
  "dosage_mg": 500,
  "duration_days": 5,
  "days_before_sale": 3,
  "milk_yield": 0,
  "previous_violations": 0
}
```
**Response:**
```json
{
  "success": true,
  "violation_probability": 0.78,
  "risk_level": "High",
  "recommendation": "⚠️ HIGH RISK: Do NOT sell animal..."
}
```

### Tamil TTS (VetBot)
```
POST /api/tts
Content-Type: application/json
```
```json
{
  "text": "உங்கள் கோழிக்கு நல்ல ஆரோக்கியம்",
  "language": "ta"
}
```

### VetBot Chat
```
POST /api/chat
Content-Type: application/json
```
```json
{
  "message": "Signs of Newcastle disease?",
  "language": "tamil"
}
```

## 📊 Risk Levels

| Level | Probability | Action |
|-------|-------------|--------|
| **Low** | 0.0 – 0.4 | Safe to proceed with normal monitoring |
| **Moderate** | 0.4 – 0.7 | Requires extended withdrawal period |
| **High** | 0.7 – 1.0 | Do NOT sell — consult veterinarian immediately |

## 🗂️ Data Schema

| Field | Type | Description |
|-------|------|-------------|
| `animal_type` | string | Type of animal (chicken, cow, goat) |
| `antibiotic_type` | string | Antibiotic used (amoxicillin, penicillin) |
| `dosage_mg` | float | Dosage in milligrams |
| `duration_days` | int | Treatment duration in days |
| `days_before_sale` | int | Days between treatment end and sale |
| `milk_yield` | float | Daily milk yield (dairy animals) |
| `previous_violations` | int | Number of previous MRL violations |

## 🚀 Production Deployment

### Gunicorn
```bash
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

### Docker
```dockerfile
FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app:app"]
```

## 🧪 Testing

```bash
# Health check
curl http://localhost:5000/health

# Single prediction
curl -X POST http://localhost:5000/predict \
  -H "Content-Type: application/json" \
  -d '{"animal_type":"chicken","antibiotic_type":"amoxicillin","dosage_mg":500,"duration_days":5,"days_before_sale":3,"milk_yield":0,"previous_violations":0}'
```

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Firebase connection error | Verify `firebase-service-account.json` exists and is valid |
| Model loading error | Ensure all `.pkl` files are in `models/` directory |
| CORS issues | Adjust CORS settings in `app.py` |
| TTS not working | Check `ANTHROPIC_API_KEY` in `.env` |

## 🔒 Security Notes

- Never commit `firebase-service-account.json` to version control
- Never commit `.env` to version control
- Add both to `.gitignore`
- Use environment variables for all sensitive data in production
- Implement API authentication before production deployment

## 📄 License

Educational / Research Project
