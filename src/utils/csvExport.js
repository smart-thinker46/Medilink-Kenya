import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as MailComposer from "expo-mail-composer";
import { Platform } from "react-native";

export const buildCsv = (headers, rows) => {
  return [headers, ...rows]
    .map((row) =>
      row
        .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
        .join(","),
    )
    .join("\n");
};

export const exportCsvToFile = async (filename, headers, rows) => {
  const csv = buildCsv(headers, rows);
  if (Platform.OS === "web") {
    // Web: return CSV string for download handling
    return { csv, uri: null };
  }
  const fileUri = `${FileSystem.documentDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(fileUri, csv, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return { csv, uri: fileUri };
};

export const shareCsv = async (options) => {
  const { filename, headers, rows, dialogTitle } = options;
  const { csv, uri } = await exportCsvToFile(filename, headers, rows);
  if (Platform.OS === "web" || !uri) {
    // Web: trigger download
    if (typeof document !== "undefined") {
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return { csv, shared: false, downloaded: true };
    }
    return { csv, shared: false, downloaded: false };
  }
  await Sharing.shareAsync(uri, {
    mimeType: "text/csv",
    dialogTitle: dialogTitle || "Share CSV",
    UTI: "public.comma-separated-values-text",
  });
  return { csv, shared: true, downloaded: false };
};

export const emailCsv = async (options) => {
  const { filename, headers, rows, subject, body } = options;
  const { csv, uri } = await exportCsvToFile(filename, headers, rows);
  if (Platform.OS === "web") {
    const mailto = `mailto:?subject=${encodeURIComponent(
      subject || "CSV Export",
    )}&body=${encodeURIComponent(body || csv)}`;
    if (typeof window !== "undefined") {
      window.location.href = mailto;
    }
    return { csv, emailed: false };
  }

  const isAvailable = await MailComposer.isAvailableAsync();
  if (!isAvailable || !uri) {
    return { csv, emailed: false };
  }

  await MailComposer.composeAsync({
    subject: subject || "CSV Export",
    body: body || "Please find the CSV attached.",
    attachments: [uri],
  });
  return { csv, emailed: true };
};
