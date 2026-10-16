import os
import json
import copy
import time

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, WeightedRandomSampler
from torchvision import datasets, transforms, models
from torchvision.models import EfficientNet_B0_Weights


# =========================================================
# CONFIG
# =========================================================

DATA_DIR = "dataset/revalue_split"
MODEL_DIR = "models"

IMAGE_SIZE = 224
BATCH_SIZE = 32
NUM_EPOCHS = 15
LEARNING_RATE = 0.0003
NUM_WORKERS = 0

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

os.makedirs(MODEL_DIR, exist_ok=True)


# =========================================================
# INFO
# =========================================================

print("=" * 60)
print("ReValue AI - Waste Material Classification")
print("=" * 60)

print(f"Device       : {DEVICE}")

if torch.cuda.is_available():
    print(f"GPU          : {torch.cuda.get_device_name(0)}")
    print(f"CUDA         : {torch.version.cuda}")
else:
    print("WARNING: CUDA tidak tersedia. Training menggunakan CPU.")

print("=" * 60)


# =========================================================
# TRANSFORMS
# =========================================================

train_transform = transforms.Compose([
    transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),

    transforms.RandomHorizontalFlip(p=0.5),
    transforms.RandomRotation(15),
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


# =========================================================
# DATASET
# =========================================================

train_dir = os.path.join(DATA_DIR, "train")
val_dir = os.path.join(DATA_DIR, "val")
test_dir = os.path.join(DATA_DIR, "test")

train_dataset = datasets.ImageFolder(
    train_dir,
    transform=train_transform
)

val_dataset = datasets.ImageFolder(
    val_dir,
    transform=val_test_transform
)

test_dataset = datasets.ImageFolder(
    test_dir,
    transform=val_test_transform
)


class_names = train_dataset.classes
num_classes = len(class_names)

print("\nClasses:")
for i, name in enumerate(class_names):
    print(f"  {i}: {name}")

print(f"\nJumlah kelas : {num_classes}")
print(f"Train        : {len(train_dataset)}")
print(f"Validation   : {len(val_dataset)}")
print(f"Test         : {len(test_dataset)}")


# =========================================================
# HANDLE CLASS IMBALANCE
# =========================================================

class_counts = [0] * num_classes

for _, label in train_dataset.samples:
    class_counts[label] += 1

print("\nDistribusi train:")
for name, count in zip(class_names, class_counts):
    print(f"  {name:20s}: {count}")


# Weight lebih besar untuk kelas yang jumlahnya lebih sedikit
class_weights = [
    1.0 / count
    for count in class_counts
]

sample_weights = [
    class_weights[label]
    for _, label in train_dataset.samples
]

sampler = WeightedRandomSampler(
    weights=sample_weights,
    num_samples=len(sample_weights),
    replacement=True
)


# =========================================================
# DATALOADER
# =========================================================

train_loader = DataLoader(
    train_dataset,
    batch_size=BATCH_SIZE,
    sampler=sampler,
    num_workers=NUM_WORKERS,
    pin_memory=torch.cuda.is_available()
)

val_loader = DataLoader(
    val_dataset,
    batch_size=BATCH_SIZE,
    shuffle=False,
    num_workers=NUM_WORKERS,
    pin_memory=torch.cuda.is_available()
)

test_loader = DataLoader(
    test_dataset,
    batch_size=BATCH_SIZE,
    shuffle=False,
    num_workers=NUM_WORKERS,
    pin_memory=torch.cuda.is_available()
)


# =========================================================
# MODEL
# =========================================================

print("\nLoading EfficientNet-B0 pretrained...")

weights = EfficientNet_B0_Weights.DEFAULT

model = models.efficientnet_b0(weights=weights)

# Ganti classifier bawaan menjadi 6 kelas ReValue
in_features = model.classifier[1].in_features

model.classifier[1] = nn.Linear(
    in_features,
    num_classes
)

model = model.to(DEVICE)

print("Model siap.")


# =========================================================
# LOSS + OPTIMIZER
# =========================================================

criterion = nn.CrossEntropyLoss()

optimizer = torch.optim.AdamW(
    model.parameters(),
    lr=LEARNING_RATE,
    weight_decay=0.01
)

scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
    optimizer,
    mode="max",
    factor=0.5,
    patience=2
)


# =========================================================
# MIXED PRECISION
# =========================================================

use_amp = DEVICE.type == "cuda"

scaler = torch.amp.GradScaler(
    "cuda",
    enabled=use_amp
)


# =========================================================
# TRAINING FUNCTIONS
# =========================================================

