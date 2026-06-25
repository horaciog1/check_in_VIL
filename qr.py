#!/usr/bin/env python3
"""
batch_qr_from_excel.py  -- create QR-code images labelled with a name + ID

Usage example:
    python batch_qr_from_excel.py scan.xlsx \
           --id-col student_id \
           --name-col fullName \
           --out-dir qr_images
"""
import argparse
import os
import pathlib
import textwrap

import pandas as pd
from PIL import Image, ImageDraw, ImageFont
import qrcode

# ──────────────────────────────────────────────────────────
# QR-code + two-line label generator
# ──────────────────────────────────────────────────────────
def generate_qr_with_labels(uid: str,
                            name: str,
                            font: ImageFont.ImageFont | None = None,
                            spacing: int = 6,
                            margin: int = 10) -> Image.Image:
    """
    Return a PIL Image that shows a QR code, then `name`, then `uid` underneath.
    """
    # Build QR
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(uid)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black",
                           back_color="white").convert("RGB")

    # Font handling
    if font is None:
        font = ImageFont.load_default()

    # Pillow ≥10: measure text via a dummy ImageDraw
    dummy = Image.new("RGB", (1, 1))
    draw_tmp = ImageDraw.Draw(dummy)

    def text_size(txt: str):
        l, t, r, b = draw_tmp.textbbox((0, 0), txt, font=font)
        return r - l, b - t

    name_w, name_h = text_size(name)
    uid_w, uid_h = text_size(uid)

    # Overall canvas size
    canvas_w = max(qr_img.width, name_w, uid_w)
    canvas_h = (
        qr_img.height
        + margin
        + name_h
        + spacing
        + uid_h
        + margin
    )
    canvas = Image.new("RGB", (canvas_w, canvas_h), "white")

    # Paste / draw, centered
    qr_x = (canvas_w - qr_img.width) // 2
    canvas.paste(qr_img, (qr_x, 0))

    draw = ImageDraw.Draw(canvas)
    name_x = (canvas_w - name_w) // 2
    uid_x  = (canvas_w - uid_w)  // 2
    name_y = qr_img.height + margin
    uid_y  = name_y + name_h + spacing

    draw.text((name_x, name_y), name, font=font, fill="black")
    draw.text((uid_x,  uid_y),  uid,  font=font, fill="black")

    return canvas

# ──────────────────────────────────────────────────────────
# Main driver
# ──────────────────────────────────────────────────────────
def main(xlsx_path: pathlib.Path,
         id_col: str,
         name_col: str,
         out_dir: pathlib.Path):
    df = pd.read_excel(xlsx_path, dtype=str)

    if id_col not in df.columns or name_col not in df.columns:
        missing = [c for c in (id_col, name_col) if c not in df.columns]
        raise KeyError(f"Missing column(s) in {xlsx_path.name}: {', '.join(missing)}")

    out_dir.mkdir(parents=True, exist_ok=True)
    font = ImageFont.load_default()

    # Generate one image per *row* (allows duplicate IDs if needed)
    for idx, row in df[[name_col, id_col]].dropna().iterrows():
        name = str(row[name_col]).strip()
        uid  = str(row[id_col]).strip()

        if not uid:
            continue

        safe_uid = os.path.basename(uid)

        img = generate_qr_with_labels(uid, name, font=font)
        img.save(out_dir / f"{safe_uid}.png")
        print(f"✔️  {safe_uid}.png")

# ──────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        formatter_class=argparse.RawDescriptionHelpFormatter,
        description="Generate QR-code images labelled with name + ID from an Excel file.",
        epilog=textwrap.dedent("""\
            Example:
              python batch_qr_from_excel.py ids.xlsx \\
                     --id-col student_id \\
                     --name-col fullName \\
                     --out-dir qr_images
        """),
    )
    parser.add_argument("excel_file", type=pathlib.Path, help="Excel file (.xlsx)")
    parser.add_argument("--id-col", default="unique_id",
                        help="Column holding the unique IDs")
    parser.add_argument("--name-col", default="fullName",
                        help="Column holding the full names")
    parser.add_argument("--out-dir", type=pathlib.Path,
                        default=pathlib.Path("qr_images"),
                        help="Folder for the PNGs (created if needed)")
    args = parser.parse_args()

    main(args.excel_file, args.id_col, args.name_col, args.out_dir)
