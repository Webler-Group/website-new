// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDOv0aIQDLEQ_1Z3-Bw85LLKjmsy3jxTJ8",
  authDomain: "auth-demo-13078.firebaseapp.com",
  databaseURL: "https://auth-demo-13078-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "auth-demo-13078",
  storageBucket: "auth-demo-13078.appspot.com",
  messagingSenderId: "499303673050",
  appId: "1:499303673050:web:7e70c141a46094c49409e3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app);
export const storage = getStorage(app);

export default app;
