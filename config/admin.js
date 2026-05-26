const admin = require('firebase-admin');

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (error) {
    console.error('Error al parsear la variable de entorno FIREBASE_SERVICE_ACCOUNT:', error);
  }
} else {
  try {
    serviceAccount = require('../serviceAccountKey.json');
  } catch (error) {
    console.error('No se encontró serviceAccountKey.json y tampoco se detectó FIREBASE_SERVICE_ACCOUNT en las variables de entorno.');
  }
}

if (!admin.apps.length && serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };
