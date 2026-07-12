---
name: japanese-git-commit-gitmoji
description: Create intentional Japanese Conventional Commit messages with gitmoji after verifying the staged scope.
---
# Japanese git commit with gitmoji

1. Inspect `git diff --cached --name-only` and split unrelated purposes.
2. Use `<emoji> <type>(<scope>): <日本語の具体的な要約>` within roughly 72 characters.
3. Use Japanese imperative summaries without polite endings; preserve identifiers and API names.
4. If a work report is staged, summarize relevant decisions and verification in the commit body.
5. Never amend, force-push, or rewrite history unless explicitly requested.
