# feature/ai-assistant

**Branch:** `feature/ai-assistant`

## Owns

| Path | Role |
| --- | --- |
| `app/compare/FloatingAssistant.tsx` | Chat launcher / drawer |
| `app/compare/ChatPanel.tsx` | Server-backed chat transcript / send |
| `app/compare/*Assistant*.module.css` | Assistant styles |
| `app/api/chat/**` | Groq chat API |
| `backend/services/ChatRecommendationService.ts` | Intent → real dataset shortlist |
| `lib/chatRecommendations.ts` | Chat contracts / prompts helpers |
| `ai/**` | Offline / training experiments (not required for demo API) |

## Out of scope

Map pin/reach logic, preference drag-and-drop editor (filters), dataset CSV edits.
