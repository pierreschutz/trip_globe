/**
 * Simple client-side router for /{username} paths.
 * Hash-based view selection (#visited, #lived, #explorer) is handled
 * separately by viewState.js and remains unchanged.
 */

export function parseRoute() {
    const path = window.location.pathname;
    // Strip leading slash, ignore trailing slash
    const segment = path.replace(/^\/+|\/+$/g, "");
    if (!segment) {
        return { username: null };
    }
    return { username: segment };
}

export function navigateTo(path) {
    window.history.pushState(null, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
}
