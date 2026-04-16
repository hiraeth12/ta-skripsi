// Import core firebase
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Config dari Firebase Console
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "XXXX",
  appId: "XXXX",
};

// Init app
const app = initializeApp(firebaseConfig);

// Init auth
export const auth = getAuth(app);
