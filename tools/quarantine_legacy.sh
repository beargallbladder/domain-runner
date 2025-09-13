#!/usr/bin/env bash
set -euo pipefail
mkdir -p _quarantine
git ls-files | while read -r f; do
  case "$f" in
    agents/*|schemas/*|nexus/*|.github/*|tools/*|Makefile|requirements.txt|README.md|pyproject.toml) : ;;
    *) mkdir -p "_quarantine/$(dirname "$f")"; git mv "$f" "_quarantine/$f" || true ;;
  esac
done
git add -A
echo "Moved legacy files to _quarantine/. Review and selectively restore behind PRDs."