# Excerpt sharing rollout

The optional report picker is enabled by default following local verification and the owner's request to publish. Set `VITE_EXCERPT_SHARING=false` at **build time** to hide it. Existing generated share suggestions continue to work, including older saved captions without generated intros. No database migration, AI request, or credit usage is needed.

For a local preview, run Vite with this environment variable set. Review a sample report, use Choose from my reading, choose a section and passage, then preview. Share and Copy use precisely that preview. A cancelled native share does not copy anything automatically. Legacy Markdown supports paragraph selection; unsupported JSON does not expose raw fields.

The enabled and disabled builds were verified locally, including a 390px mobile preview, copying, section switching and Escape dismissal. The flag requires a rebuild to change; it is not an instant runtime kill switch. To disable, rebuild with the flag false or roll back to the previous deployment, subject to the same in-flight request precautions below.

## Deployment gate

The current server has no SIGTERM handler. Render moves traffic to a new instance then sends SIGTERM to the old process after 60 seconds. Node can terminate immediately without finishing a reading. Render's default shutdown delay is 30 seconds; it is not automatic request draining. Source: https://render.com/docs/deploys#zero-downtime-deploys

Prefer a quiet window with no active readings, or separately implement and verify request draining and an appropriate shutdown delay. Adding a shutdown handler in the new version cannot protect the old process during the first transition. The owner requested publication after being informed of this deployment risk. Local tests do not establish that a live deploy has completed.

## Checks

- TypeScript and production build, including browser secret scan.
- Excerpt tests: complete passages, selected passage only, no metadata or evidence, normal/roast/couple attribution, sample attribution, older Markdown and structured reports.
- Share delivery tests: native share, explicit copy, clipboard fallback, cancellation and denied access.
- Manual preview: mobile width, section switching clears selection, preview/back preserves selection, close/Escape, keyboard navigation, and existing suggested sharing.
