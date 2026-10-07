import json
import logging

from flask import request


# ======================================
# LOGGER SETUP
# ======================================

logger = logging.getLogger("medicalskin")
logger.setLevel(logging.INFO)

if not logger.handlers:
    handler = logging.StreamHandler()

    formatter = logging.Formatter(
        "%(asctime)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    handler.setFormatter(formatter)
    logger.addHandler(handler)


# ======================================
# 📥 REQUEST
# Browser → Flask
# ======================================

def log_request():

    data = {
        "method": request.method,
        "path": request.path,
        "form_data": request.form.to_dict(),
        "files": list(request.files.keys())
    }

    logger.info(
        "\n"
        "========================================\n"
        "📥 REQUEST | Browser → Flask\n"
        "========================================\n"
        "%s\n"
        "========================================",
        json.dumps(
            data,
            indent=2
        )
    )


# ======================================
# 📤 RESPONSE
# Flask → Browser
# ======================================

def log_response(data, status=200):

    safe_data = dict(data)

    # Hide long temporary mask URLs
    if "masks" in safe_data:
        safe_data["masks"] = [
            {
                "type": item.get("type"),
                "url": "🔒 hidden"
            }
            for item in safe_data["masks"]
        ]

    logger.info(
        "\n"
        "========================================\n"
        "📤 RESPONSE | Flask → Browser\n"
        "✅ Status: %s\n"
        "========================================\n"
        "%s\n"
        "========================================",
        status,
        json.dumps(
            safe_data,
            indent=2,
            default=str
        )
    )


# ======================================
# ❌ ERROR
# ======================================

def log_error(error, error_type="unknown", status=500):

    data = {
        "error_type": error_type,
        "message": str(error)
    }

    logger.error(
        "\n"
        "========================================\n"
        "❌ ERROR\n"
        "🔴 Status: %s\n"
        "========================================\n"
        "%s\n"
        "========================================",
        status,
        json.dumps(
            data,
            indent=2
        )
    )