const DEFAULT_VIEW = "explorer";

export function parseViewFromUrl() {
    if (typeof window === "undefined" || !window.location) {
        return DEFAULT_VIEW;
    }

    const hash = window.location.hash ? window.location.hash.replace(/^#/, "") : "";
    if (!hash) {
        return DEFAULT_VIEW;
    }

    const normalized = hash.toLowerCase();
    if (normalized === "visited" || normalized === "lived" || normalized === DEFAULT_VIEW) {
        return normalized;
    }

    return DEFAULT_VIEW;
}

export function updateUrlForView(view) {
    if (typeof window === "undefined" || !window.location) {
        return;
    }

    const normalized = view || DEFAULT_VIEW;
    const newHash = `#${normalized}`;

    if (window.location.hash === newHash) {
        return;
    }

    if (window.history && window.history.replaceState) {
        window.history.replaceState({ view: normalized }, "", newHash);
    } else {
        window.location.hash = normalized;
    }
}

export function labelForView(view, isOwnProfile) {
    switch (view) {
        case "visited":
            return "Visited countries";
        case "lived":
            return isOwnProfile ? "Places I've lived" : "Places lived";
        case "explorer":
        default:
            return "Country explorer";
    }
}
