# 🔧 Chat Upload Debugging Guide

## Step 1: Check Firebase Console

### Enable Firebase Storage:
1. Go to https://console.firebase.google.com
2. Select project: **poultry-e0c80**
3. Click **Storage** in left menu
4. If not enabled, click **Get Started**
5. Choose **Start in production mode**
6. Click **Done**

### Check Storage Rules:
1. In Storage, click **Rules** tab
2. Should look like this:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```
3. Click **Publish** if you made changes

### Check Firestore Rules:
1. Go to **Firestore Database**
2. Click **Rules** tab
3. Add this if missing:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /chats/{chatId}/messages/{messageId} {
      allow read, write: if request.auth != null;
    }
  }
}
```
4. Click **Publish**

## Step 2: Test in Browser

### Open Browser Console:
1. Press **F12** (or right-click → Inspect)
2. Go to **Console** tab
3. Clear console (trash icon)

### Test Text Message:
1. Type a message
2. Press Enter
3. **Look for in console:**
   ```
   Sending text message...
   Chat ID: xxxxx_xxxxx
   Message: your message
   Message sent successfully! Doc ID: xxxxx
   ```

### Test Photo Upload:
1. Click paperclip icon (📎)
2. Select an image
3. **Look for in console:**
   ```
   === PHOTO UPLOAD STARTED ===
   File name: image.jpg
   File type: image/jpeg
   File size: 1.23 MB
   User ID: xxxxx
   Doctor ID: xxxxx
   Chat ID: xxxxx_xxxxx
   Step 1: Uploading to Firebase Storage...
   Storage path: chats/xxxxx_xxxxx/images/xxxxx_image.jpg
   ✅ Upload successful!
   Step 2: Getting download URL...
   ✅ Download URL obtained: https://...
   Step 3: Saving message to Firestore...
   ✅ Message saved! Doc ID: xxxxx
   === PHOTO UPLOAD COMPLETED ===
   ```

### Test Audio Recording:
1. Click microphone icon (🎤)
2. Allow microphone permission
3. Speak for 3-5 seconds
4. Click send button (✈️)
5. **Look for in console:**
   ```
   Requesting microphone access...
   Microphone access granted
   Recording started
   Stopping recording...
   Recording stopped, chunks: X
   Audio blob created: XXXX bytes
   === AUDIO UPLOAD STARTED ===
   Audio blob size: XX.XX KB
   Recording duration: X seconds
   Step 1: Uploading audio to Firebase Storage...
   ✅ Audio upload successful!
   Step 2: Getting download URL...
   ✅ Download URL obtained: https://...
   Step 3: Saving audio message to Firestore...
   ✅ Audio message saved! Doc ID: xxxxx
   === AUDIO UPLOAD COMPLETED ===
   ```

## Step 3: Common Errors & Solutions

### Error: "Firebase Storage: User does not have permission"
**Solution:**
- Update Storage rules (see Step 1)
- Make sure you're logged in
- Check if `request.auth != null` is in rules

### Error: "storage/unauthorized"
**Solution:**
```javascript
// In Firebase Console → Storage → Rules
// Change to:
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true; // Temporary for testing
    }
  }
}
```
**⚠️ Change back to `request.auth != null` after testing!**

### Error: "Failed to fetch"
**Solution:**
- Check internet connection
- Check if Firebase Storage is enabled
- Verify storageBucket in firebase.js config

### Error: "storage/object-not-found"
**Solution:**
- File didn't upload properly
- Check Storage rules
- Try uploading again

### Error: "NotAllowedError: Permission denied"
**Solution:**
- For audio: Allow microphone in browser
- Click lock icon in address bar
- Set Microphone to "Allow"
- Refresh page

### Error: "No error but nothing happens"
**Solution:**
1. Check Network tab in DevTools
2. Look for failed requests (red)
3. Check if Storage bucket exists
4. Verify user is authenticated

## Step 4: Manual Test

### Test Storage Upload Manually:
1. Go to Firebase Console → Storage
2. Click **Upload file**
3. Select an image
4. If this fails, Storage is not properly configured

