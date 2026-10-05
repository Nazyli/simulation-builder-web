# Simulation Builder Web

React/Vite interface for configuring and running Simulation Builder workflows.

## Routes

- `/studio` manages master data, draft workflow graphs, node configuration,
  transitions, validation, and publication.
- `/simulation` starts a published version for a `participant_id` and renders
  chat, email, call, or document events. Entering a participant ID with an
  unfinished simulation resumes that run. Participant actor and workflow
  version remain required.

## Development

Set `VITE_API_BASE_URL` to the FastAPI `/api/v1` address when it differs from
the development default, then run:

```powershell
npm install
npm run dev
```

`VITE_SEND_CHAT_TIMER` controls how long finalized participant chat bubbles wait
for more typing before the runner sends them together. The value is seconds and
defaults to `8`. Switching actor or simulation, leaving the chat page, or hiding
the page flushes finalized bubbles immediately. Enter finalizes a bubble;
Shift+Enter inserts a newline inside the current bubble. Finalized bubbles show
in the conversation immediately as queued, then switch to the persisted message
after the batch request succeeds.

The graph editor stores node configuration as JSON-compatible data. An action
with **Dummy AI** enabled uses fixture JSON such as
`{"responses":["Hello"]}` or `{"classifications":[{"label":"pass","score":0.9}]}`.
