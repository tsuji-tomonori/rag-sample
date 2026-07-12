"""Compatibility entrypoint for the Lazunex-compatible generator suite."""

from tools.docs import main as generate_docs


def main() -> int:
    return generate_docs()