### Test Firestore Write Manually:
1. Go to Firebase Console → Firestore
2. Create collection: `chats`
3. Add document with ID: `test_test`
4. Add subcollection: `messages`
5. Add document with fields:
   - message: "test"
   - timestamp: (current time)
6. If this fails, Firestore rules are wrong

## Step 5: Check Firebase Config

### Verify firebase.js:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyDSinGJdNw52fXfnUUwNWKYJmpOLs4DasA",
  authDomain: "poultry-e0c80.firebaseapp.com",
  projectId: "poultry-e0c80",
  storageBucket: "poultry-e0c80.firebasestorage.app", // ← Check this!
  messagingSenderId: "466297998023",
  appId: "1:466297998023:web:996281e9ab0af2e1268ce2"
}
```

### If storageBucket is wrong:
1. Go to Firebase Console → Project Settings
2. Scroll to "Your apps"
3. Copy the correct storageBucket value
4. Update firebase.js

## Step 6: Test with Different Files

### Test with small image:
- Use image < 1MB
- Use JPG format
- Simple filename (no special characters)

### Test with different browser:
- Try Chrome (best support)
- Try Edge
- Try Firefox

## Step 7: Check Browser Permissions

### For Audio:
1. Click lock icon in address bar
2. Check Microphone permission
3. Should be "Allow"
4. If "Ask" or "Block", change to "Allow"
5. Refresh page

### For Camera (if using camera button):
1. Same as above but for Camera permission

## Step 8: Network Issues

### Check if Firebase is reachable:
1. Open Network tab in DevTools
2. Try uploading
3. Look for requests to:
   - `firebasestorage.googleapis.com`
   - `firestore.googleapis.com`
4. If blocked, check firewall/antivirus

## Step 9: Code Verification

### Check if storage is initialized:
Open console and type:
```javascript
console.log(storage)
```
Should show: `FirebaseStorageImpl {app: FirebaseAppImpl, ...}`

If shows `undefined`, storage is not initialized.

### Check if user is authenticated:
```javascript
console.log(auth.currentUser)
```
Should show user object with `uid`.

If `null`, user is not logged in.

## Step 10: Last Resort

### Clear everything and retry:
1. Clear browser cache (Ctrl+Shift+Delete)
2. Clear localStorage:
   ```javascript
   localStorage.clear()
   ```
3. Logout and login again
4. Try uploading again

### Enable debug mode:
Add to firebase.js:
```javascript
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { connectStorageEmulator } from 'firebase/storage'

// After storage initialization:
if (location.hostname === 'localhost') {
  console.log('🔧 Debug mode enabled')
}
```

## ✅ Success Checklist

Before testing, verify:
- [ ] Firebase Storage is enabled
- [ ] Storage rules allow authenticated users
- [ ] Firestore rules allow chat messages
- [ ] User is logged in (check console)
- [ ] Storage is initialized (check console)
- [ ] Internet connection is working
- [ ] Browser has microphone permission (for audio)
- [ ] Using Chrome or Edge browser
- [ ] No firewall blocking Firebase
- [ ] Console shows no errors

## 📞 Still Not Working?

### Share these details:
1. **Browser console logs** (copy all text)
2. **Network tab** (screenshot of failed requests)
3. **Firebase Storage rules** (screenshot)
4. **Firebase Firestore rules** (screenshot)
5. **Error message** (exact text)
6. **Browser and version** (e.g., Chrome 120)
7. **Operating system** (Windows/Mac/Linux)

### Quick test command:
Open console and run:
```javascript
// Test Storage
const testRef = ref(storage, 'test.txt')
const testBlob = new Blob(['test'], { type: 'text/plain' })
uploadBytes(testRef, testBlob)
  .then(() => console.log('✅ Storage works!'))
  .catch(err => console.error('❌ Storage error:', err))

// Test Firestore
addDoc(collection(db, 'test'), { test: true })
  .then(() => console.log('✅ Firestore works!'))
  .catch(err => console.error('❌ Firestore error:', err))
```

---

**Most Common Issue:** Storage rules not configured properly!

**Quick Fix:**
```javascript
// Firebase Console → Storage → Rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Click **Publish** and try again!
