"""Run with: python app.py"""

import os
import random
from io import BytesIO
from pathlib import Path

from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
from PIL import Image, UnidentifiedImageError

from skin_api import analyze, normalize, SkinAPIError
from request_logger import log_request, log_response, log_error, logger

# ======================================
# 1. LOAD API KEY
# ======================================L

BASE_DIR = Path(__file__).resolve().parent

load_dotenv(
    dotenv_path=BASE_DIR / ".env",
    override=True,
)

key = os.getenv("YOUCAM_API_KEY", "").strip()

logger.info("API key loaded: %s", bool(key))
logger.info("API key length: %s", len(key))
# Never print the actual API key.


# ======================================
# 2. CREATE FLASK APPLICATION
# ======================================

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 8 * 1024 * 1024

# ======================================
# 3. DEMO DATA
# ======================================

DEMO = {
    "overall": 83.6,
    "skin_age": 20,
    "skin_type": "Oily",
    "scores": [
        {"type": "acne", "score": 88},
        {"type": "dark_circle_v2", "score": 79},
        {"type": "eye_bag", "score": 75},
        {"type": "firmness", "score": 93},
        {"type": "moisture", "score": 75},
        {"type": "oiliness", "score": 69},
        {"type": "pore", "score": 63},
        {"type": "radiance", "score": 95},
        {"type": "redness", "score": 91},
        {"type": "age_spot", "score": 98},
        {"type": "texture", "score": 88},
        {"type": "wrinkle", "score": 91},
    ],
    "masks": [],
}


def json_result(data, status=200):
    """Log and return a JSON response in one place."""
    log_response(data, status)
    return jsonify(data), status


# ======================================
# 4. WEBSITE HOME PAGE
# ======================================

@app.get("/")
def index():
    return render_template("index.html")


# ======================================
# 5. ANALYZE SKIN
# ======================================

@app.post("/api/analyze")
def analyze_route():
    log_request()

    # Demo mode
    if request.form.get("demo") == "1":
        demo_data = DEMO.copy()
        demo_data["skin_age"] = random.randint(20, 28)

        print("Random demo age:", demo_data["skin_age"])

        response_data = {
            "demo": True,
            **demo_data,
        }

        return json_result(response_data, 200)

    # Check uploaded image
    uploaded = request.files.get("image")

    if not uploaded:
        response_data = {
            "error": "Please upload a JPEG or PNG image.",
            "error_type": "missing_image",
        }
        log_error(response_data["error"], response_data["error_type"], 400)
        return json_result(response_data, 400)

    body = uploaded.read()

    # Validate file size
    if not body or len(body) > 8 * 1024 * 1024:
        response_data = {
            "error": "Image must be between 1 byte and 8 MB.",
            "error_type": "invalid_file_size",
        }
        log_error(response_data["error"], response_data["error_type"], 400)
        return json_result(response_data, 400)

    # ======================================
    # 6. VALIDATE IMAGE
    # ======================================

    try:
        with Image.open(BytesIO(body)) as im:
            if im.format not in ("JPEG", "PNG"):
                response_data = {
                    "error": "Only JPEG and PNG files are supported.",
                    "error_type": "invalid_image_format",
                }
                log_error(response_data["error"], response_data["error_type"], 400)
                return json_result(response_data, 400)

            width, height = im.size

            if min(width, height) < 480:
                response_data = {
                    "error": (
                        "Image resolution is too low. "
                        "The shortest side must be at least 480 pixels."
                    ),
                    "error_type": "invalid_resolution",
                }
                log_error(response_data["error"], response_data["error_type"], 400)
                return json_result(response_data, 400)

            if max(width, height) > 2560:
                response_data = {
                    "error": (
                        "Image resolution is too high. "
                        "The longest side must not exceed 2560 pixels."
                    ),
                    "error_type": "invalid_resolution",
                }
                log_error(response_data["error"], response_data["error_type"], 400)
                return json_result(response_data, 400)

            image_format = im.format
            im.verify()

            mime = (
                "image/jpeg"
                if image_format == "JPEG"
                else "image/png"
            )

    except (UnidentifiedImageError, OSError) as exc:
        response_data = {
            "error": "This is not a valid image.",
            "error_type": "invalid_image",
        }
        log_error(exc, response_data["error_type"], 400)
        return json_result(response_data, 400)

    # ======================================
    # 7. CHECK API KEY
    # ======================================

    key = os.getenv("YOUCAM_API_KEY", "").strip()

    if not key:
        response_data = {
            "error": (
                "YouCam API key is missing. "
                "Please add your key to the .env file."
            ),
            "error_type": "missing_api_key",
        }
        log_error(response_data["error"], response_data["error_type"], 500)
        return json_result(response_data, 500)

    # ======================================
    # 8. CALL REAL YOUCAM API
    # ======================================

    try:
        logger.info(
            "YOUCAM REQUEST | image_size=%s bytes | image_format=%s",
            len(body),
            mime,
        )

        response = analyze(body, mime)
        result = normalize(response)

        response_data = {
            "demo": False,
            **result,
        }

        return json_result(response_data, 200)

    # ======================================
    # 9. HANDLE API ERRORS
    # ======================================

    except SkinAPIError as exc:
        log_error(exc, "youcam_api_error", 502)

        response_data = {
            "error": str(exc),
            "error_type": "youcam_api_error",
        }
        return json_result(response_data, 502)

    # ======================================
    # 10. HANDLE RESPONSE ERRORS
    # ======================================

    except (KeyError, IndexError, ValueError) as exc:
        log_error(exc, "response_error", 502)

        response_data = {
            "error": "Unable to process the YouCam API response.",
            "error_type": "response_error",
        }
        return json_result(response_data, 502)

    # ======================================
    # 11. HANDLE UNEXPECTED ERRORS
    # ======================================

    except Exception as exc:
        log_error(exc, "server_error", 502)
        app.logger.exception("YouCam analysis failed")

        response_data = {
            "error": (
                "Unexpected server error. "
                "Please check your PyCharm Run console."
            ),
            "error_type": "server_error",
        }
        return json_result(response_data, 502)


# ======================================
# 12. HANDLE LARGE FILES
# ======================================

@app.errorhandler(413)
def too_large(_):
    response_data = {
        "error": "Maximum image file size is 8 MB.",
        "error_type": "file_too_large",
    }

    log_error(response_data["error"], response_data["error_type"], 413)
    return json_result(response_data, 413)


# ======================================
# 13. RUN WEBSITE
# ======================================

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=False,
    )
