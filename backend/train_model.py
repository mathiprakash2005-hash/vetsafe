"""
Sample script to train Logistic Regression model for MRL violation prediction
Run this once to generate the required .pkl files
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, accuracy_score
import joblib
import os

# Create models directory if it doesn't exist
os.makedirs('models', exist_ok=True)

# Sample training data (replace with your actual dataset)
data = {
    'animal_type': ['chicken', 'cow', 'goat', 'chicken', 'cow', 'chicken', 'goat', 'cow'] * 50,
    'antibiotic_type': ['amoxicillin', 'penicillin', 'tetracycline', 'amoxicillin', 'penicillin', 'tetracycline', 'amoxicillin', 'penicillin'] * 50,
    'dosage_mg': [500, 1000, 300, 600, 1200, 450, 350, 900] * 50,
    'duration_days': [5, 7, 3, 6, 8, 4, 5, 7] * 50,
    'days_before_sale': [3, 10, 5, 2, 12, 4, 1, 15] * 50,
    'milk_yield': [0, 25, 5, 0, 30, 0, 8, 28] * 50,
    'previous_violations': [0, 1, 0, 2, 0, 1, 3, 0] * 50,
    'violation': [1, 0, 0, 1, 0, 1, 1, 0] * 50  # Target variable
}

df = pd.DataFrame(data)

# Separate features and target
X = df.drop('violation', axis=1)
y = df['violation']

# Initialize label encoders
label_encoders = {}

# Encode categorical variables
for col in ['animal_type', 'antibiotic_type']:
    le = LabelEncoder()
    X[col] = le.fit_transform(X[col])
    label_encoders[col] = le

# Split data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Scale numerical features
scaler = StandardScaler()
numerical_cols = ['dosage_mg', 'duration_days', 'days_before_sale', 'milk_yield', 'previous_violations']
X_train[numerical_cols] = scaler.fit_transform(X_train[numerical_cols])
X_test[numerical_cols] = scaler.transform(X_test[numerical_cols])

# Train Logistic Regression model
model = LogisticRegression(random_state=42, max_iter=1000)
model.fit(X_train, y_train)

# Evaluate model
y_pred = model.predict(X_test)
print("Model Accuracy:", accuracy_score(y_test, y_pred))
print("\nClassification Report:")
print(classification_report(y_test, y_pred))

# Save model and preprocessors
joblib.dump(model, 'models/logistic_regression_model.pkl')
joblib.dump(scaler, 'models/scaler.pkl')
joblib.dump(label_encoders, 'models/label_encoders.pkl')

print("\n✓ Model and preprocessors saved successfully!")
print("  - models/logistic_regression_model.pkl")
print("  - models/scaler.pkl")
print("  - models/label_encoders.pkl")
