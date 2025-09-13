## What
- PRD: link to PRD file (required)
- Tests: list golden tests and coverage %
- Nexus policy gates: which pass

## Why
- User/business impact

## How
- Changes guarded by schemas + tests

## Checklist
- [ ] All golden tests green
- [ ] Schemas validated
- [ ] Coverage >= 90%
- [ ] No writes outside allowlisted paths