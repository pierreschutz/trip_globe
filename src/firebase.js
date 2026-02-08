// Firebase app initialization
// Replace these values with your Firebase project config
const firebaseConfig = {
    apiKey: "AIzaSyBJK4mMXmYXh2sccZPM0QJz5r7Nuqsbf4s",
    authDomain: "trip-globe-viz.firebaseapp.com",
    projectId: "trip-globe-viz",
    storageBucket: "trip-globe-viz.firebasestorage.app",
    messagingSenderId: "208443970680",
    appId: "1:208443970680:web:64b712ad374a4aa4cb498d"
};

let app = null;
let auth = null;
let db = null;

export function initFirebase() {
    if (app) {
        return { app, auth, db };
    }
    app = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    return { app, auth, db };
}

export function getAuth() {
    return auth;
}

export function getDb() {
    return db;
}
