import json
import time
from pathlib import Path

import torch
import torch.nn as nn
import torch.optim as optim

from torchvision import datasets, models, transforms
from torch.utils.data import DataLoader
from tqdm import tqdm


# ============================================================
# CONFIG
# ============================================================

DATA_DIR = Path("dataset/revalue_split_v2")
MODEL_DIR = Path("models")

TRAIN_DIR = DATA_DIR / "train"
VAL_DIR = DATA_DIR / "val"
TEST_DIR = DATA_DIR / "test"

IMAGE_SIZE = 224
BATCH_SIZE = 32
NUM_EPOCHS = 15
LEARNING_RATE = 0.0001

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

MODEL_DIR.mkdir(parents=True, exist_ok=True)


# ============================================================
# HEADER
# ============================================================

print("=" * 60)
print("ReValue AI V2 - Waste Material Classification")
print("=" * 60)

print(f"Device : {DEVICE}")

if torch.cuda.is_available():
    print(f"GPU    : {torch.cuda.get_device_name(0)}")
    print(f"CUDA   : {torch.version.cuda}")

print("=" * 60)


# ============================================================
# TRANSFORMS
# ============================================================

train_transform = transforms.Compose([
    transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),

    transforms.RandomHorizontalFlip(),

    transforms.RandomRotation(10),

    transforms.ColorJitter(
        brightness=0.2,
        contrast=0.2,
        saturation=0.2
    ),

    transforms.ToTensor(),

    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    ),
])


val_test_transform = transforms.Compose([
    transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),

    transforms.ToTensor(),

    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    ),
])


# ============================================================
# DATASET
# ============================================================

train_dataset = datasets.ImageFolder(
    TRAIN_DIR,
    transform=train_transform
)

val_dataset = datasets.ImageFolder(
    VAL_DIR,
    transform=val_test_transform
)

test_dataset = datasets.ImageFolder(
    TEST_DIR,
    transform=val_test_transform
)

train_loader = DataLoader(
    train_dataset,
    batch_size=BATCH_SIZE,
    shuffle=True,
    num_workers=0
)

val_loader = DataLoader(
    val_dataset,
    batch_size=BATCH_SIZE,
    shuffle=False,
    num_workers=0
)

test_loader = DataLoader(
    test_dataset,
    batch_size=BATCH_SIZE,
    shuffle=False,
    num_workers=0
)


# ============================================================
# CLASSES
# ============================================================

classes = train_dataset.classes

print()
print("Classes:")

for i, class_name in enumerate(classes):
    print(f"  {i}: {class_name}")

print()
print(f"Jumlah kelas : {len(classes)}")
print(f"Train        : {len(train_dataset)}")
print(f"Validation   : {len(val_dataset)}")
print(f"Test         : {len(test_dataset)}")


# ============================================================
# TRAIN DISTRIBUTION
# ============================================================

print()
print("Distribusi train:")

for class_name in classes:

    class_index = train_dataset.class_to_idx[class_name]

    count = sum(
        1 for _, label in train_dataset.samples
        if label == class_index
    )

    print(f"  {class_name:<18}: {count}")


# ============================================================
# MODEL
# ============================================================

print()
print("Loading EfficientNet-B0 pretrained...")

model = models.efficientnet_b0(
    weights=models.EfficientNet_B0_Weights.DEFAULT
)

in_features = model.classifier[1].in_features

model.classifier[1] = nn.Linear(
    in_features,
    len(classes)
)

model = model.to(DEVICE)

print("Model siap.")


# ============================================================
# LOSS & OPTIMIZER
# ============================================================

criterion = nn.CrossEntropyLoss()

optimizer = optim.AdamW(
    model.parameters(),
    lr=LEARNING_RATE
)


# ============================================================
# TRAINING
# ============================================================

best_val_acc = 0.0

history = []

start_time = time.time()

