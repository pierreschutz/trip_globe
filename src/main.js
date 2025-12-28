import { loadApplicationData } from "./dataLoader.js";
import { initializeResponsiveGlobe } from "./globe.js";
import { parseViewFromUrl } from "./viewState.js";

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

function boot() {
    initializeSidebar();
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
