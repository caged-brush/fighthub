import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyC5wt8ZkElrKfsTr2E2MKfciBNyx0OjTgg",
    authDomain: "fighthub-1b139.firebaseapp.com",
    projectId: "fighthub-1b139",
    storageBucket: "fighthub-1b139.firebasestorage.app",
    messagingSenderId: "897991379182",
    appId: "1:897991379182:web:9222900023cdffaa568bff",
    measurementId: "G-KQ4N34H0QR"
  };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth };
