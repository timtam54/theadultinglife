export type CategoryId =
  | "personal"
  | "health"
  | "education"
  | "employment"
  | "admin";

export const CATEGORY_IDS: readonly CategoryId[] = [
  "personal",
  "health",
  "education",
  "employment",
  "admin",
] as const;

export const CATEGORY_LABELS: Record<CategoryId, string> = {
  personal: "Personal",
  health: "Health",
  education: "Education",
  employment: "Employment",
  admin: "Admin & Bookkeeping",
};

export type FieldType = "text" | "date" | "number";

export interface RecordField {
  key: string;
  label: string;
  type: FieldType;
  value: string;
}

export type RecordStatus = "active" | "expiring_soon" | "expired";

export type UserRole = "u" | "s";

export type MemberKind = "adult" | "child" | "other";

export interface UserRow {
  id: string;
  family_group_id: string;
  email: string | null;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  auth_provider: string | null;
  auth_provider_id: string | null;
  password_hash: string | null;
  password_set_token_hash: string | null;
  password_set_expires_at: string | null;
  role: UserRole;
  member_kind: MemberKind;
  order_index: number;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface FamilyGroupRow {
  id: string;
  name: string;
  all_users_added_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecordRow {
  id: string;
  user_id: string;
  category_id: CategoryId;
  subcategory_id: string | null;
  title: string;
  fields: RecordField[];
  expiry_date: string | null;
  notes: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export type RecordHistoryAction = "created" | "updated" | "deleted";

export interface RecordHistoryRow {
  id: string;
  record_id: string;
  user_id: string | null;
  actor_user_id: string | null;
  action: RecordHistoryAction;
  changes: Record<string, unknown>;
  created_at: string;
}

export interface FileRow {
  id: string;
  user_id: string;
  record_id: string | null;
  subcategory_id: string | null;
  storage_path: string;
  filename: string;
  mime_type: string | null;
  size_bytes: number;
  tags: string[];
  created_at: string;
}

export type SubcategoryScope =
  | "user_list"
  | "family_singleton"
  | "family_list"
  | "per_user"
  | "per_user_list";

export type SubcategoryVisibility = "catalogue" | "user_private";

export interface SubcategoryRow {
  id: string;
  category_id: CategoryId;
  user_id: string | null;
  name: string;
  hint: string | null;
  tal_form: boolean;
  sort_order: number;
  scope: SubcategoryScope;
  default_fields: RecordField[] | null;
  repeatable: boolean;
  template_group: string | null;
  visibility: SubcategoryVisibility;
  created_by: string | null;
}

export type QuestionType =
  | "text"
  | "textarea"
  | "int"
  | "number"
  | "date"
  | "datetime"
  | "dropdown"
  | "image";

export interface QuestionOption {
  value: string;
  label: string;
}

export interface PageQuestionRow {
  id: string;
  page_group: string;
  subcategory_id: string | null;
  label: string;
  hint: string | null;
  question_type: QuestionType;
  options: QuestionOption[] | null;
  col_start: number;
  col_span: number;
  row_order: number;
  required: boolean;
  placeholder: string | null;
}

export interface QuestionResponseRow {
  user_id: string;
  question_id: string;
  instance_id: string;
  value: string | null;
  updated_at: string;
}

export interface ProgressRow {
  id: string;
  user_id: string;
  item_type: "content" | "quiz";
  item_id: string;
  status: "started" | "completed";
  meta: Record<string, unknown>;
  updated_at: string;
}

export interface AuditRow {
  id: number;
  user_id: string | null;
  username: string;
  page: string;
  action: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface PlannerEventRow {
  id: string;
  user_id: string;
  family_group_id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  created_at: string;
  updated_at: string;
}

export interface QuizRow {
  id: string;
  category_id: CategoryId;
  subcategory_id: string | null;
  title: string;
  description: string;
  source_article_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuizQuestionOption {
  id: string;
  text: string;
}

export interface QuizQuestionRow {
  id: string;
  quiz_id: string;
  prompt: string;
  options: QuizQuestionOption[];
  correct_option_id: string;
  explanation: string | null;
  sort_order: number;
}

export type LogLevel = "error" | "warn";

export interface AppLogRow {
  id: number;
  level: LogLevel;
  source: string;
  message: string;
  user_id: string | null;
  family_group_id: string | null;
  request_id: string | null;
  stack: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface QuizResultRow {
  id: string;
  user_id: string;
  quiz_id: string;
  score: number;
  total: number;
  answers: Record<string, string>;
  created_at: string;
}

export type VideoSource = "upload" | "youtube" | "vimeo" | "external";

export interface VideoRow {
  id: string;
  article_id: string;
  title: string;
  description: string | null;
  source: VideoSource;
  storage_path: string | null;
  url: string | null;
  content_type: string | null;
  size_bytes: number | null;
  duration_seconds: number | null;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
