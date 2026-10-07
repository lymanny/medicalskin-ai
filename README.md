# 🩺 MedicalSkin AI

AI-powered cosmetic skin analysis web app using the YouCam API for skin scores, skin type, age estimation, visualization, and personalized skincare guidance.

## 🌐 Live Demo

[Open MedicalSkin AI](https://medicalskin-ai.onrender.com/)

## 🎬 Demo Video

[Watch on YouTube](https://www.youtube.com/watch?v=ZpxTAVBszsQ)

## 🎞️ Website Preview

<img width="960" height="459" alt="MedicalSkin AI Demo" src="https://github.com/user-attachments/assets/c12021f6-5a48-4bb6-a610-04ce1695f982" />

## ✨ Features

- 📸 Upload a front-facing facial photo
- 🤖 Analyze skin using the YouCam AI Skin Analysis API
- 📊 View cosmetic skin concern scores
- 🧴 View skin type and estimated skin age
- 🖼️ Explore AI-generated skin visualization results
- 💡 Get simple daily skincare guidance
- 🧪 Try Demo without using YouCam API credits
- 📱 Responsive design for desktop and mobile
- 🛡️ Image validation and error handling
- 📥 Request, response, and error logging for development

## 🧠 How It Works

```text
User uploads a facial photo
        ↓
MedicalSkin AI Flask backend
        ↓
YouCam AI Skin Analysis API
        ↓
AI skin analysis results
        ↓
Scores + Skin Type + Skin Age
        ↓
Visualization + Daily Care Guidance
```

## 🧪 Demo Mode

MedicalSkin AI includes a **Try Demo** mode.

Demo mode uses local sample data so users can explore the interface without making a real YouCam API request or consuming API credits.

Real skin analysis is performed only when a user uploads a photo and selects **Analyze My Skin**.

## 🤖 YouCam API Integration

The project integrates the **YouCam AI Skin Analysis API** from Perfect Corp.

The live analysis flow sends the uploaded image from the Flask backend to the YouCam API and processes the returned cosmetic skin assessment results.

The application can display information such as:

- Acne
- Dark Circles
- Eye Bags
- Firmness
- Moisture
- Oiliness
- Pores
- Radiance
- Redness
- Age Spots
- Texture
- Wrinkles
- Skin Type
- Estimated Skin Age

## 🛠️ Technologies Used

- Python
- Flask
- HTML
- CSS
- JavaScript
- Pillow
- Requests
- python-dotenv
- Gunicorn
- YouCam AI Skin Analysis API

## 🔑 Environment Setup

Create a `.env` file in the project root:

```env
YOUCAM_API_KEY=your_api_key_here
YOUCAM_API_BASE=https://yce-api-01.makeupar.com
```

## 📦 Install Dependencies

```bash
pip install -r requirements.txt
```

## ▶️ Run Locally

```bash
python app.py
```

Then open:

```text
http://127.0.0.1:5000
```

## ⚠️ Disclaimer

MedicalSkin AI provides **cosmetic skin assessment and general skincare guidance only**.

It is not intended for medical diagnosis or treatment.

## 📚 References

- [Perfect Corp. — YouCam API Documentation](https://docs.perfectcorp.com/develop/introduction)
- [Perfect Corp. — YouCam API Quick Start Guide](https://docs.perfectcorp.com/develop/quick_start_guide)
- [Perfect Corp. — AI Skin Analysis API V2.1](https://docs.perfectcorp.com/reference/ai_skin_analysis/v2.1)

## 👤 Author

**Ly Manny** · [GitHub](https://github.com/lymanny) · [Portfolio](https://lymanny.onrender.com/)
