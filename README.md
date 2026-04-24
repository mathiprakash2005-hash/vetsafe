# VET_CORE — Poultry Management System

A comprehensive web application for managing poultry farms, connecting farmers, veterinary doctors, and buyers in one platform.

## 🚀 Features

- **Farmer Dashboard**: Manage livestock, track health records, and medication
- **Doctor Portal**: Monitor animal health, prescribe treatments, and manage withdrawal periods
- **Buyer Interface**: Browse available livestock and make purchases
- **AI Chatbot**: VetBot AI assistant for veterinary guidance (Tamil voice support)
- **ML Risk Prediction**: Antibiotic misuse and MRL violation detection
- **Real-time Updates**: Firebase Firestore integration for live data synchronization
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## 🛠️ Technical Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|----------|
| **React** | 18.x | Core UI library for building component-based user interfaces |
| **Vite** | 5.x | Fast build tool and development server with HMR |
| **React Router DOM** | 6.x | Client-side routing for navigation between dashboards |
| **CSS3** | - | Custom styling with CSS variables for theming and responsive design |
| **JavaScript (ES6+)** | - | Modern JavaScript features for application logic |

### Backend & Database

| Technology | Purpose |
|------------|----------|
| **Firebase Authentication** | User authentication with email/password and Google OAuth |
| **Cloud Firestore** | NoSQL real-time database for storing all application data |
| **Firebase SDK** | JavaScript SDK for Firebase integration (v10.x) |
| **Flask (Python)** | REST API backend for ML predictions |

### Mobile Development

| Technology | Purpose |
|------------|----------|
| **Capacitor** | Cross-platform native runtime to convert web app to Android/iOS |
| **Android Studio** | IDE for building and testing Android APK |

### Development Tools

| Tool | Purpose |
|------|----------|
| **npm** | Package manager for dependencies |
| **Git** | Version control system |
| **ESLint** | Code linting and quality checks |
| **Firebase CLI** | Command-line tools for Firebase deployment and management |

### Key Dependencies

```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^6.x",
  "firebase": "^10.x",
  "@capacitor/core": "^5.x",
  "@capacitor/android": "^5.x"
}
```

### Architecture Pattern

