import axios from "axios";
import { Platform, Linking } from "react-native";
import Constants from "expo-constants";
import { useAuthStore } from "../utils/auth/store";

const normalizeBaseUrl = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const trimmed = raw.replace(/\/+$/, "");
  if (Platform.OS === "android") {
    return trimmed
      .replace("http://localhost:", "http://10.0.2.2:")
      .replace("http://127.0.0.1:", "http://10.0.2.2:");
  }
  return trimmed;
};

const resolveExpoDevHost = () => {
  try {
    const hostUri =
      Constants?.expoConfig?.hostUri ||
      Constants?.manifest2?.extra?.expoGo?.debuggerHost ||
      Constants?.manifest?.debuggerHost ||
      "";
    if (!hostUri) return "";
    return String(hostUri).split(":")[0] || "";
  } catch {
    return "";
  }
};

const resolveApiBaseUrls = () => {
  const primary = normalizeBaseUrl(process.env.EXPO_PUBLIC_BASE_URL);
  const rawFallbacks = String(process.env.EXPO_PUBLIC_BASE_URLS || "").trim();
  const fallbackList = rawFallbacks
    ? rawFallbacks.split(",").map((item) => normalizeBaseUrl(item))
    : [];
  const expoHost = resolveExpoDevHost();
  const autoFallbacks = [
    expoHost ? normalizeBaseUrl(`http://${expoHost}:3000`) : "",
    normalizeBaseUrl("http://10.0.2.2:3000"),
    normalizeBaseUrl("http://localhost:3000"),
  ];
  return Array.from(
    new Set([primary, ...fallbackList, ...autoFallbacks].filter(Boolean)),
  );
};

const API_BASE_URLS = resolveApiBaseUrls();
const API_BASE_URL = API_BASE_URLS[0] || "";

