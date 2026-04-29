from rest_framework.views import exception_handler


def _first_validation_message(data: dict):
    """Flatten DRF validation errors into a single human-readable string."""
    parts = []
    for key, val in data.items():
        if key in ("detail",):
            continue
        if isinstance(val, list) and val:
            parts.append(f"{key}: {val[0]}")
        elif isinstance(val, dict):
            for k2, v2 in val.items():
                if isinstance(v2, list) and v2:
                    parts.append(f"{key}.{k2}: {v2[0]}")
    return "; ".join(parts) if parts else None


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None and isinstance(response.data, dict):
        if "detail" in response.data and len(response.data) == 1:
            response.data = {"error": response.data["detail"]}
        elif "non_field_errors" in response.data:
            errs = response.data["non_field_errors"]
            response.data = {"error": errs[0] if errs else "Validation error."}
        else:
            msg = _first_validation_message(response.data)
            if msg:
                response.data = {"error": msg, **response.data}
    return response
