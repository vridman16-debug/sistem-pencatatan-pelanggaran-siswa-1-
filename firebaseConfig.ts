// firebaseConfig.ts
// FIX: Use * as import for Firebase App initialization functions to resolve "Module has no exported member" errors.
import * as FirebaseApp from "firebase/app";
// FIX: Use * as import for Firebase Auth initialization functions to resolve "Module has no exported member" errors.
import * as FirebaseAuth from "firebase/auth";
// FIX: Use * as import for Firebase Firestore initialization functions to resolve "Module has no exported member" errors.
import * as FirebaseFirestore from "firebase/firestore";
// If you want to use Firebase Analytics, uncomment the import below:
// import { getAnalytics } from "firebase/analytics";

// THIS IS YOUR WEB APP'S FIREBASE CONFIGURATION (copied from Firebase Console)
const firebaseConfig = {
  apiKey: "AIzaSyDJ1S42PCDGf9ephBH2at7_mSEjZhF-ZOK",
  authDomain: "sistem-pencatatan-pelanggaran.firebaseapp.com",
  projectId: "sistem-pencatatan-pelanggaran",
  storageBucket: "sistem-pencatatan-pelanggaran.firebasestorage.app",
  messagingSenderId: "581340009104",
  appId: "1:581340009104:web:ed12eae087f28d6fbebe15",
  measurementId: "G-B72Z4J9CXN" // This is for Analytics, optional for core app functionality
};

// Initialize Firebase
// FIX: Call initializeApp from FirebaseApp namespace.
const app = FirebaseApp.initializeApp(firebaseConfig);
// FIX: Call getAuth from FirebaseAuth namespace.
export const auth = FirebaseAuth.getAuth(app);
// FIX: Call getFirestore from FirebaseFirestore namespace.
export const db = FirebaseFirestore.getFirestore(app);
// If you uncommented getAnalytics, you can initialize it here:
// export const analytics = getAnalytics(app);

// Helper function to get the current Firebase Auth user's ID
export const getCurrentFirebaseUserId = () => auth.currentUser?.uid;