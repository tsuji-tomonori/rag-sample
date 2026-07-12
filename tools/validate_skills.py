import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKILLS = ROOT / "skills"
FIELD = re.compile(r"^(name|description):\s*(.+)$", re.MULTILINE)


def main() -> int:
    issues: list[str] = []
    names: set[str] = set()
    for path in sorted(SKILLS.glob("*/SKILL.md")):
        text = path.read_text(encoding="utf-8")
        if not text.startswith("---\n") or "\n---\n" not in text[4:]:
            issues.append(f"{path.relative_to(ROOT)}: invalid frontmatter delimiters")
            continue
        frontmatter = text.split("---", 2)[1]
        fields = dict(FIELD.findall(frontmatter))
        name = fields.get("name", "")
        if name != path.parent.name:
            issues.append(f"{path.relative_to(ROOT)}: name must match directory")
        if not fields.get("description", "").strip():
            issues.append(f"{path.relative_to(ROOT)}: description is required")
        if name in names:
            issues.append(f"{path.relative_to(ROOT)}: duplicate name {name}")
        names.add(name)
    if not names:
        issues.append("skills: no SKILL.md files found")
    for issue in issues:
        print(issue)
    if issues:
        return 1
    print(f"Validated {len(names)} repository skills.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
