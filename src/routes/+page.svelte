<script lang="ts">
  import { untrack } from 'svelte';
  import * as api from '$lib/api';
  import { getUniqueDays, filterAndSortSongs, suggestNextDay, type SortKey } from '$lib/songs';
  import type { Song } from '$lib/types';
  import type { PageData } from './$types';

  import AppHeader from '$lib/components/AppHeader.svelte';
  import UserTabs from '$lib/components/UserTabs.svelte';
  import ControlsBar from '$lib/components/ControlsBar.svelte';
  import TrackGrid from '$lib/components/TrackGrid.svelte';
  import TrackTable from '$lib/components/TrackTable.svelte';
  import SongModal from '$lib/components/SongModal.svelte';

  const CURATOR = 'the_pervy_s4ge';

  let { data }: { data: PageData } = $props();

  // Seed from the server-rendered payload — first paint already has data.
  // untrack: read the SSR values once; the client owns this state afterwards.
  let songs = $state<Song[]>(untrack(() => data.songs));
  let users = $state<string[]>(untrack(() => data.users));
  let currentUser = $state(untrack(() => data.user));
  let isLoading = $state(false);
  let errorMsg = $state('');

  // Cross-user search: fetched lazily the first time the user switches into
  // "All Users" scope, then kept in sync locally on every save/delete.
  let allSongs = $state<Song[]>([]);
  let allSongsLoaded = $state(false);
  let isLoadingAll = $state(false);

  let searchTerm = $state('');
  let selectedDay = $state('All');
  let viewMode = $state<'grid' | 'list'>('grid');
  let currentSort = $state<SortKey>('day-asc');
  let searchScope = $state<'user' | 'all'>('user');

  // null = closed; { song } where song is null => add, song set => edit
  let modal = $state<{ song: Song | null } | null>(null);

  const isCurator = true;
  const activeSongs = $derived(searchScope === 'all' ? allSongs : songs);

  // Text matching runs server-side (Typesense: fuzzy/typo-tolerant, falls
  // back to substring match if the index is unreachable). Day filter + sort
  // stay client-side over whatever base list is currently active.
  let searchResults = $state<Song[] | null>(null);
  let isSearching = $state(false);
  let searchSeq = 0;

  const hasSearch = $derived(searchTerm.trim().length > 0);
  const baseSongs = $derived(hasSearch ? (searchResults ?? []) : activeSongs);
  const uniqueDays = $derived(getUniqueDays(baseSongs));
  const visibleSongs = $derived(filterAndSortSongs(baseSongs, { selectedDay, sort: currentSort }));

  async function runSearch(term: string, scope: 'user' | 'all', user: string) {
    const seq = ++searchSeq;
    isSearching = true;
    try {
      const results = await api.searchSongs(term, scope, user);
      if (seq !== searchSeq) return;
      searchResults = results;
    } catch (err) {
      if (seq !== searchSeq) return;
      console.error(err);
      searchResults = filterAndSortSongs(scope === 'all' ? allSongs : songs, { searchTerm: term });
    } finally {
      if (seq === searchSeq) isSearching = false;
    }
  }

  $effect(() => {
    const term = searchTerm.trim();
    if (!term) {
      searchResults = null;
      searchSeq++;
      return;
    }
    const scope = searchScope;
    const user = currentUser;
    const timer = setTimeout(() => runSearch(term, scope, user), 250);
    return () => clearTimeout(timer);
  });

  async function fetchAllSongs() {
    isLoadingAll = true;
    errorMsg = '';
    try {
      allSongs = await api.getAllSongs();
      allSongsLoaded = true;
    } catch (err) {
      console.error(err);
      errorMsg = 'Error connecting to backend server.';
    } finally {
      isLoadingAll = false;
    }
  }

  $effect(() => {
    if (searchScope === 'all' && !allSongsLoaded) fetchAllSongs();
  });

  // Monotonic guard: only the most recent fetch may write state, so rapidly
  // switching users can never leave a stale spinner stuck.
  let fetchSeq = 0;
  async function fetchSongs(user: string) {
    const seq = ++fetchSeq;
    isLoading = true;
    errorMsg = '';
    try {
      const data = await api.getSongs(user);
      if (seq !== fetchSeq) return;
      songs = data;
    } catch (err) {
      if (seq !== fetchSeq) return;
      console.error(err);
      errorMsg = 'Error connecting to backend server.';
    } finally {
      if (seq === fetchSeq) isLoading = false;
    }
  }

  function selectUser(user: string) {
    searchScope = 'user';
    if (user === currentUser) return;
    currentUser = user;
    selectedDay = 'All';
    searchTerm = '';
    fetchSongs(user);
  }

  async function handleDelete(song: Song) {
    if (!song.id) {
      alert('This entry cannot be deleted (missing ID).');
      return;
    }
    if (!confirm(`Are you sure you want to delete this track from ${song.day}?`)) return;
    try {
      const updatedOwnerList = await api.deleteSong(song.id);
      if (searchScope === 'all') {
        allSongs = allSongs.filter((s) => s.id !== song.id);
        if (song.owner === currentUser) songs = updatedOwnerList;
      } else {
        songs = updatedOwnerList;
        allSongs = allSongs.filter((s) => s.id !== song.id);
      }
      if (searchTerm.trim()) runSearch(searchTerm.trim(), searchScope, currentUser);
    } catch (err) {
      console.error(err);
      alert('Failed to delete the song.');
    }
  }

  function handleSaved(updatedOwnerList: Song[], targetUser: string) {
    const owner = updatedOwnerList[0]?.owner ?? targetUser;

    if (allSongsLoaded) {
      allSongs = [...allSongs.filter((s) => s.owner !== owner), ...updatedOwnerList];
    }

    if (searchScope === 'all') {
      if (currentUser === owner) songs = updatedOwnerList;
    } else {
      // The save returns the target user's list — switch to their tab to show it.
      if (targetUser !== currentUser) {
        currentUser = targetUser;
        selectedDay = 'All';
        searchTerm = '';
      }
      songs = updatedOwnerList;
    }
    if (searchTerm.trim()) runSearch(searchTerm.trim(), searchScope, currentUser);
    modal = null;
  }

  const modalKey = $derived(modal ? (modal.song?.id ?? 'new') : 'closed');
