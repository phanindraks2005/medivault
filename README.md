# MediVault

A health records app for families. Upload a prescription or lab report, and MediVault reads it with Gemini and pulls out the doctor, date and medicines, so the whole family's medical history is searchable in one place.

## Features

- **Family profiles.** One account manages records for every family member: blood group, allergies, known conditions.
- **Record extraction.** Upload a photo or scan of a prescription or report. Gemini extracts the doctor name, record date, medicines with dosage and frequency, and notes into structured data.
- **Doc, the health copilot.** A chat assistant that answers questions using your family's actual records ("what is Dad taking for blood pressure?"). It gives general guidance only and points to a doctor for anything serious.
- **Interaction checker.** Checks a family member's current medicines against each other for known interactions.
- **Visit summary.** Generates a short summary of a member's records to bring to a doctor's appointment.
- **Emergency card.** A printable page with blood group, allergies, conditions and current medicines.
- **Vaccination tracker** per family member.
- **Quick tools** on the dashboard: medicine lookup, symptom triage, and a translator for medical jargon in doctor's notes.

## Tech stack

- Next.js 16 (App Router), React 19, TypeScript
- Supabase (Postgres, Auth, Storage)
- Google Gemini API (`@google/generative-ai`)
- Tailwind CSS 4, Framer Motion

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
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key, used by the browser client |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key, used only in server routes. Never expose it to the client |
| `GEMINI_API_KEY` | Google AI Studio API key |

### Database

Tables: `family_members`, `medical_records`, `vaccinations`, `chat_history`, each with a `user_id` column tied to `auth.users`. Files are stored in a Storage bucket named `medical-records`.

## Disclaimer

MediVault is a personal project, not a medical device. AI output can be wrong; always confirm medical decisions with a doctor or pharmacist.
