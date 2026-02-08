import { loadStaticData, loadUserTripData, emptyTripData } from "./dataLoader.js";
import { initializeResponsiveGlobe, updateGlobeTripData } from "./globe.js";
import { parseViewFromUrl } from "./viewState.js";
import { initFirebase } from "./firebase.js";
import { initAuth, signIn, signOut, onAuthStateChanged } from "./auth.js";
import { initEditPanel, removeEditPanel } from "./editPanel.js";

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

function initAuthButtons() {
    const signInBtn = document.getElementById("authSignIn");
    const userMenuBtn = document.getElementById("authUserMenu");

    if (signInBtn) {
        signInBtn.addEventListener("click", () => {
            signIn().catch(err => console.error("Sign-in failed", err));
        });
    }

    if (userMenuBtn) {
        userMenuBtn.addEventListener("click", () => {
            signOut().catch(err => console.error("Sign-out failed", err));
        });
    }
}

function updateSidebarTitle(profile) {
    const titleEl = document.querySelector(".sidebar__title");
    if (titleEl) {
        titleEl.textContent = profile ? `${profile.displayName}'s Maps` : "Trip Globe";
    }
}

function boot() {
    initializeSidebar();
    initFirebase();
    initAuthButtons();

    onAuthStateChanged(async (user, profile) => {
        updateSidebarTitle(profile);

        if (user) {
            try {
                const tripData = await loadUserTripData(user.uid);
                updateGlobeTripData(tripData);
                initEditPanel(user.uid);
            } catch (err) {
                console.error("Failed to load user trip data", err);
            }
        } else {
            removeEditPanel();
            updateGlobeTripData(emptyTripData());
        }
    });

    initAuth();

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
