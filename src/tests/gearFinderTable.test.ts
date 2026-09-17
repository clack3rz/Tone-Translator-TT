import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  filterGearProfiles,
  sortGearProfiles,
  paginateGearProfiles,
  formatShortGuid,
  getMatchingAlias,
  GearFinderFilters,
  getProfileStatusRank,
  FinderUIState,
  clearSelectionReducer,
  clearFiltersReducer,
  resetFinderReducer,
  isProfileRowSelected,
  isFinderModifiedState
} from '../utils/gearFinderUtils';
import { GearProfile } from '../types';

const mockProfiles: GearProfile[] = [
  {
    id: 'gear-3',
    displayName: 'Super Overdrive',
    type: 'stomp',
    guid: '11112222-3333-4444-5555-666677778888',
    slot: 'Stomp',
    aliases: ['SD-1', 'Yellow Drive'],
    parameters: [],
    rawSources: {},
    validation: { status: 'PASS', gaps: [] }
  },
  {
    id: 'gear-1',
    displayName: 'Brit 800',
    type: 'amp',
    guid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    slot: 'Amp',
    aliases: ['JCM 800', 'British Lead'],
    parameters: [],
    rawSources: {},
    validation: { status: 'WARN', gaps: ['Missing parameter'] }
  },
  {
    id: 'gear-4',
    displayName: 'Brit 800 Vintage',
    type: 'amp',
    guid: '',
    slot: 'Amp',
    aliases: ['JCM 800 V'],
    parameters: [],
    rawSources: {},
    validation: { status: 'FAIL', gaps: ['Missing GUID'] }
  },
  {
    id: 'gear-2',
    displayName: 'American 4x12',
    type: 'cab',
    guid: '22223333-4444-5555-6666-777788889999',
    slot: 'Cab',
    aliases: ['Recto 4x12', 'Oversized Cab'],
    parameters: [],
    rawSources: {},
    validationStatus: 'at5p_validated',
    validation: { status: 'CHECK', gaps: [] }
  },
  {
    id: 'gear-5',
    displayName: 'Chorus Ensemble',
    type: 'stomp',
    guid: '33334444-5555-6666-7777-888899990000',
    slot: 'Stomp',
    aliases: ['CE-1', 'Stereo Chorus'],
    parameters: [],
    rawSources: {},
    validation: { status: 'PARTIAL', gaps: [] }
  }
];

const defaultFilters: GearFinderFilters = {
  searchTerm: '',
  type: 'all',
  profileStatus: 'all',
  validationStatus: 'all',
  exportStatus: 'all',
  aliasContains: ''
};

