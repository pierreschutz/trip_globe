import { loadApplicationData } from "./dataLoader.js";
import { initializeResponsiveGlobe } from "./globe.js";
import { parseViewFromUrl } from "./viewState.js";
import { initFirebase } from "./firebase.js";
import { initAuth, signIn, signOut, onAuthStateChanged } from "./auth.js";

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

    onAuthStateChanged((user, profile) => {
        updateSidebarTitle(profile);
    });

    initAuth();

    loadApplicationData()
        .then(data => {
            const initialView = parseViewFromUrl();
            initializeResponsiveGlobe(data, initialView);
        })
        .catch(error => {
            console.error("Failed to initialise globe", error);
        });
}

document.addEventListener("DOMContentLoaded", boot);
