import os
import torch
from PIL import Image
from torchvision import transforms, models
import torch.nn as nn


# ============================================================
# CONFIG
# ============================================================

MODEL_PATH = "models/revalue_efficientnet_b0_v2_best.pth"
DATASET_DIR = "dataset/garbage_classification"

CATEGORIES = [
    "trash",
    "battery",
    "clothes",
    "shoes"
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
print("ReValue AI V2 - OTHER CATEGORY TEST")
print("=" * 60)

print(f"Device : {DEVICE}")

if torch.cuda.is_available():
    print(f"GPU    : {torch.cuda.get_device_name(0)}")

classes = [
    "Glass",
    "Metal",
    "Organic",
    "Other",
    "Paper_Cardboard",
    "Plastic"
]

model = models.efficientnet_b0(weights=None)

model.classifier[1] = nn.Linear(
    model.classifier[1].in_features,
    len(classes)
)

checkpoint = torch.load(
    MODEL_PATH,
    map_location=DEVICE
)

if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
    model.load_state_dict(checkpoint["model_state_dict"])
else:
    model.load_state_dict(checkpoint)

model = model.to(DEVICE)
model.eval()

print("Model loaded.")
print("=" * 60)


# ============================================================
# TEST
# ============================================================

for category in CATEGORIES:

    folder = os.path.join(
        DATASET_DIR,
        category
    )

    files = [
        f for f in os.listdir(folder)
        if f.lower().endswith(
            (".jpg", ".jpeg", ".png", ".webp")
        )
    ]

    correct = 0
    total = 0

    print(f"\n[{category.upper()}]")
    print(f"Images : {len(files)}")

    with torch.no_grad():

        for filename in files:

            path = os.path.join(
                folder,
                filename
            )

            try:

                image = Image.open(path).convert("RGB")

                image = transform(image)
                image = image.unsqueeze(0)
                image = image.to(DEVICE)

                output = model(image)

                probabilities = torch.softmax(
                    output,
                    dim=1
                )

                confidence, prediction = torch.max(
                    probabilities,
                    dim=1
                )

                predicted_class = classes[
                    prediction.item()
                ]

                if predicted_class == "Other":
                    correct += 1

                total += 1

            except Exception as e:

                print(
                    f"Error: {filename} -> {e}"
                )

    accuracy = (
        correct / total * 100
        if total > 0
        else 0
    )

    print(
        f"Predicted Other : "
        f"{correct}/{total}"
    )

    print(
        f"Other Rate      : "
        f"{accuracy:.2f}%"
    )


print("\n" + "=" * 60)
print("TEST SELESAI")
print("=" * 60)