describe('Gear Finder Table Utilities', () => {
  it('default sort is Name A-Z and does not mutate source array', () => {
    const originalSnapshot = JSON.stringify(mockProfiles);
    const sorted = sortGearProfiles(mockProfiles, 'name', 'asc');

    assert.strictEqual(sorted.length, mockProfiles.length);
    assert.strictEqual(sorted[0].displayName, 'American 4x12');
    assert.strictEqual(sorted[1].displayName, 'Brit 800');
    assert.strictEqual(sorted[2].displayName, 'Brit 800 Vintage');
    assert.strictEqual(sorted[3].displayName, 'Chorus Ensemble');
    assert.strictEqual(sorted[4].displayName, 'Super Overdrive');

    // Confirm source array was NOT mutated
    assert.strictEqual(JSON.stringify(mockProfiles), originalSnapshot);
  });

  it('sorts Name descending Z-A', () => {
    const sorted = sortGearProfiles(mockProfiles, 'name', 'desc');
    assert.strictEqual(sorted[0].displayName, 'Super Overdrive');
    assert.strictEqual(sorted[sorted.length - 1].displayName, 'American 4x12');
  });

  it('sorts Type column ascending and descending', () => {
    const sortedAsc = sortGearProfiles(mockProfiles, 'type', 'asc');
    assert.strictEqual(sortedAsc[0].type, 'amp');

    const sortedDesc = sortGearProfiles(mockProfiles, 'type', 'desc');
    assert.strictEqual(sortedDesc[0].type, 'stomp');
  });

  it('sorts Profile status by intentional severity order: FAIL -> CHECK -> PARTIAL -> WARN -> PASS', () => {
    // Check ranks
    assert.ok(getProfileStatusRank('FAIL') < getProfileStatusRank('CHECK'));
    assert.ok(getProfileStatusRank('CHECK') < getProfileStatusRank('PARTIAL'));
    assert.ok(getProfileStatusRank('PARTIAL') < getProfileStatusRank('WARN'));
    assert.ok(getProfileStatusRank('WARN') < getProfileStatusRank('PASS'));

    const sorted = sortGearProfiles(mockProfiles, 'profile', 'asc');
    const statuses = sorted.map(p => p.validation.status);

    assert.deepStrictEqual(statuses, ['FAIL', 'CHECK', 'PARTIAL', 'WARN', 'PASS']);
  });

  it('sorts Profile status descending: PASS -> WARN -> PARTIAL -> CHECK -> FAIL', () => {
    const sorted = sortGearProfiles(mockProfiles, 'profile', 'desc');
    const statuses = sorted.map(p => p.validation.status);

    assert.deepStrictEqual(statuses, ['PASS', 'WARN', 'PARTIAL', 'CHECK', 'FAIL']);
  });

  it('provides stable deterministic tie-breaking for equal values using Name A-Z then ID', () => {
    const ties: GearProfile[] = [
      { id: 'b', displayName: 'Zeta', type: 'amp', guid: '1', slot: '', aliases: [], parameters: [], rawSources: {}, validation: { status: 'PASS', gaps: [] } },
      { id: 'a', displayName: 'Alpha', type: 'amp', guid: '2', slot: '', aliases: [], parameters: [], rawSources: {}, validation: { status: 'PASS', gaps: [] } },
      { id: 'c', displayName: 'Alpha', type: 'amp', guid: '3', slot: '', aliases: [], parameters: [], rawSources: {}, validation: { status: 'PASS', gaps: [] } }
    ];

    const sorted = sortGearProfiles(ties, 'type', 'asc');
    assert.strictEqual(sorted[0].displayName, 'Alpha');
    assert.strictEqual(sorted[0].id, 'a');
    assert.strictEqual(sorted[1].displayName, 'Alpha');
    assert.strictEqual(sorted[1].id, 'c');
    assert.strictEqual(sorted[2].displayName, 'Zeta');
  });

  it('sorts GUID with missing GUIDs deterministically grouped', () => {
    const sorted = sortGearProfiles(mockProfiles, 'guid', 'asc');
    // Items with GUID sorted first alphabetically, empty GUID at the end
    assert.strictEqual(sorted[sorted.length - 1].guid, '');
  });

  it('filters by combined search term, type, status, and alias', () => {
    const filteredType = filterGearProfiles(mockProfiles, {
      ...defaultFilters,
      type: 'amp'
    });
    assert.strictEqual(filteredType.length, 2);

    const filteredSearch = filterGearProfiles(mockProfiles, {
      ...defaultFilters,
      searchTerm: 'Brit 800'
    });
    assert.strictEqual(filteredSearch.length, 2);

    const filteredAlias = filterGearProfiles(mockProfiles, {
      ...defaultFilters,
      aliasContains: 'Recto'
    });
    assert.strictEqual(filteredAlias.length, 1);
    assert.strictEqual(filteredAlias[0].displayName, 'American 4x12');
  });

  it('alias contains is case-insensitive and combined with AND', () => {
    const combined = filterGearProfiles(mockProfiles, {
      ...defaultFilters,
      type: 'stomp',
      aliasContains: 'yellow'
    });
    assert.strictEqual(combined.length, 1);
    assert.strictEqual(combined[0].displayName, 'Super Overdrive');

    const noMatch = filterGearProfiles(mockProfiles, {
      ...defaultFilters,
      type: 'amp',
      aliasContains: 'yellow'
    });
    assert.strictEqual(noMatch.length, 0);
  });

  it('extracts matching alias for display under Name only when query is active', () => {
    const alias1 = getMatchingAlias(['JCM 800', 'British Lead'], 'lead');
    assert.strictEqual(alias1, 'British Lead');

    const aliasEmpty = getMatchingAlias(['JCM 800', 'British Lead'], '');
    assert.strictEqual(aliasEmpty, null);
  });

  it('paginates correctly with default 25 and custom page sizes', () => {
    const items = Array.from({ length: 445 }, (_, i) => `item-${i + 1}`);

    const page1 = paginateGearProfiles(items, 1, 25);
    assert.strictEqual(page1.pagedItems.length, 25);
    assert.strictEqual(page1.totalPages, 18);
    assert.strictEqual(page1.startIndex, 1);
    assert.strictEqual(page1.endIndex, 25);
    assert.strictEqual(page1.safePage, 1);

    const page18 = paginateGearProfiles(items, 18, 25);
    assert.strictEqual(page18.pagedItems.length, 20); // 445 - 17*25 = 20
    assert.strictEqual(page18.startIndex, 426);
    assert.strictEqual(page18.endIndex, 445);
  });

  it('safely clamps out-of-range pages', () => {
    const items = ['a', 'b', 'c'];
    const clampedOver = paginateGearProfiles(items, 99, 25);
    assert.strictEqual(clampedOver.safePage, 1);
    assert.strictEqual(clampedOver.pagedItems.length, 3);

    const clampedUnder = paginateGearProfiles(items, -5, 25);
    assert.strictEqual(clampedUnder.safePage, 1);
  });

  it('shortens GUID accurately for compact table display', () => {
    const formatted = formatShortGuid('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
    assert.strictEqual(formatted, 'aaaaaaaa...eeee');

    const empty = formatShortGuid('');
    assert.strictEqual(empty, '');
  });

  describe('Gear Finder Selection & Reset State Logic', () => {
    const baseState: FinderUIState = {
      selectedProfileId: 'gear-1',
      searchTerm: 'brit',
      filters: {
        searchTerm: '',
        type: 'amp',
        profileStatus: 'WARN',
        validationStatus: 'all',
        exportStatus: 'all',
        aliasContains: 'lead'
      },
      sortColumn: 'type',
      sortDirection: 'desc',
      currentPage: 3,
      pageSize: 50,
      isFinderExpanded: false
    };

    it('clears a normal selected record with a GUID and expands finder', () => {
      const normalProfile = mockProfiles[0]; // has GUID '11112222-3333-4444-5555-666677778888'
      const stateWithSelection: FinderUIState = {
        ...baseState,
        selectedProfileId: normalProfile.id,
        isFinderExpanded: false
      };

      // Initially selected
      assert.strictEqual(isProfileRowSelected(normalProfile, { id: normalProfile.id }), true);

      // Perform Clear Selection
      const nextState = clearSelectionReducer(stateWithSelection);

      assert.strictEqual(nextState.selectedProfileId, null);
      assert.strictEqual(nextState.isFinderExpanded, true);
      assert.strictEqual(isProfileRowSelected(normalProfile, null), false);
    });

    it('clears a selected record without a GUID and identifies it accurately', () => {
      const profileNoGuid = mockProfiles[2]; // id: 'gear-4', guid: ''
      assert.strictEqual(profileNoGuid.guid, '');

      const stateWithSelection: FinderUIState = {
        ...baseState,
        selectedProfileId: profileNoGuid.id,
        isFinderExpanded: false
      };

      // Verified selected by record identity even with empty GUID
      assert.strictEqual(isProfileRowSelected(profileNoGuid, { id: profileNoGuid.id, guid: '' }), true);
      assert.strictEqual(isProfileRowSelected(profileNoGuid, { id: 'other-id', guid: '' }), false);

      // Perform Clear Selection
      const nextState = clearSelectionReducer(stateWithSelection);

      assert.strictEqual(nextState.selectedProfileId, null);
      assert.strictEqual(nextState.isFinderExpanded, true);
      assert.strictEqual(isProfileRowSelected(profileNoGuid, null), false);
    });

    it('maintains robust duplicate-name record identity and clears only intended item', () => {
      const duplicateA: GearProfile = {
        id: 'dup-1',
        displayName: 'Vintage Deluxe',
        type: 'amp',
        guid: '11111111-2222-3333-4444-555555555555',
        slot: 'Amp',
        aliases: [],
        parameters: [],
        rawSources: {},
        validation: { status: 'PASS', gaps: [] }
      };

      const duplicateB: GearProfile = {
        id: 'dup-2',
        displayName: 'Vintage Deluxe', // Identical name
        type: 'amp', // Identical type
        guid: '', // No GUID
        slot: 'Amp',
        aliases: [],
        parameters: [],
        rawSources: {},
        validation: { status: 'PASS', gaps: [] }
      };

      // Selecting duplicateA should NOT select duplicateB
      assert.strictEqual(isProfileRowSelected(duplicateA, duplicateA), true);
      assert.strictEqual(isProfileRowSelected(duplicateB, duplicateA), false);

      // Selecting duplicateB should NOT select duplicateA
      assert.strictEqual(isProfileRowSelected(duplicateA, duplicateB), false);
      assert.strictEqual(isProfileRowSelected(duplicateB, duplicateB), true);

      // After clearing, neither is selected
      assert.strictEqual(isProfileRowSelected(duplicateA, null), false);
      assert.strictEqual(isProfileRowSelected(duplicateB, null), false);
    });

    it('Clear Selection preserves active search, filters, sort, and pagination', () => {
      const activeState: FinderUIState = {
        selectedProfileId: 'gear-3',
        searchTerm: 'super',
        filters: {
          searchTerm: '',
          type: 'stomp',
          profileStatus: 'PASS',
          validationStatus: 'all',
          exportStatus: 'PASS',
          aliasContains: 'SD-1'
        },
        sortColumn: 'type',
        sortDirection: 'desc',
        currentPage: 2,
        pageSize: 50,
        isFinderExpanded: false
      };

      const result = clearSelectionReducer(activeState);

      // Only selectedProfileId and isFinderExpanded are altered
      assert.strictEqual(result.selectedProfileId, null);
      assert.strictEqual(result.isFinderExpanded, true);

      // All filters and queries preserved intact
      assert.strictEqual(result.searchTerm, 'super');
      assert.strictEqual(result.filters.type, 'stomp');
      assert.strictEqual(result.filters.profileStatus, 'PASS');
      assert.strictEqual(result.filters.exportStatus, 'PASS');
      assert.strictEqual(result.filters.aliasContains, 'SD-1');
      assert.strictEqual(result.sortColumn, 'type');
      assert.strictEqual(result.sortDirection, 'desc');
      assert.strictEqual(result.currentPage, 2);
      assert.strictEqual(result.pageSize, 50);
    });

    it('Clear Filters preserves selected record while clearing search and filter parameters', () => {
      const activeState: FinderUIState = {
        selectedProfileId: 'gear-1',
        searchTerm: 'jcm',
        filters: {
          searchTerm: '',
          type: 'amp',
          profileStatus: 'WARN',
          validationStatus: 'all',
          exportStatus: 'all',
          aliasContains: 'british'
        },
        sortColumn: 'name',
        sortDirection: 'asc',
        currentPage: 4,
        pageSize: 25,
        isFinderExpanded: true
      };

      const result = clearFiltersReducer(activeState);

      // Selection must remain preserved!
      assert.strictEqual(result.selectedProfileId, 'gear-1');

      // Search and filters are cleared
      assert.strictEqual(result.searchTerm, '');
      assert.strictEqual(result.filters.type, 'all');
      assert.strictEqual(result.filters.profileStatus, 'all');
      assert.strictEqual(result.filters.validationStatus, 'all');
      assert.strictEqual(result.filters.exportStatus, 'all');
      assert.strictEqual(result.filters.aliasContains, '');

      // Page is reset to 1
      assert.strictEqual(result.currentPage, 1);
      assert.strictEqual(result.pageSize, 25);
    });

    it('Reset Finder clears selection, search, all filters, sort order, and resets to page 1', () => {
      const modifiedState: FinderUIState = {
        selectedProfileId: 'gear-5',
        searchTerm: 'chorus',
        filters: {
          searchTerm: '',
          type: 'stomp',
          profileStatus: 'PARTIAL',
          validationStatus: 'all',
          exportStatus: 'all',
          aliasContains: 'stereo'
        },
        sortColumn: 'profile',
        sortDirection: 'desc',
        currentPage: 3,
        pageSize: 50,
        isFinderExpanded: false
      };

      assert.strictEqual(isFinderModifiedState(modifiedState), true);

      const result = resetFinderReducer(modifiedState);

      // Selection cleared
      assert.strictEqual(result.selectedProfileId, null);
      // Search and filters cleared
      assert.strictEqual(result.searchTerm, '');
      assert.strictEqual(result.filters.type, 'all');
      assert.strictEqual(result.filters.profileStatus, 'all');
      assert.strictEqual(result.filters.validationStatus, 'all');
      assert.strictEqual(result.filters.exportStatus, 'all');
      assert.strictEqual(result.filters.aliasContains, '');
      // Restores default sort Name A-Z
      assert.strictEqual(result.sortColumn, 'name');
      assert.strictEqual(result.sortDirection, 'asc');
      // Returns to page 1
      assert.strictEqual(result.currentPage, 1);
      // Preserves user page size preference
      assert.strictEqual(result.pageSize, 50);
      // Expands finder
      assert.strictEqual(result.isFinderExpanded, true);

      // After reset, state is no longer modified
      assert.strictEqual(isFinderModifiedState(result), false);
    });

    it('ensures no automatic reselection occurs after explicit clearing', () => {
      // Simulates handledInitialGuidRef behavior:
      // Once initialSelectedGuid is handled, explicit clearing cannot be overridden by re-render
      let handledInitialGuid: string | null = null;
      let selectedProfile: GearProfile | null = null;

      const incomingGuid = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

      // 1. First run: Guid is unhandled, select profile
      if (incomingGuid && handledInitialGuid !== incomingGuid) {
        handledInitialGuid = incomingGuid;
        selectedProfile = mockProfiles.find(p => p.guid === incomingGuid) || null;
      }

      assert.strictEqual(selectedProfile?.id, 'gear-1');

      // 2. User clicks "Clear Selection"
      selectedProfile = null;
      assert.strictEqual(selectedProfile, null);

      // 3. Subsequent render/update pass with unchanged initialSelectedGuid prop
      if (incomingGuid && handledInitialGuid !== incomingGuid) {
        handledInitialGuid = incomingGuid;
        selectedProfile = mockProfiles.find(p => p.guid === incomingGuid) || null;
      }

      // Assert that automatic reselection DID NOT occur
      assert.strictEqual(selectedProfile, null);
    });
  });
});
