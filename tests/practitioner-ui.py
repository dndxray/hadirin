"""Compatibility runner for the current practitioner flow, local demo emulators only.

Replaces the obsolete test that expected Izin as a bottom tab. This resets only
the fixed demo-hadirin emulator fixture, never the real Firebase project.
"""
import subprocess
import sys

subprocess.run(["node", "tests/history-fixture.mjs", "seed"], check=True)
subprocess.run([sys.executable, "tests/history-ui.py"], check=True)
