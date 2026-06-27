import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCsxfad2queBt5cDOtJodqlpKpu6mNOwCo",
    authDomain: "mypa-ai-planner.firebaseapp.com",
    projectId: "mypa-ai-planner",
    storageBucket: "mypa-ai-planner.firebasestorage.app",
    messagingSenderId: "592819684160",
    appId: "1:592819684160:web:55900c1416f0c48589f0a5"
  };

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);