def train_one_epoch(model, loader):
    model.train()

    running_loss = 0.0
    correct = 0
    total = 0

    for images, labels in loader:

        images = images.to(
            DEVICE,
            non_blocking=True
        )

        labels = labels.to(
            DEVICE,
            non_blocking=True
        )

        optimizer.zero_grad(set_to_none=True)

        with torch.amp.autocast(
            device_type="cuda",
            enabled=use_amp
        ):
            outputs = model(images)
            loss = criterion(outputs, labels)

        scaler.scale(loss).backward()

        scaler.step(optimizer)
        scaler.update()

        running_loss += loss.item() * images.size(0)

        _, predicted = torch.max(
            outputs,
            1
        )

        total += labels.size(0)
        correct += (
            predicted == labels
        ).sum().item()

    epoch_loss = running_loss / total
    epoch_acc = correct / total

    return epoch_loss, epoch_acc


def evaluate(model, loader):
    model.eval()

    running_loss = 0.0
    correct = 0
    total = 0

    with torch.no_grad():

        for images, labels in loader:

            images = images.to(
                DEVICE,
                non_blocking=True
            )

            labels = labels.to(
                DEVICE,
                non_blocking=True
            )

            with torch.amp.autocast(
                device_type="cuda",
                enabled=use_amp
            ):
                outputs = model(images)
                loss = criterion(outputs, labels)

            running_loss += loss.item() * images.size(0)

            _, predicted = torch.max(
                outputs,
                1
            )

            total += labels.size(0)

            correct += (
                predicted == labels
            ).sum().item()

    epoch_loss = running_loss / total
    epoch_acc = correct / total

    return epoch_loss, epoch_acc


# =========================================================
# TRAINING LOOP
# =========================================================

best_val_acc = 0.0
best_model_weights = copy.deepcopy(model.state_dict())

history = {
    "train_loss": [],
    "train_acc": [],
    "val_loss": [],
    "val_acc": []
}


print("\n")
print("=" * 60)
print("START TRAINING")
print("=" * 60)

start_time = time.time()

for epoch in range(NUM_EPOCHS):

    epoch_start = time.time()

    train_loss, train_acc = train_one_epoch(
        model,
        train_loader
    )

    val_loss, val_acc = evaluate(
        model,
        val_loader
    )

    scheduler.step(val_acc)

    history["train_loss"].append(train_loss)
    history["train_acc"].append(train_acc)

    history["val_loss"].append(val_loss)
    history["val_acc"].append(val_acc)

    elapsed = time.time() - epoch_start

    print(
        f"Epoch [{epoch + 1:02d}/{NUM_EPOCHS}] "
        f"| Train Loss: {train_loss:.4f} "
        f"| Train Acc: {train_acc:.4f} "
        f"| Val Loss: {val_loss:.4f} "
        f"| Val Acc: {val_acc:.4f} "
        f"| Time: {elapsed:.1f}s"
    )

    # Simpan model terbaik berdasarkan validation accuracy
    if val_acc > best_val_acc:

        best_val_acc = val_acc

        best_model_weights = copy.deepcopy(
            model.state_dict()
        )

        checkpoint = {
            "model_state_dict": best_model_weights,
            "class_names": class_names,
            "image_size": IMAGE_SIZE,
            "best_val_acc": best_val_acc
        }

        torch.save(
            checkpoint,
            os.path.join(
                MODEL_DIR,
                "revalue_efficientnet_b0_best.pth"
            )
        )

        print(
            f"  -> Best model disimpan "
            f"(Val Acc: {best_val_acc:.4f})"
        )


# =========================================================
# RESTORE BEST MODEL
# =========================================================

model.load_state_dict(best_model_weights)


# =========================================================
# FINAL TEST
# =========================================================

print("\n")
print("=" * 60)
print("FINAL TEST")
print("=" * 60)

test_loss, test_acc = evaluate(
    model,
    test_loader
)

print(f"Test Loss : {test_loss:.4f}")
print(f"Test Acc  : {test_acc:.4f}")


# =========================================================
# SAVE FINAL MODEL
# =========================================================

final_checkpoint = {
    "model_state_dict": model.state_dict(),
    "class_names": class_names,
    "image_size": IMAGE_SIZE,
    "test_accuracy": test_acc,
    "best_val_accuracy": best_val_acc
}

final_model_path = os.path.join(
    MODEL_DIR,
    "revalue_efficientnet_b0_final.pth"
)

torch.save(
    final_checkpoint,
    final_model_path
)


# =========================================================
# SAVE HISTORY
# =========================================================

with open(
    os.path.join(MODEL_DIR, "training_history.json"),
    "w"
) as f:

    json.dump(
        history,
        f,
        indent=2
    )


# =========================================================
# DONE
# =========================================================

total_time = time.time() - start_time

print("\n")
print("=" * 60)
print("TRAINING SELESAI")
print("=" * 60)

print(f"Best Validation Accuracy : {best_val_acc:.4f}")
print(f"Test Accuracy            : {test_acc:.4f}")
print(f"Total Training Time      : {total_time / 60:.1f} menit")

print("\nModel:")
print(f"  {final_model_path}")

print("\nHistory:")
print("  models/training_history.json")

print("=" * 60)