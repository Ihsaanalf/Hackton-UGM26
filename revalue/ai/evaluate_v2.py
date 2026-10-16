import os
import torch
import numpy as np
from torchvision import datasets, transforms, models
from torch.utils.data import DataLoader
from sklearn.metrics import classification_report, confusion_matrix
import torch.nn as nn


# ============================================================
# CONFIG
# ============================================================

TEST_DIR = "dataset/revalue_split_v2/test"
MODEL_PATH = "models/revalue_efficientnet_b0_v2_best.pth"

IMAGE_SIZE = 224
BATCH_SIZE = 32

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


# ============================================================
# HEADER
# ============================================================

print("=" * 60)
print("ReValue AI V2 - Detailed Evaluation")
print("=" * 60)

print(f"Device : {DEVICE}")

if torch.cuda.is_available():
    print(f"GPU    : {torch.cuda.get_device_name(0)}")
    print(f"CUDA   : {torch.version.cuda}")

print("=" * 60)


# ============================================================
# TRANSFORM
# ============================================================

test_transform = transforms.Compose([
    transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])


# ============================================================
# DATASET
# ============================================================

test_dataset = datasets.ImageFolder(
    TEST_DIR,
    transform=test_transform
)

test_loader = DataLoader(
    test_dataset,
    batch_size=BATCH_SIZE,
    shuffle=False,
    num_workers=0
)

classes = test_dataset.classes

print("\nClasses:")

for i, cls in enumerate(classes):
    print(f"  {i}: {cls}")

print(f"\nTest Images : {len(test_dataset)}")


# ============================================================
# MODEL
# ============================================================

print("\nLoading V2 model...")

model = models.efficientnet_b0(weights=None)

model.classifier[1] = nn.Linear(
    model.classifier[1].in_features,
    len(classes)
)

checkpoint = torch.load(
    MODEL_PATH,
    map_location=DEVICE
)

# Support checkpoint dictionary
if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
    model.load_state_dict(checkpoint["model_state_dict"])
else:
    model.load_state_dict(checkpoint)

model = model.to(DEVICE)
model.eval()

print("Model loaded.")


# ============================================================
# PREDICTION
# ============================================================

all_labels = []
all_predictions = []

correct = 0
total = 0

with torch.no_grad():

    for images, labels in test_loader:

        images = images.to(DEVICE)
        labels = labels.to(DEVICE)

        outputs = model(images)

        predictions = torch.argmax(outputs, dim=1)

        correct += (predictions == labels).sum().item()
        total += labels.size(0)

        all_labels.extend(labels.cpu().numpy())
        all_predictions.extend(predictions.cpu().numpy())


accuracy = correct / total

print("\n" + "=" * 60)
print("RESULT")
print("=" * 60)

print(f"Test Images : {total}")
print(f"Accuracy    : {accuracy * 100:.2f}%")


# ============================================================
# CLASSIFICATION REPORT
# ============================================================

print("\n" + "=" * 60)
print("CLASSIFICATION REPORT")
print("=" * 60)

print(
    classification_report(
        all_labels,
        all_predictions,
        target_names=classes,
        digits=4
    )
)


# ============================================================
# CONFUSION MATRIX
# ============================================================

cm = confusion_matrix(
    all_labels,
    all_predictions
)

print("=" * 60)
print("CONFUSION MATRIX")
print("=" * 60)

print("\nActual \\ Predicted")

print(
    f"{'':20}",
    end=""
)

for cls in classes:
    print(f"{cls[:12]:>13}", end="")

print()

for i, cls in enumerate(classes):

    print(f"{cls:20}", end="")

    for j in range(len(classes)):
        print(f"{cm[i][j]:>13}", end="")

    print()

print("=" * 60)