- **Component-Based Architecture**: Modular React components for reusability
- **Role-Based Access Control (RBAC)**: Different dashboards for Farmer, Doctor, and Buyer
- **Real-time Data Sync**: Firestore listeners for live updates
- **Responsive Design**: Mobile-first approach with CSS media queries

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Firebase account
- Modern web browser

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd document
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   - Create a Firebase project at [https://console.firebase.google.com](https://console.firebase.google.com)
   - Enable Authentication (Email/Password + Google)
   - Enable Firestore Database
   - Copy your Firebase config to `src/config/firebase.js`

4. **Set up environment variables**
   - Create a `.env` file in the root directory:
   ```env
   VITE_FIREBASE_API_KEY=<your-api-key>
   VITE_FIREBASE_AUTH_DOMAIN=<your-auth-domain>
   VITE_FIREBASE_PROJECT_ID=<your-project-id>
   VITE_FIREBASE_STORAGE_BUCKET=<your-storage-bucket>
   VITE_FIREBASE_MESSAGING_SENDER_ID=<your-sender-id>
   VITE_FIREBASE_APP_ID=<your-app-id>
   VITE_API_URL=http://localhost:5000
   ```

5. **Run the application**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Open browser and navigate to `http://localhost:5173`

## 🔐 Test Credentials

> ⚠️ **Note**: Create test accounts via the registration page. Do not hardcode credentials in source code or README files.

| Role | Access |
|------|--------|
| **Farmer** | Livestock management, health records, medication tracking |
| **Doctor** | Animal health monitoring, treatment prescriptions, withdrawal period management |
| **Buyer** | Browse livestock, view health status, purchase animals |

## 🔥 Firebase Firestore Structure

### Collections

#### 1. `users`
```
users/
  └── {userId}/
      ├── email: string
      ├── role: string ("farmer" | "doctor" | "buyer")
      ├── name: string
      ├── createdAt: timestamp
      └── additionalInfo: object
```

#### 2. `livestock`
```
livestock/
  └── {animalId}/
      ├── farmerId: string
      ├── animalType: string ("chicken" | "duck" | "turkey")
      ├── breed: string
      ├── age: number
      ├── weight: number
      ├── healthStatus: string ("healthy" | "sick" | "under-treatment")
      ├── isAvailableForSale: boolean
      ├── currentValue: number
      └── createdAt: timestamp
```

#### 3. `healthRecords`
```
healthRecords/
  └── {recordId}/
      ├── animalId: string
      ├── farmerId: string
      ├── doctorId: string
      ├── symptoms: array
      ├── diagnosis: string
      ├── status: string ("normal" | "requires-attention" | "critical")
      └── createdAt: timestamp
```

#### 4. `medications`
```
medications/
  └── {medicationId}/
      ├── animalId: string
      ├── farmerId: string
      ├── doctorId: string
      ├── medicationName: string
      ├── dosage: string
      ├── withdrawalPeriod: number (days)
      ├── withdrawalEndDate: timestamp
      ├── status: string ("active" | "completed" | "withdrawal-period")
      └── createdAt: timestamp
```

#### 5. `transactions`
```
transactions/
  └── {transactionId}/
      ├── buyerId: string
      ├── farmerId: string
      ├── animalId: string
      ├── amount: number
      ├── status: string ("pending" | "completed" | "cancelled")
      └── createdAt: timestamp
```

## 🔍 Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }

    match /livestock/{animalId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null &&
                      request.resource.data.farmerId == request.auth.uid;
      allow update, delete: if request.auth != null &&
                              resource.data.farmerId == request.auth.uid;
    }

    match /healthRecords/{recordId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null &&
                     (resource.data.farmerId == request.auth.uid ||
                      resource.data.doctorId == request.auth.uid);
    }

    match /medications/{medicationId} {
      allow read: if request.auth != null;
      allow create, update: if request.auth != null;
    }

    match /transactions/{transactionId} {
      allow read: if request.auth != null &&
                    (resource.data.buyerId == request.auth.uid ||
                     resource.data.farmerId == request.auth.uid);
      allow create: if request.auth != null;
    }
  }
}
```

## 📱 Building for Android

```bash
npm run build
npx cap add android
npx cap sync
npx cap open android
```
Then in Android Studio: **Build > Build Bundle(s) / APK(s) > Build APK(s)**

APK location: `android/app/build/outputs/apk/debug/`

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Firebase connection error | Check `.env` config values |
| Auth errors | Ensure Email/Password & Google auth enabled in Firebase Console |
| Data not showing | Check Firestore security rules and user authentication |
| Build errors | Run `rm -rf node_modules && npm install` |

## 🔒 Security Best Practices

1. Never commit `.env` or `firebase-service-account.json` to version control
2. Add both to `.gitignore`
3. Use environment variables for all sensitive data
4. Implement proper Firestore security rules
5. Enable Firebase App Check for production
6. Enable 2FA on your Firebase account

## 📊 Data Flow

```
User Login → Firebase Auth → Role Detection → Dashboard Routing
                                                      ↓
                                            Firestore Queries
                                                      ↓
                                            Real-time Updates
                                                      ↓
                                            React Components
                                                      ↓
                                            UI Rendering
```

## 📱 Building for Android

1. Install Capacitor:
   ```bash
   npm install @capacitor/core @capacitor/cli @capacitor/android
   npx cap init
   ```
2. Build & sync:
   ```bash
   npm run build
   npx cap add android
   npx cap sync
   npx cap open android
   ```

## 🎓 Learning Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Data Modeling](https://firebase.google.com/docs/firestore/data-model)
- [React Router Docs](https://reactrouter.com/)
- [Vite Documentation](https://vitejs.dev/)

## 📄 License

This project is for educational purposes.

## 👥 Team

- **Developer**: Mathi Prakash

---

**Last Updated**: 2024
