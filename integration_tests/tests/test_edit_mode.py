"""Test edit mode click-to-toggle functionality.

Bypasses Google OAuth by injecting edit mode state and a test callback directly.
"""
from helpers.globe import (
    enable_edit_mode,
    install_click_tracker,
    get_test_clicks,
    clear_test_clicks,
    find_clickable_country,
    get_globe_state,
    switch_view,
)

SCREENSHOT_DIR = "screenshots"


def test_edit_mode_can_be_enabled(globe_page):
    enable_edit_mode(globe_page)
    state = get_globe_state(globe_page)
    assert state["editMode"] is True


def test_click_tracker_installs(globe_page):
    enable_edit_mode(globe_page)
    install_click_tracker(globe_page)
    state = get_globe_state(globe_page)
    assert state["hasOnCountryClick"] is True


def test_find_clickable_country(globe_page):
    country = find_clickable_country(globe_page)
    assert country is not None, "Should find at least one visible country path"
    assert country["normalizedId"], "Country should have a normalizedId"
    assert country["x"] > 0 and country["y"] > 0, "Country should have valid coordinates"


def test_click_country_in_edit_mode(globe_page):
    """Core test: clicking a country in edit mode should trigger onCountryClick."""
    enable_edit_mode(globe_page)
    install_click_tracker(globe_page)

    country = find_clickable_country(globe_page)
    assert country is not None, "Need a visible country to click"

    # Click the country center
    globe_page.mouse.click(country["x"], country["y"])
    globe_page.wait_for_timeout(500)

    clicks = get_test_clicks(globe_page)
    globe_page.screenshot(path=f"{SCREENSHOT_DIR}/after_click.png")

    assert len(clicks) >= 1, (
        f"Expected at least 1 click callback, got {len(clicks)}. "
        f"Targeted country: {country['normalizedId']} at ({country['x']}, {country['y']}). "
        f"Globe state: {get_globe_state(globe_page)}"
    )
    assert clicks[0]["normalizedId"] == country["normalizedId"]


def test_click_without_edit_mode_does_nothing(globe_page):
    """Clicking a country without edit mode should NOT trigger the callback."""
    install_click_tracker(globe_page)
    # Edit mode is OFF by default

    country = find_clickable_country(globe_page)
    assert country is not None

    globe_page.mouse.click(country["x"], country["y"])
    globe_page.wait_for_timeout(500)

    clicks = get_test_clicks(globe_page)
    assert len(clicks) == 0, "Should not trigger click callback when edit mode is off"


def test_drag_does_not_trigger_click(globe_page):
    """Dragging the globe should NOT trigger the country click callback."""
    enable_edit_mode(globe_page)
    install_click_tracker(globe_page)

    country = find_clickable_country(globe_page)
    assert country is not None

    # Drag from the country center 100px to the right
    globe_page.mouse.move(country["x"], country["y"])
    globe_page.mouse.down()
    globe_page.mouse.move(country["x"] + 100, country["y"], steps=10)
    globe_page.mouse.up()
    globe_page.wait_for_timeout(500)

    clicks = get_test_clicks(globe_page)
    assert len(clicks) == 0, "Dragging should not trigger click callback"


def test_click_in_visited_view(globe_page):
    """Click should work in visited view with edit mode on."""
    switch_view(globe_page, "visited")
    enable_edit_mode(globe_page)
    install_click_tracker(globe_page)

    country = find_clickable_country(globe_page)
    assert country is not None

    globe_page.mouse.click(country["x"], country["y"])
    globe_page.wait_for_timeout(500)

    clicks = get_test_clicks(globe_page)
    globe_page.screenshot(path=f"{SCREENSHOT_DIR}/after_click_visited_view.png")

    assert len(clicks) >= 1, (
        f"Expected click in visited view, got {len(clicks)}. "
        f"State: {get_globe_state(globe_page)}"
    )
