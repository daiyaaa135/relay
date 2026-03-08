import admin from 'firebase-admin';

function getApp(): admin.app.App {
  if (admin.apps.length > 0) return admin.apps[0]!;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const projectId = process.env.FIREBASE_PROJECT_ID;

  if (!serviceAccountJson || !projectId) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID env vars');
  }

  let serviceAccount: admin.ServiceAccount;
  try {
    serviceAccount = JSON.parse(serviceAccountJson) as admin.ServiceAccount;
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON');
  }

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId,
  });
}

export function getFirebaseMessaging(): admin.messaging.Messaging {
  return getApp().messaging();
}
