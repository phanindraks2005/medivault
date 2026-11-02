# MediVault

A health records app for families. Upload a prescription or lab report, and MediVault reads it with Gemini and pulls out the doctor, date and medicines, so the whole family's medical history is searchable in one place.

## Features

- **Try it without an account.** `/demo` opens the real dashboard with a sample family. The landing page shows the real app on a fixed stage that changes as you scroll, and lets you switch between the sample family's emergency cards.
- **Calendar dashboard.** A month view of due and overdue vaccinations and the dates prescriptions were written, each family member in their own colour. Red is kept for overdue items and allergies.
- **Family profiles.** One account manages records for every family member: blood group, allergies, known conditions.
- **Record extraction.** Upload a photo or PDF (JPEG, PNG, WebP, HEIC or PDF, up to 10 MB) of a prescription or report. Gemini extracts the doctor name, the date the doctor wrote it, medicines with dosage and frequency, and notes. The record page shows the original file next to what was read, lets you correct anything (including the date), and offers a retry if reading fails.
- **Doc, the health copilot.** A chat assistant that answers questions using your family's actual records ("what is Dad taking for blood pressure?"). It gives general guidance only and points to a doctor for anything serious.
- **Interaction checker.** Checks a family member's current medicines against each other for known interactions.
- **Visit summary.** Generates a short summary of a member's records to bring to a doctor's appointment.
- **Emergency card.** A large-type page with blood group, allergies, current medicines and a one-tap call button; it prints cleanly on one page.
- **Vaccination tracker** per family member: next due first, overdue in red, due within 30 days in marigold.
- **Quick tools** on the dashboard: medicine lookup, symptom triage, and a translator for medical jargon in doctor's notes.

## Tech stack

- Next.js 16 (App Router), React 19, TypeScript
- Supabase (Postgres, Auth, Storage)
- Google Gemini API (`@google/generative-ai`)
- Tailwind CSS 4, shadcn/ui (Base UI) components, Motion for animation, lucide icons, Inter and Archivo (dates)

Photographs on the landing page come from Wikimedia Commons and are credited in its footer (`public/photos/credits.json`).

## Security notes

Uploaded files are stored under the user's id in Supabase Storage. The bucket should be private, and every table needs row level security limiting rows to `auth.uid() = user_id`, since the browser client queries them directly. The two API routes that use the service-role key (`doc-chat` and `extract-record`) identify the user from their Supabase access token, sent as a bearer token, and only touch rows owned by that user.

## Running locally

Requires Node 20+ and a Supabase project.

```bash
git clone https://github.com/phanindraks2005/medivault.git
cd medivault
npm install
cp .env.example .env.local   # fill in your keys
npm run dev
```

The app runs at http://localhost:3000.

### Environment variables

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable key (`sb_publishable_...`) or legacy anon key, used by the browser client |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret key (`sb_secret_...`) or legacy service role key, used only in server routes. Never expose it to the client |
| `GEMINI_API_KEY` | Google AI Studio API key |

### Database

Run [`supabase/schema.sql`](supabase/schema.sql) once in the Supabase SQL Editor of a new project. It creates the tables (`family_members`, `medical_records`, `vaccinations`, `chat_history`, each with a `user_id` tied to `auth.users`), turns on row level security with per-user policies, and sets up the private `medical-records` Storage bucket (10 MB, images and PDFs) with policies that keep each user's files in their own folder. The script is safe to run again.

For local testing you can turn off email confirmation under Authentication → Sign In / Providers → Email.

### AI models

All Gemini calls go through `lib/gemini.ts`. It uses `gemini-3.5-flash` and falls back to `gemini-3.5-flash-lite` when the first model is busy or out of quota, with a 25 second timeout. On the free tier each model allows about 20 requests a day, so heavy testing can hit the limit; the app then shows a "busy, try again" message instead of failing silently. A record whose extraction failed can be read again from its page with **Try again**.

## Disclaimer

MediVault is a personal project, not a medical device. AI output can be wrong; always confirm medical decisions with a doctor or pharmacist.
