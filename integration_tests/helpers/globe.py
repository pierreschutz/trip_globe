"""Helpers for interacting with the globe's internal state via Playwright."""


def get_globe_state(page):
    """Return a snapshot of the globe's internal state."""
    return page.evaluate("""() => {
        const svg = document.querySelector('#mapViz svg');
        if (!svg || !svg.__globeState) return null;
        const s = svg.__globeState;
        return {
            editMode: s.editMode,
            hasOnCountryClick: !!s.onCountryClick,
            currentView: s.currentView,
            hasDragTarget: '_dragTarget' in s,
            hasDragged: '_dragged' in s,
            _dragged: s._dragged,
        };
    }""")


def enable_edit_mode(page):
    """Enable edit mode by setting state directly (bypasses UI toggle)."""
    page.evaluate("""() => {
        const svg = document.querySelector('#mapViz svg');
        if (!svg || !svg.__globeState) throw new Error('No globe state');
        svg.__globeState.editMode = true;
        document.body.classList.add('edit-mode');
    }""")


def install_click_tracker(page):
    """Install a test callback on onCountryClick that records calls."""
    page.evaluate("""() => {
        const svg = document.querySelector('#mapViz svg');
        if (!svg || !svg.__globeState) throw new Error('No globe state');
        window.__testClicks = [];
        svg.__globeState.onCountryClick = (datum) => {
            window.__testClicks.push({
                normalizedId: datum.normalizedId,
                id: datum.id,
                timestamp: Date.now(),
            });
        };
    }""")


def get_test_clicks(page):
    """Return the list of recorded test clicks."""
    return page.evaluate("() => window.__testClicks || []")


def clear_test_clicks(page):
    """Clear the recorded test clicks."""
    page.evaluate("() => { window.__testClicks = []; }")


def find_clickable_country(page, min_size=20):
    """Find a country path and a point that actually hits it via elementFromPoint.

    SVG paths are irregular shapes, so the bounding-box center may land on
    ocean or behind the appbar. This samples multiple points within each
    path's bounding box until it finds one where elementFromPoint returns
    the path itself.
    """
    return page.evaluate("""(minSize) => {
        const paths = document.querySelectorAll('#mapViz svg path');
        for (const p of paths) {
            const d = p.__data__;
            if (!d || !d.normalizedId) continue;
            const rect = p.getBoundingClientRect();
            if (rect.width < minSize || rect.height < minSize) continue;

            // Sample a grid of points within the bounding box
            const steps = 5;
            for (let xi = 1; xi < steps; xi++) {
                for (let yi = 1; yi < steps; yi++) {
                    const x = rect.x + (rect.width * xi / steps);
                    const y = rect.y + (rect.height * yi / steps);
                    const el = document.elementFromPoint(x, y);
                    if (el === p) {
                        return {
                            normalizedId: d.normalizedId,
                            x: x,
                            y: y,
                            width: rect.width,
                            height: rect.height,
                        };
                    }
                }
            }
        }
        return null;
    }""", min_size)


def count_country_paths(page):
    """Return the number of country paths with bound data."""
    return page.evaluate("""() => {
        const paths = document.querySelectorAll('#mapViz svg path');
        let count = 0;
        paths.forEach(p => { if (p.__data__ && p.__data__.normalizedId) count++; });
        return count;
    }""")


def switch_view(page, view):
    """Switch the globe to a specific view (explorer, visited, lived)."""
    page.evaluate("""(view) => {
        const svg = document.querySelector('#mapViz svg');
        if (!svg || !svg.__globeState || !svg.__globeState.applyView) {
            throw new Error('No globe state or applyView');
        }
        svg.__globeState.applyView(view, false);
    }""", view)
