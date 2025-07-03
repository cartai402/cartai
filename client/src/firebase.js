import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyC7jj_js_VW7Si5wrYC91wnH9dlwnVfTc0",
  authDomain: "cartai-7480e.firebaseapp.com",
  databaseURL: "https://cartai-7480e-default-rtdb.firebaseio.com/",
  projectId: "cartai-7480e",
  storageBucket: "cartai-7480e.appspot.com",
  messagingSenderId: "1010697880116",
  appId: "1:1010697880116:web:5a06033b2644567ccac061",
  measurementId: "G-MXV0GGZF7D"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app); // ✅ Correcto
export const db = getDatabase(app); // ✅ Correcto
