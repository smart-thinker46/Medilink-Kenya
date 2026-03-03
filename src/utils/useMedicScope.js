import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import apiClient from "@/utils/api";
import { useAuthStore } from "@/utils/auth/store";
import { useAdminContextStore } from "@/utils/admin/store";

export default function useMedicScope() {
  const { auth } = useAuthStore();
  const role = String(auth?.user?.role || "").toUpperCase();
  const isSuperAdmin = role === "SUPER_ADMIN";
  const accountMedicUserId = auth?.user?.id || auth?.user?.userId || null;

  const { selectedMedicUserId, setSelectedMedicUserId } = useAdminContextStore();

  const medicsQuery = useQuery({
    queryKey: ["admin-medics", "medic-scope"],
    queryFn: () => apiClient.getMedics({}),
    enabled: isSuperAdmin,
  });

  const medics = useMemo(
    () => (Array.isArray(medicsQuery.data) ? medicsQuery.data : []),
    [medicsQuery.data],
  );

  useEffect(() => {
    if (!isSuperAdmin) return;
    if (!medics.length) return;
    const hasSelected = medics.some((medic) => medic?.id === selectedMedicUserId);
    if (!hasSelected) {
      setSelectedMedicUserId(medics[0]?.id || null);
    }
  }, [isSuperAdmin, medics, selectedMedicUserId, setSelectedMedicUserId]);

  const medicUserId = isSuperAdmin
    ? selectedMedicUserId || medics[0]?.id || null
    : accountMedicUserId;

  const selectedMedic = medics.find((medic) => medic?.id === medicUserId) || null;

  return {
    isSuperAdmin,
    medicUserId,
    medics,
    selectedMedic,
    setSelectedMedicUserId,
    isLoadingScope: isSuperAdmin ? medicsQuery.isLoading : false,
  };
}

