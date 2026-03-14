const MB = 1024 * 1024;

const formatAllowedTypes = ({ allowImages, allowPdf, allowAudio }) => {
  const labels = [];
  if (allowImages) labels.push("images");
  if (allowPdf) labels.push("PDFs");
  if (allowAudio) labels.push("audio files");

  if (labels.length === 0) return "Unsupported file type";
  if (labels.length === 1) return `Only ${labels[0]} are allowed`;
  if (labels.length === 2) return `Only ${labels[0]} or ${labels[1]} are allowed`;
  return `Only ${labels.slice(0, -1).join(", ")}, or ${labels[labels.length - 1]} are allowed`;
};

const resolveFileName = (file) => {
  const raw = file?.name || file?.fileName || file?.uri || "file";
  const name = String(raw).split("/").pop();
  return name || "file";
};

export const validatePickedFiles = (files = [], options = {}) => {
  const {
    allowImages = false,
    allowPdf = false,
    allowAudio = false,
    maxBytes = 4 * MB,
  } = options;
  const accepted = [];
  const rejected = [];
  const typeMessage = formatAllowedTypes({ allowImages, allowPdf, allowAudio });
  const maxSizeLabel = `${Math.round(maxBytes / MB)}MB`;

  files.forEach((file) => {
    const name = resolveFileName(file);
    const ext = name.split(".").pop()?.toLowerCase() || "";
    const mime = String(file?.mimeType || file?.type || "").toLowerCase();
    const size = Number(file?.size ?? file?.fileSize ?? 0);
    const sizeKnown = Number.isFinite(size) && size > 0;

    const isImage =
      allowImages &&
      (mime === "image" ||
        mime.startsWith("image/") ||
        ["png", "jpg", "jpeg", "webp", "heic", "heif"].includes(ext));
    const isPdf =
      allowPdf && (mime === "application/pdf" || ext === "pdf");
    const isAudio =
      allowAudio &&
      (mime === "audio" ||
        mime.startsWith("audio/") ||
        ["mp3", "wav", "m4a", "aac", "ogg", "opus", "webm"].includes(ext));

    const reasons = [];
    if (!(isImage || isPdf || isAudio)) reasons.push(typeMessage);
    if (sizeKnown && size > maxBytes) reasons.push(`File is larger than ${maxSizeLabel}`);

    if (reasons.length) {
      rejected.push({ name, reasons });
    } else {
      accepted.push(file);
    }
  });

  const message = rejected
    .map((item) => `• ${item.name}: ${item.reasons.join(", ")}`)
    .join("\n");

  return { accepted, rejected, message };
};
