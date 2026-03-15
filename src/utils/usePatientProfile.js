import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/utils/auth/store";
import apiClient from "@/utils/api";

export const usePatientProfile = () => {
  const { auth, setAuth } = useAuthStore();
  const queryClient = useQueryClient();

  const syncAuthUser = (data) => {
    if (!auth?.user) return;
    const resolved = data?.user || data || {};
    const keys = Object.keys(resolved);
    if (keys.length === 0) return;
    const changed = keys.some((key) => resolved[key] !== auth.user?.[key]);
    if (!changed) return;
    void setAuth({
      ...auth,
      user: { ...auth.user, ...resolved },
    });
  };

  const profileQuery = useQuery({
    queryKey: ["patient-profile"],
    queryFn: () => apiClient.getProfile(),
    enabled: Boolean(auth?.token),
    onSuccess: syncAuthUser,
  });

  const profileData = useMemo(() => {
    const data = profileQuery.data;
    const resolved = data?.user || data || {};
    return {
      ...(auth?.user || {}),
      ...resolved,
    };
  }, [auth?.user, profileQuery.data]);

  const updateMutation = useMutation({
    mutationFn: (payload) => apiClient.updateProfile(payload),
    onSuccess: (data, payload) => {
      const updatedUser = data?.user || data || {};
      const fallbackUser = payload && typeof payload === "object" ? payload : {};
      const merged = Object.keys(updatedUser || {}).length ? updatedUser : fallbackUser;

      if (auth?.user && merged && typeof merged === "object") {
        setAuth({
          ...auth,
          user: { ...auth.user, ...merged },
        });
      }

      // Ensure screens reading from the profile query update immediately, even
      // if the backend returns only `{ success: true }`.
      queryClient.setQueryData(["patient-profile"], (prev) => {
        const existing = prev?.user || prev || {};
        const nextUser = { ...(existing || {}), ...(merged || {}) };
        return prev && typeof prev === "object" && "user" in prev ? { ...prev, user: nextUser } : { user: nextUser };
      });

      queryClient.invalidateQueries({ queryKey: ["patient-profile"] });
    },
  });

  return {
    profile: profileData,
    profileQuery,
    updateProfile: updateMutation,
  };
};
