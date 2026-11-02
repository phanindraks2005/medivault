import type { Member } from '@/lib/family-context'
import type { MedicalRecord, Vaccination } from '@/components/dashboard/types'
import { memberColors } from '@/lib/family'

// A made-up family for the public demo and the landing page. Dates are built
// relative to today so the calendar always has something on it.
function day(offset: number) {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

const at = (offset: number) => `${day(offset)}T09:30:00.000Z`

export const sampleMembers: Member[] = [
  { id: 'arjun', name: 'Arjun Sharma', relation: 'self', dob: '1994-03-11', gender: 'Male', blood_group: 'B+', allergies: 'Penicillin', known_conditions: null, created_at: at(-400) },
  { id: 'ramesh', name: 'Ramesh Sharma', relation: 'father', dob: '1964-08-20', gender: 'Male', blood_group: 'O+', allergies: 'Sulfa drugs', known_conditions: 'Hypertension, type 2 diabetes', created_at: at(-399) },
  { id: 'sunita', name: 'Sunita Sharma', relation: 'mother', dob: '1968-01-05', gender: 'Female', blood_group: 'B+', allergies: null, known_conditions: 'Hypothyroidism', created_at: at(-398) },
  { id: 'diya', name: 'Diya Sharma', relation: 'daughter', dob: '2022-06-14', gender: 'Female', blood_group: 'B+', allergies: null, known_conditions: null, created_at: at(-300) },
]

export const sampleVaccinations: Vaccination[] = [
  { id: 'v1', family_member_id: 'ramesh', vaccine_name: 'Tetanus booster', date_given: day(-3680), next_due_date: day(-12) },
  { id: 'v2', family_member_id: 'ramesh', vaccine_name: 'Influenza', date_given: day(-347), next_due_date: day(6) },
  { id: 'v3', family_member_id: 'diya', vaccine_name: 'MMR, second dose', date_given: day(-190), next_due_date: day(13) },
  { id: 'v4', family_member_id: 'sunita', vaccine_name: 'Pneumococcal', date_given: null, next_due_date: day(24) },
  { id: 'v5', family_member_id: 'diya', vaccine_name: 'Typhoid conjugate', date_given: day(-600), next_due_date: day(52) },
]

export const sampleRecords: MedicalRecord[] = [
  {
    id: 'r1', family_member_id: 'ramesh', record_type: 'prescription', record_date: day(-5), created_at: at(-4),
    doctor_name: 'Dr. Anita Rao', hospital_name: 'City Care Clinic',
    extracted_data: { medicines: [
      { name: 'Amlodipine', dosage: '5 mg', frequency: 'Once daily, morning' },
      { name: 'Metformin', dosage: '500 mg', frequency: 'Twice daily after meals' },
      { name: 'Atorvastatin', dosage: '10 mg', frequency: 'At night' },
    ] },
  },
  {
    id: 'r2', family_member_id: 'sunita', record_type: 'lab_report', record_date: day(-9), created_at: at(-9),
    doctor_name: 'Dr. Meera Iyer', hospital_name: 'Metro Diagnostics',
    extracted_data: { medicines: [{ name: 'Levothyroxine', dosage: '50 mcg', frequency: 'Before breakfast' }] },
  },
  {
    id: 'r3', family_member_id: 'diya', record_type: 'prescription', record_date: day(-17), created_at: at(-17),
    doctor_name: 'Dr. Kavya Nair', hospital_name: 'Little Steps Paediatrics',
    extracted_data: { medicines: [{ name: 'Paracetamol syrup', dosage: '5 ml', frequency: 'Every 6 hours if fever' }] },
  },
  {
    id: 'r4', family_member_id: 'arjun', record_type: 'prescription', record_date: day(-41), created_at: at(-40),
    doctor_name: 'Dr. Sameer Khan', hospital_name: 'Lakeside Clinic',
    extracted_data: { medicines: [{ name: 'Cetirizine', dosage: '10 mg', frequency: 'At night for 5 days' }] },
  },
]

export const sampleFamily = { email: 'arjun@example.com', members: sampleMembers }

export const sampleColors = memberColors(sampleMembers)
