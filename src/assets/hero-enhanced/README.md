# Enhanced hero photos

Masters and responsive AVIF/WebP/JPEG derivatives for the homepage hero.
Originals in `/workspace/lachev/photos/` were not modified.

| File stem | Original | Method | Master size |
|---|---|---|---|
| house-and-patio | lossless first frame of the site video (matches the live slide 1; poster `406693_video_desktop_v1.jpg` 1280×720) | Lanczos ×4 + grade (Real-ESRGAN rejected: it garbled “LA CHEV 208” / “Open”) | 5120×2880 |
| patio-table | `full/b1_39c7d6fe9c4428891b9f5f803d3f07.jpg` (800×800) | RealESRGAN_x4plus + grade, then a masked lift of the near-neutral table (×1.133/1.142/1.126, soft cap ~248) back to the original ~243, keeping the pink plate-shadow streak | 3200×3200 |
| kitchen-team-wide | `events_pg_back.jpg` (1382×1000) | RealESRGAN_x4plus + grade | 5528×4000 |

Grade (all three): light `fastNlMeans` denoise, gentle unsharp (radius 1.15, amount 0.42), mild gray-world WB blended at 35% plus a hint of warmth, a small shadow lift with highlight rolloff.

Tools: PyTorch 2.15 (CPU), spandrel 0.4.2, `RealESRGAN_x4plus.pth` (xinntao/Real-ESRGAN v0.1.0), Pillow, OpenCV, sharp for AVIF/WebP.

Mobile LCP is `house-and-patio-780.avif` (~45 KB, under the 120 KB cap).

`scripts/encode-hero.mjs [name…]` re-encodes only from the committed masters here (`<name>.jpg`, quality 95, 4:4:4; house-and-patio is the video-frame slide 1). patio-table re-encodes byte-identical; house-and-patio and kitchen-team-wide come out visually identical (mean difference about 1–4/255) because the shipped derivatives were cut from lossless PNG working masters.
