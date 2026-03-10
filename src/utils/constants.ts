export const ENDPOINTS = {
  auth: {
    register: "/api/auth/register",
    login: "/api/auth/login",
  },
  users: {
    profile: "/api/users/profile",
  },
  deals: {
    base: "/api/deals",
  },
  categories: "/api/categories",
  stores: "/api/stores",
  favorites: "/api/favorites",
  search: "/api/search",
} as const;
