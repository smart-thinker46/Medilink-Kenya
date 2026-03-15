import { Platform, Image } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { Asset } from "expo-asset";
import { getAppContactSnapshot } from "@/utils/appSettings/store";

const DEFAULT_LOGO = require("../assets/images/Medilink-logo.png");
const DEFAULT_APP_ICON = require("../../assets/images/icon.png");
const BASE64_ENCODING = FileSystem?.EncodingType?.Base64 || "base64";

const formatCurrency = (amount, currency = "KES") => {
  const numeric = Number(amount || 0);
  return `${currency} ${numeric.toLocaleString()}`;
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const buildReceiptHtml = ({ payment, payer, recipient, business, logoDataUri, iconDataUri }) => {
  const issuedAt = payment?.createdAt || new Date().toISOString();
  const receiptNumber = payment?.receiptNumber || payment?.id;
  const invoiceNumber = payment?.invoiceNumber || receiptNumber;
  const status = payment?.status || "PENDING";
  const method = payment?.method || "Unknown";
  const type = payment?.type || "PAYMENT";
  const amount = payment?.amount || 0;
  const chargedAmount = payment?.chargedAmount;
  const chargedCurrency = payment?.chargedCurrency;
  const minutes = payment?.minutes;
  const plan = payment?.plan;
  const description =
    payment?.description ||
    (type === "VIDEO_CALL" ? "Video Call" : type === "SUBSCRIPTION" ? "Subscription" : "Payment");

  const payerName =
    payer?.name ||
    payer?.fullName ||
    payer?.hospitalName ||
    payer?.pharmacyName ||
    payer?.businessName ||
    payer?.email ||
    "Customer";
  const payerEmail = payer?.email || "-";
  const payerPhone = payer?.phone || "-";
  const recipientName =
    recipient?.name ||
    recipient?.fullName ||
    recipient?.hospitalName ||
    recipient?.pharmacyName ||
    recipient?.businessName ||
    "-";
  const recipientRole = recipient?.role || payment?.recipientRole || "-";
  const brandColor = business?.primaryColor || "#0f766e";
  const accentColor = business?.accentColor || "#0ea5e9";
  const supportEmail = business?.email || "support@medilink.co.ke";

  return `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: "Inter", "Segoe UI", Arial, sans-serif; margin: 0; padding: 32px; color: #0f172a; background: #f8fafc; }
        .receipt { max-width: 720px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 20px; padding: 28px; background: #ffffff; }
        .flag { position: relative; height: 64px; border-radius: 14px; overflow: hidden; margin-bottom: 18px; background: linear-gradient(180deg, #111827 0 30%, #f8fafc 30% 34%, #b91c1c 34% 66%, #f8fafc 66% 70%, #15803d 70% 100%); }
        .flag-logo { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 64px; height: 64px; border-radius: 999px; background: #fff; border: 2px solid #0f172a; display: flex; align-items: center; justify-content: center; }
        .flag-logo img { height: 38px; width: auto; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
        .brand { font-weight: 700; font-size: 22px; color: ${brandColor}; }
        .sub { font-size: 12px; color: #64748b; margin-top: 4px; }
        .badge { background: ${accentColor}; color: #ffffff; padding: 4px 10px; border-radius: 999px; font-size: 12px; }
        .section { margin-top: 20px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #94a3b8; }
        .value { font-size: 14px; color: #0f172a; margin-top: 4px; }
        .line { height: 1px; background: #e5e7eb; margin: 18px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 6px; }
        th, td { text-align: left; padding: 10px 0; font-size: 13px; border-bottom: 1px solid #e5e7eb; }
        .total { font-weight: 700; font-size: 16px; text-align: right; padding-top: 12px; }
        .footer { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 24px; }
        .footer-logo { margin: 12px auto 6px; height: 28px; width: auto; }
      </style>
    </head>
    <body>
      <div class="receipt">
        <div class="flag">
          ${iconDataUri ? `<div class="flag-logo"><img src="${iconDataUri}" alt="App icon" /></div>` : ""}
        </div>
        <div class="header">
          <div>
            <div class="brand">${escapeHtml(business?.name || "MediLink Kenya")}</div>
            <div class="sub">${escapeHtml(business?.address || "Nairobi, Kenya")}</div>
            <div class="sub">${escapeHtml(business?.phone || "+254 700 000 000")}</div>
            <div class="sub">${escapeHtml(supportEmail)}</div>
          </div>
          <div class="badge">${escapeHtml(status)}</div>
        </div>

        <div class="grid">
          <div>
            <div class="label">Receipt Number</div>
            <div class="value">${escapeHtml(receiptNumber)}</div>
          </div>
          <div>
            <div class="label">Issued At</div>
            <div class="value">${escapeHtml(new Date(issuedAt).toLocaleString())}</div>
          </div>
          <div>
            <div class="label">Invoice Number</div>
            <div class="value">${escapeHtml(invoiceNumber)}</div>
          </div>
          <div>
            <div class="label">Payment Type</div>
            <div class="value">${escapeHtml(type)}</div>
          </div>
          <div>
            <div class="label">Method</div>
            <div class="value">${escapeHtml(method)}</div>
          </div>
          <div>
            <div class="label">Reason</div>
            <div class="value">${escapeHtml(description)}</div>
          </div>
        </div>

        <div class="line"></div>

        <div class="grid">
          <div>
            <div class="label">Payer / Employer</div>
            <div class="value">${escapeHtml(payerName)}</div>
            <div class="value">${escapeHtml(payerEmail)}</div>
            <div class="value">${escapeHtml(payerPhone)}</div>
          </div>
          <div>
            <div class="label">Paid To</div>
            <div class="value">${escapeHtml(recipientName)}</div>
            <div class="value">${escapeHtml(recipientRole)}</div>
          </div>
        </div>

        <div class="section">
          <div class="label">Payment Details</div>
          <table>
            <thead>
              <tr>
                <th>Service</th>
                <th>Reason</th>
                <th style="text-align:right;">Amount Paid</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${escapeHtml(description)}${plan ? ` • ${escapeHtml(plan)}` : ""}${
                  minutes ? ` • ${escapeHtml(minutes)} min` : ""
                }</td>
                <td>${escapeHtml(description)}</td>
                <td style="text-align:right;">${escapeHtml(formatCurrency(amount, payment?.currency || "KES"))}</td>
              </tr>
            </tbody>
          </table>
          <div class="total">Total: ${escapeHtml(formatCurrency(amount, payment?.currency || "KES"))}</div>
          ${
            chargedAmount && chargedCurrency
              ? `<div class="sub">Charged: ${escapeHtml(formatCurrency(chargedAmount, chargedCurrency))}</div>`
              : ""
          }
        </div>

        <div class="footer">
          ${logoDataUri ? `<img class="footer-logo" src="${logoDataUri}" alt="Logo" />` : ""}
          <div>MediLink Kenya • Digital Health Network</div>
          <div>${escapeHtml(business?.phone || "+254 700 000 000")} • ${escapeHtml(supportEmail)}</div>
          <div>Thank you for your payment.</div>
        </div>
      </div>
    </body>
  </html>
  `;
};

const resolveLogoDataUri = async (logoSource) => {
  if (!logoSource) return null;
  // `Image.resolveAssetSource` isn't consistently available on web builds.
  // Prefer `expo-asset` to resolve bundled module assets across platforms.
  let uri = null;
  try {
    if (typeof logoSource === "string") {
      uri = logoSource;
    } else if (logoSource?.uri) {
      uri = logoSource.uri;
    } else {
      const asset = Asset.fromModule(logoSource);
      if (!asset?.uri && typeof asset?.downloadAsync === "function") {
        await asset.downloadAsync();
      }
      uri = asset?.localUri || asset?.uri || null;
    }
  } catch {
    uri = null;
  }

  // Last-resort: try RN resolver if present.
  if (!uri) {
    try {
      const resolver =
        Image?.resolveAssetSource || Image?.default?.resolveAssetSource || null;
      const resolved = resolver ? resolver(logoSource) : null;
      uri = resolved?.uri || null;
    } catch {
      uri = null;
    }
  }

  if (!uri) return null;
  if (Platform.OS === "web") return uri;
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: BASE64_ENCODING,
    });
    return `data:image/png;base64,${base64}`;
  } catch {
    return uri;
  }
};