</script>

<div class="app-container">
  <AppHeader
    songCount={activeSongs.length}
    dayCount={uniqueDays.length}
    {currentUser}
    {isCurator}
    onAdd={() => (modal = { song: null })}
  />

  <UserTabs {users} {currentUser} onSelect={selectUser} />

  {#if isLoading || (searchScope === 'all' && isLoadingAll)}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>{searchScope === 'all' ? 'Gathering everyone’s tracks...' : 'Entering the Lounge...'}</p>
    </div>
  {:else if errorMsg}
    <div class="error-state">
      <span class="error-icon">⚠️</span>
      <h3>Connection Error</h3>
      <p>{errorMsg}</p>
      <button
        onclick={() => (searchScope === 'all' ? fetchAllSongs() : fetchSongs(currentUser))}
        class="btn btn-retry"
        type="button"
      >
        Retry Connection
      </button>
    </div>
  {:else}
    <ControlsBar bind:searchTerm bind:currentSort bind:viewMode bind:selectedDay bind:searchScope {uniqueDays} {isSearching} />

    <div class="results-meta">
      Showing <span class="results-count">{visibleSongs.length}</span> of
      <span>{baseSongs.length}</span> matching tracks
      {#if searchScope === 'all'}
        <span>across all users</span>
      {/if}
    </div>

    <section class="tracks-container">
      {#if visibleSongs.length === 0}
        <div class="empty-state">
          <div class="empty-icon">🎵</div>
          <h3 class="empty-title">No Tracks Found</h3>
          <p class="empty-desc">No songs match your search query or filters. Try adjusting your search term.</p>
        </div>
      {:else if viewMode === 'grid'}
        <TrackGrid
          songs={visibleSongs}
          {isCurator}
          {currentUser}
          showOwner={searchScope === 'all'}
          onEdit={(song) => (modal = { song })}
          onDelete={handleDelete}
        />
      {:else}
        <TrackTable
          songs={visibleSongs}
          {isCurator}
          {currentUser}
          showOwner={searchScope === 'all'}
          onEdit={(song) => (modal = { song })}
          onDelete={handleDelete}
        />
      {/if}
    </section>
  {/if}

  <footer>
    <p>The Pervy Sage Lounge &bull; SvelteKit SSR &bull; CSV database remains 100% intact</p>
  </footer>
</div>

{#if modal}
  {#key modalKey}
    <SongModal
      song={modal.song}
      suggestedDay={suggestNextDay(songs)}
      {users}
      {currentUser}
      onClose={() => (modal = null)}
      onSaved={handleSaved}
    />
  {/key}
{/if}

<style lang="postcss">
  @reference "../app.css";

  .app-container {
    @apply bg-md-sys-background text-md-sys-on-background min-h-screen py-12 px-8 relative;
    font-family: 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
    letter-spacing: 0.1px;
  }
  .loading-state, .error-state {
    @apply text-center py-24 px-8 max-w-125 mx-auto my-12;
  }
  .spinner {
    @apply border-[3px] border-solid border-md-sys-surface-bright w-11 h-11 rounded-full border-l-md-sys-primary mx-auto mb-6;
    animation: spin 1s linear infinite;
  }
  .error-icon {
    @apply text-[3.5rem] mb-5 inline-block;
  }
  .error-state h3 {
    @apply text-[1.4rem] font-bold mb-2 text-md-sys-text-primary;
  }
  .error-state p {
    @apply text-md-sys-text-secondary text-[0.95rem] mb-6 leading-relaxed;
  }
  .btn-retry {
    @apply bg-transparent border border-solid border-md-sys-outline text-md-sys-primary;
  }
  .btn-retry:hover {
    @apply bg-md-sys-primary/8;
  }
  .results-meta {
    @apply text-[0.88rem] text-md-sys-text-secondary mb-6 max-w-300 mx-auto;
  }
  .results-count {
    @apply text-md-sys-primary font-bold;
  }
  .tracks-container {
    @apply max-w-300 mx-auto min-h-100;
  }
  .empty-state {
    @apply text-center py-16 px-8 bg-md-sys-surface-container border border-dashed border-md-sys-outline rounded-xl max-w-150 mx-auto my-12;
  }
  .empty-icon {
    @apply text-[3rem] text-md-sys-outline mb-4;
  }
  .empty-title {
    @apply text-[1.3rem] font-bold text-md-sys-text-primary mb-2;
  }
  .empty-desc {
    @apply text-md-sys-text-secondary text-[0.9rem] max-w-95 mx-auto leading-relaxed;
  }
  footer {
    @apply mt-20 text-center text-md-sys-outline text-[0.8rem] border-t border-solid border-md-sys-outline-variant pt-8 max-w-300 mx-auto font-normal;
  }

  @media (max-width: 768px) {
    .app-container {
      @apply py-8 px-5;
    }
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
</style>

