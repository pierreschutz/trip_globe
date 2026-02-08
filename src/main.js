import { loadStaticData, loadUserTripData, emptyTripData } from "./dataLoader.js";
import { initializeResponsiveGlobe, updateGlobeTripData, setIsOwnProfile } from "./globe.js";
import { parseViewFromUrl } from "./viewState.js";
import { initFirebase } from "./firebase.js";
import { initAuth, signIn, signOut, onAuthStateChanged } from "./auth.js";
import { initEditPanel, removeEditPanel } from "./editPanel.js";
import { parseRoute } from "./router.js";
import { getUidByUsername, getUserProfile } from "./userService.js";

let currentUser = null;
let currentProfile = null;
let authResolved = false;
let resolveAuthReady;
const authReady = new Promise(r => { resolveAuthReady = r; });

function initializeSidebar() {
    const body = d3.select("body");
    const sidebar = d3.select("#sidebar");
    const overlay = d3.select("#sidebarOverlay");
    const toggle = d3.select("#sidebarToggle");

    if (sidebar.empty() || overlay.empty() || toggle.empty()) {
        return;
    }

    function setOpen(isOpen) {
        body.classed("sidebar-open", isOpen);
        sidebar
            .classed("sidebar--open", isOpen)
            .attr("aria-hidden", isOpen ? "false" : "true");
        overlay
            .classed("sidebar-overlay--visible", isOpen)
            .attr("aria-hidden", isOpen ? "false" : "true");
        toggle
            .attr("aria-expanded", isOpen ? "true" : "false")
            .attr("aria-label", isOpen ? "Close sidebar" : "Open sidebar");
    }

    toggle.on("click", () => setOpen(!body.classed("sidebar-open")));
    overlay.on("click", () => setOpen(false));

    d3.select(window).on("keydown.sidebar", () => {
        if (d3.event && d3.event.key === "Escape") {
            setOpen(false);
        }
    });

    window.__sidebarControl = { setOpen };
}

function showLoading() {
    if (document.getElementById("loadingOverlay")) return;
    const overlay = document.createElement("div");
    overlay.id = "loadingOverlay";
    overlay.className = "loading-overlay";
    const text = document.createElement("span");
    text.className = "loading-overlay__text";
    text.textContent = "Loading\u2026";
    overlay.appendChild(text);
    const content = document.querySelector(".content");
    if (content) content.appendChild(overlay);
}

function hideLoading() {
    const el = document.getElementById("loadingOverlay");
    if (el) el.remove();
}

