import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  permissions: [], // lista de módulos permitidos: ['dashboard', 'mesas', ...]
  isAuthenticated: false,
  isLoading: true,
  login: (user, permissions = []) => set({ user, permissions, isAuthenticated: true, isLoading: false }),
  logout: () => set({ user: null, permissions: [], isAuthenticated: false, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  setPermissions: (permissions) => set({ permissions }),
  hasPermission: (module) => {
    // ADMIN siempre tiene acceso total
    const state = useAuthStore.getState();
    if (state.user?.role === 'ADMIN') return true;
    return state.permissions.includes(module);
  },
}));
