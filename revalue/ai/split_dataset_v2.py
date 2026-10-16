import shutil
import random
from pathlib import Path

SOURCE_DIR = Path("dataset/revalue_6class_v2")
OUTPUT_DIR = Path("dataset/revalue_split_v2")

TRAIN_RATIO = 0.8
VAL_RATIO = 0.1
TEST_RATIO = 0.1

SEED = 42

random.seed(SEED)

# Bersihkan output lama jika ada
if OUTPUT_DIR.exists():
    shutil.rmtree(OUTPUT_DIR)

print("=" * 60)
print("ReValue Dataset Split V2")
print("=" * 60)

total_train = 0
total_val = 0
total_test = 0

classes = sorted([
    folder for folder in SOURCE_DIR.iterdir()
    if folder.is_dir()
])

for class_dir in classes:

    class_name = class_dir.name

    files = [
        f for f in class_dir.iterdir()
        if f.is_file()
    ]

    random.shuffle(files)

    total = len(files)

    train_count = int(total * TRAIN_RATIO)
    val_count = int(total * VAL_RATIO)

    train_files = files[:train_count]
    val_files = files[
        train_count:
        train_count + val_count
    ]
    test_files = files[
        train_count + val_count:
    ]

    for split_name, split_files in [
        ("train", train_files),
        ("val", val_files),
        ("test", test_files),
    ]:

        output_class_dir = (
            OUTPUT_DIR /
            split_name /
            class_name
        )

        output_class_dir.mkdir(
            parents=True,
            exist_ok=True
        )

        for file in split_files:
            shutil.copy2(
                file,
                output_class_dir / file.name
            )

    total_train += len(train_files)
    total_val += len(val_files)
    total_test += len(test_files)

    print()
    print(class_name)
    print(f"  Total : {total}")
    print(f"  train : {len(train_files)}")
    print(f"  val   : {len(val_files)}")
    print(f"  test  : {len(test_files)}")

print()
print("=" * 60)
print("DATASET SPLIT V2 SELESAI")
print("=" * 60)

print(f"Train : {total_train}")
print(f"Val   : {total_val}")
print(f"Test  : {total_test}")
print(f"Total : {total_train + total_val + total_test}")

print()
print(f"Output: {OUTPUT_DIR}")
print("=" * 60)