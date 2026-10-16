from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware


import io
import torch
import torch.nn as nn

from PIL import Image
from torchvision import transforms, models


# ============================================================
# APP
# ============================================================

app = FastAPI(
    title="ReValue AI API",
    description="Waste material classification API for ReValue",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# CONFIG
# ============================================================

MODEL_PATH = "models/revalue_efficientnet_b0_v2_best.pth"

CLASSES = [
    "Glass",
    "Metal",
    "Organic",
    "Other",
    "Paper_Cardboard",
    "Plastic"
]

IMAGE_SIZE = 224

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)


# ============================================================
# TRANSFORM
# ============================================================

transform = transforms.Compose([
    transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])


# ============================================================
# LOAD MODEL
# ============================================================

print("=" * 60)
print("Loading ReValue AI V2 model...")
print("=" * 60)

model = models.efficientnet_b0(weights=None)

model.classifier[1] = nn.Linear(
    model.classifier[1].in_features,
    len(CLASSES)
)

checkpoint = torch.load(
    MODEL_PATH,
    map_location=DEVICE
)

# V2 menggunakan checkpoint dictionary
if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
    model.load_state_dict(
        checkpoint["model_state_dict"]
    )
else:
    # fallback kalau checkpoint berupa state_dict langsung
    model.load_state_dict(checkpoint)

model = model.to(DEVICE)
model.eval()

print(f"Model  : {MODEL_PATH}")
print(f"Device : {DEVICE}")

if torch.cuda.is_available():
    print(f"GPU    : {torch.cuda.get_device_name(0)}")
    print(f"CUDA   : {torch.version.cuda}")

print("Model loaded successfully.")
print("=" * 60)


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():

    return {
        "success": True,
        "service": "ReValue AI",
        "version": "2.0.0",
        "model": "EfficientNet-B0",
        "classes": CLASSES,
        "device": str(DEVICE)
    }


# ============================================================
# PREDICT
# ============================================================

@app.post("/predict")
async def predict(
    file: UploadFile = File(...)
):

    try:

        # ----------------------------------------------------
        # Read image
        # ----------------------------------------------------

        contents = await file.read()

        image = Image.open(
            io.BytesIO(contents)
        ).convert("RGB")

        # ----------------------------------------------------
        # Transform
        # ----------------------------------------------------

        input_tensor = transform(image)
        input_tensor = input_tensor.unsqueeze(0)
        input_tensor = input_tensor.to(DEVICE)

        # ----------------------------------------------------
        # Prediction
        # ----------------------------------------------------

        with torch.no_grad():

            outputs = model(input_tensor)

            probabilities = torch.softmax(
                outputs,
                dim=1
            )

            confidence, predicted = torch.max(
                probabilities,
                dim=1
            )

        predicted_class = CLASSES[
            predicted.item()
        ]

        confidence_percent = (
            confidence.item() * 100
        )

        # ----------------------------------------------------
        # Top predictions
        # ----------------------------------------------------

        top_probs, top_indices = torch.topk(
            probabilities,
            k=len(CLASSES),
            dim=1
        )

        top_predictions = []

        for prob, index in zip(
            top_probs[0],
            top_indices[0]
        ):

            top_predictions.append({
                "class": CLASSES[index.item()],
                "confidence": round(
                    prob.item() * 100,
                    2
                )
            })

        # ----------------------------------------------------
        # Response
        # ----------------------------------------------------

        return {
            "success": True,
            "version": "2.0.0",
            "filename": file.filename,
            "prediction": predicted_class,
            "confidence": round(
                confidence_percent,
                2
            ),
            "top_predictions": top_predictions
        }

    except Exception as e:

        return {
            "success": False,
            "error": str(e)
        }