import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCoJivjqdYUS8JOHgL7AvTl2uH3dDGaMe0",
  authDomain: "threatly-93add.firebaseapp.com",
  projectId: "threatly-93add",
  storageBucket: "threatly-93add.firebasestorage.app",
  messagingSenderId: "820473380808",
  appId: "1:820473380808:web:74b849ec6cf4dd43c78afd"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app); 