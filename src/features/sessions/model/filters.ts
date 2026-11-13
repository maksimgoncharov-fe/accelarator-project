import type { SessionFilters } from '../../../api/index.ts'

export function isFiltered(filters: SessionFilters): boolean {
  return Boolean(filters.query?.trim()) || Boolean(filters.status)
}
