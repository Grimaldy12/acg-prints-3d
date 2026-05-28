const admin = require('firebase-admin');
const path = require('path');

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (err) {
    console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT environment variable:', err);
  }
}

if (!serviceAccount) {
  try {
    const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
    serviceAccount = require(serviceAccountPath);
  } catch (err) {
    console.error('Failed to load local serviceAccountKey.json:', err);
    throw new Error('Firebase credentials missing. Please set the FIREBASE_SERVICE_ACCOUNT environment variable or place serviceAccountKey.json locally in server/.');
  }
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Enable timestamps in snapshots for Firestore if needed
db.settings({ ignoreUndefinedProperties: true });

// Compatibility layers for Express server startup checks
db.ready = true;
db._initPromise = Promise.resolve();

console.log('Firebase Firestore initialized successfully!');

module.exports = db;
