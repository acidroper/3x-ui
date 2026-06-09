# AI Agent Instructions

## Merge Conflicts Resolution
When resolving merge conflicts between the fork and upstream:
1. Always consult `FORK_CHANGES.md` to identify and preserve fork-specific modifications.
2. Do not overwrite or delete fork features when integrating upstream updates. Keep both sets of logic where applicable.
3. Ensure any added UI elements, data schemas, or backend integrations from the fork are retained alongside upstream changes.

## Documenting Custom Changes
When adding new custom features, architectural changes, or modifying upstream logic for this fork:
1. Always document these changes thoroughly in `FORK_CHANGES.md`.
2. Include the file paths, description of the changes, and any relevant code snippets or schemas to maintain a clear record of the fork's state.

## Frontend Rebuild
When changes are made to frontend source files (`frontend/src/`), the static assets must be rebuilt:
1. Change working directory: `cd frontend/`
2. Install dependencies and build: `npm install && npm run build`
3. This is mandatory for the Go backend to serve the updated UI.
