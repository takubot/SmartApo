import apiClient from "@app-alias/fetchclient";
import type {
  AgentCreateSchemaType,
  AgentStatusUpdateSchemaType,
  AgentUpdateSchemaType,
  CallListContactAddSchemaType,
  CallListCreateSchemaType,
  CallListUpdateSchemaType,
  CallbackCreateSchemaType,
  CallbackUpdateSchemaType,
  CampaignContactAddSchemaType,
  CampaignCreateSchemaType,
  CampaignUpdateSchemaType,
  ContactCreateSchemaType,
  ContactSearchSchemaType,
  ContactUpdateSchemaType,
  DispositionCreateSchemaType,
  DispositionUpdateSchemaType,
  DncBulkCreateSchemaType,
  DncCreateSchemaType,
  GoogleCallbackSchemaType,
  ScriptCreateSchemaType,
  ScriptUpdateSchemaType,
  TwilioConfigSchemaType,
} from "../zod/based_template";
export async function list_contacts_v2_dialer_contacts_get() {
  const { data, error } = await apiClient.GET(`/v2/dialer/contacts`);
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function create_contact_v2_dialer_contacts_post(
  body: ContactCreateSchemaType,
) {
  const { data, error } = await apiClient.POST(`/v2/dialer/contacts`, { body });
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function get_contact_v2_dialer_contacts__contact_id__get(
  contact_id: string,
) {
  const { data, error } = await apiClient.GET(
    `/v2/dialer/contacts/${contact_id}`,
  );
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function update_contact_v2_dialer_contacts__contact_id__put(
  contact_id: string,
  body: ContactUpdateSchemaType,
) {
  const { data, error } = await apiClient.PUT(
    `/v2/dialer/contacts/${contact_id}`,
    { body },
  );
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function delete_contact_v2_dialer_contacts__contact_id__delete(
  contact_id: string,
) {
  const { data, error } = await apiClient.DELETE(
    `/v2/dialer/contacts/${contact_id}`,
  );
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function import_csv_v2_dialer_contacts_import_csv_post(
  body: FormData,
) {
  const { data, error } = await apiClient.POST_FORM_DATA(
    `/v2/dialer/contacts/import/csv`,
    body,
  );
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function search_contacts_v2_dialer_contacts_search_post(
  body: ContactSearchSchemaType,
) {
  const { data, error } = await apiClient.POST(`/v2/dialer/contacts/search`, {
    body,
  });
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function list_campaigns_v2_dialer_campaigns_get() {
  const { data, error } = await apiClient.GET(`/v2/dialer/campaigns`);
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function create_campaign_v2_dialer_campaigns_post(
  body: CampaignCreateSchemaType,
) {
  const { data, error } = await apiClient.POST(`/v2/dialer/campaigns`, {
    body,
  });
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function get_campaign_v2_dialer_campaigns__campaign_id__get(
  campaign_id: string,
) {
  const { data, error } = await apiClient.GET(
    `/v2/dialer/campaigns/${campaign_id}`,
  );
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function update_campaign_v2_dialer_campaigns__campaign_id__put(
  campaign_id: string,
  body: CampaignUpdateSchemaType,
) {
  const { data, error } = await apiClient.PUT(
    `/v2/dialer/campaigns/${campaign_id}`,
    { body },
  );
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function delete_campaign_v2_dialer_campaigns__campaign_id__delete(
  campaign_id: string,
) {
  const { data, error } = await apiClient.DELETE(
    `/v2/dialer/campaigns/${campaign_id}`,
  );
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function start_campaign_v2_dialer_campaigns__campaign_id__start_post(
  campaign_id: string,
) {
  const { data, error } = await apiClient.POST(
    `/v2/dialer/campaigns/${campaign_id}/start`,
  );
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function pause_campaign_v2_dialer_campaigns__campaign_id__pause_post(
  campaign_id: string,
) {
  const { data, error } = await apiClient.POST(
    `/v2/dialer/campaigns/${campaign_id}/pause`,
  );
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function stop_campaign_v2_dialer_campaigns__campaign_id__stop_post(
  campaign_id: string,
) {
  const { data, error } = await apiClient.POST(
    `/v2/dialer/campaigns/${campaign_id}/stop`,
  );
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function campaign_stats_v2_dialer_campaigns__campaign_id__stats_get(
  campaign_id: string,
) {
  const { data, error } = await apiClient.GET(
    `/v2/dialer/campaigns/${campaign_id}/stats`,
  );
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function add_contacts_to_campaign_v2_dialer_campaigns__campaign_id__contacts_post(
  campaign_id: string,
  body: CampaignContactAddSchemaType,
) {
  const { data, error } = await apiClient.POST(
    `/v2/dialer/campaigns/${campaign_id}/contacts`,
    { body },
  );
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function list_campaign_contacts_v2_dialer_campaigns__campaign_id__contacts_get(
  campaign_id: string,
) {
  const { data, error } = await apiClient.GET(
    `/v2/dialer/campaigns/${campaign_id}/contacts`,
  );
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function remove_contact_from_campaign_v2_dialer_campaigns__campaign_id__contacts__contact_id__delete(
  campaign_id: string,
  contact_id: string,
) {
  const { data, error } = await apiClient.DELETE(
    `/v2/dialer/campaigns/${campaign_id}/contacts/${contact_id}`,
  );
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function assign_agents_v2_dialer_campaigns__campaign_id__agents_post(
  campaign_id: string,
) {
  const { data, error } = await apiClient.POST(
    `/v2/dialer/campaigns/${campaign_id}/agents`,
  );
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function unassign_agent_v2_dialer_campaigns__campaign_id__agents__agent_id__delete(
  campaign_id: string,
  agent_id: string,
) {
  const { data, error } = await apiClient.DELETE(
    `/v2/dialer/campaigns/${campaign_id}/agents/${agent_id}`,
  );
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function list_agents_v2_dialer_agents_get() {
  const { data, error } = await apiClient.GET(`/v2/dialer/agents`);
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function create_agent_v2_dialer_agents_post(
  body: AgentCreateSchemaType,
) {
  const { data, error } = await apiClient.POST(`/v2/dialer/agents`, { body });
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function status_board_v2_dialer_agents_status_board_get() {
  const { data, error } = await apiClient.GET(`/v2/dialer/agents/status-board`);
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function available_agents_v2_dialer_agents_available_get() {
  const { data, error } = await apiClient.GET(`/v2/dialer/agents/available`);
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function get_agent_v2_dialer_agents__agent_id__get(
  agent_id: string,
) {
  const { data, error } = await apiClient.GET(`/v2/dialer/agents/${agent_id}`);
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function update_agent_v2_dialer_agents__agent_id__put(
  agent_id: string,
  body: AgentUpdateSchemaType,
) {
  const { data, error } = await apiClient.PUT(`/v2/dialer/agents/${agent_id}`, {
    body,
  });
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function update_agent_status_v2_dialer_agents__agent_id__status_put(
  agent_id: string,
  body: AgentStatusUpdateSchemaType,
) {
  const { data, error } = await apiClient.PUT(
    `/v2/dialer/agents/${agent_id}/status`,
    { body },
  );
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function initiate_call_v2_dialer_calls_initiate_post() {
  const { data, error } = await apiClient.POST(`/v2/dialer/calls/initiate`);
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function hold_call_v2_dialer_calls__call_sid__hold_post(
  call_sid: string,
) {
  const { data, error } = await apiClient.POST(
    `/v2/dialer/calls/${call_sid}/hold`,
  );
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function resume_call_v2_dialer_calls__call_sid__resume_post(
  call_sid: string,
) {
  const { data, error } = await apiClient.POST(
    `/v2/dialer/calls/${call_sid}/resume`,
  );
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function transfer_call_v2_dialer_calls__call_sid__transfer_post(
  call_sid: string,
) {
  const { data, error } = await apiClient.POST(
    `/v2/dialer/calls/${call_sid}/transfer`,
  );
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function end_call_v2_dialer_calls__call_sid__end_post(
  call_sid: string,
) {
  const { data, error } = await apiClient.POST(
    `/v2/dialer/calls/${call_sid}/end`,
  );
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function set_disposition_v2_dialer_calls__call_sid__disposition_post(
  call_sid: string,
) {
  const { data, error } = await apiClient.POST(
    `/v2/dialer/calls/${call_sid}/disposition`,
  );
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function active_calls_v2_dialer_calls_active_get() {
  const { data, error } = await apiClient.GET(`/v2/dialer/calls/active`);
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function list_call_logs_v2_dialer_call_logs_get() {
  const { data, error } = await apiClient.GET(`/v2/dialer/call-logs`);
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function get_call_log_v2_dialer_call_logs__call_log_id__get(
  call_log_id: string,
) {
  const { data, error } = await apiClient.GET(
    `/v2/dialer/call-logs/${call_log_id}`,
  );
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function get_recording_v2_dialer_call_logs__call_log_id__recording_get(
  call_log_id: string,
) {
  const { data, error } = await apiClient.GET(
    `/v2/dialer/call-logs/${call_log_id}/recording`,
  );
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function list_call_lists_v2_dialer_call_lists_get() {
  const { data, error } = await apiClient.GET(`/v2/dialer/call-lists`);
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function create_call_list_v2_dialer_call_lists_post(
  body: CallListCreateSchemaType,
) {
  const { data, error } = await apiClient.POST(`/v2/dialer/call-lists`, {
    body,
  });
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function get_call_list_v2_dialer_call_lists__call_list_id__get(
  call_list_id: string,
) {
  const { data, error } = await apiClient.GET(
    `/v2/dialer/call-lists/${call_list_id}`,
  );
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function update_call_list_v2_dialer_call_lists__call_list_id__put(
  call_list_id: string,
  body: CallListUpdateSchemaType,
) {
  const { data, error } = await apiClient.PUT(
    `/v2/dialer/call-lists/${call_list_id}`,
    { body },
  );
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function delete_call_list_v2_dialer_call_lists__call_list_id__delete(
  call_list_id: string,
) {
  const { data, error } = await apiClient.DELETE(
    `/v2/dialer/call-lists/${call_list_id}`,
  );
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function add_contacts_v2_dialer_call_lists__call_list_id__contacts_post(
  call_list_id: string,
  body: CallListContactAddSchemaType,
) {
  const { data, error } = await apiClient.POST(
    `/v2/dialer/call-lists/${call_list_id}/contacts`,
    { body },
  );
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function remove_contact_v2_dialer_call_lists__call_list_id__contacts__contact_id__delete(
  call_list_id: string,
  contact_id: string,
) {
  const { data, error } = await apiClient.DELETE(
    `/v2/dialer/call-lists/${call_list_id}/contacts/${contact_id}`,
  );
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function list_callbacks_v2_dialer_callbacks_get() {
  const { data, error } = await apiClient.GET(`/v2/dialer/callbacks`);
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function create_callback_v2_dialer_callbacks_post(
  body: CallbackCreateSchemaType,
) {
  const { data, error } = await apiClient.POST(`/v2/dialer/callbacks`, {
    body,
  });
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function update_callback_v2_dialer_callbacks__callback_id__put(
  callback_id: string,
  body: CallbackUpdateSchemaType,
) {
  const { data, error } = await apiClient.PUT(
    `/v2/dialer/callbacks/${callback_id}`,
    { body },
  );
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function delete_callback_v2_dialer_callbacks__callback_id__delete(
  callback_id: string,
) {
  const { data, error } = await apiClient.DELETE(
    `/v2/dialer/callbacks/${callback_id}`,
  );
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function complete_callback_v2_dialer_callbacks__callback_id__complete_post(
  callback_id: string,
) {
  const { data, error } = await apiClient.POST(
    `/v2/dialer/callbacks/${callback_id}/complete`,
  );
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function today_callbacks_v2_dialer_callbacks_today_get() {
  const { data, error } = await apiClient.GET(`/v2/dialer/callbacks/today`);
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function list_dispositions_v2_dialer_dispositions_get() {
  const { data, error } = await apiClient.GET(`/v2/dialer/dispositions`);
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function create_disposition_v2_dialer_dispositions_post(
  body: DispositionCreateSchemaType,
) {
  const { data, error } = await apiClient.POST(`/v2/dialer/dispositions`, {
    body,
  });
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function update_disposition_v2_dialer_dispositions__disposition_id__put(
  disposition_id: string,
  body: DispositionUpdateSchemaType,
) {
  const { data, error } = await apiClient.PUT(
    `/v2/dialer/dispositions/${disposition_id}`,
    { body },
  );
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function delete_disposition_v2_dialer_dispositions__disposition_id__delete(
  disposition_id: string,
) {
  const { data, error } = await apiClient.DELETE(
    `/v2/dialer/dispositions/${disposition_id}`,
  );
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function list_dnc_v2_dialer_dnc_get() {
  const { data, error } = await apiClient.GET(`/v2/dialer/dnc`);
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function add_dnc_v2_dialer_dnc_post(body: DncCreateSchemaType) {
  const { data, error } = await apiClient.POST(`/v2/dialer/dnc`, { body });
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function bulk_add_dnc_v2_dialer_dnc_bulk_post(
  body: DncBulkCreateSchemaType,
) {
  const { data, error } = await apiClient.POST(`/v2/dialer/dnc/bulk`, { body });
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function delete_dnc_v2_dialer_dnc__dnc_id__delete(dnc_id: string) {
  const { data, error } = await apiClient.DELETE(`/v2/dialer/dnc/${dnc_id}`);
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function check_dnc_v2_dialer_dnc_check__phone_number__get(
  phone_number: string,
) {
  const { data, error } = await apiClient.GET(
    `/v2/dialer/dnc/check/${phone_number}`,
  );
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function list_scripts_v2_dialer_scripts_get() {
  const { data, error } = await apiClient.GET(`/v2/dialer/scripts`);
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function create_script_v2_dialer_scripts_post(
  body: ScriptCreateSchemaType,
) {
  const { data, error } = await apiClient.POST(`/v2/dialer/scripts`, { body });
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function get_script_v2_dialer_scripts__script_id__get(
  script_id: string,
) {
  const { data, error } = await apiClient.GET(
    `/v2/dialer/scripts/${script_id}`,
  );
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function update_script_v2_dialer_scripts__script_id__put(
  script_id: string,
  body: ScriptUpdateSchemaType,
) {
  const { data, error } = await apiClient.PUT(
    `/v2/dialer/scripts/${script_id}`,
    { body },
  );
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function delete_script_v2_dialer_scripts__script_id__delete(
  script_id: string,
) {
  const { data, error } = await apiClient.DELETE(
    `/v2/dialer/scripts/${script_id}`,
  );
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function dashboard_overview_v2_dialer_dashboard_overview_get() {
  const { data, error } = await apiClient.GET(`/v2/dialer/dashboard/overview`);
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function agents_performance_v2_dialer_dashboard_agents_performance_get() {
  const { data, error } = await apiClient.GET(
    `/v2/dialer/dashboard/agents/performance`,
  );
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function hourly_stats_v2_dialer_dashboard_hourly_stats_get() {
  const { data, error } = await apiClient.GET(
    `/v2/dialer/dashboard/hourly-stats`,
  );
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function get_auth_url_v2_dialer_google_auth_url__integration_type__get(
  integration_type: string,
) {
  const { data, error } = await apiClient.GET(
    `/v2/dialer/google/auth-url/${integration_type}`,
  );
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function oauth_callback_v2_dialer_google_callback_post(
  body: GoogleCallbackSchemaType,
) {
  const { data, error } = await apiClient.POST(`/v2/dialer/google/callback`, {
    body,
  });
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function integration_status_v2_dialer_google_status_get() {
  const { data, error } = await apiClient.GET(`/v2/dialer/google/status`);
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function manual_sync_v2_dialer_google_sync__integration_type__post(
  integration_type: string,
) {
  const { data, error } = await apiClient.POST(
    `/v2/dialer/google/sync/${integration_type}`,
  );
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function disconnect_v2_dialer_google__integration_id__delete(
  integration_id: string,
) {
  const { data, error } = await apiClient.DELETE(
    `/v2/dialer/google/${integration_id}`,
  );
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function get_twilio_config_v2_dialer_settings_twilio_get() {
  const { data, error } = await apiClient.GET(`/v2/dialer/settings/twilio`);
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function update_twilio_config_v2_dialer_settings_twilio_put(
  body: TwilioConfigSchemaType,
) {
  const { data, error } = await apiClient.PUT(`/v2/dialer/settings/twilio`, {
    body,
  });
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function test_twilio_v2_dialer_settings_twilio_test_post() {
  const { data, error } = await apiClient.POST(
    `/v2/dialer/settings/twilio/test`,
  );
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function voice_webhook_v2_dialer_webhooks_twilio_voice_post() {
  const { data, error } = await apiClient.POST(
    `/v2/dialer/webhooks/twilio/voice`,
  );
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function status_webhook_v2_dialer_webhooks_twilio_status_post() {
  const { data, error } = await apiClient.POST(
    `/v2/dialer/webhooks/twilio/status`,
  );
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function recording_webhook_v2_dialer_webhooks_twilio_recording_post() {
  const { data, error } = await apiClient.POST(
    `/v2/dialer/webhooks/twilio/recording`,
  );
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function fallback_webhook_v2_dialer_webhooks_twilio_fallback_post() {
  const { data, error } = await apiClient.POST(
    `/v2/dialer/webhooks/twilio/fallback`,
  );
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function redoc_html_redoc_get() {
  const { data, error } = await apiClient.GET(`/redoc`);
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function health_check_health_get() {
  const { data, error } = await apiClient.GET(`/health`);
  if (error) throw error;
  return data as any; // refine typing in consumer
}

export async function show_settings_settings_get() {
  const { data, error } = await apiClient.GET(`/settings`);
  if (error) throw error;
  return data as any; // refine typing in consumer
}
export const basedTemplateService = {
  list_contacts_v2_dialer_contacts_get,
  create_contact_v2_dialer_contacts_post,
  get_contact_v2_dialer_contacts__contact_id__get,
  update_contact_v2_dialer_contacts__contact_id__put,
  delete_contact_v2_dialer_contacts__contact_id__delete,
  import_csv_v2_dialer_contacts_import_csv_post,
  search_contacts_v2_dialer_contacts_search_post,
  list_campaigns_v2_dialer_campaigns_get,
  create_campaign_v2_dialer_campaigns_post,
  get_campaign_v2_dialer_campaigns__campaign_id__get,
  update_campaign_v2_dialer_campaigns__campaign_id__put,
  delete_campaign_v2_dialer_campaigns__campaign_id__delete,
  start_campaign_v2_dialer_campaigns__campaign_id__start_post,
  pause_campaign_v2_dialer_campaigns__campaign_id__pause_post,
  stop_campaign_v2_dialer_campaigns__campaign_id__stop_post,
  campaign_stats_v2_dialer_campaigns__campaign_id__stats_get,
  add_contacts_to_campaign_v2_dialer_campaigns__campaign_id__contacts_post,
  list_campaign_contacts_v2_dialer_campaigns__campaign_id__contacts_get,
  remove_contact_from_campaign_v2_dialer_campaigns__campaign_id__contacts__contact_id__delete,
  assign_agents_v2_dialer_campaigns__campaign_id__agents_post,
  unassign_agent_v2_dialer_campaigns__campaign_id__agents__agent_id__delete,
  list_agents_v2_dialer_agents_get,
  create_agent_v2_dialer_agents_post,
  status_board_v2_dialer_agents_status_board_get,
  available_agents_v2_dialer_agents_available_get,
  get_agent_v2_dialer_agents__agent_id__get,
  update_agent_v2_dialer_agents__agent_id__put,
  update_agent_status_v2_dialer_agents__agent_id__status_put,
  initiate_call_v2_dialer_calls_initiate_post,
  hold_call_v2_dialer_calls__call_sid__hold_post,
  resume_call_v2_dialer_calls__call_sid__resume_post,
  transfer_call_v2_dialer_calls__call_sid__transfer_post,
  end_call_v2_dialer_calls__call_sid__end_post,
  set_disposition_v2_dialer_calls__call_sid__disposition_post,
  active_calls_v2_dialer_calls_active_get,
  list_call_logs_v2_dialer_call_logs_get,
  get_call_log_v2_dialer_call_logs__call_log_id__get,
  get_recording_v2_dialer_call_logs__call_log_id__recording_get,
  list_call_lists_v2_dialer_call_lists_get,
  create_call_list_v2_dialer_call_lists_post,
  get_call_list_v2_dialer_call_lists__call_list_id__get,
  update_call_list_v2_dialer_call_lists__call_list_id__put,
  delete_call_list_v2_dialer_call_lists__call_list_id__delete,
  add_contacts_v2_dialer_call_lists__call_list_id__contacts_post,
  remove_contact_v2_dialer_call_lists__call_list_id__contacts__contact_id__delete,
  list_callbacks_v2_dialer_callbacks_get,
  create_callback_v2_dialer_callbacks_post,
  update_callback_v2_dialer_callbacks__callback_id__put,
  delete_callback_v2_dialer_callbacks__callback_id__delete,
  complete_callback_v2_dialer_callbacks__callback_id__complete_post,
  today_callbacks_v2_dialer_callbacks_today_get,
  list_dispositions_v2_dialer_dispositions_get,
  create_disposition_v2_dialer_dispositions_post,
  update_disposition_v2_dialer_dispositions__disposition_id__put,
  delete_disposition_v2_dialer_dispositions__disposition_id__delete,
  list_dnc_v2_dialer_dnc_get,
  add_dnc_v2_dialer_dnc_post,
  bulk_add_dnc_v2_dialer_dnc_bulk_post,
  delete_dnc_v2_dialer_dnc__dnc_id__delete,
  check_dnc_v2_dialer_dnc_check__phone_number__get,
  list_scripts_v2_dialer_scripts_get,
  create_script_v2_dialer_scripts_post,
  get_script_v2_dialer_scripts__script_id__get,
  update_script_v2_dialer_scripts__script_id__put,
  delete_script_v2_dialer_scripts__script_id__delete,
  dashboard_overview_v2_dialer_dashboard_overview_get,
  agents_performance_v2_dialer_dashboard_agents_performance_get,
  hourly_stats_v2_dialer_dashboard_hourly_stats_get,
  get_auth_url_v2_dialer_google_auth_url__integration_type__get,
  oauth_callback_v2_dialer_google_callback_post,
  integration_status_v2_dialer_google_status_get,
  manual_sync_v2_dialer_google_sync__integration_type__post,
  disconnect_v2_dialer_google__integration_id__delete,
  get_twilio_config_v2_dialer_settings_twilio_get,
  update_twilio_config_v2_dialer_settings_twilio_put,
  test_twilio_v2_dialer_settings_twilio_test_post,
  voice_webhook_v2_dialer_webhooks_twilio_voice_post,
  status_webhook_v2_dialer_webhooks_twilio_status_post,
  recording_webhook_v2_dialer_webhooks_twilio_recording_post,
  fallback_webhook_v2_dialer_webhooks_twilio_fallback_post,
  redoc_html_redoc_get,
  health_check_health_get,
  show_settings_settings_get,
};
export default basedTemplateService;
