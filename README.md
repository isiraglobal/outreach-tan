# ISIRA — Office Project Export

## Tech Stack
- React 18
- React Router DOM v6
- Tailwind CSS
- shadcn/ui components
- lucide-react icons

## Pages
| File | Route | Description |
|---|---|---|
| pages/Landing.jsx | / | Public landing page |
| pages/Dashboard.jsx | /dashboard | Main dashboard with stats |
| pages/Campaigns.jsx | /campaigns | Campaign management |
| pages/BulkSending.jsx | /bulk-sending | Bulk email sending |
| pages/LeadDiscovery.jsx | /lead-discovery | AI lead discovery jobs |
| pages/Responses.jsx | /responses | Email reply management |
| pages/CRM.jsx | /crm | Contact & deal management |
| pages/Settings.jsx | /settings | User profile & Gmail setup |
| Layout.jsx | (wrapper) | Shared sidebar layout |

## Integration Points
Every API call is stubbed with a `// TODO` comment. Replace them with your own:
- REST API calls (fetch/axios)
- GraphQL queries
- Any other backend

## Gmail OAuth Flow
1. User clicks "Connect Gmail" in Settings
2. Call your backend `getGoogleAuthUrl(redirectUri, userEmail)` → get authUrl
3. Redirect user to authUrl
4. Google redirects back to your `/oauth-callback` with `?code=...`
5. Backend exchanges code for access + refresh tokens and stores them
6. Tokens are refreshed automatically before each send

## Color Palette
| Token | Value |
|---|---|
| Background | `#F8F5F2` |
| Surface | `#E8E2DC` |
| Primary Text | `#3A2E27` |
| Secondary Text | `#6B5E57` |
| Brand Green | `#9BA77D` |
| Brand Gold | `#C9B37B` |
