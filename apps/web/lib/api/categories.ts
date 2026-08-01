import { apiFetch } from '../api-client';

export interface CategoryData {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  isActive: boolean;
  parent?: CategoryData | null;
  children?: CategoryData[];
  createdAt: string;
}

export async function getCategories() {
  return apiFetch<CategoryData[]>('/categories');
}

export async function getCategory(id: string) {
  return apiFetch<CategoryData>(`/categories/${id}`);
}

export async function createCategory(data: { name: string; slug?: string; parentId?: string }) {
  return apiFetch<CategoryData>('/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCategory(id: string, data: { name?: string; parentId?: string; isActive?: boolean }) {
  return apiFetch<CategoryData>(`/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteCategory(id: string) {
  return apiFetch<{ success: boolean }>(`/categories/${id}`, {
    method: 'DELETE',
  });
}
