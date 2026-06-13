<script lang="ts">
  import { getCoreDay } from '$lib/format';
  import type { Song } from '$lib/types';
  import TrackActions from './TrackActions.svelte';
  import DiscordBubble from './DiscordBubble.svelte';

  let {
    songs,
    isCurator,
    currentUser,
    onEdit,
    onDelete
  }: {
    songs: Song[];
    isCurator: boolean;
    currentUser: string;
    onEdit: (song: Song) => void;
    onDelete: (song: Song) => void;
  } = $props();

  let openIndex = $state<number | null>(null);
  const toggle = (i: number) => (openIndex = openIndex === i ? null : i);

  const isSpecial = (day: string) => (day || '').toLowerCase().includes('special');
</script>

<table class="tracks-list">
  <thead>
    <tr>
      <th style="width: 100px;">Day</th>
      <th>Track Info</th>
      <th>Original Video Title</th>
      <th style="text-align: right; width: 160px;">Actions</th>
    </tr>
  </thead>
  <tbody>
    {#each songs as song, idx}
      <tr class="list-row">
        <td class="list-cell list-cell-day">
          {getCoreDay(song.day)}
          {#if isSpecial(song.day)}
            <span class="special-badge list-badge">Spec</span>
          {/if}
        </td>
        <td class="list-cell">
          <a href={song.link} target="_blank" rel="noreferrer" class="list-song-name">
            {song.cleanedSong || song.rawTitle || 'YouTube Link'}
          </a>
          <div class="list-artist-name">{song.cleanedArtist || 'Unknown Artist'}</div>
        </td>
        <td class="list-cell">
          <div class="list-raw-title" title={song.rawTitle}>{song.rawTitle || '—'}</div>
        </td>
        <td class="list-cell" style="text-align: right;">
          <div style="display: flex; gap: 0.4rem; justify-content: flex-end;">
            <TrackActions
              {song}
              {isCurator}
              variant="list"
              isDrawerOpen={openIndex === idx}
              onToggleDrawer={() => toggle(idx)}
              {onEdit}
              {onDelete}
            />
          </div>
        </td>
      </tr>
      {#if openIndex === idx}
        <tr class="list-discord-drawer-row">
          <td colspan="4" class="list-discord-cell">
            <DiscordBubble {song} {currentUser} />
          </td>
        </tr>
      {/if}
    {/each}
  </tbody>
</table>

<style lang="postcss">
  @reference "../../app.css";

  .tracks-list {
    @apply w-full border-separate border-spacing-0 mt-4 bg-md-sys-surface-container border border-solid border-md-sys-outline-variant rounded-xl overflow-hidden shadow-md-elevation-1;
  }
  .tracks-list th {
    @apply text-md-sys-outline text-[0.75rem] font-bold uppercase tracking-[0.5px] px-5 py-4 text-left border-b border-solid border-md-sys-outline-variant bg-md-sys-surface-container-high;
  }
  .list-row {
    @apply bg-transparent transition-colors duration-150;
  }
  .list-row:hover {
    @apply bg-md-sys-surface-container-high;
  }
  .list-cell {
    @apply px-5 py-4 align-middle border-b border-solid border-md-sys-outline-variant;
  }
  .list-row:last-child .list-cell {
    @apply border-b-0;
  }
  .list-cell-day {
    @apply font-bold text-md-sys-primary text-[0.9rem] whitespace-nowrap;
  }
  .list-song-name {
    @apply font-bold text-[1rem] text-md-sys-text-primary no-underline transition-colors duration-150 inline-block;
  }
  .list-song-name:hover {
    @apply text-md-sys-primary;
  }
  .list-artist-name {
    @apply text-[0.85rem] text-md-sys-text-secondary mt-1;
  }
  .list-raw-title {
    @apply text-[0.82rem] text-md-sys-outline max-w-[360px] truncate italic;
  }
  .list-discord-drawer-row {
    @apply bg-md-sys-surface-container-low;
  }
  .list-discord-cell {
    @apply px-5 py-3 border-b border-solid border-md-sys-outline-variant;
  }
  .list-badge {
    @apply ml-1.5;
  }

  @media (max-width: 768px) {
    .tracks-list th:nth-child(3),
    .tracks-list td:nth-child(3) {
      @apply hidden;
    }
    .list-cell {
      @apply p-3.5;
    }
  }
</style>

