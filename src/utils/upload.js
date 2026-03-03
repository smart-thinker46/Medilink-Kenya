import apiClient from "@/utils/api";

const IMAGE_EXTS = ["png", "jpg", "jpeg"];
const DOC_EXTS = ["pdf", "doc", "docx"];

const isUploadedReference = (value) => {
  if (!value || typeof value !== "string") return false;
  return (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("/uploads/") ||
    value.startsWith("uploads/")
  );
};

const getFileMeta = (uri, kind = "image") => {
  const filename = uri.split("/").pop() || `upload-${Date.now()}`;
  const match = /\.(\w+)$/.exec(filename);
  const ext = match ? match[1].toLowerCase() : "";

  if (kind === "document") {
    if (ext && !DOC_EXTS.includes(ext)) {
      throw new Error("Invalid document type. Use PDF or DOC/DOCX.");
    }
    const type = !ext
      ? "application/octet-stream"
      : ext === "pdf"
        ? "application/pdf"
        : ext === "doc"
          ? "application/msword"
          : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    return { filename, type };
  }

  if (ext && !IMAGE_EXTS.includes(ext)) {
    throw new Error("Invalid image type. Use PNG or JPEG.");
  }
  const normalized = ext === "jpg" ? "jpeg" : ext;
  const type = normalized ? `image/${normalized}` : "image/jpeg";
  return { filename, type };
};

const isWebRuntime = () =>
  typeof window !== "undefined" && typeof document !== "undefined";

const isBlobLike = (value) =>
  value &&
  typeof value === "object" &&
  typeof value.arrayBuffer === "function" &&
  typeof value.type === "string";

const resolveWebBinary = async (input, fallbackName, fallbackType) => {
  if (!isWebRuntime()) return null;
  if (isBlobLike(input)) return input;
  if (input?.file && isBlobLike(input.file)) return input.file;

  const uri = typeof input === "string" ? input : input?.uri;
  if (!uri || typeof fetch !== "function") return null;
  if (uri.startsWith("http://") || uri.startsWith("https://") || uri.startsWith("/uploads/") || uri.startsWith("uploads/")) {
    return null;
  }

  try {
    const response = await fetch(uri);
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!blob) return null;
    if (blob.type || !fallbackType) return blob;
    return new Blob([blob], { type: fallbackType });
  } catch {
    return null;
  }
};

export const uploadFileIfNeeded = async (input, options = {}) => {
  if (!input) return null;
  if (typeof input === "object" && input?.url && isUploadedReference(input.url)) {
    return input.url;
  }

  const uri = typeof input === "string" ? input : input?.uri;
  if (!uri) return null;
  if (isUploadedReference(uri)) {
    return uri;
  }

  const kind = options.kind || "image";
  const providedName = typeof input === "object" ? input?.name : undefined;
  const providedType = typeof input === "object" ? input?.type || input?.mimeType : undefined;
  const { filename, type } = getFileMeta(providedName || uri, kind);

  const formData = new FormData();
  const webBinary = await resolveWebBinary(input, providedName || filename, providedType || type);

  if (webBinary) {
    formData.append("file", webBinary, providedName || filename);
  } else {
    formData.append("file", {
      uri,
      name: providedName || filename,
      type: providedType || type,
    });
  }

  const response = await apiClient.request("/uploads", {
    method: "POST",
    body: formData,
  });

  return response?.url || null;
};
