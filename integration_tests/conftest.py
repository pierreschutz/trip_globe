import pytest

BASE_URL = "http://localhost:8080"
GLOBE_LOAD_TIMEOUT = 4000  # ms to wait for globe + data to render


@pytest.fixture(scope="session")
def browser_context_args():
    return {"viewport": {"width": 1280, "height": 900}}


@pytest.fixture()
def globe_page(page):
    """Navigate to the globe app, wait for it to fully render, and return the page."""
    errors = []
    page.on("pageerror", lambda err: errors.append(str(err)))
    page.goto(BASE_URL)
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(GLOBE_LOAD_TIMEOUT)
    yield page
    assert not errors, f"Page errors: {errors}"
