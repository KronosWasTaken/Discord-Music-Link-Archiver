<script lang="ts">
  import { getCoreDay } from '$lib/format';
  import type { Song } from '$lib/types';
  import TrackActions from './TrackActions.svelte';
  import DiscordBubble from './DiscordBubble.svelte';

  let {
    songs,
    isCurator,
    currentUser,
    showOwner = false,
    onEdit,
    onDelete
  }: {
    songs: Song[];
    isCurator: boolean;
    currentUser: string;
    showOwner?: boolean;
    onEdit: (song: Song) => void;
    onDelete: (song: Song) => void;
  } = $props();

  // Drawer open state is a purely-visual concern, owned by this view.
  let openIndex = $state<number | null>(null);
  const toggle = (i: number) => (openIndex = openIndex === i ? null : i);

  const isSpecial = (day: string) => (day || '').toLowerCase().includes('special');
</script>

<div class="tracks-grid">
  {#each songs as song, idx}
    <div class="track-card">
      <div class="card-top">
        <div class="day-tag-container">
          <span class="day-tag">{getCoreDay(song.day)}</span>
          {#if isSpecial(song.day)}
            <span class="special-badge">Special</span>
          {/if}
        </div>
        {#if showOwner}
          <span class="owner-badge" title="Owner">{song.owner}</span>
        {/if}
      </div>

      <a
        href={song.link}
        target="_blank"
        rel="noreferrer"
        class="song-title"
        title={song.cleanedSong || song.rawTitle || song.link}
      >
        {song.cleanedSong || song.rawTitle || 'YouTube Link'}
      </a>

      <div class="artist-name">
        <svg class="artist-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
        <span>{song.cleanedArtist || 'Unknown Artist'}</span>
      </div>

      {#if song.rawTitle}
        <div class="raw-title-disclosure">
          <div class="raw-title-label">Original Video Title</div>
          <div class="raw-title-text" title={song.rawTitle}>{song.rawTitle}</div>
        </div>
      {/if}

      <div class="card-actions">
        <TrackActions
          {song}
          {isCurator}
          isDrawerOpen={openIndex === idx}
          onToggleDrawer={() => toggle(idx)}
          {onEdit}
          {onDelete}
        />
      </div>

      {#if openIndex === idx}
        <div class="discord-drawer">
          <DiscordBubble {song} {currentUser} />
        </div>
      {/if}
    </div>
  {/each}
</div>

<style lang="postcss">
  @reference "../../app.css";

  .tracks-grid {
    @apply grid gap-5;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  }
  .track-card {
    @apply bg-md-sys-surface-container border border-solid border-md-sys-outline-variant rounded-xl p-6 flex flex-col relative shadow-md-elevation-1 transition-all duration-200;
    transition-timing-function: cubic-bezier(0.2, 0, 0, 1);
  }
  .track-card:hover {
    @apply bg-md-sys-surface-container-high border-md-sys-outline -translate-y-0.5 shadow-md-elevation-2;
  }
  .card-top {
    @apply flex justify-between items-center mb-3;
  }
  .day-tag-container {
    @apply flex items-center gap-2;
  }
  .day-tag {
    @apply text-md-sys-primary text-[0.88rem] font-bold;
  }
  .song-title {
    @apply text-[1.2rem] font-bold text-md-sys-text-primary leading-snug mb-1.5 transition-colors duration-150;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-decoration: none;
  }
  .song-title:hover {
    @apply text-md-sys-primary;
  }
  .artist-name {
    @apply text-[0.92rem] font-normal text-md-sys-text-secondary mb-5 flex items-center gap-1.5;
  }
  .artist-icon {
    @apply opacity-80 w-3.5 h-3.5 text-md-sys-outline;
  }
  .raw-title-disclosure {
    @apply bg-md-sys-surface-container-low border border-solid border-md-sys-outline-variant rounded-lg p-3 mb-5;
  }
  .raw-title-label {
    @apply text-[0.62rem] uppercase tracking-[0.5px] text-md-sys-outline mb-1 font-bold;
  }
  .raw-title-text {
    @apply text-[0.78rem] text-md-sys-text-secondary italic line-clamp-2 leading-snug break-all;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .card-actions {
    @apply mt-auto flex gap-2 items-center;
  }
  .discord-drawer {
    @apply overflow-hidden;
    animation: slideDown 0.25s cubic-bezier(0.2, 0, 0, 1) forwards;
  }
  @keyframes slideDown {
    from { max-height: 0; opacity: 0; }
    to { max-height: 320px; opacity: 1; }
  }

  @media (max-width: 768px) {
    .tracks-grid {
      @apply grid-cols-1 gap-5;
    }
  }
</style>

