"""Context-aware IAM severity classification for ThreatLens."""

from collections.abc import Mapping


def classify_scenario(scenario):
    """
    Evaluate a privacy-safe IAM scenario using
    multiple security indicators.

    Returns a severity, matched rule, and explanation.

    All indicators must come from validated internal
    context, not untrusted raw event fields.
    """

    if not isinstance(scenario, Mapping):
        raise TypeError("Scenario must be a mapping")

    indicators = scenario.get("indicators", {})

    if not isinstance(indicators, Mapping):
        indicators = {}

    privilege = scenario.get("account_privilege", "unknown")

    if privilege not in ("privileged", "standard"):
        privilege = "unknown"

    failed_count = indicators.get("failed_attempts_5m")

    if type(failed_count) is not int or not 0 <= failed_count <= 10000:
        failed_count = None

    success_after_failures = (
        indicators.get("successful_login_after_failures") is True
    )

    unfamiliar_source = (
        indicators.get("unfamiliar_source") is True
    )

    sensitive_action = (
        indicators.get("sensitive_action_after_login") is True
    )

    unusual_time = (
        indicators.get("unusual_login_time") is True
    )

    severity = "Unknown"
    rule_id = "INSUFFICIENT_CONTEXT"
    reason = (
        "Insufficient verified security context to "
        "assign a scenario-based severity."
    )

    # Critical: Multiple correlated indicators
    # involving a privileged account.
    if (
        privilege == "privileged"
        and success_after_failures
        and sensitive_action
    ):
        severity = "Critical"
        rule_id = "PRIVILEGED_COMPROMISE_INDICATORS"
        reason = (
            "A privileged account had a successful login "
            "following authentication failures and "
            "subsequent sensitive activity."
        )

    # High: Strong suspicious indicators.
    elif (
        success_after_failures and sensitive_action
    ) or (
        privilege == "privileged"
        and failed_count is not None
        and failed_count >= 10
    ) or (
        privilege == "privileged"
        and success_after_failures
        and unfamiliar_source
    ):
        severity = "High"
        rule_id = "HIGH_RISK_AUTHENTICATION_PATTERN"
        reason = (
            "Multiple suspicious authentication indicators "
            "or repeated attempts against a privileged "
            "account require priority investigation."
        )

    # Medium: Notable suspicious patterns.
    elif (
        failed_count is not None and failed_count >= 10
    ) or (
        privilege == "privileged"
        and failed_count is not None
        and failed_count >= 5
    ) or success_after_failures or (
        privilege == "privileged" and sensitive_action
    ):
        severity = "Medium"
        rule_id = "SUSPICIOUS_AUTHENTICATION_PATTERN"
        reason = (
            "Repeated authentication failures or "
            "suspicious account activity warrant review."
        )

    # Low: Minor anomalies.
    elif (
        failed_count is not None and failed_count >= 3
    ) or (
        unfamiliar_source and unusual_time
    ):
        severity = "Low"
        rule_id = "MINOR_AUTHENTICATION_ANOMALY"
        reason = (
            "Unusual authentication activity was observed, "
            "but stronger indicators are not established."
        )

    return {
        "severity": severity,
        "rule_id": rule_id,
        "reason": reason,
    }
