"""Test that country hover highlights reset properly."""
from helpers.globe import find_clickable_country


def test_hover_highlight_resets(globe_page):
    """After hovering a country and moving away, its stroke should reset to #1a1a1a."""
    country = find_clickable_country(globe_page)
    assert country is not None

    # Get all countries with white (highlight) strokes before interaction
    white_before = globe_page.evaluate("""() => {
        let count = 0;
        document.querySelectorAll('#mapViz svg path').forEach(p => {
            if (p.getAttribute('stroke') === '#ffffff') count++;
        });
        return count;
    }""")
    print(f"\nWhite-stroke countries before hover: {white_before}")

    # Hover over the country
    globe_page.mouse.move(country["x"], country["y"])
    globe_page.wait_for_timeout(400)

    # Now move away to the ocean (center of globe)
    globe_page.mouse.move(50, 50)  # Move to a far corner (no country)
    globe_page.wait_for_timeout(400)

    # Check how many countries still have white strokes
    white_after = globe_page.evaluate("""() => {
        let count = 0;
        let stuck = [];
        document.querySelectorAll('#mapViz svg path').forEach(p => {
            if (p.getAttribute('stroke') === '#ffffff') {
                count++;
                const d = p.__data__;
                stuck.push(d ? d.normalizedId : 'unknown');
            }
        });
        return { count, stuck: stuck.slice(0, 10) };
    }""")
    print(f"White-stroke countries after moving away: {white_after}")

    assert white_after["count"] == 0, (
        f"{white_after['count']} countries stuck with white stroke: {white_after['stuck']}"
    )


def test_multiple_hovers_no_accumulation(globe_page):
    """Hovering multiple countries sequentially should not accumulate highlights."""
    # Find two different clickable countries
    countries = globe_page.evaluate("""() => {
        const results = [];
        const paths = document.querySelectorAll('#mapViz svg path');
        for (const p of paths) {
            const d = p.__data__;
            if (!d || !d.normalizedId) continue;
            const rect = p.getBoundingClientRect();
            if (rect.width < 20 || rect.height < 20) continue;

            // Verify elementFromPoint hits this path
            const steps = 5;
            for (let xi = 1; xi < steps; xi++) {
                for (let yi = 1; yi < steps; yi++) {
                    const x = rect.x + (rect.width * xi / steps);
                    const y = rect.y + (rect.height * yi / steps);
                    if (document.elementFromPoint(x, y) === p) {
                        results.push({ normalizedId: d.normalizedId, x, y });
                        break;
                    }
                }
                if (results.length > 0 && results[results.length - 1].normalizedId === d.normalizedId) break;
            }
            if (results.length >= 3) break;
        }
        return results;
    }""")

    assert len(countries) >= 2, f"Need at least 2 clickable countries, found {len(countries)}"

    # Hover each country sequentially
    for c in countries:
        globe_page.mouse.move(c["x"], c["y"])
        globe_page.wait_for_timeout(300)

    # Move away
    globe_page.mouse.move(50, 50)
    globe_page.wait_for_timeout(400)

    white_count = globe_page.evaluate("""() => {
        let count = 0;
        document.querySelectorAll('#mapViz svg path').forEach(p => {
            if (p.getAttribute('stroke') === '#ffffff') count++;
        });
        return count;
    }""")
    print(f"\nWhite-stroke countries after hovering {len(countries)} countries: {white_count}")

    assert white_count == 0, f"{white_count} countries stuck with highlight"


def test_hover_after_drag_resets(globe_page):
    """Highlights should reset after dragging the globe."""
    country = find_clickable_country(globe_page)
    assert country is not None

    # Hover a country
    globe_page.mouse.move(country["x"], country["y"])
    globe_page.wait_for_timeout(300)

    # Now drag across the globe (hover → drag → release)
    globe_page.mouse.down()
    globe_page.mouse.move(country["x"] + 150, country["y"] + 50, steps=10)
    globe_page.mouse.up()
    globe_page.wait_for_timeout(500)

    # Move to empty area
    globe_page.mouse.move(50, 50)
    globe_page.wait_for_timeout(400)

    white_count = globe_page.evaluate("""() => {
        let count = 0;
        let stuck = [];
        document.querySelectorAll('#mapViz svg path').forEach(p => {
            if (p.getAttribute('stroke') === '#ffffff') {
                count++;
                const d = p.__data__;
                stuck.push(d ? d.normalizedId : 'unknown');
            }
        });
        return { count, stuck: stuck.slice(0, 10) };
    }""")
    print(f"\nWhite-stroke after hover+drag: {white_count}")
    globe_page.screenshot(path="integration_tests/screenshots/after_drag_highlight.png")

    assert white_count["count"] == 0, (
        f"{white_count['count']} countries stuck after drag: {white_count['stuck']}"
    )


def test_click_then_hover(globe_page):
    """Clicking a country then hovering others should not accumulate highlights."""
    country = find_clickable_country(globe_page)
    assert country is not None

    # Click (mousedown + mouseup without drag)
    globe_page.mouse.click(country["x"], country["y"])
    globe_page.wait_for_timeout(300)

    # Hover several nearby positions
    for offset in [(30, 0), (60, 0), (0, 30), (0, 60)]:
        globe_page.mouse.move(country["x"] + offset[0], country["y"] + offset[1])
        globe_page.wait_for_timeout(200)

    # Move away
    globe_page.mouse.move(50, 50)
    globe_page.wait_for_timeout(400)

    white_count = globe_page.evaluate("""() => {
        let count = 0;
        document.querySelectorAll('#mapViz svg path').forEach(p => {
            if (p.getAttribute('stroke') === '#ffffff') count++;
        });
        return count;
    }""")
    print(f"\nWhite-stroke after click+hover: {white_count}")

    assert white_count == 0, f"{white_count} countries stuck after click+hover"
