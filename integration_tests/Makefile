.PHONY: install test test-verbose test-edit clean

install:
	pip install -r requirements.txt
	python -m playwright install chromium

test:
	cd .. && python -m pytest integration_tests/tests/ -q

test-verbose:
	cd .. && python -m pytest integration_tests/tests/ -v

test-edit:
	cd .. && python -m pytest integration_tests/tests/test_edit_mode.py -v

clean:
	rm -rf screenshots/*.png __pycache__ tests/__pycache__ helpers/__pycache__ .pytest_cache
