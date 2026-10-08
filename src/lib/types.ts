// Shapes returned by the API, as used by the dashboard pages.

export type FieldType =
  | 'short_text' | 'long_text' | 'phone' | 'email' | 'number'
  | 'dropdown' | 'radio' | 'checkbox' | 'date' | 'yes_no';

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  options?: string[];
  helpText?: string;
}

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  short_text: 'Short answer',
  long_text: 'Paragraph',
  phone: 'Phone number',
  email: 'Email',
  number: 'Number',
  dropdown: 'Dropdown',
  radio: 'Multiple choice (pick one)',
  checkbox: 'Checkboxes (pick many)',
  date: 'Date',
  yes_no: 'Yes / No',
};

export const CHOICE_TYPES: FieldType[] = ['dropdown', 'radio', 'checkbox'];

export type EventStatus = 'open' | 'closed' | 'full' | 'scheduled';

export interface EventSummary {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  startsAt: string | null;
  venue: string | null;
  registrationClosesAt: string | null;
  capacity: number | null;
  isOpen: boolean;
  uniquePhone: boolean;
  confirmationMessage: string | null;
  fields: FormField[];
  churchId: string;
  churchName: string | null;
  createdAt: string;
  registrationCount: number;
  status: EventStatus;
  shareUrl: string | null;
}

export interface Registration {
  id: string;
  fullName: string;
  phone: string;
  ticketCode: string;
  answers: Record<string, unknown>;
  createdAt: string;
}

export interface Member {
  id: string;
  memberId: string | null;
  firstName: string;
  lastName: string;
  middleName: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  maritalStatus: string | null;
  occupation: string | null;
  phone: string;
  alternatePhone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  status: string;
  churchRole: string | null;
  departmentName: string | null;
  departmentRole: string | null;
  membershipDate: string | null;
  churchId: string;
  tags: string[];
  isYouth: boolean;
  customFields: Record<string, any> | null;
  createdAt: string;
}

export const FOLLOW_UP_TAG = 'Follow-Up Needed';

export const ADMIN_ROLES = ['senior_pastor', 'branch_pastor', 'admin_pastor', 'super_admin'];

/** Pulls the most useful message out of an API error. */
export function apiError(e: any, fallback = 'Something went wrong. Please try again.'): string {
  const m = e?.response?.data?.message;
  if (Array.isArray(m)) return m.join(' ');
  return m ?? e?.message ?? fallback;
}
