
import { initializeApp, getApp, type FirebaseApp } from 'firebase/app';
import { getDatabase, type Database, ref, set } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyBssScXwadFMajRBpVoXIMEwE9RR9MgqPY",
  authDomain: "breatheeasy-dashboard-ag0rl.firebaseapp.com",
  databaseURL: "https://breatheeasy-dashboard-ag0rl-default-rtdb.firebaseio.com",
  projectId: "breatheeasy-dashboard-ag0rl",
  storageBucket: "breatheeasy-dashboard-ag0rl.firebasestorage.app",
  messagingSenderId: "652574746004",
  appId: "1:652574746004:web:e05d233b501d867f359b81"
};

let app: FirebaseApp;
try {
  app = getApp();
} catch (e) {
  app = initializeApp(firebaseConfig);
}

const database: Database = getDatabase(app);

// Export firebase db functions
export { app, database, ref, set };
