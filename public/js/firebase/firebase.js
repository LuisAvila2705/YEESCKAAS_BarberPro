// public/js/firebase/firebase.js  (CDN version)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCbFk0hEPXcjfNF9QoPQevdrqPRZCZxsYQ",
  authDomain: "barberpro-f6004.firebaseapp.com",
  projectId: "barberpro-f6004",
  storageBucket: "barberpro-f6004.firebasestorage.app",
  messagingSenderId: "97996236003",
  appId: "1:97996236003:web:d32efe0f055fe71b5c91d6"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);