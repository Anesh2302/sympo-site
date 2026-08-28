import { useEffect, useRef } from "react";
import QRCode from "qrcode";

/* ── QR code rendered onto a canvas (gold-on-dark by default) ── */
export default function QrCode({
  value,
  size = 160,
  dark = "#0c0a07",
  light = "#f2df9a",
  className,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return undefined;

    QRCode.toCanvas(canvasRef.current, value, {
      width: size * 2, // render 2x, CSS scales down for crispness
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark, light },
    }).catch(() => {});

    return undefined;
  }, [value, size, dark, light]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: size, height: size }}
    />
  );
}