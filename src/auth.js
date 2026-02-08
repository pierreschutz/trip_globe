import { getAuth } from "./firebase.js";
import { getUserProfile } from "./userService.js";
import { showUsernameModal } from "./usernameModal.js";

const listeners = [];

export function onAuthStateChanged(callback) {
    listeners.push(callback);
}

function notifyListeners(user, profile) {
    listeners.forEach(fn => fn(user, profile));
}

export function initAuth() {
    const auth = getAuth();

    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            notifyListeners(null, null);
            updateAuthUI(null);
            return;
        }

        const profile = await getUserProfile(user.uid);
        if (profile) {
            notifyListeners(user, profile);
            updateAuthUI(user);
        } else {
            showUsernameModal(user, (profile) => {
                notifyListeners(user, profile);
                updateAuthUI(user);
            });
        }
    });
}

export function signIn() {
    const auth = getAuth();
    const provider = new firebase.auth.GoogleAuthProvider();
    return auth.signInWithPopup(provider);
}

export function signOut() {
    const auth = getAuth();
    return auth.signOut();
}

export function getCurrentUser() {
    const auth = getAuth();
    return auth.currentUser;
}

function updateAuthUI(user) {
    const signInBtn = document.getElementById("authSignIn");
    const userMenu = document.getElementById("authUserMenu");
    const userPhoto = document.getElementById("authUserPhoto");

    if (!signInBtn || !userMenu) {
        return;
    }

    if (user) {
        signInBtn.style.display = "none";
        userMenu.style.display = "inline-flex";
        if (userPhoto && user.photoURL) {
            userPhoto.src = user.photoURL;
            userPhoto.alt = user.displayName || "Profile";
        }
    } else {
        signInBtn.style.display = "inline-flex";
        userMenu.style.display = "none";
    }
}
