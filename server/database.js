const admin = require('firebase-admin');
const path = require('path');

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
const serviceAccount = require(serviceAccountPath);

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
