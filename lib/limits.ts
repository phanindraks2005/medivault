// Longest values the app accepts. Forms use them as maxLength and the API
// routes reject anything longer, so the two never disagree.
export const LIMITS = {
  medicineName: 100,
  symptoms: 1000,
  note: 3000,
  question: 2000,
  medicines: 20,
  summaryRecords: 30,
} as const
