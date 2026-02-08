"""Test for performance issues and JS errors during globe interaction."""
import time
from helpers.globe import find_clickable_country


def test_no_console_errors(globe_page):
    """Check for JS errors during page load and basic interaction."""
    errors = []
    warnings = []
    globe_page.on("console", lambda msg: (
        errors.append(msg.text) if msg.type == "error"
        else warnings.append(msg.text) if msg.type == "warning"
        else None
    ))

    # Basic interaction
    country = find_clickable_country(globe_page)
    if country:
        globe_page.mouse.move(country["x"], country["y"])
        globe_page.wait_for_timeout(300)
        globe_page.mouse.click(country["x"], country["y"])
        globe_page.wait_for_timeout(300)

    if errors:
        print(f"\nConsole errors: {errors}")
    if warnings:
        print(f"\nConsole warnings: {warnings}")

    assert not errors, f"JS errors found: {errors}"


def test_hover_sweep_performance(globe_page):
    """Measure time for a rapid hover sweep across the globe."""
    # Sweep across the globe horizontally
    start = time.time()
    for x in range(300, 900, 10):
        globe_page.mouse.move(x, 450)
        globe_page.wait_for_timeout(5)
    elapsed = time.time() - start

    print(f"\nSweep time for 60 moves: {elapsed:.2f}s")

    # Check DOM health after sweep
    globe_page.mouse.move(50, 50)
    globe_page.wait_for_timeout(500)

    path_count = globe_page.evaluate("""() => {
        const paths = document.querySelectorAll('#mapViz svg path');
        let activeTransitions = 0;
        let whiteStrokes = 0;
        paths.forEach(p => {
            if (p.__transition__) activeTransitions++;
            if (p.getAttribute('stroke') === '#ffffff') whiteStrokes++;
        });
        return { total: paths.length, activeTransitions, whiteStrokes };
    }""")
    print(f"After sweep: {path_count}")

    assert path_count["whiteStrokes"] == 0, f"{path_count['whiteStrokes']} stuck highlights"


def test_active_transition_count(globe_page):
    """Check that we don't create excessive simultaneous transitions."""
    country = find_clickable_country(globe_page)
    assert country is not None

    globe_page.mouse.move(country["x"], country["y"])
    globe_page.wait_for_timeout(50)  # Mid-transition

    active = globe_page.evaluate("""() => {
        let count = 0;
        document.querySelectorAll('#mapViz svg path').forEach(p => {
            // D3 v3 stores transitions on __transition__
            if (p.__transition__ && Object.keys(p.__transition__).length > 0) count++;
        });
        return count;
    }""")
    print(f"\nActive transitions during hover: {active}")

    # Should only be 1 country transitioning (the hovered one)
    assert active <= 3, f"Too many simultaneous transitions: {active}"
