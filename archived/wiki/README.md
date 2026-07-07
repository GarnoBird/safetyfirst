# Archived BC Construction Safety Wiki

This folder preserves the retired Wiki prototype after it was removed from the
live Safety First site routes and production bundle.

Archived contents:

- `src/`: the former `WikiApp` React component and generated Wiki data modules.
- `content/`: Markdown article, topic, source-note, review-template, and glossary source files.
- `docs/`: Wiki planning, review, source, and cleanup reports.
- `scripts/`: former Wiki build, validation, review, and source-check scripts.

The live app no longer imports these files. To restore the Wiki in the future,
move the needed files back to their original paths, re-add the `/wiki` route in
`src/App.jsx`, restore any package scripts you need, and run a full build before
publishing.