class ApiClient {
  constructor() {
    this.lastUnauthorizedAt = 0;
    this.lastNetworkErrorAt = 0;
    this.hasWarnedBaseUrl = false;
    this.baseUrls = API_BASE_URLS.length ? API_BASE_URLS : [""];
    this.buildApiBase = (base) => (base ? `${base}/api` : "/api");
    this.client = axios.create({
      baseURL: this.buildApiBase(this.baseUrls[0]),
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 15000, // 15 seconds timeout
    });

    // Request Interceptor: Add Auth Token & Tenant ID
    this.client.interceptors.request.use(
      (config) => {
        if (!API_BASE_URL && !this.hasWarnedBaseUrl) {
          this.hasWarnedBaseUrl = true;
          console.error(
            "API Error: EXPO_PUBLIC_BASE_URL is missing. Set it in apps/mobile/.env (or EXPO_PUBLIC_BASE_URLS for fallbacks).",
          );
        }
        const auth = useAuthStore.getState().auth;
        const token = auth?.token || auth?.jwt || auth?.accessToken;

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add tenant header for multi-tenancy
        if (auth?.user?.hospital_id) {
          config.headers["X-Tenant-ID"] = auth.user.hospital_id;
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      },
    );

    // Response Interceptor: Handle 401 & Errors
    this.client.interceptors.response.use(
      (response) => {
        return response.data;
      },
      (error) => {
        const status = error.response?.status;
        const url = error.config?.url || "";
        const data = error.response?.data;
        const isNetworkError = !error.response;
        const isAuthEndpoint =
          url.includes("/auth/login") ||
          url.includes("/auth/signup") ||
          url.includes("/auth/forgot-password") ||
          url.includes("/auth/reset-password");

        if (isNetworkError && error.config) {
          const currentIndex = Number(error.config._baseRetryIndex || 0);
          const nextIndex = currentIndex + 1;
          if (nextIndex < this.baseUrls.length) {
            const nextBase = this.baseUrls[nextIndex];
            error.config._baseRetryIndex = nextIndex;
            error.config.baseURL = this.buildApiBase(nextBase);
            return this.client.request(error.config);
          }
        }

        if (status === 401) {
          const messageText =
            typeof data?.message === "string" ? data.message.toLowerCase() : "";
          if (messageText.includes("suspended") || messageText.includes("blocked")) {
            const currentAuth = useAuthStore.getState().auth;
            if (currentAuth?.user) {
              useAuthStore.getState().setAuth({
                ...currentAuth,
                user: { ...currentAuth.user, status: "suspended", blocked: true },
              });
            }
          }
          // Don't auto-logout during login/signup attempts
          if (!url.includes("/auth/login") && !url.includes("/auth/signup")) {
            if (
              !messageText.includes("suspended") &&
              !messageText.includes("blocked")
            ) {
              useAuthStore.getState().setAuth(null);
            }
          }

          const now = Date.now();
          if (now - this.lastUnauthorizedAt > 3000) {
            console.warn("API Unauthorized: session expired or invalid token.");
            this.lastUnauthorizedAt = now;
          }
        }

        // Extract error message from backend
        let message = data?.message || error.message || "Something went wrong";
        if (isNetworkError) {
          const tried = this.baseUrls.filter(Boolean);
          message = `Network Error. Cannot reach API at ${tried.length ? tried.join(", ") : "[missing EXPO_PUBLIC_BASE_URL]"}. Ensure backend is running and phone can access this host.`;
        }

        const messageText =
          typeof data?.message === "string" ? data.message.toLowerCase() : "";
        const isExpectedAuthFailure =
          isAuthEndpoint &&
          (status === 400 || status === 401) &&
          (messageText.includes("invalid credentials") ||
            messageText.includes("wrong credentials") ||
            messageText.includes("unauthorized"));

        if (status !== 401 && !isExpectedAuthFailure) {
          const now = Date.now();
          if (!isNetworkError || now - this.lastNetworkErrorAt > 5000) {
            console.error("API Error:", message);
            if (isNetworkError) {
              this.lastNetworkErrorAt = now;
            }
          }
        }
        const formattedMessage =
          typeof message === "string" ? message : "Something went wrong";
        const err = new Error(formattedMessage);
        if (data?.missingFields) {
          err.missingFields = data.missingFields;
        }
        if (status) {
          err.status = status;
        }
        throw err;
      },
    );
  }

  // Adapter to keep existing method signature working
  async request(endpoint, options = {}) {
    const { method = "GET", body, headers, ...customConfig } = options;

    const isLikelyFormData = (value) => {
      if (!value || typeof value !== "object") return false;
      if (typeof FormData !== "undefined" && value instanceof FormData) return true;
      if (Array.isArray(value._parts)) return true;
      if (typeof value.append === "function" && typeof value.getParts === "function") {
        return true;
      }
      const tag = Object.prototype.toString.call(value);
      if (tag === "[object FormData]") return true;
      return value?.constructor?.name === "FormData";
    };

    let data;
    const isFormData = isLikelyFormData(body);
    if (body instanceof FormData) {
      data = body;
    } else if (typeof body === "string") {
      data = JSON.parse(body);
    } else {
      data = body;
    }

    const mergedHeaders = {
      ...headers,
    };
    if (isFormData) {
      // Force multipart for RN/Expo where axios defaults can otherwise keep JSON.
      delete mergedHeaders["content-type"];
      mergedHeaders["Content-Type"] = "multipart/form-data";
    }

    const config = {
      url: endpoint,
      method,
      data: data ?? undefined,
      headers: mergedHeaders,
      ...customConfig,
    };

    return this.client(config);
  }

  // Auth endpoints
  async login(email, password) {
    return this.client.post("/auth/login", { email, password });
  }

  async signup(userData) {
    return this.client.post("/auth/signup", userData);
  }

  async forgotPassword(email) {
    return this.client.post("/auth/forgot-password", { email });
  }

  async resetPassword(token, password) {
    return this.client.post("/auth/reset-password", { token, password });
  }

  // User endpoints
  async getProfile() {
    return this.client.get("/users/profile");
  }

  async getSubscriptionPricing() {
    return this.client.get("/subscriptions/pricing");
  }

  async getUserById(id) {
    return this.client.get(`/users/${id}`);
  }

  async getSupportAdmin() {
    return this.client.get("/users/support-admin");
  }

  async updateProfile(data) {
    return this.client.put("/users/profile", data);
  }

  async getMyLocation() {
    return this.client.get("/users/location");
  }

  async updateMyLocation(data) {
    const latitude = Number(data?.latitude ?? data?.lat);
    const longitude = Number(data?.longitude ?? data?.lng);
    const payload = {
      ...data,
      latitude: Number.isFinite(latitude) ? latitude : undefined,
      longitude: Number.isFinite(longitude) ? longitude : undefined,
      lat: Number.isFinite(latitude) ? latitude : undefined,
      lng: Number.isFinite(longitude) ? longitude : undefined,
    };
    return this.client.put("/users/location", payload);
  }

  async getUserLocation(id) {
    return this.client.get(`/users/${id}/location`);
  }

  async getLinkedLocations() {
    return this.client.get("/users/linked-locations");
  }

  async getPatientDashboard(params = {}) {
    return this.client.get("/users/patient-dashboard", { params });
  }

  async addPatientVitals(data, params = {}) {
    return this.client.post("/users/patient-vitals", data, { params });
  }

  async checkPatientMedicationSafety(data, params = {}) {
    return this.client.post("/users/patient-medication-check", data, { params });
  }

  async createPatientHealthShare(data, params = {}) {
    return this.client.post("/users/patient-health-share", data, { params });
  }

  async getSharedPatientHealth(token, params = {}) {
    return this.client.get(`/users/patient-health-share/${encodeURIComponent(String(token || ""))}`, { params });
  }

  async addPatientCarePlanMedication(data, params = {}) {
    return this.client.post("/users/patient-care-plan/medications", data, { params });
  }

  async markPatientMedicationTaken(medicationId, params = {}) {
    return this.client.post(`/users/patient-care-plan/medications/${medicationId}/take`, {}, { params });
  }

  async markPatientMedicationMissed(medicationId, params = {}) {
    return this.client.post(`/users/patient-care-plan/medications/${medicationId}/miss`, {}, { params });
  }

  // Appointments
  async getAppointments(params = {}) {
    return this.client.get("/appointments", { params });
  }

  async createAppointment(data) {
    return this.client.post("/appointments", data);
  }

  async updateAppointment(id, data) {
    return this.client.put(`/appointments/${id}`, data);
  }

  // Medics
  async getMedics(params = {}) {
    return this.client.get("/medics", { params });
  }

  async getMedicById(id) {
    return this.client.get(`/medics/${id}`);
  }

  async approveMedic(medicId) {
    return this.client.post(`/medics/${medicId}/approve`);
  }

  async hireMedic(medicId) {
    return this.client.post(`/medics/${medicId}/hire`);
  }

  async getMedicHires(params = {}) {
    return this.client.get("/medics/hires", { params });
  }

  async getMedicAnalytics(params = {}) {
    return this.client.get("/medics/analytics/me", { params });
  }

  async getPatientHealthStatus(patientId) {
    return this.client.get(`/medics/patients/${patientId}/health-status`);
  }

  async updatePatientHealthStatus(patientId, data) {
    return this.client.post(`/medics/patients/${patientId}/health-status`, data);
  }

  // Medical Records
  async getMedicalRecords(patientId, params = {}) {
    return this.client.get("/medical-records", {
      params: { patient_id: patientId, ...params },
    });
  }

  async getMedicalRecordById(id) {
    return this.client.get(`/medical-records/${id}`);
  }

  async createMedicalRecord(data) {
    return this.client.post("/medical-records", data);
  }

  async createConditionUpdate(data) {
    return this.client.post("/medical-records/condition", data);
  }

  async createPrescription(data) {
    return this.client.post("/medical-records/prescription", data);
  }

  async createClinicalUpdate(data) {
    return this.client.post("/medical-records/clinical-update", data);
  }

  // Shifts
  async getShifts(params = {}) {
    return this.client.get("/shifts", { params });
  }

  async createShift(data) {
    return this.client.post("/shifts", data);
  }

  async applyToShift(shiftId) {
    return this.client.post(`/shifts/${shiftId}/apply`);
  }

  async cancelShiftApplication(shiftId) {
    return this.client.post(`/shifts/${shiftId}/unapply`);
  }

  async updateShift(shiftId, data) {
    return this.client.put(`/shifts/${shiftId}`, data);
  }

  async cancelShift(shiftId, reason) {
    return this.client.put(`/shifts/${shiftId}/cancel`, {
      reason: reason || undefined,
    });
  }

  async deleteShift(shiftId) {
    return this.client.delete(`/shifts/${shiftId}`);
  }

  async getHospitalAnalytics() {
    return this.client.get("/shifts/analytics/hospital");
  }

  // Pharmacy
  async getProducts(pharmacyId, params = {}) {
    if (!pharmacyId) {
      throw new Error("Pharmacy tenant not found for this account.");
    }
    return this.client.get(`/pharmacy/${pharmacyId}/products`, { params });
  }

  async getPharmacyMarketplace(params = {}) {
    return this.client.get("/pharmacy/marketplace", { params });
  }

  async getProductById(productId) {
    return this.client.get(`/pharmacy/products/${productId}`);
  }

  async createProduct(pharmacyId, data) {
    if (!pharmacyId) {
      throw new Error("Pharmacy tenant not found for this account.");
    }
    return this.client.post(`/pharmacy/${pharmacyId}/products`, data);
  }

  async updateProduct(pharmacyId, productId, data) {
    if (!pharmacyId) {
      throw new Error("Pharmacy tenant not found for this account.");
    }
    return this.client.put(`/pharmacy/${pharmacyId}/products/${productId}`, data);
  }

  async deleteProduct(pharmacyId, productId) {
    if (!pharmacyId) {
      throw new Error("Pharmacy tenant not found for this account.");
    }
    return this.client.delete(`/pharmacy/${pharmacyId}/products/${productId}`);
  }

  async getPharmacyStockMovements(pharmacyId, params = {}) {
    if (!pharmacyId) {
      throw new Error("Pharmacy tenant not found for this account.");
    }
    return this.client.get(`/pharmacy/${pharmacyId}/stock-movements`, { params });
  }

  async getPharmacyAnalytics(pharmacyId, params = {}) {
    if (!pharmacyId) {
      throw new Error("Pharmacy tenant not found for this account.");
    }
    return this.client.get(`/pharmacy/${pharmacyId}/analytics`, { params });
  }

  async trackPharmacyEvent(pharmacyId, payload = {}) {
    if (!pharmacyId) {
      throw new Error("Pharmacy tenant not found for this account.");
    }
    return this.client.post(`/pharmacy/${pharmacyId}/events`, payload);
  }

  async getPharmacyReorderDraft(pharmacyId, params = {}) {
    if (!pharmacyId) {
      throw new Error("Pharmacy tenant not found for this account.");
    }
    return this.client.get(`/pharmacy/${pharmacyId}/reorder-draft`, { params });
  }

  async createPharmacyReorderDraft(pharmacyId, payload = {}) {
    if (!pharmacyId) {
      throw new Error("Pharmacy tenant not found for this account.");
    }
    return this.client.post(`/pharmacy/${pharmacyId}/reorder-draft`, payload);
  }

  async runPharmacySmartAlerts(pharmacyId, payload = {}) {
    if (!pharmacyId) {
      throw new Error("Pharmacy tenant not found for this account.");
    }
    return this.client.post(`/pharmacy/${pharmacyId}/smart-alerts/run`, payload);
  }

  // Hospital inventory (uses unified pharmacy inventory endpoints with hospital tenant id)
  async getHospitalInventoryProducts(hospitalTenantId, params = {}) {
    return this.getProducts(hospitalTenantId, params);
  }

  async createHospitalInventoryProduct(hospitalTenantId, data) {
    return this.createProduct(hospitalTenantId, data);
  }

  async updateHospitalInventoryProduct(hospitalTenantId, productId, data) {
    return this.updateProduct(hospitalTenantId, productId, data);
  }

  async deleteHospitalInventoryProduct(hospitalTenantId, productId) {
    return this.deleteProduct(hospitalTenantId, productId);
  }

  async getHospitalInventoryStockMovements(hospitalTenantId, params = {}) {
    return this.getPharmacyStockMovements(hospitalTenantId, params);
  }

  // Orders
  async getOrders(params = {}) {
    return this.client.get("/orders", { params });
  }

  async createOrder(data) {
    return this.client.post("/orders", data);
  }

  // Payments
  async createPayment(data) {
    const payload = {
      ...(data || {}),
      method: "intasend",
    };
    const payment = await this.client.post("/payments", payload);
    const checkoutUrl =
      payment?.checkoutUrl ||
      payment?.gatewayResponse?.url ||
      payment?.gatewayResponse?.checkout_url ||
      null;
    if (checkoutUrl && data?.openCheckout !== false) {
      try {
        await Linking.openURL(String(checkoutUrl));
      } catch {
        // Ignore browser launch failures and let caller handle fallback UX.
      }
    }
    return payment;
  }

  async getPaymentMethods() {
    return this.client.get("/payments/methods");
  }

  async getPaymentRates() {
    return this.client.get("/payments/rates");
  }

  async getPaymentHistory(params = {}) {
    return this.client.get("/payments/history", { params });
  }

  async getWallet(ownerId) {
    return this.client.get("/payments/wallet", {
      params: ownerId ? { ownerId } : {},
    });
  }

  async requestWalletWithdrawal(payload = {}) {
    return this.client.post("/payments/wallet/withdrawal", payload);
  }

  // Video calls
  async getVideoCallToken(payload) {
    return this.client.post("/video-calls/token", payload);
  }

  async getVideoCallHistory() {
    return this.client.get("/video-calls/history");
  }

  // Notifications
  async getNotifications() {
    return this.client.get("/notifications");
  }

  async markNotificationAsRead(id) {
    return this.client.put(`/notifications/${id}/read`);
  }

  async requestSupportChat(payload = {}) {
    return this.client.post("/notifications/support-chat/request", payload);
  }

  async respondSupportChatRequest(requestId, accept) {
    return this.client.post("/notifications/support-chat/respond", {
      requestId,
      accept: Boolean(accept),
    });
  }

  // Statistics
  async getStats(type = "overview") {
    return this.client.get("/statistics", { params: { type } });
  }

  // Admin
  async getAdminOverview() {
    return this.client.get("/admin/overview");
  }

  async getTenants(params = {}) {
    return this.client.get("/tenants", { params });
  }

  async getAdminUsers(params = {}) {
    return this.client.get("/admin/users", { params });
  }

  async verifyAdminUser(userId, verified = true) {
    return this.client.put(`/admin/users/${userId}/verify`, { verified });
  }

  async verifyAdminUsersBulk(userIds = [], verified = true) {
    return this.client.put("/admin/users/verify/bulk", { userIds, verified });
  }

  async blockAdminUser(userId, blocked = true) {
    return this.client.put(`/admin/users/${userId}/block`, { blocked });
  }

  async adminSendNotification(payload) {
    return this.client.put("/admin/notifications", payload);
  }

  async adminGetNotifications() {
    return this.client.get("/admin/notifications");
  }

  async adminSendMessage(payload) {
    return this.client.put("/admin/messages", payload);
  }

  async adminGetComplaints() {
    return this.client.get("/admin/complaints");
  }

  async adminResolveComplaint(id, payload) {
    return this.client.put(`/admin/complaints/${id}/resolve`, payload);
  }

  async adminGetSubscriptions() {
    return this.client.get("/admin/subscriptions");
  }

  async adminUpdateSubscription(id, status) {
    return this.client.put(`/admin/subscriptions/${id}/status`, { status });
  }

  async adminGetSubscriptionPricing() {
    return this.client.get("/admin/subscription-pricing");
  }

  async adminUpdateSubscriptionPricing(payload) {
    return this.client.put("/admin/subscription-pricing", payload);
  }

  async adminCreateUser(payload) {
    return this.client.post("/admin/users", payload);
  }

  async adminUpdateUser(userId, payload) {
    return this.client.put(`/admin/users/${userId}`, payload);
  }

  async adminDeleteUser(userId) {
    return this.client.delete(`/admin/users/${userId}`);
  }

  async adminGetAuditLogs() {
    return this.client.get("/admin/audit-logs");
  }

  async adminGetShifts() {
    return this.client.get("/admin/shifts");
  }

  async adminGetHiring() {
    return this.client.get("/admin/hiring");
  }

  async adminGetOperations() {
    return this.client.get("/admin/operations");
  }

  async adminGetActivityReport() {
    return this.client.get("/admin/reports/activities");
  }

  async adminGetShiftMigrationDiagnostics(params = {}) {
    return this.client.get("/admin/diagnostics/shifts", { params });
  }

  async adminRunShiftBackfill() {
    return this.client.post("/admin/diagnostics/shifts/backfill");
  }

  async adminGetControlCenter() {
    return this.client.get("/admin/control-center");
  }

  async adminGetRolePermissions() {
    return this.client.get("/admin/role-permissions");
  }

  async adminUpdateRolePermissions(matrix) {
    return this.client.put("/admin/role-permissions", { matrix });
  }

  async adminGetKycQueue() {
    return this.client.get("/admin/kyc-queue");
  }

  async adminReviewKyc(userId, payload = {}) {
    return this.client.put(`/admin/kyc-queue/${userId}`, payload);
  }

  async adminGetRevenueIntelligence() {
    return this.client.get("/admin/revenue-intelligence");
  }

  async adminGetFraudCenter() {
    return this.client.get("/admin/fraud-center");
  }

  async adminCreateFraudCase(payload = {}) {
    return this.client.post("/admin/fraud-cases", payload);
  }

  async adminUpdateFraudCase(id, payload = {}) {
    return this.client.put(`/admin/fraud-cases/${id}`, payload);
  }

  async adminGetSupportCenter() {
    return this.client.get("/admin/support-center");
  }

  async adminCreateSupportTicket(payload = {}) {
    return this.client.post("/admin/support-tickets", payload);
  }

  async adminUpdateSupportTicket(id, payload = {}) {
    return this.client.put(`/admin/support-tickets/${id}`, payload);
  }

  async adminGetPlatformHealth() {
    return this.client.get("/admin/platform-health");
  }

  async adminGetContentPolicies() {
    return this.client.get("/admin/content-policies");
  }

  async adminCreateContentPolicy(payload = {}) {
    return this.client.post("/admin/content-policies", payload);
  }

  async adminPublishContentPolicy(id, payload = {}) {
    return this.client.put(`/admin/content-policies/${id}/publish`, payload);
  }

  async adminGetPolicyAcceptances(id) {
    return this.client.get(`/admin/content-policies/${id}/acceptances`);
  }

  async adminCreatePolicyAcceptance(id, payload = {}) {
    return this.client.post(`/admin/content-policies/${id}/acceptances`, payload);
  }

  async adminGetEmergencyOps() {
    return this.client.get("/admin/emergency-ops");
  }

  async adminCreateEmergencyIncident(payload = {}) {
    return this.client.post("/admin/emergency-ops", payload);
  }

  async adminUpdateEmergencyIncident(id, payload = {}) {
    return this.client.put(`/admin/emergency-ops/${id}`, payload);
  }

  async adminGetComplianceRequests() {
    return this.client.get("/admin/compliance-requests");
  }

  async adminCreateComplianceRequest(payload = {}) {
    return this.client.post("/admin/compliance-requests", payload);
  }

  async adminUpdateComplianceRequest(id, payload = {}) {
    return this.client.put(`/admin/compliance-requests/${id}`, payload);
  }

  async adminExportComplianceSnapshot(payload = {}) {
    return this.client.post("/admin/compliance-requests/export", payload);
  }

  async adminGetFeatureFlags() {
    return this.client.get("/admin/feature-flags");
  }

  async adminUpdateFeatureFlags(flags = {}) {
    return this.client.put("/admin/feature-flags", { flags });
  }

  async adminGetDisputes() {
    return this.client.get("/admin/disputes");
  }

  async adminCreateDispute(payload = {}) {
    return this.client.post("/admin/disputes", payload);
  }

  async adminUpdateDispute(id, payload = {}) {
    return this.client.put(`/admin/disputes/${id}`, payload);
  }

  async adminCreateRefund(payload = {}) {
    return this.client.post("/admin/refunds", payload);
  }

  // Complaints
  async createComplaint(payload) {
    return this.client.post("/complaints", payload);
  }

  async getMyComplaints() {
    return this.client.get("/complaints/my");
  }

  // Subscriptions
  async createSubscription(payload) {
    return this.client.post("/subscriptions", payload);
  }

  async cancelSubscription(id) {
    return this.client.put(`/subscriptions/${id}/cancel`);
  }

  // Messages
  async getChatThread(userId) {
    return this.client.get("/messages/thread", { params: { userId } });
  }

  async sendChatMessage(payload) {
    return this.client.post("/messages/send", payload);
  }

  async getChatConversations() {
    return this.client.get("/messages/conversations");
  }

  async markChatRead(userId) {
    return this.client.put("/messages/read", { userId });
  }

  async deleteChatMessage(messageId) {
    return this.client.delete(`/messages/${messageId}`);
  }

  async deleteChatMessageForEveryone(messageId) {
    return this.client.delete(`/messages/${messageId}/everyone`);
  }

  // AI
  async aiHealthSummary(payload = {}) {
    return this.client.post("/ai/health-summary", payload);
  }

  async aiSearch(payload = {}) {
    return this.client.post("/ai/search", payload);
  }

  async aiAnalyticsSummary(payload = {}) {
    return this.client.post("/ai/analytics-summary", payload);
  }

  async aiAssistant(payload = {}) {
    return this.client.post("/ai/assistant", payload);
  }

  async aiGetSettings() {
    return this.client.get("/ai/settings");
  }

  async aiUpdateSettings(payload = {}) {
    return this.client.put("/ai/settings", payload);
  }

  async aiVoiceCreateSession(payload = {}) {
    return this.client.post("/ai/voice/session", payload);
  }

  async aiVoiceHistory(params = {}) {
    return this.client.get("/ai/voice/history", { params });
  }

  async aiVoiceTool(payload = {}) {
    return this.client.post("/ai/voice/tool", payload);
  }

  async uploadFile(file) {
    const formData = new FormData();
    formData.append("file", file);
    return this.request("/uploads", {
      method: "POST",
      body: formData,
    });
  }
}

export default new ApiClient();
