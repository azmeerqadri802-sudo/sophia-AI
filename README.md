# Sophia · Omnix Global

Sophia is a responsive, private sales workspace with a Node.js server and a plain HTML, CSS, and JavaScript client. It uses Node 20 or newer and has no runtime package dependencies.

## Start the app

1. Install Node.js 20 or newer.
2. In this folder, run `npm run setup`. Save the generated admin password shown in the terminal; it is only displayed once. The command creates a private `.env` with a random password and a 32-byte encryption key.
3. Run `npm start`.
4. Open `http://127.0.0.1:4173` and sign in with the generated password.

The server binds to loopback by default. Do not expose the plain HTTP development listener directly to the public internet. For a private deployment, put it behind a TLS reverse proxy, keep the `.env` key and password private, persist and back up the `data/` directory, and set `TRUST_PROXY=1` only when the proxy overwrites `Host` and `X-Forwarded-Proto` itself.

## Deploy the complete app

GitHub Pages only serves static site files. Sophia also needs the Node server for sign-in, persistent CRM changes, encrypted credentials, AI, Gmail, and booking webhooks. The included [Render blueprint](render.yaml) describes a Node web service with persistent storage and a health check.

To deploy with Render, connect this repository and choose **New → Blueprint**, then review the service and storage charges before creation. The blueprint selects a paid Starter web service and a 1 GB persistent disk. Render generates the admin password and encryption key as service secrets. Open the deployed service URL and use the `APP_ADMIN_PASSWORD` value in the Render environment settings to sign in. Never commit generated deployment secrets to GitHub.

## Working features

- Home, campaigns, live leads, and settings switch views without dead links. The mobile layout places all four views in a fixed bottom navigation bar.
- Lead and campaign records are stored in `data/crm.json`. Add, edit, filter, sort, export, activate, pause, resume, and delete actions persist through the server. Leads assigned to a deleted campaign stay in the CRM.
- The first launch seeds clearly labelled example contacts and campaigns. The email addresses use the reserved `.test` domain. Remove or replace these records before working with real contacts.
- The WhatsApp action opens `https://wa.me/923083335262` with the lead's details in an encoded message.
- Auto-pilot runs a real browser interval and appends activity entries while enabled. These are explicitly marked as previews: it does not create CRM records or send outreach.
- Saved AI keys and the Gmail app password are encrypted on the server with AES-256-GCM. Secrets are not put in browser storage or returned after save. CRM data, activity history, Auto-pilot preference, and saved local email drafts are stored separately.
- Gemini and OpenAI are called from the server to create a personalized email draft. The app does not send an AI draft until an admin reviews it and confirms the send.
- Gmail sending uses TLS on `smtp.gmail.com:465` with a Google app password. “Send test email” sends a real test message to the configured sender.
- Meeting requests are sent as JSON to the saved HTTPS booking webhook. The test button sends a real `sophia.connection_test` event. Booking endpoints must resolve to public addresses; webhook requests are pinned to the checked DNS address, and redirects are disabled.

## Settings behavior

Saving a credential shows **Saved · verify**. The **Test connection** buttons make a real request and only then show **Connected**. The test-email and webhook buttons send real requests, so use them when ready.

To rotate the admin password or encryption key, stop the server and carefully edit `.env`. Back up the key before rotating it: existing encrypted settings cannot be decrypted with a new key. Changing the admin password does not change the encryption key.

## Deployment scope

This is a single-admin, file-backed application intended for a private Omnix workspace. CRM contact records in `data/crm.json` are plain JSON, the session store is in process memory, and there is no multi-user roles or SSO layer. A public multi-user rollout should move CRM records and sessions to a managed database/session store, add organizational identity and role controls, configure TLS and backups, and review data retention before importing real prospect data. Integration secrets are encrypted at rest, but the encryption key must still be protected as a server secret.

Render free services cannot preserve these local files, and free instances block outbound Gmail SMTP on port 465. A paid web service and persistent disk are required for this implementation's saved CRM/settings and Gmail sender to work there.
