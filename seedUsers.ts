import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAeEVBmJGaW6jBiQxXFeRLM38DYvlYcwuM",
  authDomain: "pronunciation-exam-pro.firebaseapp.com",
  projectId: "pronunciation-exam-pro",
  storageBucket: "pronunciation-exam-pro.firebasestorage.app",
  messagingSenderId: "945368789678",
  appId: "1:945368789678:web:f2abc4395a40776d7e733f",
  measurementId: "G-0QLP2XWSCT"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Seed data untuk users
const users = [
  { name: "Aura", password: "Yogyakarta, August 15, 2000" },
  { name: "Azizah Ashabihi", password: "Pematangsiantar, May 25, 2008" },
  { name: "Dhia Awliya Azka Purnama", password: "Sukabumi, April 1, 2010" },
  { name: "Eliana Nurvianita Ulfa", password: "Nganjuk, April 28, 1997" },
  { name: "Hayatul Insani Alhumairah", password: "Makassar, November 28, 2009" },
  { name: "Sittayani Afta Shobikhah", password: "Lamongan, June 22, 2001" },
  { name: "Lintang Asmara", password: "Jember, March 3, 2005" },
  { name: "Najwa Alyssa Putri", password: "Bojonegoro, June 20, 2009" },
  { name: "Nadya Musyarrofah", password: "Bandung, June 21, 2007" },
  { name: "Nadya Rahma Azzahro", password: "Magetan, September 2, 2006" },
  { name: "Nayla Andini Kissisina", password: "Tangerang, March 23, 2005" },
  { name: "Penesia Sianturi", password: "Tarutung, September 25, 2006" },
  { name: "Purnama Sari", password: "Jepara, May 12, 2006" },
  { name: "Ramlah", password: "Maros, July 19, 2000" },
  { name: "Salsabila Novita Bella Putri Rahman", password: "Surabaya, November 18, 2008" },
  { name: "Shalahuddin Ayyubi", password: "Medan, October 19, 2006" },
  { name: "Shobrina Salma Izzatunnisa'", password: "Tulungagung, February 20, 2006" },
  { name: "Tara Balqis Alpiyyah", password: "Pematangsiantar, November 20, 2008" },
  { name: "Tiara Nilawati Dewi", password: "Subang, July 22, 2002" },
  { name: "Zahida Najwa Mu'nisah", password: "Mojokerto, April 14, 2006" },
  { name: "Suci Adellia", password: "Prabumulih, April 8, 2018" },
  { name: "Wafiq Azizah", password: "Cilacap, March 13, 2008" },
  { name: "Salma Dhitya Nafia", password: "Magelang, May 6, 2007" },
  { name: "Widya Sylvana Putri", password: "Belitung, January 17, 2005" }
];

export const seedUsers = async () => {
  console.log("🌱 Starting to seed users...");
  console.log("🔍 Firebase project:", firebaseConfig.projectId);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const user of users) {
    try {
      const docId = user.name.replace(/\s+/g, '_');
      console.log(`🔄 Processing: ${user.name} -> ${docId}`);
      
      const docRef = doc(db, 'users', docId);
      
      const userData = {
        Password: user.password,
        FullName: user.name,
        CreatedAt: new Date().toISOString()
      };
      
      console.log("📤 Data to be written:", userData);
      
      await setDoc(docRef, userData, { merge: true });
      
      console.log(`✅ Successfully created user: ${user.name} (ID: ${docId})`);
      successCount++;
      
      // Verify the document was created
      const verifyDoc = await getDoc(docRef);
      if (verifyDoc.exists()) {
        console.log(`✅ Verified: Document exists for ${docId}`);
      } else {
        console.log(`❌ Warning: Document not found for ${docId} after creation`);
      }
      
    } catch (error) {
      console.error(`❌ Failed to create user: ${user.name}`, error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      failCount++;
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n🎉 Seeding completed!`);
  console.log(`✅ Success: ${successCount} users`);
  console.log(`❌ Failed: ${failCount} users`);
  
  if (failCount > 0) {
    console.log("\n🔍 Possible issues:");
    console.log("1. Firebase Rules don't allow write operations");
    console.log("2. Network connectivity issues");
    console.log("3. Firebase project configuration");
    console.log("4. Authentication/permission issues");
  }
};

// Test connection first
export const testConnection = async () => {
  try {
    console.log("🔍 Testing Firebase connection...");
    console.log("Project ID:", firebaseConfig.projectId);
    
    // Try to create a reference to users collection
    doc(db, 'users', '_test_connection');
    console.log("✅ Firebase connection successful");
    return true;
  } catch (error) {
    console.error("❌ Firebase connection failed:", error);
    return false;
  }
};

// Run seeding if this file is executed directly
if (typeof window === 'undefined') {
  testConnection().then(connected => {
    if (connected) {
      seedUsers();
    } else {
      console.log("❌ Cannot proceed with seeding due to connection issues");
    }
  });
}
