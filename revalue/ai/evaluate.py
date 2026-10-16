import torch
import torch.nn as nn
from pathlib import Path
from torchvision import models, datasets, transforms
from torch.utils.data import DataLoader
from sklearn.metrics import classification_report, confusion_matrix

# =========================
# CONFIG
# =========================

TEST_DIR = Path("dataset/revalue_split/test")
MODEL_PATH = Path("models/revalue_efficientnet_b0_best.pth")

CLASSES = [
    "Glass",
    "Metal",
    "Organic",
    "Other",
    "Paper_Cardboard",
    "Plastic",
]

IMAGE_SIZE = 224
BATCH_SIZE = 32

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# =========================
# TRANSFORM
# =========================

transform = transforms.Compose([
    transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    ),
])

# =========================
# DATASET
# =========================

dataset = datasets.ImageFolder(
    TEST_DIR,
    transform=transform
)

loader = DataLoader(
    dataset,
    batch_size=BATCH_SIZE,
    shuffle=False,
    num_workers=0
)

# =========================
# MODEL
# =========================

model = models.efficientnet_b0(weights=None)

in_features = model.classifier[1].in_features

model.classifier[1] = nn.Linear(
    in_features,
    len(CLASSES)
)

checkpoint = torch.load(
    MODEL_PATH,
    map_location=DEVICE,
    weights_only=False
)

if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
    state_dict = checkpoint["model_state_dict"]
elif isinstance(checkpoint, dict) and "state_dict" in checkpoint:
    state_dict = checkpoint["state_dict"]
else:
    state_dict = checkpoint

model.load_state_dict(state_dict)

model.to(DEVICE)
model.eval()

# =========================
# EVALUATION
# =========================

all_predictions = []
all_labels = []

correct = 0
total = 0

print("=" * 60)
print("ReValue AI - Detailed Evaluation")
print("=" * 60)
print(f"Device : {DEVICE}")

if torch.cuda.is_available():
    print(f"GPU    : {torch.cuda.get_device_name(0)}")

print("=" * 60)

with torch.no_grad():

    for images, labels in loader:

        images = images.to(DEVICE)
        labels = labels.to(DEVICE)

        outputs = model(images)

        predictions = torch.argmax(
            outputs,
            dim=1
        )

        correct += (predictions == labels).sum().item()
        total += labels.size(0)

        all_predictions.extend(
            predictions.cpu().numpy()
        )

        all_labels.extend(
            labels.cpu().numpy()
        )

# =========================
# RESULTS
# =========================

accuracy = correct / total

print()
print("=" * 60)
print("HASIL EVALUASI")
print("=" * 60)

print(f"Test Images : {total}")
print(f"Accuracy    : {accuracy * 100:.2f}%")

print()
print("=" * 60)
print("CLASSIFICATION REPORT")
print("=" * 60)

print(
    classification_report(
        all_labels,
        all_predictions,
        target_names=CLASSES,
        digits=4
    )
)

print("=" * 60)
print("CONFUSION MATRIX")
print("=" * 60)

cm = confusion_matrix(
    all_labels,
    all_predictions
)

print()
print("Rows = Actual")
print("Cols = Predicted")
print()

print(" " * 18, end="")

for class_name in CLASSES:
    print(f"{class_name[:10]:>12}", end="")

print()

for i, row in enumerate(cm):

    print(f"{CLASSES[i]:>18}", end="")

    for value in row:
        print(f"{value:>12}", end="")

    print()

print()
print("=" * 60)
print("EVALUASI SELESAI")
print("=" * 60)