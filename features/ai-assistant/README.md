# feature/ai-assistant

**Branch:** `feature/ai-assistant`

## Owns

| Path | Role |
| --- | --- |
| `app/compare/FloatingAssistant.tsx` | Chat launcher / drawer |
| `app/compare/AssistantPanel.tsx` | Assistant UI |
| `app/compare/ChatPanel.tsx` | Chat transcript / send |
| `app/compare/*Assistant*.module.css` | Assistant styles |
| `app/api/chat/**` | Groq chat API |
| `app/api/assistant/**` | Preference assist API |
| `backend/services/ChatRecommendationService.ts` | Intent → real dataset shortlist |
| `lib/assistantPreferences.ts` | Preference parsing helpers |
| `lib/chatRecommendations.ts` | Chat contracts / prompts helpers |
| `ai/**` | Offline / training experiments (not required for demo API) |

## Out of scope

Map pin/reach logic, preference drag-and-drop editor (filters), dataset CSV edits.
