#!/usr/bin/env python3
"""Combine multiple images into a single PDF in numeric order."""

import re
from PIL import Image
from pathlib import Path

def extract_number(filename: str) -> int:
    """Extract number from parentheses in filename, e.g., 'Image (7).jpg' -> 7."""
    match = re.search(r'\((\d+)\)', filename)
    return int(match.group(1)) if match else 0

def combine_images_to_pdf(image_folder: str, output_path: str):
    """Combine all images in a folder into a single PDF in numeric order."""
    folder = Path(image_folder)
    output = Path(output_path)

    # Get all image files and sort by number in parentheses
    image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff'}
    image_files = sorted([
        f for f in folder.iterdir()
        if f.suffix.lower() in image_extensions
    ], key=lambda x: extract_number(x.name))

    if not image_files:
        print("No image files found in the folder.")
        return

    print(f"Found {len(image_files)} images:")
    for i, img_file in enumerate(image_files, 1):
        print(f"  {i}. {img_file.name}")

    # Open all images and convert to RGB (required for PDF)
    images = []
    for img_path in image_files:
        img = Image.open(img_path)
        if img.mode == 'RGBA':
            # Convert RGBA to RGB with white background
            background = Image.new('RGB', img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[3])
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        images.append(img)

    # Save as PDF - first image, then append the rest
    if images:
        first_image = images[0]
        other_images = images[1:] if len(images) > 1 else []

        first_image.save(
            output,
            "PDF",
            resolution=100.0,
            save_all=True,
            append_images=other_images
        )
        print(f"\nSuccessfully created: {output}")
        print(f"PDF contains {len(images)} pages")

if __name__ == "__main__":
    image_folder = r"C:\Users\jonat\OneDrive\Documents\Scanned Documents\Documents"
    output_path = r"C:\Users\jonat\OneDrive\Documents\Scanned Documents\Documents\Combined_Documents.pdf"

    combine_images_to_pdf(image_folder, output_path)
