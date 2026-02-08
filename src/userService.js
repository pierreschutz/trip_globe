import { getDb } from "./firebase.js";

export async function getUserProfile(uid) {
    const db = getDb();
    const doc = await db.collection("users").doc(uid).get();
    if (doc.exists) {
        return doc.data();
    }
    return null;
}

export async function isUsernameTaken(username) {
    const db = getDb();
    const doc = await db.collection("usernames").doc(username).get();
    return doc.exists;
}

export function validateUsername(username) {
    if (!username || username.length < 3) {
        return "Username must be at least 3 characters";
    }
    if (username.length > 30) {
        return "Username must be 30 characters or less";
    }
    if (!/^[a-z0-9][a-z0-9_-]*[a-z0-9]$/.test(username) && username.length > 2) {
        return "Lowercase letters, numbers, hyphens, underscores only. Must start and end with a letter or number.";
    }
    return null;
}

export async function createUserProfile(user, username) {
    const db = getDb();
    const batch = db.batch();

    const userRef = db.collection("users").doc(user.uid);
    const usernameRef = db.collection("usernames").doc(username);

    const profile = {
        username: username,
        displayName: user.displayName || "",
        photoURL: user.photoURL || "",
        isPublic: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    batch.set(userRef, profile);
    batch.set(usernameRef, { uid: user.uid });

    await batch.commit();
    return profile;
}
