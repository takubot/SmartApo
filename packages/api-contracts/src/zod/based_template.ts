import { z } from "zod";

export const status = z.union([z.string(), z.null()]).optional();
export type statusType = z.infer<typeof status>;
export const PaginatedResponse = z
  .object({
    items: z.array(z.unknown()),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
    totalPages: z.number().int(),
  })
  .passthrough();
export type PaginatedResponseType = z.infer<typeof PaginatedResponse>;
export const ValidationError = z
  .object({
    loc: z.array(z.union([z.string(), z.number()])),
    msg: z.string(),
    type: z.string(),
  })
  .passthrough();
export type ValidationErrorType = z.infer<typeof ValidationError>;
export const HTTPValidationError = z
  .object({ detail: z.array(ValidationError) })
  .partial()
  .passthrough();
export type HTTPValidationErrorType = z.infer<typeof HTTPValidationError>;
export const ContactCreateSchema = z.object({
  lastName: z.string(),
  firstName: z.string(),
  lastNameKana: z.union([z.string(), z.null()]).optional(),
  firstNameKana: z.union([z.string(), z.null()]).optional(),
  companyName: z.union([z.string(), z.null()]).optional(),
  department: z.union([z.string(), z.null()]).optional(),
  position: z.union([z.string(), z.null()]).optional(),
  phonePrimary: z.string(),
  phoneSecondary: z.union([z.string(), z.null()]).optional(),
  phoneMobile: z.union([z.string(), z.null()]).optional(),
  email: z.union([z.string(), z.null()]).optional(),
  postalCode: z.union([z.string(), z.null()]).optional(),
  prefecture: z.union([z.string(), z.null()]).optional(),
  city: z.union([z.string(), z.null()]).optional(),
  addressLine: z.union([z.string(), z.null()]).optional(),
  notes: z.union([z.string(), z.null()]).optional(),
  tags: z.union([z.array(z.string()), z.null()]).optional(),
});
export type ContactCreateSchemaType = z.infer<typeof ContactCreateSchema>;
export const ContactResponseSchema = z.object({
  contactId: z.string(),
  lastName: z.string(),
  firstName: z.string(),
  lastNameKana: z.union([z.string(), z.null()]).optional(),
  firstNameKana: z.union([z.string(), z.null()]).optional(),
  companyName: z.union([z.string(), z.null()]).optional(),
  department: z.union([z.string(), z.null()]).optional(),
  position: z.union([z.string(), z.null()]).optional(),
  phonePrimary: z.string(),
  phoneSecondary: z.union([z.string(), z.null()]).optional(),
  phoneMobile: z.union([z.string(), z.null()]).optional(),
  email: z.union([z.string(), z.null()]).optional(),
  postalCode: z.union([z.string(), z.null()]).optional(),
  prefecture: z.union([z.string(), z.null()]).optional(),
  city: z.union([z.string(), z.null()]).optional(),
  addressLine: z.union([z.string(), z.null()]).optional(),
  status: z.string(),
  notes: z.union([z.string(), z.null()]).optional(),
  tags: z.union([z.array(z.string()), z.null()]).optional(),
  totalCalls: z.number().int().optional().default(0),
  lastCalledAt: z.union([z.string(), z.null()]).optional(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});
export type ContactResponseSchemaType = z.infer<typeof ContactResponseSchema>;
export const ContactUpdateSchema = z
  .object({
    lastName: z.union([z.string(), z.null()]),
    firstName: z.union([z.string(), z.null()]),
    lastNameKana: z.union([z.string(), z.null()]),
    firstNameKana: z.union([z.string(), z.null()]),
    companyName: z.union([z.string(), z.null()]),
    department: z.union([z.string(), z.null()]),
    position: z.union([z.string(), z.null()]),
    phonePrimary: z.union([z.string(), z.null()]),
    phoneSecondary: z.union([z.string(), z.null()]),
    phoneMobile: z.union([z.string(), z.null()]),
    email: z.union([z.string(), z.null()]),
    postalCode: z.union([z.string(), z.null()]),
    prefecture: z.union([z.string(), z.null()]),
    city: z.union([z.string(), z.null()]),
    addressLine: z.union([z.string(), z.null()]),
    notes: z.union([z.string(), z.null()]),
    tags: z.union([z.array(z.string()), z.null()]),
    status: z.union([z.string(), z.null()]),
  })
  .partial();
export type ContactUpdateSchemaType = z.infer<typeof ContactUpdateSchema>;
export const Body_import_csv_v2_dialer_contacts_import_csv_post = z
  .object({ file: z.instanceof(File) })
  .passthrough();
export type Body_import_csv_v2_dialer_contacts_import_csv_postType = z.infer<
  typeof Body_import_csv_v2_dialer_contacts_import_csv_post
>;
export const MessageResponse = z.object({ message: z.string() });
export type MessageResponseType = z.infer<typeof MessageResponse>;
export const ContactSearchSchema = z
  .object({
    keyword: z.union([z.string(), z.null()]),
    companyName: z.union([z.string(), z.null()]),
    phone: z.union([z.string(), z.null()]),
    status: z.union([z.string(), z.null()]),
    tags: z.union([z.array(z.string()), z.null()]),
  })
  .partial();
export type ContactSearchSchemaType = z.infer<typeof ContactSearchSchema>;
export const CampaignCreateSchema = z.object({
  name: z.string(),
  description: z.union([z.string(), z.null()]).optional(),
  startDate: z.union([z.string(), z.null()]).optional(),
  endDate: z.union([z.string(), z.null()]).optional(),
  dailyStartTime: z.string().optional().default("09:00:00"),
  dailyEndTime: z.string().optional().default("18:00:00"),
  activeDays: z.union([z.array(z.number().int()), z.null()]).optional(),
  predictiveRatio: z.union([z.number(), z.string()]).optional().default("1.20"),
  maxConcurrentCalls: z.number().int().optional().default(10),
  maxAbandonRate: z.union([z.number(), z.string()]).optional().default("3.00"),
  maxAttemptsPerContact: z.number().int().optional().default(3),
  retryIntervalMinutes: z.number().int().optional().default(30),
  ringTimeoutSeconds: z.number().int().optional().default(30),
  wrapUpSeconds: z.number().int().optional().default(30),
  callListId: z.union([z.string(), z.null()]).optional(),
  scriptId: z.union([z.string(), z.null()]).optional(),
  callerId: z.union([z.string(), z.null()]).optional(),
});
export type CampaignCreateSchemaType = z.infer<typeof CampaignCreateSchema>;
export const CampaignResponseSchema = z.object({
  campaignId: z.string(),
  name: z.string(),
  description: z.union([z.string(), z.null()]).optional(),
  status: z.string(),
  startDate: z.union([z.string(), z.null()]).optional(),
  endDate: z.union([z.string(), z.null()]).optional(),
  dailyStartTime: z.string(),
  dailyEndTime: z.string(),
  activeDays: z.union([z.array(z.number().int()), z.null()]).optional(),
  predictiveRatio: z.string(),
  maxConcurrentCalls: z.number().int(),
  maxAbandonRate: z.string(),
  maxAttemptsPerContact: z.number().int(),
  retryIntervalMinutes: z.number().int(),
  ringTimeoutSeconds: z.number().int(),
  wrapUpSeconds: z.number().int(),
  callListId: z.union([z.string(), z.null()]).optional(),
  scriptId: z.union([z.string(), z.null()]).optional(),
  callerId: z.union([z.string(), z.null()]).optional(),
  totalContacts: z.number().int().optional().default(0),
  completedContacts: z.number().int().optional().default(0),
  totalCalls: z.number().int().optional().default(0),
  totalAnswered: z.number().int().optional().default(0),
  totalAbandoned: z.number().int().optional().default(0),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});
export type CampaignResponseSchemaType = z.infer<typeof CampaignResponseSchema>;
export const CampaignUpdateSchema = z
  .object({
    name: z.union([z.string(), z.null()]),
    description: z.union([z.string(), z.null()]),
    startDate: z.union([z.string(), z.null()]),
    endDate: z.union([z.string(), z.null()]),
    dailyStartTime: z.union([z.string(), z.null()]),
    dailyEndTime: z.union([z.string(), z.null()]),
    activeDays: z.union([z.array(z.number().int()), z.null()]),
    predictiveRatio: z.union([z.number(), z.string(), z.null()]),
    maxConcurrentCalls: z.union([z.number(), z.null()]),
    maxAbandonRate: z.union([z.number(), z.string(), z.null()]),
    maxAttemptsPerContact: z.union([z.number(), z.null()]),
    retryIntervalMinutes: z.union([z.number(), z.null()]),
    ringTimeoutSeconds: z.union([z.number(), z.null()]),
    wrapUpSeconds: z.union([z.number(), z.null()]),
    callListId: z.union([z.string(), z.null()]),
    scriptId: z.union([z.string(), z.null()]),
    callerId: z.union([z.string(), z.null()]),
  })
  .partial();
export type CampaignUpdateSchemaType = z.infer<typeof CampaignUpdateSchema>;
export const CampaignStatsSchema = z.object({
  campaignId: z.string(),
  totalContacts: z.number().int(),
  completedContacts: z.number().int(),
  totalCalls: z.number().int(),
  totalAnswered: z.number().int(),
  totalAbandoned: z.number().int(),
  answerRate: z.number(),
  abandonRate: z.number(),
  activeUsers: z.number().int(),
  activeCalls: z.number().int(),
  predictiveRatio: z.string(),
});
export type CampaignStatsSchemaType = z.infer<typeof CampaignStatsSchema>;
export const CampaignContactAddSchema = z.object({
  contactIds: z.array(z.string()),
  priority: z.number().int().optional().default(0),
});
export type CampaignContactAddSchemaType = z.infer<
  typeof CampaignContactAddSchema
>;
export const UserResponseSchema = z.object({
  userId: z.string(),
  firebaseUid: z.string(),
  displayName: z.string(),
  extension: z.union([z.string(), z.null()]).optional(),
  status: z.string(),
  statusChangedAt: z.union([z.string(), z.null()]).optional(),
  currentCallId: z.union([z.string(), z.null()]).optional(),
  skills: z.union([z.array(z.string()), z.null()]).optional(),
  maxConcurrentCalls: z.number().int(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});
export type UserResponseSchemaType = z.infer<typeof UserResponseSchema>;
export const UserStatusUpdateSchema = z.object({ status: z.string() });
export type UserStatusUpdateSchemaType = z.infer<typeof UserStatusUpdateSchema>;
export const UserCreateSchema = z.object({
  email: z.string(),
  password: z.string(),
  displayName: z.string(),
  extension: z.union([z.string(), z.null()]).optional(),
  skills: z.union([z.array(z.string()), z.null()]).optional(),
  maxConcurrentCalls: z.number().int().optional().default(1),
});
export type UserCreateSchemaType = z.infer<typeof UserCreateSchema>;
export const UserUpdateSchema = z
  .object({
    displayName: z.union([z.string(), z.null()]),
    extension: z.union([z.string(), z.null()]),
    skills: z.union([z.array(z.string()), z.null()]),
    maxConcurrentCalls: z.union([z.number(), z.null()]),
  })
  .partial();
export type UserUpdateSchemaType = z.infer<typeof UserUpdateSchema>;
export const CallLogResponseSchema = z.object({
  callLogId: z.string(),
  campaignId: z.union([z.string(), z.null()]).optional(),
  contactId: z.string(),
  userId: z.union([z.string(), z.null()]).optional(),
  dispositionId: z.union([z.string(), z.null()]).optional(),
  callUuid: z.union([z.string(), z.null()]).optional(),
  phoneNumberDialed: z.string(),
  callerIdUsed: z.union([z.string(), z.null()]).optional(),
  callStatus: z.string(),
  initiatedAt: z.union([z.string(), z.null()]).optional(),
  answeredAt: z.union([z.string(), z.null()]).optional(),
  endedAt: z.union([z.string(), z.null()]).optional(),
  durationSeconds: z.number().int().optional().default(0),
  ringDurationSeconds: z.number().int().optional().default(0),
  recordingUrl: z.union([z.string(), z.null()]).optional(),
  recordingDurationSeconds: z.number().int().optional().default(0),
  notes: z.union([z.string(), z.null()]).optional(),
  isAbandoned: z.boolean().optional().default(false),
  createdAt: z.string().datetime({ offset: true }),
});
export type CallLogResponseSchemaType = z.infer<typeof CallLogResponseSchema>;
export const CallListCreateSchema = z.object({
  name: z.string(),
  description: z.union([z.string(), z.null()]).optional(),
});
export type CallListCreateSchemaType = z.infer<typeof CallListCreateSchema>;
export const CallListResponseSchema = z.object({
  callListId: z.string(),
  name: z.string(),
  description: z.union([z.string(), z.null()]).optional(),
  contactCount: z.number().int(),
  source: z.union([z.string(), z.null()]).optional(),
  spreadsheetId: z.union([z.string(), z.null()]).optional(),
  sheetName: z.union([z.string(), z.null()]).optional(),
  sheetRange: z.union([z.string(), z.null()]).optional(),
  columnMapping: z.union([z.string(), z.null()]).optional(),
  headerRow: z.number().int().optional().default(1),
  lastSheetSyncedAt: z.union([z.string(), z.null()]).optional(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});
export type CallListResponseSchemaType = z.infer<typeof CallListResponseSchema>;
export const CallListUpdateSchema = z
  .object({
    name: z.union([z.string(), z.null()]),
    description: z.union([z.string(), z.null()]),
  })
  .partial();
export type CallListUpdateSchemaType = z.infer<typeof CallListUpdateSchema>;
export const CallListContactAddSchema = z.object({
  contactIds: z.array(z.string()),
});
export type CallListContactAddSchemaType = z.infer<
  typeof CallListContactAddSchema
>;
export const StartCallingRequestSchema = z
  .object({
    callerId: z.union([z.string(), z.null()]),
    maxConcurrentCalls: z.number().int().default(1),
    contactIds: z.union([z.array(z.string()), z.null()]),
  })
  .partial();
export type StartCallingRequestSchemaType = z.infer<
  typeof StartCallingRequestSchema
>;
export const StartCallingResponseSchema = z.object({
  initiatedCount: z.number().int(),
  message: z.string(),
  sessionId: z.union([z.string(), z.null()]).optional(),
});
export type StartCallingResponseSchemaType = z.infer<
  typeof StartCallingResponseSchema
>;
export const CallingSessionCallSchema = z.object({
  callLogId: z.string(),
  contactId: z.string(),
  status: z.string(),
  phoneNumber: z.string(),
  contactName: z.string().optional().default(""),
  companyName: z.union([z.string(), z.null()]).optional(),
});
export type CallingSessionCallSchemaType = z.infer<
  typeof CallingSessionCallSchema
>;
export const CallingSessionContactSchema = z.object({
  contactId: z.string(),
  lastName: z.string(),
  firstName: z.string(),
  phonePrimary: z.string(),
  phoneSecondary: z.union([z.string(), z.null()]).optional(),
  phoneMobile: z.union([z.string(), z.null()]).optional(),
  email: z.union([z.string(), z.null()]).optional(),
  companyName: z.union([z.string(), z.null()]).optional(),
  department: z.union([z.string(), z.null()]).optional(),
  position: z.union([z.string(), z.null()]).optional(),
});
export type CallingSessionContactSchemaType = z.infer<
  typeof CallingSessionContactSchema
>;
export const CallingSessionStatusSchema = z.object({
  sessionId: z.string(),
  calls: z.array(CallingSessionCallSchema),
  connectedCallLogId: z.union([z.string(), z.null()]).optional(),
  connectedContact: z.union([CallingSessionContactSchema, z.null()]).optional(),
  isComplete: z.boolean(),
});
export type CallingSessionStatusSchemaType = z.infer<
  typeof CallingSessionStatusSchema
>;
export const CallResultRequestSchema = z.object({
  teleStatus: z.string(),
  teleNote: z.union([z.string(), z.null()]).optional(),
  notes: z.union([z.string(), z.null()]).optional(),
  dispositionId: z.union([z.string(), z.null()]).optional(),
});
export type CallResultRequestSchemaType = z.infer<
  typeof CallResultRequestSchema
>;
export const SpreadsheetItemSchema = z.object({
  spreadsheetId: z.string(),
  name: z.string(),
  modifiedTime: z.union([z.string(), z.null()]).optional(),
});
export type SpreadsheetItemSchemaType = z.infer<typeof SpreadsheetItemSchema>;
export const SpreadsheetListSchema = z.object({
  items: z.array(SpreadsheetItemSchema),
});
export type SpreadsheetListSchemaType = z.infer<typeof SpreadsheetListSchema>;
export const SheetTabSchema = z.object({
  sheetId: z.number().int(),
  title: z.string(),
});
export type SheetTabSchemaType = z.infer<typeof SheetTabSchema>;
export const SheetTabListSchema = z.object({ items: z.array(SheetTabSchema) });
export type SheetTabListSchemaType = z.infer<typeof SheetTabListSchema>;
export const SheetsPreviewRequestSchema = z.object({
  spreadsheetId: z.string(),
  sheetName: z.union([z.string(), z.null()]).optional().default("Sheet1"),
  headerRow: z.number().int().optional().default(1),
});
export type SheetsPreviewRequestSchemaType = z.infer<
  typeof SheetsPreviewRequestSchema
>;
export const SheetsPreviewResponseSchema = z.object({
  headers: z.array(z.string()),
  rows: z.array(z.record(z.string())),
  totalRows: z.number().int(),
  rawRows: z.array(z.array(z.string())).optional().default([]),
  suggestedMapping: z.record(z.string()).optional().default({}),
});
export type SheetsPreviewResponseSchemaType = z.infer<
  typeof SheetsPreviewResponseSchema
>;
export const SheetsImportRequestSchema = z.object({
  spreadsheetId: z.string(),
  sheetName: z.union([z.string(), z.null()]).optional().default("Sheet1"),
  rangeName: z.union([z.string(), z.null()]).optional().default("A:Z"),
  headerRow: z.number().int().optional().default(1),
  listName: z.string(),
  listDescription: z.union([z.string(), z.null()]).optional(),
  columnMapping: z.union([z.record(z.string()), z.null()]).optional(),
});
export type SheetsImportRequestSchemaType = z.infer<
  typeof SheetsImportRequestSchema
>;
export const SheetsImportResponseSchema = z.object({
  callListId: z.string(),
  name: z.string(),
  importedCount: z.number().int(),
  skippedCount: z.number().int(),
  message: z.string(),
});
export type SheetsImportResponseSchemaType = z.infer<
  typeof SheetsImportResponseSchema
>;
export const SheetsSyncResponseSchema = z.object({
  addedCount: z.number().int(),
  updatedCount: z.number().int(),
  removedCount: z.number().int(),
  message: z.string(),
});
export type SheetsSyncResponseSchemaType = z.infer<
  typeof SheetsSyncResponseSchema
>;
export const CallbackResponseSchema = z.object({
  callbackId: z.string(),
  contactId: z.string(),
  campaignId: z.union([z.string(), z.null()]).optional(),
  assignedUserId: z.union([z.string(), z.null()]).optional(),
  scheduledAt: z.string().datetime({ offset: true }),
  priority: z.string(),
  notes: z.union([z.string(), z.null()]).optional(),
  isCompleted: z.boolean(),
  completedAt: z.union([z.string(), z.null()]).optional(),
  googleCalendarEventId: z.union([z.string(), z.null()]).optional(),
  createdAt: z.string().datetime({ offset: true }),
});
export type CallbackResponseSchemaType = z.infer<typeof CallbackResponseSchema>;
export const CallbackCreateSchema = z.object({
  contactId: z.string(),
  campaignId: z.union([z.string(), z.null()]).optional(),
  assignedUserId: z.union([z.string(), z.null()]).optional(),
  scheduledAt: z.string().datetime({ offset: true }),
  priority: z.string().optional().default("medium"),
  notes: z.union([z.string(), z.null()]).optional(),
});
export type CallbackCreateSchemaType = z.infer<typeof CallbackCreateSchema>;
export const CallbackUpdateSchema = z
  .object({
    assignedUserId: z.union([z.string(), z.null()]),
    scheduledAt: z.union([z.string(), z.null()]),
    priority: z.union([z.string(), z.null()]),
    notes: z.union([z.string(), z.null()]),
  })
  .partial();
export type CallbackUpdateSchemaType = z.infer<typeof CallbackUpdateSchema>;
export const DispositionResponseSchema = z.object({
  dispositionId: z.string(),
  name: z.string(),
  dispositionType: z.string(),
  requiresCallback: z.boolean(),
  isFinal: z.boolean(),
  displayOrder: z.number().int(),
  colorCode: z.union([z.string(), z.null()]).optional(),
  createdAt: z.string().datetime({ offset: true }),
});
export type DispositionResponseSchemaType = z.infer<
  typeof DispositionResponseSchema
>;
export const DispositionCreateSchema = z.object({
  name: z.string(),
  dispositionType: z.string(),
  requiresCallback: z.boolean().optional().default(false),
  isFinal: z.boolean().optional().default(false),
  displayOrder: z.number().int().optional().default(0),
  colorCode: z.union([z.string(), z.null()]).optional(),
});
export type DispositionCreateSchemaType = z.infer<
  typeof DispositionCreateSchema
>;
export const DispositionUpdateSchema = z
  .object({
    name: z.union([z.string(), z.null()]),
    dispositionType: z.union([z.string(), z.null()]),
    requiresCallback: z.union([z.boolean(), z.null()]),
    isFinal: z.union([z.boolean(), z.null()]),
    displayOrder: z.union([z.number(), z.null()]),
    colorCode: z.union([z.string(), z.null()]),
  })
  .partial();
export type DispositionUpdateSchemaType = z.infer<
  typeof DispositionUpdateSchema
>;
export const DncResponseSchema = z.object({
  dncId: z.string(),
  phoneNumber: z.string(),
  reason: z.union([z.string(), z.null()]).optional(),
  addedBy: z.union([z.string(), z.null()]).optional(),
  expiresAt: z.union([z.string(), z.null()]).optional(),
  createdAt: z.string().datetime({ offset: true }),
});
export type DncResponseSchemaType = z.infer<typeof DncResponseSchema>;
export const DncCreateSchema = z.object({
  phoneNumber: z.string(),
  reason: z.union([z.string(), z.null()]).optional(),
  expiresAt: z.union([z.string(), z.null()]).optional(),
});
export type DncCreateSchemaType = z.infer<typeof DncCreateSchema>;
export const DncBulkCreateSchema = z.object({
  phoneNumbers: z.array(z.string()),
  reason: z.union([z.string(), z.null()]).optional(),
});
export type DncBulkCreateSchemaType = z.infer<typeof DncBulkCreateSchema>;
export const BulkOperationResult = z.object({
  successCount: z.number().int(),
  errorCount: z.number().int(),
  errors: z.array(z.string()).optional().default([]),
});
export type BulkOperationResultType = z.infer<typeof BulkOperationResult>;
export const DncCheckResponseSchema = z.object({
  phoneNumber: z.string(),
  isDnc: z.boolean(),
});
export type DncCheckResponseSchemaType = z.infer<typeof DncCheckResponseSchema>;
export const ScriptResponseSchema = z.object({
  scriptId: z.string(),
  name: z.string(),
  content: z.union([z.string(), z.null()]).optional(),
  version: z.number().int(),
  isDefault: z.boolean(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});
export type ScriptResponseSchemaType = z.infer<typeof ScriptResponseSchema>;
export const ScriptCreateSchema = z.object({
  name: z.string(),
  content: z.union([z.string(), z.null()]).optional(),
  isDefault: z.boolean().optional().default(false),
});
export type ScriptCreateSchemaType = z.infer<typeof ScriptCreateSchema>;
export const ScriptUpdateSchema = z
  .object({
    name: z.union([z.string(), z.null()]),
    content: z.union([z.string(), z.null()]),
    isDefault: z.union([z.boolean(), z.null()]),
  })
  .partial();
export type ScriptUpdateSchemaType = z.infer<typeof ScriptUpdateSchema>;
export const DashboardOverviewSchema = z.object({
  totalCallsToday: z.number().int(),
  totalAnsweredToday: z.number().int(),
  answerRateToday: z.number(),
  avgCallDurationSeconds: z.number(),
  activeCampaigns: z.number().int(),
  activeUsers: z.number().int(),
  totalCallbacksToday: z.number().int(),
  totalContacts: z.number().int(),
});
export type DashboardOverviewSchemaType = z.infer<
  typeof DashboardOverviewSchema
>;
export const UserPerformanceSchema = z.object({
  userId: z.string(),
  displayName: z.string(),
  totalCalls: z.number().int(),
  totalAnswered: z.number().int(),
  answerRate: z.number(),
  avgCallDurationSeconds: z.number(),
  totalTalkTimeSeconds: z.number().int(),
});
export type UserPerformanceSchemaType = z.infer<typeof UserPerformanceSchema>;
export const HourlyStatSchema = z.object({
  hour: z.number().int(),
  totalCalls: z.number().int(),
  totalAnswered: z.number().int(),
  answerRate: z.number(),
});
export type HourlyStatSchemaType = z.infer<typeof HourlyStatSchema>;
export const GoogleAuthUrlResponseSchema = z.object({ authUrl: z.string() });
export type GoogleAuthUrlResponseSchemaType = z.infer<
  typeof GoogleAuthUrlResponseSchema
>;
export const GoogleCallbackSchema = z.object({
  code: z.string(),
  state: z.union([z.string(), z.null()]).optional(),
  redirectUri: z.union([z.string(), z.null()]).optional(),
});
export type GoogleCallbackSchemaType = z.infer<typeof GoogleCallbackSchema>;
export const GooglePickerConfigSchema = z.object({
  accessToken: z.string(),
  apiKey: z.string(),
  appId: z.string(),
});
export type GooglePickerConfigSchemaType = z.infer<
  typeof GooglePickerConfigSchema
>;
export const GoogleIntegrationStatusSchema = z.object({
  integrationId: z.string(),
  integrationType: z.string(),
  status: z.string(),
  lastSyncedAt: z.union([z.string(), z.null()]).optional(),
});
export type GoogleIntegrationStatusSchemaType = z.infer<
  typeof GoogleIntegrationStatusSchema
>;
export const GoogleIntegrationListSchema = z.object({
  integrations: z.array(GoogleIntegrationStatusSchema),
});
export type GoogleIntegrationListSchemaType = z.infer<
  typeof GoogleIntegrationListSchema
>;
export const PhoneConfigResponseSchema = z.object({
  eslConnected: z.boolean(),
  sipGateway: z.string(),
  registeredUsers: z.number().int(),
  defaultCallerId: z.union([z.string(), z.null()]).optional(),
});
export type PhoneConfigResponseSchemaType = z.infer<
  typeof PhoneConfigResponseSchema
>;
export const EslTestResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  freeswitchVersion: z.union([z.string(), z.null()]).optional(),
});
export type EslTestResponseSchemaType = z.infer<typeof EslTestResponseSchema>;
export const DialRequest = z
  .object({
    phone_number: z.string(),
    contact_id: z.string(),
    caller_id: z.string(),
    campaign_id: z.union([z.string(), z.null()]).optional(),
    ring_timeout: z.number().int().gte(10).lte(120).optional().default(30),
    record: z.boolean().optional().default(true),
  })
  .passthrough();
export type DialRequestType = z.infer<typeof DialRequest>;
export const DialResponse = z
  .object({
    call_uuid: z.string(),
    status: z.string(),
    user_extension: z.string(),
    contact_id: z.string(),
    phone_number: z.string(),
  })
  .passthrough();
export type DialResponseType = z.infer<typeof DialResponse>;
