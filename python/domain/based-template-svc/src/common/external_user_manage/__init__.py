from .manager import (
    ExternalSessionResolution,
    build_external_history_lookup_candidates,
    compose_web_scoped_session_id,
    derive_legacy_external_user_id_from_session,
    extract_external_user_id_from_web_scoped_session,
    get_or_create_guest_external_user,
    get_or_create_line_external_user,
    resolve_web_external_user_and_session,
    validate_external_session_id,
)

__all__ = [
    "ExternalSessionResolution",
    "build_external_history_lookup_candidates",
    "compose_web_scoped_session_id",
    "derive_legacy_external_user_id_from_session",
    "extract_external_user_id_from_web_scoped_session",
    "get_or_create_guest_external_user",
    "get_or_create_line_external_user",
    "resolve_web_external_user_and_session",
    "validate_external_session_id",
]
