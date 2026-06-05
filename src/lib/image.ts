/** Normalizes any image to a centered N×N square (consistent icon/logo). */
export async function cropToSquare(file: File, size = 256): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    // Scale to COVER the square, centered (true crop).
    const scale = Math.max(size / img.width, size / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
    const blob = await new Promise<Blob>((res) =>
      canvas.toBlob((b) => res(b!), "image/png", 0.92),
    );
    return new File([blob], "logo.png", { type: "image/png" });
  } finally {
    URL.revokeObjectURL(url);
  }
}
