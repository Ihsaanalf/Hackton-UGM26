import os
import shutil
import random

SOURCE_DIR = "dataset/revalue_6class"
OUTPUT_DIR = "dataset/revalue_split"

TRAIN_RATIO = 0.8
VAL_RATIO = 0.1
TEST_RATIO = 0.1

random.seed(42)

print("=" * 60)
print("ReValue Dataset Split")
print("=" * 60)

for class_name in os.listdir(SOURCE_DIR):

    source_class_dir = os.path.join(SOURCE_DIR, class_name)

    if not os.path.isdir(source_class_dir):
        continue

    # Ambil semua file gambar
    images = [
        f for f in os.listdir(source_class_dir)
        if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))
    ]

    # Acak supaya pembagian tidak berdasarkan urutan file
    random.shuffle(images)

    total = len(images)

    train_end = int(total * TRAIN_RATIO)
    val_end = train_end + int(total * VAL_RATIO)

    train_images = images[:train_end]
    val_images = images[train_end:val_end]
    test_images = images[val_end:]

    datasets = {
        "train": train_images,
        "val": val_images,
        "test": test_images,
    }

    print(f"\n{class_name}")
    print(f"  Total : {total}")

    for split_name, split_images in datasets.items():

        destination_dir = os.path.join(
            OUTPUT_DIR,
            split_name,
            class_name
        )

        os.makedirs(destination_dir, exist_ok=True)

        for filename in split_images:

            source_path = os.path.join(
                source_class_dir,
                filename
            )

            destination_path = os.path.join(
                destination_dir,
                filename
            )

            shutil.copy2(source_path, destination_path)

        print(f"  {split_name:5} : {len(split_images)}")

print("\n" + "=" * 60)
print("DATASET SPLIT SELESAI")
print(f"Output: {OUTPUT_DIR}")
print("=" * 60)