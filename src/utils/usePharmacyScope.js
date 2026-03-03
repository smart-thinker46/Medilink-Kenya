import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import apiClient from "@/utils/api";
import { useAuthStore } from "@/utils/auth/store";
import { useAdminContextStore } from "@/utils/admin/store";

export default function usePharmacyScope() {
  const { auth } = useAuthStore();
  const role = String(auth?.user?.role || "").toUpperCase();
  const isSuperAdmin = role === "SUPER_ADMIN";
  const accountTenantId = auth?.tenantId || auth?.tenant?.id || null;

  const { selectedPharmacyTenantId, setSelectedPharmacyTenantId } =
    useAdminContextStore();

  const tenantsQuery = useQuery({
    queryKey: ["admin-tenants", "pharmacy-scope"],
    queryFn: () => apiClient.getTenants(),
    enabled: isSuperAdmin,
  });

  const pharmacies = useMemo(
    () =>
      (Array.isArray(tenantsQuery.data) ? tenantsQuery.data : []).filter(
        (tenant) => String(tenant?.type || "").toUpperCase() === "PHARMACY",
      ),
    [tenantsQuery.data],
  );

  useEffect(() => {
    if (!isSuperAdmin) return;
    if (!pharmacies.length) return;
    const hasSelected = pharmacies.some(
      (tenant) => tenant?.id === selectedPharmacyTenantId,
    );
    if (!hasSelected) {
      setSelectedPharmacyTenantId(pharmacies[0]?.id || null);
    }
  }, [
    isSuperAdmin,
    pharmacies,
    selectedPharmacyTenantId,
    setSelectedPharmacyTenantId,
  ]);

  const pharmacyId = isSuperAdmin
    ? selectedPharmacyTenantId || pharmacies[0]?.id || null
    : accountTenantId;

  const selectedPharmacy = pharmacies.find((tenant) => tenant?.id === pharmacyId) || null;

  return {
    isSuperAdmin,
    pharmacyId,
    pharmacies,
    selectedPharmacy,
    setSelectedPharmacyTenantId,
    isLoadingScope: isSuperAdmin ? tenantsQuery.isLoading : false,
  };
}

