"""Verify the globe renders correctly with country paths and state."""
from helpers.globe import get_globe_state, count_country_paths


def test_svg_exists(globe_page):
    svg = globe_page.locator("#mapViz svg")
    assert svg.count() > 0, "SVG should be present in #mapViz"


def test_country_paths_rendered(globe_page):
    count = count_country_paths(globe_page)
    assert count > 100, f"Expected 100+ country paths, got {count}"


def test_initial_globe_state(globe_page):
    state = get_globe_state(globe_page)
    assert state is not None, "Globe state should exist"
    assert state["editMode"] is False, "Edit mode should be off initially"
    assert state["hasOnCountryClick"] is False, "No click handler initially"
    assert state["currentView"] == "explorer", "Should start in explorer view"
