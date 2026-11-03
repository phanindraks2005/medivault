// Longest values the app accepts. Forms use them as maxLength, the API routes
// reject anything longer, and supabase/schema.sql has matching check
// constraints, so the three never disagree.
export const LIMITS = {
  // People
  name: 80,
  allergies: 500,
  conditions: 500,
  phone: 20,
  // Records
  doctor: 100,
  clinic: 120,
  recordNotes: 2000,
  dose: 60,
  frequency: 120,
  // Vaccinations
  vaccine: 100,
  vaccineNotes: 500,
  // AI tools
  medicineName: 100,
  symptoms: 1000,
  note: 3000,
  question: 2000,
  medicines: 20,
  summaryRecords: 30,
} as const
