import { initializeApp } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithRedirect, getRedirectResult, sendPasswordResetEmail } from 'firebase/auth'
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, addDoc, query, where, orderBy, serverTimestamp, updateDoc, Timestamp, deleteDoc, onSnapshot, runTransaction } from 'firebase/firestore'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'

const firebaseConfig = {
  apiKey: "AIzaSyDSinGJdNw52fXfnUUwNWKYJmpOLs4DasA",
  authDomain: "poultry-e0c80.firebaseapp.com",
  projectId: "poultry-e0c80",
  storageBucket: "poultry-e0c80.appspot.com",
  messagingSenderId: "466297998023",
  appId: "1:466297998023:web:996281e9ab0af2e1268ce2"
}

let app
let auth
let db
let storage

try {
  app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  db = getFirestore(app)
  storage = getStorage(app)
  console.log('Firebase initialized successfully')
} catch (error) {
  console.error('Firebase initialization error:', error)
}

export { auth, db, storage }

export {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  sendPasswordResetEmail,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  updateDoc,
  Timestamp,
  deleteDoc,
  onSnapshot,
  runTransaction,
  ref,
  uploadBytes,
  getDownloadURL
}
