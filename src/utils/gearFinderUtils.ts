import { GearProfile } from '../types';

export type GearSortColumn = 'name' | 'type' | 'profile' | 'validation' | 'export' | 'guid';
export type SortDirection = 'asc' | 'desc';

export interface GearFinderFilters {
  searchTerm: string;
  type: string;
  profileStatus: string;
  validationStatus: string;
  exportStatus: string;
  aliasContains: string;
}

export const PROFILE_STATUS_SEVERITY: Record<string, number> = {
  FAIL: 1,
  CRITICAL: 1,
  CHECK: 2,
  PARTIAL_WITH_FALLBACK: 3,
  PARTIAL: 4,
  WARN: 5,
  PASS: 6
};

export const EXPORT_STATUS_SEVERITY: Record<string, number> = {
  FAIL: 1,
  CRITICAL: 1,
  CHECK: 2,
  PARTIAL: 3,
  WARN: 4,
  PASS: 5,
  NA: 6,
  'N/A': 6
};

export function getProfileStatusRank(status: string | undefined): number {
  if (!status) return 99;
  return PROFILE_STATUS_SEVERITY[status.toUpperCase()] ?? 50;
}

export function getExportStatusRank(status: string | null | undefined): number {
  if (!status || status === 'N/A') return 6;
  return EXPORT_STATUS_SEVERITY[status.toUpperCase()] ?? 50;
}

export function getValidationStatusRank(profile: GearProfile): number {
  const isAt5p = profile.validationStatus === 'at5p_validated' || profile.validationStatus === 'verified_at5p';
  return isAt5p ? 2 : 1; // Unverified / standard first in ascending (needs validation)
}

/**
 * Filter gear profiles according to combined criteria (AND logic).
 * Does not mutate the source array.
 */
