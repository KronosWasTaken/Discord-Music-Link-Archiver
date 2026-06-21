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

  // View controls
  let searchTerm = $state('');
  let selectedDay = $state('All');
  let viewMode = $state<'grid' | 'list'>('grid');
  let currentSort = $state<SortKey>('day-asc');

  // null = closed; { song } where song is null => add, song set => edit
  let modal = $state<{ song: Song | null } | null>(null);

  const isCurator = true;
  const uniqueDays = $derived(getUniqueDays(songs));
  const visibleSongs = $derived(filterAndSortSongs(songs, { searchTerm, selectedDay, sort: currentSort }));

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
      songs = await api.deleteSong(song.id);
    } catch (err) {
      console.error(err);
      alert('Failed to delete the song.');
    }
  }

  function handleSaved(updated: Song[], targetUser: string) {
    // The save returns the target user's list — switch to their tab to show it.
    if (targetUser !== currentUser) {
      currentUser = targetUser;
      selectedDay = 'All';
      searchTerm = '';
    }
    songs = updated;
    modal = null;
  }

  const modalKey = $derived(modal ? (modal.song?.id ?? 'new') : 'closed');
</script>

<div class="app-container">
  <AppHeader
    songCount={songs.length}
    dayCount={uniqueDays.length}
    {currentUser}
    {isCurator}
    onAdd={() => (modal = { song: null })}
  />

  <UserTabs {users} {currentUser} onSelect={selectUser} />

  {#if isLoading}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Entering the Lounge...</p>
    </div>
  {:else if errorMsg}
    <div class="error-state">
      <span class="error-icon">⚠️</span>
      <h3>Connection Error</h3>
      <p>{errorMsg}</p>
      <button onclick={() => fetchSongs(currentUser)} class="btn btn-retry" type="button">
        Retry Connection
      </button>
    </div>
  {:else}
    <ControlsBar bind:searchTerm bind:currentSort bind:viewMode bind:selectedDay {uniqueDays} />

    <div class="results-meta">
      Showing <span class="results-count">{visibleSongs.length}</span> of
      <span>{songs.length}</span> matching tracks
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
          onEdit={(song) => (modal = { song })}
          onDelete={handleDelete}
        />
      {:else}
        <TrackTable
          songs={visibleSongs}
          {isCurator}
          {currentUser}
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
    @apply text-center py-24 px-8 max-w-[500px] mx-auto my-12;
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
    @apply text-[0.88rem] text-md-sys-text-secondary mb-6 max-w-[1200px] mx-auto;
  }
  .results-count {
    @apply text-md-sys-primary font-bold;
  }
  .tracks-container {
    @apply max-w-[1200px] mx-auto min-h-[400px];
  }
  .empty-state {
    @apply text-center py-16 px-8 bg-md-sys-surface-container border border-dashed border-md-sys-outline rounded-xl max-w-[600px] mx-auto my-12;
  }
  .empty-icon {
    @apply text-[3rem] text-md-sys-outline mb-4;
  }
  .empty-title {
    @apply text-[1.3rem] font-bold text-md-sys-text-primary mb-2;
  }
  .empty-desc {
    @apply text-md-sys-text-secondary text-[0.9rem] max-w-[380px] mx-auto leading-relaxed;
  }
  footer {
    @apply mt-20 text-center text-md-sys-outline text-[0.8rem] border-t border-solid border-md-sys-outline-variant pt-8 max-w-[1200px] mx-auto font-normal;
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