const prepareReceiptHtml = async ({ payment, payer, recipient, business, logo, icon }) => {
  const contact = getAppContactSnapshot();
  // Receipts should always show the global app contact info (admin-controlled),
  // even if a screen passes a `business` object for branding.
  const businessInfo = {
    name: "MediLink Kenya",
    ...(business || {}),
    address: contact?.address || business?.address || "Nairobi, Kenya",
    phone: contact?.phone || business?.phone || "+254 700 000 000",
    email: contact?.email || business?.email || "support@medilink.co.ke",
  };
  const logoDataUri = await resolveLogoDataUri(logo || DEFAULT_LOGO);
  const iconDataUri = await resolveLogoDataUri(icon || DEFAULT_APP_ICON);
  const html = buildReceiptHtml({
    payment,
    payer,
    recipient,
    business: businessInfo,
    logoDataUri,
    iconDataUri,
  });
  const filename = `receipt-${payment?.receiptNumber || payment?.id || "payment"}.pdf`;
  return { html, filename };
};

export const previewReceipt = async ({ payment, payer, recipient, business, logo, icon }) => {
  const { html } = await prepareReceiptHtml({ payment, payer, recipient, business, logo, icon });

  if (Platform.OS === "web") {
    if (typeof document !== "undefined") {
      const win = window.open("", "_blank");
      if (win) {
        win.document.write(html);
        win.document.close();
        win.focus();
      }
    }
    return { previewed: true };
  }

  await Print.printAsync({ html });
  return { previewed: true };
};

export const exportReceipt = async ({ payment, payer, recipient, business, logo, icon }) => {
  const { html, filename } = await prepareReceiptHtml({
    payment,
    payer,
    recipient,
    business,
    logo,
    icon,
  });

  if (Platform.OS === "web") {
    try {
      const result = await Print.printToFileAsync({ html });
      if (result?.uri && typeof document !== "undefined") {
        const link = document.createElement("a");
        link.href = result.uri;
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      return { shared: false, downloaded: true };
    } catch {
      if (typeof document !== "undefined") {
        const win = window.open("", "_blank");
        if (win) {
          win.document.write(html);
          win.document.close();
          win.focus();
          win.print();
        }
      }
      return { shared: false, downloaded: true };
    }
  }

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    dialogTitle: "Receipt",
    UTI: "com.adobe.pdf",
  });
  return { shared: true, downloaded: false };
};
