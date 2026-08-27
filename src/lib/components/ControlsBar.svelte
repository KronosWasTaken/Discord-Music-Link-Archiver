<script lang="ts">
  import type { SortKey } from '$lib/songs';

  let {
    searchTerm = $bindable(),
    currentSort = $bindable(),
    viewMode = $bindable(),
    selectedDay = $bindable(),
    searchScope = $bindable(),
    uniqueDays,
    isSearching = false
  }: {
    searchTerm: string;
    currentSort: SortKey;
    viewMode: 'grid' | 'list';
    selectedDay: string;
    searchScope: 'user' | 'all';
    uniqueDays: string[];
    isSearching?: boolean;
  } = $props();

  // Translate vertical mouse wheel into horizontal scroll on the day timeline.
  let filterListEl = $state<HTMLDivElement | undefined>();
  $effect(() => {
    const el = filterListEl;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  });
</script>

<section class="controls-wrapper">
  <div class="search-row">
    <div class="search-container">
      <input
        type="text"
        bind:value={searchTerm}
        class="search-input"
        placeholder={searchScope === 'all'
          ? 'Search song title, artist, user, keyword or day across everyone...'
          : 'Search song title, artist, keyword or day...'}
      />
      {#if isSearching}
        <div class="search-spinner"></div>
      {:else}
        <svg class="search-icon-svg" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      {/if}
      {#if searchTerm}
        <button class="clear-search" onclick={() => (searchTerm = '')}>&times;</button>
      {/if}
    </div>

    <div class="scope-toggle">
      <button
        class="toggle-btn scope-btn"
        class:active={searchScope === 'user'}
        onclick={() => (searchScope = 'user')}
        title="Search only the selected user's tracks"
      >
        This User
      </button>
      <button
        class="toggle-btn scope-btn"
        class:active={searchScope === 'all'}
        onclick={() => (searchScope = 'all')}
        title="Search every user's tracks at once"
      >
        All Users
      </button>
    </div>

    <div class="sort-container">
      <span class="sort-label">Sort</span>
      <select bind:value={currentSort} class="sort-select">
        <option value="day-asc">Day (Chrono Asc)</option>
        <option value="day-desc">Day (Chrono Desc)</option>
        <option value="song-asc">Song Title (A-Z)</option>
        <option value="song-desc">Song Title (Z-A)</option>
        <option value="artist-asc">Artist Name (A-Z)</option>
        <option value="artist-desc">Artist Name (Z-A)</option>
      </select>
    </div>

    <div class="view-toggle">
      <button class="toggle-btn" class:active={viewMode === 'grid'} onclick={() => (viewMode = 'grid')} title="Grid View">
        <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
        </svg>
      </button>
      <button class="toggle-btn" class:active={viewMode === 'list'} onclick={() => (viewMode = 'list')} title="List View">
        <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <line x1="8" y1="6" x2="21" y2="6"></line>
          <line x1="8" y1="12" x2="21" y2="12"></line>
          <line x1="8" y1="18" x2="21" y2="18"></line>
          <line x1="3" y1="6" x2="3.01" y2="6"></line>
          <line x1="3" y1="12" x2="3.01" y2="12"></line>
          <line x1="3" y1="18" x2="3.01" y2="18"></line>
        </svg>
      </button>
    </div>
  </div>

  <div class="day-filters-container">
    <span class="day-filters-label">Days</span>
    <div class="day-filters-list" bind:this={filterListEl}>
      <button class="day-badge-btn" class:active={selectedDay === 'All'} onclick={() => (selectedDay = 'All')}>
        All Days
      </button>
      {#each uniqueDays as day}
        <button class="day-badge-btn" class:active={selectedDay === day} onclick={() => (selectedDay = day)}>
          {day}
        </button>
      {/each}
    </div>
  </div>
</section>

<style lang="postcss">
  @reference "../../app.css";

  .controls-wrapper {
    @apply flex flex-col gap-6 max-w-300 mx-auto mb-10 bg-md-sys-surface-container-low rounded-2xl p-6 shadow-md-elevation-1 border border-solid border-md-sys-outline-variant;
  }
  .search-row {
    @apply flex gap-4 flex-wrap items-center;
  }
  .search-container {
    @apply relative grow min-w-75;
  }
  .search-input {
    @apply w-full bg-md-sys-surface-container-high border-2 border-solid border-transparent text-md-sys-on-background px-11 py-3 rounded-full text-[0.92rem] outline-none transition-all duration-200;
    transition-timing-function: cubic-bezier(0.2, 0, 0, 1);
  }
  .search-input::placeholder {
    @apply text-md-sys-outline;
  }
  .search-input:focus {
    @apply bg-md-sys-surface-container-high border-md-sys-primary;
  }
  .search-icon-svg {
    @apply absolute left-[1.2rem] top-1/2 -translate-y-1/2 text-md-sys-outline pointer-events-none w-5 h-5;
  }
  .search-spinner {
    @apply absolute left-[1.2rem] top-1/2 -translate-y-1/2 border-2 border-solid border-md-sys-surface-bright w-5 h-5 rounded-full border-l-md-sys-primary;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    0% { transform: translateY(-50%) rotate(0deg); }
    100% { transform: translateY(-50%) rotate(360deg); }
  }
  .search-input:focus ~ .search-icon-svg {
    @apply text-md-sys-primary;
  }
  .clear-search {
    @apply absolute right-[1.2rem] top-1/2 -translate-y-1/2 bg-transparent border-none text-md-sys-outline text-[1.4rem] cursor-pointer flex items-center justify-center;
  }
  .clear-search:hover {
    @apply text-md-sys-on-background;
  }
  .sort-container {
    @apply flex items-center gap-3;
  }
  .sort-label {
    @apply text-[0.75rem] font-bold text-md-sys-text-secondary uppercase tracking-[0.5px];
  }
  .sort-select {
    @apply bg-md-sys-surface-container-high border border-solid border-md-sys-outline-variant text-md-sys-on-background pl-4 pr-10 py-3 rounded-lg text-[0.88rem] font-medium outline-none cursor-pointer transition-all duration-200 appearance-none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%238c9099' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 1rem center;
    background-size: 1rem;
  }
  .sort-select:focus {
    @apply border-md-sys-primary;
  }
  .scope-toggle {
    @apply flex bg-transparent border border-solid border-md-sys-outline rounded-full overflow-hidden;
  }
  .scope-btn {
    @apply w-auto px-4 text-[0.82rem] font-medium whitespace-nowrap;
  }
  .view-toggle {
    @apply flex bg-transparent border border-solid border-md-sys-outline rounded-full overflow-hidden;
  }
  .view-toggle .toggle-btn {
    @apply w-11 px-0;
  }
  .toggle-btn {
    @apply bg-transparent border-0 border-r border-solid border-md-sys-outline text-md-sys-outline px-4 py-2 cursor-pointer flex items-center justify-center transition-all duration-200 outline-none h-9;
  }
  .toggle-btn:hover {
    @apply text-md-sys-primary bg-md-sys-primary/4;
  }
  .toggle-btn:last-child {
    @apply border-r-0;
  }
  .toggle-btn.active {
    @apply bg-md-sys-primary-container text-md-sys-on-primary-container;
  }
  .toggle-btn svg {
    @apply w-4.5 h-4.5;
  }
  .day-filters-container {
    @apply flex items-center gap-4 border-t border-solid border-md-sys-outline-variant pt-5;
  }
  .day-filters-label {
    @apply text-[0.75rem] font-bold text-md-sys-text-secondary uppercase tracking-[0.5px] whitespace-nowrap;
  }
  .day-filters-list {
    @apply flex gap-2 overflow-x-auto py-1 w-full;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .day-filters-list::-webkit-scrollbar {
    display: none;
  }
  .day-badge-btn {
    @apply bg-transparent border border-solid border-md-sys-outline text-md-sys-on-background px-4 py-2 rounded-lg cursor-pointer text-[0.85rem] font-medium whitespace-nowrap transition-all duration-200 outline-none;
    transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
  }
  .day-badge-btn:hover {
    @apply bg-md-sys-on-background/5;
  }
  .day-badge-btn.active {
    @apply bg-md-sys-secondary-container border-transparent text-md-sys-on-secondary-container font-semibold;
  }

  @media (max-width: 768px) {
    .controls-wrapper {
      @apply gap-5 p-5 rounded-xl;
    }
    .search-row {
      @apply flex-col items-stretch gap-4;
    }
    .search-container {
      @apply min-w-full;
    }
    .view-toggle {
      @apply justify-center;
    }
    .day-filters-container {
      @apply flex-col items-start gap-3;
    }
  }
</style>

