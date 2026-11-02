export type Medicine = { name: string; dosage?: string | null; frequency?: string | null }

export type Vaccination = {
  id: string
  family_member_id: string
  vaccine_name: string
  date_given: string | null
  next_due_date: string | null
}

export type MedicalRecord = {
  id: string
  family_member_id: string
  record_type: string | null
  record_date: string | null
  created_at: string
  doctor_name: string | null
  hospital_name: string | null
  extracted_data: { error?: string; medicines?: Medicine[]; notes?: string | null } | null
}

export type CalendarEvent = {
  date: string
  memberId: string
  label: string
  kind: 'overdue' | 'due' | 'record'
}