export function filterGearProfiles(
  profiles: GearProfile[],
  filters: GearFinderFilters,
  getExportStatus?: (profile: GearProfile) => string | null
): GearProfile[] {
  const term = filters.searchTerm.toLowerCase().trim();
  const aliasQuery = filters.aliasContains.toLowerCase().trim();
  const typeFilter = filters.type.toLowerCase().trim();
  const profileStatusFilter = filters.profileStatus.toLowerCase().trim();
  const validationFilter = filters.validationStatus.toLowerCase().trim();
  const exportFilter = filters.exportStatus.toUpperCase().trim();

  return profiles.filter(p => {
    // 1. Search term: matches display name or GUID (and matches aliases if alias refinement filter is empty)
    if (term) {
      const matchName = p.displayName.toLowerCase().includes(term);
      const matchGuid = Boolean(p.guid && p.guid.toLowerCase().includes(term));
      const matchAlias = Boolean(!aliasQuery && p.aliases && p.aliases.some(a => a.toLowerCase().includes(term)));
      if (!matchName && !matchGuid && !matchAlias) {
        return false;
      }
    }

    // 2. Type filter
    if (typeFilter !== 'all' && p.type.toLowerCase() !== typeFilter) {
      return false;
    }

    // 3. Profile status filter
    if (profileStatusFilter !== 'all') {
      const pStatus = (p.validation?.status || '').toLowerCase();
      if (pStatus !== profileStatusFilter) {
        return false;
      }
    }

    // 4. Validation status filter
    if (validationFilter !== 'all') {
      const isAt5p = p.validationStatus === 'at5p_validated' || p.validationStatus === 'verified_at5p';
      if (validationFilter === 'validated' && !isAt5p) return false;
      if (validationFilter === 'unvalidated' && isAt5p) return false;
    }

    // 5. Export status filter
    if (exportFilter !== 'ALL') {
      const exportStatus = getExportStatus ? (getExportStatus(p) || 'NA').toUpperCase() : 'NA';
      if (exportFilter === 'NA' && exportStatus !== 'NA' && exportStatus !== 'N/A') {
        return false;
      }
      if (exportFilter !== 'NA' && exportStatus !== exportFilter) {
        return false;
      }
    }

    // 6. Dedicated Alias filter (case-insensitive substring)
    if (aliasQuery) {
      const matchAlias = Boolean(p.aliases && p.aliases.some(a => a.toLowerCase().includes(aliasQuery)));
      if (!matchAlias) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Stable, deterministic sorting for gear profiles.
 * Never mutates the source array.
 * Uses intentional severity ordering for status columns.
 * Falls back to Name A-Z, then stable profile ID.
 */
export function sortGearProfiles(
  profiles: GearProfile[],
  sortColumn: GearSortColumn,
  sortDirection: SortDirection,
  getExportStatus?: (profile: GearProfile) => string | null
): GearProfile[] {
  const copy = [...profiles];

  return copy.sort((a, b) => {
    let cmp = 0;

    switch (sortColumn) {
      case 'name':
        cmp = a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' });
        break;

      case 'type':
        cmp = (a.type || '').localeCompare(b.type || '', undefined, { sensitivity: 'base' });
        break;

      case 'profile': {
        const rankA = getProfileStatusRank(a.validation?.status);
        const rankB = getProfileStatusRank(b.validation?.status);
        cmp = rankA - rankB;
        break;
      }

      case 'validation': {
        const rankA = getValidationStatusRank(a);
        const rankB = getValidationStatusRank(b);
        cmp = rankA - rankB;
        break;
      }

      case 'export': {
        const statusA = getExportStatus ? getExportStatus(a) : null;
        const statusB = getExportStatus ? getExportStatus(b) : null;
        const rankA = getExportStatusRank(statusA);
        const rankB = getExportStatusRank(statusB);
        cmp = rankA - rankB;
        break;
      }

      case 'guid': {
        const guidA = a.guid || '';
        const guidB = b.guid || '';
        if (!guidA && guidB) cmp = 1;
        else if (guidA && !guidB) cmp = -1;
        else cmp = guidA.localeCompare(guidB, undefined, { sensitivity: 'base' });
        break;
      }
    }

    if (cmp !== 0) {
      return sortDirection === 'asc' ? cmp : -cmp;
    }

    // Deterministic fallback: Name A-Z, then profile ID
    const nameFallback = a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' });
    if (nameFallback !== 0) {
      return nameFallback;
    }
    return (a.id || '').localeCompare(b.id || '');
  });
}

/**
 * Pure client-side pagination calculation.
 */
export function isProfileRowSelected(
  profile: { id: string; guid?: string },
  selectedProfile: { id: string; guid?: string } | null | undefined
): boolean {
  if (!selectedProfile || !selectedProfile.id) return false;
  return selectedProfile.id === profile.id;
}

export interface FinderUIState {
  selectedProfileId: string | null;
  searchTerm: string;
  filters: GearFinderFilters;
  sortColumn: GearSortColumn;
  sortDirection: SortDirection;
  currentPage: number;
  pageSize?: number;
  isFinderExpanded: boolean;
}

export function isFinderModifiedState(state: {
  hasActiveFilters?: boolean;
  filters?: GearFinderFilters;
  searchTerm?: string;
  selectedProfileId: string | null;
  sortColumn: GearSortColumn;
  sortDirection: SortDirection;
  currentPage: number;
}): boolean {
  const activeFilters = state.hasActiveFilters !== undefined
    ? state.hasActiveFilters
    : Boolean(
        (state.searchTerm && state.searchTerm.trim()) ||
        (state.filters && (
          (state.filters.searchTerm && state.filters.searchTerm.trim()) ||
          state.filters.type !== 'all' ||
          state.filters.profileStatus !== 'all' ||
          state.filters.validationStatus !== 'all' ||
          state.filters.exportStatus !== 'all' ||
          (state.filters.aliasContains && state.filters.aliasContains.trim() !== '')
        ))
      );
  return Boolean(
    activeFilters ||
    state.selectedProfileId !== null ||
    state.sortColumn !== 'name' ||
    state.sortDirection !== 'asc' ||
    state.currentPage !== 1
  );
}

export function clearSelectionReducer(state: FinderUIState): FinderUIState {
  return {
    ...state,
    selectedProfileId: null,
    isFinderExpanded: true
  };
}

export function clearFiltersReducer(state: FinderUIState): FinderUIState {
  return {
    ...state,
    searchTerm: '',
    filters: {
      searchTerm: '',
      type: 'all',
      profileStatus: 'all',
      validationStatus: 'all',
      exportStatus: 'all',
      aliasContains: ''
    },
    currentPage: 1
  };
}

export function resetFinderReducer(state: FinderUIState): FinderUIState {
  return {
    ...state,
    selectedProfileId: null,
    searchTerm: '',
    filters: {
      searchTerm: '',
      type: 'all',
      profileStatus: 'all',
      validationStatus: 'all',
      exportStatus: 'all',
      aliasContains: ''
    },
    sortColumn: 'name',
    sortDirection: 'asc',
    currentPage: 1,
    isFinderExpanded: true
  };
}

/**
 * Pure client-side pagination calculation.
 */
export function paginateGearProfiles<T>(
  items: T[],
  page: number,
  pageSize: number
): {
  pagedItems: T[];
  totalPages: number;
  safePage: number;
  totalCount: number;
  startIndex: number;
  endIndex: number;
} {
  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  if (totalCount === 0) {
    return {
      pagedItems: [],
      totalPages: 1,
      safePage: 1,
      totalCount: 0,
      startIndex: 0,
      endIndex: 0
    };
  }

  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalCount);
  const pagedItems = items.slice(startIndex, endIndex);

  return {
    pagedItems,
    totalPages,
    safePage,
    totalCount,
    startIndex: startIndex + 1,
    endIndex
  };
}

/**
 * Returns the first alias matching the aliasQuery for display under Name.
 */
export function getMatchingAlias(aliases: string[] | undefined, aliasQuery: string): string | null {
  if (!aliases || !aliasQuery.trim()) return null;
  const q = aliasQuery.toLowerCase().trim();
  const found = aliases.find(a => a.toLowerCase().includes(q));
  return found || null;
}

/**
 * Shortens a GUID for compact table representation (e.g. 80d8591e...3997).
 */
export function formatShortGuid(guid: string | undefined): string {
  if (!guid || !guid.trim()) return '';
  const trimmed = guid.trim();
  if (trimmed.length <= 14) return trimmed;
  return `${trimmed.slice(0, 8)}...${trimmed.slice(-4)}`;
}
