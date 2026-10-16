import os
from PIL import Image

DATASET_DIR = "dataset/garbage_classification"

classes = [
    "battery",
    "biological",
    "brown-glass",
    "cardboard",
    "clothes",
    "green-glass",
    "metal",
    "paper",
    "plastic",
    "shoes",
    "trash",
    "white-glass",
]

valid_extensions = {".jpg", ".jpeg", ".png", ".webp"}

print("=" * 50)
print("ReValue Dataset Audit")
print("=" * 50)

total = 0
bad_files = []

for class_name in classes:
    folder = os.path.join(DATASET_DIR, class_name)

    count = 0

    for filename in os.listdir(folder):
        path = os.path.join(folder, filename)

        if not os.path.isfile(path):
            continue

        ext = os.path.splitext(filename)[1].lower()

        if ext not in valid_extensions:
            continue

        try:
            with Image.open(path) as img:
                img.verify()

            count += 1

        except Exception:
            bad_files.append(path)

    total += count
    print(f"{class_name:15} : {count:5} valid images")

print("=" * 50)
print(f"TOTAL VALID      : {total}")
print(f"BAD/CORRUPT      : {len(bad_files)}")
print("=" * 50)

if bad_files:
    print("\nFile bermasalah:")
    for path in bad_files[:20]:
        print(path)