function showToast(message, isError) {
    const existing = document.querySelector(".toast");
    if (existing) existing.remove();
    const toast = document.createElement("div");
    toast.className = isError ? "toast toast--error" : "toast";
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function updateSidebarTabs(hasTripData) {
    const visitedBtn = document.querySelector('.sidebar-nav__item[data-view="visited"]');
    const livedBtn = document.querySelector('.sidebar-nav__item[data-view="lived"]');
    if (visitedBtn) visitedBtn.style.display = hasTripData ? "" : "none";
    if (livedBtn) livedBtn.style.display = hasTripData ? "" : "none";
}

function initUserMenu() {
    const menuBtn = document.getElementById("authUserMenu");
    const dropdown = document.getElementById("userMenuDropdown");
    const signOutBtn = document.getElementById("userMenuSignOut");

    if (!menuBtn || !dropdown) return;

    menuBtn.addEventListener("click", () => {
        const isOpen = dropdown.style.display !== "none";
        dropdown.style.display = isOpen ? "none" : "flex";
        menuBtn.setAttribute("aria-expanded", isOpen ? "false" : "true");
    });

    if (signOutBtn) {
        signOutBtn.addEventListener("click", () => {
            dropdown.style.display = "none";
            menuBtn.setAttribute("aria-expanded", "false");
            signOut().catch(err => console.error("Sign-out failed", err));
        });
    }

    document.addEventListener("click", (e) => {
        if (!menuBtn.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.style.display = "none";
            menuBtn.setAttribute("aria-expanded", "false");
        }
    });
}

function updateUserMenuName(name) {
    const el = document.getElementById("userMenuName");
    if (el) el.textContent = name || "";
}

function initAuthButtons() {
    const signInBtn = document.getElementById("authSignIn");

    if (signInBtn) {
        signInBtn.addEventListener("click", () => {
            signIn().catch(err => console.error("Sign-in failed", err));
        });
    }

    initUserMenu();
}

function updateSidebarTitle(displayName) {
    const titleEl = document.querySelector(".sidebar__title");
    if (titleEl) {
        titleEl.textContent = displayName ? `${displayName}'s Maps` : "Trip Globe";
    }
}

function hideOverlays() {
    const privateOverlay = document.getElementById("privateOverlay");
    const notFoundOverlay = document.getElementById("notFoundOverlay");
    if (privateOverlay) privateOverlay.style.display = "none";
    if (notFoundOverlay) notFoundOverlay.style.display = "none";
}

function showOverlay(id) {
    hideOverlays();
    const el = document.getElementById(id);
    if (el) el.style.display = "flex";
}

async function applyRoute() {
    await authReady;

    // Close sidebar on route change
    if (window.__sidebarControl) {
        window.__sidebarControl.setOpen(false);
    }

    // Clean up previous state
    hideOverlays();
    hideLoading();
    removeEditPanel();

    const { username } = parseRoute();

    if (!username) {
        // Root path — show own globe if signed in, empty if not
        if (currentUser && currentProfile) {
            updateSidebarTitle(currentProfile.displayName);
            updateUserMenuName(currentProfile.username || currentProfile.displayName);
            document.title = "My World Map";
            setIsOwnProfile(true);
            showLoading();
            try {
                const tripData = await loadUserTripData(currentUser.uid);
                updateGlobeTripData(tripData);
                updateSidebarTabs(true);
                initEditPanel(currentUser.uid, currentProfile);
            } catch (err) {
                console.error("Failed to load user trip data", err);
                showToast("Something went wrong loading your data", true);
            }
            hideLoading();
        } else {
            updateSidebarTitle(null);
            document.title = "Trip Globe";
            setIsOwnProfile(false);
            updateGlobeTripData(emptyTripData());
            updateSidebarTabs(false);
        }
        return;
    }

    // Path has a username — look up the target user
    showLoading();
    const targetUid = await getUidByUsername(username);
    if (!targetUid) {
        hideLoading();
        updateSidebarTitle(null);
        document.title = "User Not Found — Trip Globe";
        setIsOwnProfile(false);
        updateGlobeTripData(emptyTripData());
        updateSidebarTabs(false);
        showOverlay("notFoundOverlay");
        return;
    }

    // Check if viewing own profile
    const isOwn = !!(currentUser && currentUser.uid === targetUid);
    setIsOwnProfile(isOwn);

    if (isOwn) {
        updateSidebarTitle(currentProfile ? currentProfile.displayName : null);
        updateUserMenuName(currentProfile ? (currentProfile.username || currentProfile.displayName) : null);
        document.title = "My World Map";
        try {
            const tripData = await loadUserTripData(currentUser.uid);
            updateGlobeTripData(tripData);
            updateSidebarTabs(true);
            initEditPanel(currentUser.uid, currentProfile);
        } catch (err) {
            console.error("Failed to load user trip data", err);
            showToast("Something went wrong loading your data", true);
        }
        hideLoading();
        return;
    }

    // Viewing someone else's profile — try to load their data
    try {
        const targetProfile = await getUserProfile(targetUid);
        const displayName = targetProfile ? targetProfile.displayName : username;
        updateSidebarTitle(displayName);
        document.title = `${displayName}'s World Map`;

        const tripData = await loadUserTripData(targetUid);
        updateGlobeTripData(tripData);
        updateSidebarTabs(true);
        hideLoading();
    } catch (err) {
        hideLoading();
        if (err.code === "permission-denied") {
            updateSidebarTitle(null);
            document.title = "Private Profile — Trip Globe";
            updateGlobeTripData(emptyTripData());
            updateSidebarTabs(false);
            showOverlay("privateOverlay");
        } else {
            console.error("Failed to load profile", err);
            updateSidebarTitle(null);
            document.title = "Trip Globe";
            updateGlobeTripData(emptyTripData());
            updateSidebarTabs(false);
            showToast("Something went wrong", true);
        }
    }
}

function boot() {
    initializeSidebar();
    initFirebase();
    initAuthButtons();

    onAuthStateChanged(async (user, profile) => {
        currentUser = user;
        currentProfile = profile;

        if (!authResolved) {
            authResolved = true;
            resolveAuthReady();
        }

        applyRoute();
    });

    initAuth();

    // Listen for client-side navigation
    window.addEventListener("popstate", () => applyRoute());

    // Load static data (world geometry, names, facts) + empty trip data for initial render
    loadStaticData()
        .then(staticData => {
            const initialView = parseViewFromUrl();
            const empty = emptyTripData();
            initializeResponsiveGlobe({ ...staticData, ...empty }, initialView);
        })
        .catch(error => {
            console.error("Failed to initialise globe", error);
        });
}

document.addEventListener("DOMContentLoaded", boot);
