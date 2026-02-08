# Integration Tests

Browser-based integration tests for trip_globe using Playwright + pytest.

## Prerequisites

- Python 3.10+
- Dev server running on port 8080 (`make dev` from project root)

## Setup

```bash
make install
```

## Running tests

```bash
make test           # all tests, quiet output
make test-verbose   # all tests, verbose
make test-edit      # edit mode tests only
```

## Structure

```
integration_tests/
├── conftest.py          # pytest fixtures (globe_page, browser config)
├── helpers/
│   └── globe.py         # Globe state helpers (inject edit mode, find countries, etc.)
├── tests/
│   ├── test_globe_render.py   # Globe renders with paths and correct initial state
│   └── test_edit_mode.py      # Edit mode click-to-toggle and drag detection
└── screenshots/               # Test failure screenshots
```

## Auth bypass

Tests bypass Google OAuth by injecting state directly into the globe's internal
state object (`svg.__globeState`). This lets us test edit mode interactions
without a real Firebase session.
