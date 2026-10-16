import os
import shutil

SOURCE_DIR = "dataset/garbage_classification"
OUTPUT_DIR = "dataset/revalue_6class"

mapping = {
    "Plastic": ["plastic"],
    "Paper_Cardboard": ["paper", "cardboard"],
    "Glass": ["brown-glass", "green-glass", "white-glass"],
    "Metal": ["metal"],
    "Organic": ["biological"],
    "Other": ["trash"],
}

print("=" * 60)
print("ReValue Dataset Preparation")
print("=" * 60)

# Buat folder output
os.makedirs(OUTPUT_DIR, exist_ok=True)

total = 0

for target_class, source_classes in mapping.items():

    target_dir = os.path.join(OUTPUT_DIR, target_class)
    os.makedirs(target_dir, exist_ok=True)

    class_count = 0

    for source_class in source_classes:

        source_dir = os.path.join(SOURCE_DIR, source_class)

        for filename in os.listdir(source_dir):

            source_path = os.path.join(source_dir, filename)

            if not os.path.isfile(source_path):
                continue

            destination_filename = f"{source_class}_{filename}"
            destination_path = os.path.join(
                target_dir,
                destination_filename
            )

            shutil.copy2(source_path, destination_path)

            class_count += 1
            total += 1

    print(f"{target_class:20} : {class_count:5} images")

print("=" * 60)
print(f"TOTAL TRAINING DATA : {total}")
print(f"OUTPUT               : {OUTPUT_DIR}")
print("=" * 60)