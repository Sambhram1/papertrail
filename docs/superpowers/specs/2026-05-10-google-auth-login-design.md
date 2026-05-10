# PaperTrail Google Auth Login Design

## Summary

Fix the current signup and signin path by keeping the existing Supabase email/password flow and adding Google OAuth through Supabase Auth. New Google users are allowed automatically. The implementation should reuse the existing browser-session model, add a dedicated OAuth callback route, and make the login flow resilient to missing config and redirect mistakes.

## Goals

- Keep email/password signup and signin working from the existing login page.
- Add a `Continue with Google` path using Supabase-hosted Google OAuth.
- Allow first-time Google users to create accounts automatically.
- Return users to the app with a valid Supabase session after Google auth.
- Surface clearer auth errors instead of failing silently or leaving the user stuck.

## Non-goals

- Removing email/password auth.
- Custom account-linking or provider-merging logic beyond Supabase defaults.
- Role-based access control or invite-only auth.
- Reworking the broader app shell, storage model, or API auth contract.

## User Experience

### Login page

- Keep the existing sign-in / sign-up mode toggle and email/password inputs.
- Add a separate `Continue with Google` button in the auth card.
- Preserve the current visual structure; this is an auth capability change, not a redesign.
- Disable auth actions while a request is in flight.
- Show clear inline error text when:
  - Supabase browser config is missing.
  - Email/password auth fails.
  - Google OAuth cannot be started.
  - OAuth callback returns an auth error.

### Google flow

1. User opens `/login`.
2. User clicks `Continue with Google`.
3. Browser is redirected to the Supabase-hosted Google consent flow.
4. After success, Google redirects back through Supabase to this app's callback URL.
5. The callback route exchanges the auth code for a session.
6. User is redirected to `/`.
7. The existing home-page session gate loads the user session and app data normally.

### Email/password flow

- Existing email/password sign-in remains on the page.
- Existing email/password sign-up remains on the page.
- If Supabase email confirmation is enabled and sign-up returns no session, keep the current "check your email" message pattern.

## Architecture

### Auth provider

- Use Supabase Auth as the single auth system for both email/password and Google.
- Use `supabase.auth.signInWithOAuth({ provider: "google" })` from the browser client.
- Pass an explicit `redirectTo` URL pointing at an app-owned callback route.

### Callback route

- Add a dedicated route at `/auth/callback`.
- The route reads the OAuth `code` and exchanges it for a Supabase session.
- On success, redirect to `/`.
- On failure, redirect to `/login` with a compact error signal in the query string so the login page can display a useful message.

### Session model

- Keep the existing browser-session usage already present in the app.
- Do not introduce a second auth library or a custom token format.
- Keep API authorization based on the Supabase access token sent as `Bearer`.

## Components and File Changes

### `src/app/login/page.tsx`

- Add a Google sign-in button.
- Add a dedicated handler for Google OAuth start.
- Parse callback error query params and render a user-facing message.
- Keep email/password auth logic in place, but unify error handling so both paths report through the same message area.

### `src/app/auth/callback/route.ts`

- New route handler for OAuth completion.
- Validate required query params.
- Exchange the code for a session with Supabase.
- Redirect cleanly on success or failure.

### `src/lib/supabase/browser.ts`

- Keep the singleton browser client pattern.
- No architectural change required unless callback support exposes missing auth options.

### `src/lib/supabase/server.ts`

- Reuse existing server-side Supabase config patterns if a route-level client is needed for code exchange.
- Any added helper should stay narrowly focused on auth callback completion.

### `.env.example` and `README.md`

- Document the required Supabase project settings:
  - Google provider enabled in Supabase Auth.
  - Google client ID and secret configured in Supabase.
  - App site URL set correctly.
  - Redirect URL includes `/auth/callback`.
- Document any app env needed to build absolute redirect URLs in development and production.

## Redirect and Config Rules

- Development redirect target should resolve to the local app origin plus `/auth/callback`.
- Production redirect target should resolve to the deployed app origin plus `/auth/callback`.
- The app should avoid hardcoded origins when possible; derive the redirect target from `window.location.origin` on the client for OAuth initiation.
- If required env is missing, fail with a readable message on the login page instead of sending the user into a broken OAuth redirect.

## Error Handling

- Missing Supabase URL or anon key: show `Supabase env vars are missing.`
- Failed email/password auth: show Supabase's returned error message.
- Failed Google OAuth start: show a generic but actionable inline error such as `Google sign-in could not start. Check auth configuration.`
- Callback without code: redirect to `/login?error=oauth_callback_missing_code`
- Callback exchange failure: redirect to `/login?error=oauth_callback_failed`
- Login page maps callback error codes to readable copy and does not expose raw internal errors unless they are already user-actionable.

## Testing

- Manual verification:
  - email sign-up success
  - email sign-in success
  - email sign-in failure
  - Google first-time sign-in success
  - Google returning-user sign-in success
  - sign-out after Google sign-in
  - callback failure path returns to `/login` with an error message
- Basic route-level verification for `/auth/callback` success and error redirects.
- Login-page verification that query-string error codes render expected messages.

## Risks and Constraints

- Supabase Google provider setup must be correct outside the codebase; broken provider credentials cannot be fixed in app code.
- Redirect URL mismatch between Google Console, Supabase Auth, and this app will break OAuth even if the code is correct.
- The current home page redirects unauthenticated users to `/login`; the callback flow must complete session establishment before landing there.

## Implementation Notes

- Prefer small, local changes over broader auth refactors.
- Reuse existing message state on the login page.
- Keep the resulting flow compatible with the current `getSession()` checks already used on `/` and in client components.
