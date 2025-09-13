import os, sys

ALLOW = {
    "agents", "schemas", "nexus", ".github", "tools",
    "Makefile", "requirements.txt", "README.md", "pyproject.toml"
}

root = os.getcwd()
violations = []
for dirpath, dirnames, filenames in os.walk(root):
    rel = os.path.relpath(dirpath, root)
    if rel == ".":
        continue
    top = rel.split(os.sep)[0]
    if top.startswith("_quarantine"):
        continue
    if top not in ALLOW:
        for f in filenames:
            if f.startswith(".git"):
                continue
            violations.append(os.path.join(rel, f))

if violations:
    print("❌ Allowlist violations:\n" + "\n".join(sorted(violations)))
    sys.exit(1)
print("✅ Allowlist clean")