for epoch in range(NUM_EPOCHS):

    epoch_start = time.time()

    # --------------------------------------------------------
    # TRAIN
    # --------------------------------------------------------

    model.train()

    train_loss = 0.0
    train_correct = 0
    train_total = 0

    for images, labels in train_loader:

        images = images.to(DEVICE)
        labels = labels.to(DEVICE)

        optimizer.zero_grad()

        outputs = model(images)

        loss = criterion(
            outputs,
            labels
        )

        loss.backward()

        optimizer.step()

        train_loss += (
            loss.item() *
            labels.size(0)
        )

        predictions = torch.argmax(
            outputs,
            dim=1
        )

        train_correct += (
            predictions == labels
        ).sum().item()

        train_total += labels.size(0)

    train_loss /= train_total

    train_acc = (
        train_correct /
        train_total
    )


    # --------------------------------------------------------
    # VALIDATION
    # --------------------------------------------------------

    model.eval()

    val_loss = 0.0
    val_correct = 0
    val_total = 0

    with torch.no_grad():

        for images, labels in val_loader:

            images = images.to(DEVICE)
            labels = labels.to(DEVICE)

            outputs = model(images)

            loss = criterion(
                outputs,
                labels
            )

            val_loss += (
                loss.item() *
                labels.size(0)
            )

            predictions = torch.argmax(
                outputs,
                dim=1
            )

            val_correct += (
                predictions == labels
            ).sum().item()

            val_total += labels.size(0)

    val_loss /= val_total

    val_acc = (
        val_correct /
        val_total
    )

    elapsed = time.time() - epoch_start

    print(
        f"Epoch [{epoch + 1:02d}/{NUM_EPOCHS}] "
        f"| Train Loss: {train_loss:.4f} "
        f"| Train Acc: {train_acc:.4f} "
        f"| Val Loss: {val_loss:.4f} "
        f"| Val Acc: {val_acc:.4f} "
        f"| Time: {elapsed:.1f}s"
    )


    # --------------------------------------------------------
    # SAVE BEST MODEL
    # --------------------------------------------------------

    if val_acc > best_val_acc:

        best_val_acc = val_acc

        torch.save(
            {
                "model_state_dict": model.state_dict(),
                "classes": classes,
                "image_size": IMAGE_SIZE,
                "val_accuracy": best_val_acc,
            },
            MODEL_DIR /
            "revalue_efficientnet_b0_v2_best.pth"
        )

        print(
            f"  -> Best model disimpan "
            f"(Val Acc: {best_val_acc:.4f})"
        )


    history.append({
        "epoch": epoch + 1,
        "train_loss": train_loss,
        "train_accuracy": train_acc,
        "val_loss": val_loss,
        "val_accuracy": val_acc,
        "time_seconds": elapsed,
    })


# ============================================================
# TEST
# ============================================================

print()
print("=" * 60)
print("FINAL TEST")
print("=" * 60)

# Load best model

best_checkpoint = torch.load(
    MODEL_DIR /
    "revalue_efficientnet_b0_v2_best.pth",
    map_location=DEVICE,
    weights_only=False
)

model.load_state_dict(
    best_checkpoint["model_state_dict"]
)

model.eval()

test_loss = 0.0
test_correct = 0
test_total = 0

with torch.no_grad():

    for images, labels in test_loader:

        images = images.to(DEVICE)
        labels = labels.to(DEVICE)

        outputs = model(images)

        loss = criterion(
            outputs,
            labels
        )

        test_loss += (
            loss.item() *
            labels.size(0)
        )

        predictions = torch.argmax(
            outputs,
            dim=1
        )

        test_correct += (
            predictions == labels
        ).sum().item()

        test_total += labels.size(0)

test_loss /= test_total

test_acc = (
    test_correct /
    test_total
)

print(f"Test Loss : {test_loss:.4f}")
print(f"Test Acc  : {test_acc:.4f}")


# ============================================================
# SAVE FINAL MODEL
# ============================================================

torch.save(
    {
        "model_state_dict": model.state_dict(),
        "classes": classes,
        "image_size": IMAGE_SIZE,
        "test_accuracy": test_acc,
    },
    MODEL_DIR /
    "revalue_efficientnet_b0_v2_final.pth"
)


# ============================================================
# SAVE HISTORY
# ============================================================

with open(
    MODEL_DIR / "training_history_v2.json",
    "w"
) as f:

    json.dump(
        history,
        f,
        indent=2
    )


# ============================================================
# SUMMARY
# ============================================================

total_time = (
    time.time() -
    start_time
)

print()
print("=" * 60)
print("TRAINING V2 SELESAI")
print("=" * 60)

print(
    f"Best Validation Accuracy : "
    f"{best_val_acc:.4f}"
)

print(
    f"Test Accuracy            : "
    f"{test_acc:.4f}"
)

print(
    f"Total Training Time      : "
    f"{total_time / 60:.1f} menit"
)

print()
print("Model:")
print(
    "  models\\"
    "revalue_efficientnet_b0_v2_final.pth"
)

print()
print("Best Model:")
print(
    "  models\\"
    "revalue_efficientnet_b0_v2_best.pth"
)

print()
print("History:")
print(
    "  models\\training_history_v2.json"
)

print("=" * 60)