from pathlib import Path

REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
PRODUCT_ROOTS = ("backend", "frontend", "infra", "docs", "tools")
REMOVED_ROOTS = ("apps", "packages", "src", "tests")


def test_product_ownership_roots_exist_without_legacy_roots() -> None:
    assert all((REPOSITORY_ROOT / name).is_dir() for name in PRODUCT_ROOTS)
    assert all(not (REPOSITORY_ROOT / name).exists() for name in REMOVED_ROOTS)


def test_runtime_frontend_contract_and_tooling_use_canonical_paths() -> None:
    expected = (
        "backend/src/app/main.py",
        "backend/tests/test_api.py",
        "frontend/web/src/App.tsx",
        "frontend/contract/src/index.ts",
        "infra/lib/rag-engineering-stack.ts",
        "docs/TRACEABILITY.md",
        "tools/python/tools/docs.py",
        "tools/web-inventory.mjs",
    )
    assert all((REPOSITORY_ROOT / relative).is_file() for relative in expected)


def test_workspace_manifests_reference_only_canonical_paths() -> None:
    manifests = (
        REPOSITORY_ROOT / "package.json",
        REPOSITORY_ROOT / "pyproject.toml",
        REPOSITORY_ROOT / "Taskfile.yml",
    )
    combined = "\n".join(path.read_text(encoding="utf-8") for path in manifests)
    for canonical in ("backend/", "frontend/", "infra", "docs", "tools"):
        assert canonical in combined
    for legacy in ("apps/web", "packages/contract", '"src/app"', '"tests"'):
        assert legacy not in combined
