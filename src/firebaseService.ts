import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBuXvn88ZLD3NOS32IJeEr2CsyCxshUQcM",
  authDomain: "pronunciation-examination.firebaseapp.com",
  projectId: "pronunciation-examination",
  storageBucket: "pronunciation-examination.firebasestorage.app",
  messagingSenderId: "1076942783492",
  appId: "1:1076942783492:web:3da71f597ad3fa68d4a151",
  measurementId: "G-LK73P1LZ7Y"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export const authenticateUser = async (fullName: string, passwordInput: string): Promise<boolean> => {
  try {
    // Collection: Cedar, Doc ID: Full Name, Field: Password
    const docRef = doc(db, 'Cedar', fullName);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      // Compare Password field
      if (data.Password === passwordInput) {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error("Auth error:", error);
    return false;
  }
};