from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.db import IntegrityError


def _first_validation_message(data: dict):
    """Flatten DRF validation errors into a single human-readable string."""
    parts = []
    for key, val in data.items():
        if key in ("detail", "error"):
            continue
        if isinstance(val, list) and val:
            first_msg = str(val[0])
            # If the message already looks like a complete sentence, avoid ugly 'field:' prefix
            if key in ("non_field_errors", "error") or first_msg.endswith((".", "!")):
                parts.append(first_msg)
            else:
                parts.append(f"{key}: {first_msg}")
        elif isinstance(val, dict):
            for k2, v2 in val.items():
                if isinstance(v2, list) and v2:
                    parts.append(f"{k2}: {v2[0]}")
        elif isinstance(val, str):
            parts.append(val)
    return "; ".join(parts) if parts else None


def custom_exception_handler(exc, context):
    if isinstance(exc, IntegrityError):
        msg = "A record with this information already exists."
        exc_str = str(exc).lower()
        if "unique constraint" in exc_str or "duplicate key" in exc_str:
            msg = "A record with this information already exists."
        elif "foreign key" in exc_str:
            msg = "Referenced record was not found or is in use."
        return Response(
            {"error": msg, "detail": msg},
            status=status.HTTP_400_BAD_REQUEST,
        )

    response = exception_handler(exc, context)
    if response is not None and isinstance(response.data, dict):
        if "detail" in response.data and len(response.data) == 1:
            detail_val = response.data["detail"]
            response.data = {"error": detail_val, "detail": detail_val}
        elif "non_field_errors" in response.data:
            errs = response.data["non_field_errors"]
            msg = str(errs[0]) if errs else "Validation error."
            response.data = {"error": msg, "detail": msg}
        else:
            msg = _first_validation_message(response.data)
            if msg:
                response.data = {"error": msg, "detail": msg, **response.data}
    return response
