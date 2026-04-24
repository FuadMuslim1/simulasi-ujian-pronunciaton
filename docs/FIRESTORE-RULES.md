# Firestore Security Rules

## 📋 Overview

Ada 2 versi Firestore Rules:

1. **firestore-rules.txt** - Rules dasar (lebih permisif)
2. **firestore-rules-secure.txt** - Rules ketat dengan validasi (recommended)

## 🔒 firestore-rules.txt (Basic)

### Features:
- ✅ Users collection: Read allowed, Write blocked
- ✅ Recordings collection: User hanya bisa akses data mereka sendiri
- ✅ Sessions collection: User hanya bisa akses data mereka sendiri
- ✅ Default: Deny all untuk koleksi lain

### Keamanan:
- 🟡 Medium - Cukup aman untuk production
- ⚠️ Password masih plaintext di database
- ⚠️ Tidak ada validasi data structure

## 🔐 firestore-rules-secure.txt (Recommended)

### Features:
- ✅ Users collection: Read allowed, Write blocked
- ✅ Data validation untuk semua collections
- ✅ Type checking untuk fields
- ✅ User isolation (user hanya bisa akses data mereka)
- ✅ Admin collection dengan role-based access
- ✅ Prevent update/delete untuk recordings

### Keamanan:
- 🟢 High - Sangat aman untuk production
- ✅ Validasi struktur data
- ✅ Type safety
- ✅ Role-based access control
- ⚠️ Password masih plaintext (perlu perbaikan terpisah)

## 📝 Cara Deploy Rules

### Option 1: Via Firebase Console (Recommended)

1. Buka [Firebase Console](https://console.firebase.google.com)
2. Pilih project: **pronunciation-exam-pro**
3. Klik **Firestore Database** di sidebar
4. Klik tab **Rules**
5. Copy isi dari `firestore-rules.txt` atau `firestore-rules-secure.txt`
6. Paste ke editor
7. Klik **Publish**

### Option 2: Via Firebase CLI

```bash
# Install Firebase CLI (jika belum)
npm install -g firebase-tools

# Login
firebase login

# Init project (jika belum)
firebase init firestore

# Copy rules ke firestore.rules
cp firestore-rules-secure.txt firestore.rules

# Deploy
firebase deploy --only firestore:rules
```

## 🔧 Seeding Users dengan Rules Baru

Karena client write di-block, ada 2 cara untuk seed users:

### Option 1: Temporary Enable Write (Not Recommended)

1. Uncomment baris ini di rules:
```javascript
allow create: if isValidUserData();
```

2. Deploy rules
3. Run seeding: `npm run tsx seedUsers.ts`
4. Comment kembali dan deploy lagi

### Option 2: Firebase Admin SDK (Recommended)

Buat script seeding dengan Admin SDK yang bypass rules:

```typescript
// seedUsersAdmin.ts
import * as admin from 'firebase-admin';
import serviceAccount from './serviceAccountKey.json';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Seeding code here...
```

## 🚨 Security Issues yang Masih Ada

### 1. Password Plaintext
**Problem:** Password disimpan sebagai plaintext di Firestore

**Solution:**
- Gunakan Firebase Authentication
- Atau hash password dengan bcrypt/argon2
- Simpan hash di Firestore, bukan plaintext

### 2. No Rate Limiting
**Problem:** Tidak ada rate limiting untuk login attempts

**Solution:**
- Implementasi rate limiting di Cloud Functions
- Atau gunakan Firebase App Check
- Atau gunakan reCAPTCHA

### 3. No Audit Logging
**Problem:** Tidak ada logging untuk akses data

**Solution:**
- Implementasi audit logging di Cloud Functions
- Track login attempts, failed logins, dll

## 📊 Comparison Table

| Feature | firestore-rules.txt | firestore-rules-secure.txt |
|---------|---------------------|----------------------------|
| Users Read | ✅ Allowed | ✅ Allowed |
| Users Write | ❌ Blocked | ❌ Blocked |
| Data Validation | ❌ No | ✅ Yes |
| Type Checking | ❌ No | ✅ Yes |
| User Isolation | ✅ Yes | ✅ Yes |
| Admin Role | ❌ No | ✅ Yes |
| Recording Delete | ✅ Allowed | ❌ Blocked |
| Session Update | ✅ Allowed | ✅ Allowed |

## 🎯 Recommendation

**Untuk Production:** Gunakan `firestore-rules-secure.txt`

**Langkah-langkah:**
1. Deploy `firestore-rules-secure.txt` ke Firebase
2. Seed users via Firebase Admin SDK
3. Test login functionality
4. Monitor Firestore usage di Console
5. Implementasi password hashing (future improvement)

## 📞 Support

Jika ada masalah dengan rules:
1. Cek Firebase Console → Firestore → Rules tab
2. Lihat error message di console
3. Test rules dengan Rules Playground di Firebase Console
