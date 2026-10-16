import shutil
import random
from pathlib import Path

SOURCE_DIR = Path("dataset/garbage_classification")
OUTPUT_DIR = Path("dataset/revalue_6class_v2")

SEED = 42

mapping = {
    "Plastic": ["plastic"],
    "Paper_Cardboard": ["paper", "cardboard"],
    "Glass": ["brown-glass", "green-glass", "white-glass"],
    "Metal": ["metal"],
    "Organic": ["biological"],
    "Other": ["trash", "battery", "clothes", "shoes"],
}

# Jumlah maksimal gambar untuk setiap subkategori Other
OTHER_LIMIT = 697

random.seed(SEED)

print("=" * 60)
print("ReValue Dataset Preparation V2")
print("=" * 60)

# Buat folder output
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

total = 0

for target_class, source_classes in mapping.items():

    target_dir = OUTPUT_DIR / target_class
    target_dir.mkdir(parents=True, exist_ok=True)

    class_total = 0

    print(f"\n{target_class}")

    for source_class in source_classes:

        source_dir = SOURCE_DIR / source_class

        files = [
            f for f in source_dir.iterdir()
            if f.is_file()
        ]

        # Sampling khusus Other
        if target_class == "Other":
            if len(files) > OTHER_LIMIT:
                files = random.sample(files, OTHER_LIMIT)

        print(
            f"  {source_class:<12}: "
            f"{len(files):>5} images"
        )

        for file in files:

            destination = (
                target_dir /
                f"{source_class}_{file.name}"
            )

            shutil.copy2(file, destination)

            class_total += 1

    total += class_total

    print(
        f"  TOTAL {target_class:<8}: "
        f"{class_total:>5}"
    )

print()
print("=" * 60)
print(f"TOTAL DATASET V2 : {total}")
print(f"OUTPUT           : {OUTPUT_DIR}")
print("=" * 60)