#!/usr/bin/env bash
# Gathers what changed since the last PROCESS.md entry. Run by /reflect.
git fetch -q origin 2>/dev/null
echo "Today: $(date +%Y-%m-%d)"
echo "Branch: $(git status -sb | head -1)"
echo "Uncommitted:"; git status --short | head -20
last=$(git log -1 --format=%H -- PROCESS.md 2>/dev/null)
if [ -n "$last" ]; then
  echo "Last entry: $(git log -1 --date=short --format='%h %ad %s' "$last")"
  range="$last..HEAD"
else
  echo "Last entry: none yet (no commit has touched PROCESS.md)"
  range="HEAD"
fi
echo
echo "== Pull requests merged with a merge commit since then (squashed or rebased ones are in the commits below) =="
git log --merges --reverse --date=short --format='%h %ad %s' "$range" 2>/dev/null | grep -v 'reflect/' | head -30
echo
echo "== Commits since then, oldest first =="
git log --no-merges --reverse --date=short --format='--- %h %ad %s' --stat "$range" -- . ':(exclude)PROCESS.md' 2>/dev/null | head -250
echo
echo "== Changes to CLAUDE.md and .claude/ since then =="
if [ -n "$last" ]; then git diff "$range" -- CLAUDE.md .claude 2>/dev/null | head -80; else echo "(first entry: see the commits above)"; fi
echo
echo "== Images added since then =="
git log --diff-filter=A --name-only --format= "$range" -- '*.png' '*.jpg' '*.jpeg' '*.gif' '*.webp' 2>/dev/null | sort -u | head -30
echo
echo "== The end of PROCESS.md, for its format =="
tail -40 PROCESS.md 2>/dev/null || echo "(no PROCESS.md yet)"
true
