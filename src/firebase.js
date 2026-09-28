// Firebase is optional. With no config, the app runs entirely on
// localStorage — fine for a single device. Fill in a .env (see
// .env.example) to sync tasks/log/people across your devices via Firestore,
// the same pattern the Farkle project uses.
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getMessaging, isSupported as messagingIsSupported } from 'firebase/messaging'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const firebaseEnabled = Boolean(config.apiKey && config.projectId)

let app = null
let db = null

if (firebaseEnabled) {
  app = initializeApp(config)
  db = getFirestore(app)
}

export { app, db }

// Push notifications need their own opt-in flow since they require a
// user gesture + the VAPID key from your Firebase project's Cloud
// Messaging settings. See CommLog/Focus components for where this is
// invoked, and README.md for how to get the VAPID key.
export async function getMessagingIfSupported() {
  if (!firebaseEnabled) return null
  const supported = await messagingIsSupported().catch(() => false)
  if (!supported) return null
  return getMessaging(app)
}
