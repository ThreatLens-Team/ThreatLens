"""Privacy-limited IAM scenarios for external AI analysis."""

from collections.abc import Mapping

# Only recognized event names can leave ThreatLens.
ALLOWED_EVENT_TYPES = {
    "LOGIN_SUCCESS",
    "LOGIN_FAILURE",
    "LOGOUT",
    "ACCOUNT_CREATED",
    "ACCOUNT_DEACTIVATED",
    "ACCOUNT_REACTIVATED",
    "ACCOUNT_DELETED",
    "ACCOUNT_LOCKED",
    "PASSWORD_CHANGE",
    "PASSWORD_RESET",
    "UNAUTHORIZED_ACCESS",
    "ROLE_CHANGE",
    "PERMISSION_GRANTED",
    "PERMISSION_REVOKED",
    "MFA_SUCCESS",
    "MFA_FAILURE",
    "MFA_ENABLED",
    "MFA_DISABLED",
    "SESSION_CREATED",
    "SESSION_EXPIRED",
    "SESSION_REVOKED",
}

ALLOWED_OUTCOMES = {
    "SUCCESS",
    "FAILURE",
    "DENIED",
    "BLOCKED",
    "UNKNOWN",
}

# These values must eventually come from trusted
# ThreatLens/Splunk calculations, not raw user input.
BOOLEAN_INDICATORS = {
    "successful_login_after_failures",
    "unfamiliar_source",
    "sensitive_action_after_login",
    "unusual_login_time",
}


def allowed_enum(value, choices, fallback):
    if not isinstance(value, str):
        return fallback

    normalized = value.strip().upper()

    return normalized if normalized in choices else fallback


def build_privacy_safe_scenario(event, *, verified_context=None):
    """
    Convert an IAM event into a restricted AI payload.

    Does not forward usernames, emails, IP addresses,
    company names, timestamps, descriptions, or raw logs.

    verified_context must be computed by trusted internal
    logic. Never pass raw client-controlled fields directly.
    """
    if not isinstance(event, Mapping):
        raise TypeError("IAM event must be a mapping")

    context = verified_context or {}

    if not isinstance(context, Mapping):
        raise TypeError("Verified context must be a mapping")

    event_type = allowed_enum(
        event.get("event_type"),
        ALLOWED_EVENT_TYPES,
        "OTHER",
    )

    outcome = allowed_enum(
        event.get("status"),
        ALLOWED_OUTCOMES,
        "UNKNOWN",
    )

    privilege = context.get("account_privilege", "unknown")

    if privilege not in ("standard", "privileged"):
        privilege = "unknown"

    scenario = {
        "schema_version": 1,
        "event_type": event_type,
        "event_result": outcome,
        "account_privilege": privilege,
        "indicators": {},
    }

    for indicator in BOOLEAN_INDICATORS:
        value = context.get(indicator)

        if type(value) is bool:
            scenario["indicators"][indicator] = value

    count = context.get("failed_attempts_5m")

    if type(count) is int and 0 <= count <= 10000:
        scenario["indicators"]["failed_attempts_5m"] = count

    return scenario
