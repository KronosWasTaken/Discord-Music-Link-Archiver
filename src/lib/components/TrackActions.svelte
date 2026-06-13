<script lang="ts">
  import type { Song } from '$lib/types';

  let {
    song,
    isCurator,
    isDrawerOpen,
    variant = 'grid',
    onToggleDrawer,
    onEdit,
    onDelete
  }: {
    song: Song;
    isCurator: boolean;
    isDrawerOpen: boolean;
    variant?: 'grid' | 'list';
    onToggleDrawer: () => void;
    onEdit: (song: Song) => void;
    onDelete: (song: Song) => void;
  } = $props();

  const isList = $derived(variant === 'list');
</script>

<a href={song.link} target="_blank" rel="noreferrer" class="btn btn-play" class:list-play-btn={isList}>
  <svg viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </svg>
  {isList ? 'Play' : 'Play on YouTube'}
</a>

<button
  class="btn btn-discord"
  class:list-discord-btn={isList}
  class:active={isDrawerOpen}
  onclick={onToggleDrawer}
  title="Original Discord Message"
>
  <svg viewBox="0 0 127.14 96.36" fill="currentColor">
    <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5c.9-.65,1.76-1.34,2.58-2.07a75.48,75.48,0,0,0,72.84,0c.82.73,1.68,1.42,2.58,2.07a68.43,68.43,0,0,1-10.5,5,77.7,77.7,0,0,0,6.63,10.85,105.73,105.73,0,0,0,31.58-18.83C129.24,50.24,123.38,27.42,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69ZM42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z" />
  </svg>
</button>

{#if isCurator}
  <button class="btn btn-edit" class:list-edit-btn={isList} onclick={() => onEdit(song)} title="Edit Entry">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
      <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
  </button>
  <button class="btn btn-delete" class:list-delete-btn={isList} onclick={() => onDelete(song)} title="Delete Entry">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      <line x1="10" y1="11" x2="10" y2="17"></line>
      <line x1="14" y1="11" x2="14" y2="17"></line>
    </svg>
  </button>
{/if}

<style lang="postcss">
  @reference "../../app.css";

  .btn-play {
    @apply bg-md-sys-primary-container text-md-sys-on-primary-container grow font-bold py-2 px-4 rounded-full shadow-none border-none;
  }
  .btn-play:hover {
    @apply bg-[#1a57c2];
  }
  .btn-play svg {
    @apply w-3.5 h-3.5;
  }
  .btn-discord {
    @apply bg-transparent border border-solid border-md-sys-outline-variant text-md-sys-on-background p-2 rounded-full w-9 h-9 flex items-center justify-center;
  }
  .btn-discord:hover, .btn-discord.active {
    @apply bg-[#5865f2]/12 border-[#5865F2] text-[#7289da];
  }
  .btn-discord svg {
    @apply w-[18px] h-[18px];
  }
  .btn-delete {
    @apply bg-transparent border border-solid border-md-sys-outline-variant text-md-sys-outline p-2 rounded-full w-9 h-9 flex items-center justify-center;
  }
  .btn-delete:hover {
    @apply bg-red-500/12 border-md-sys-error text-md-sys-error;
  }
  .btn-delete svg {
    @apply w-[18px] h-[18px];
  }
  .btn-edit {
    @apply bg-transparent border border-solid border-md-sys-outline-variant text-md-sys-outline p-2 rounded-full w-9 h-9 flex items-center justify-center;
  }
  .btn-edit:hover {
    @apply bg-md-sys-primary/12 border-md-sys-primary text-md-sys-primary;
  }
  .btn-edit svg {
    @apply w-[18px] h-[18px];
  }
  .list-play-btn {
    @apply px-4 py-2 text-[0.8rem] rounded-full;
  }
  .list-discord-btn {
    @apply p-0 rounded-full;
  }
  .list-edit-btn {
    @apply p-0 rounded-full;
  }
  .list-delete-btn {
    @apply p-0;
  }
</style>

