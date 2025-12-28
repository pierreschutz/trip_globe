import { loadApplicationData } from "./dataLoader.js";
import { initializeResponsiveGlobe } from "./globe.js";
import { parseViewFromUrl } from "./viewState.js";

function boot() {
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
