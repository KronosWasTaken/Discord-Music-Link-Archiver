<script lang="ts">
  import { formatTimestamp } from '$lib/format';
  import type { Song } from '$lib/types';

  let { song, currentUser }: { song: Song; currentUser: string } = $props();

  const initials = $derived((song.authorName || 'P').charAt(0).toUpperCase());
</script>

<div class="discord-bubble">
  <div class="discord-header">
    <div class="discord-avatar">{initials}</div>
    <div class="discord-meta">
      <div class="discord-user-info">
        <span class="discord-nickname">{song.authorName}</span>
        <span class="discord-username">@{currentUser}</span>
      </div>
      <span class="discord-timestamp">{formatTimestamp(song.timestamp)}</span>
    </div>
  </div>
  <div class="discord-text">{song.originalMessage || 'No additional context available.'}</div>
</div>

<style lang="postcss">
  @reference "../../app.css";

  .discord-bubble {
    @apply bg-md-sys-surface-container-low rounded-xl p-4 mt-3 border border-solid border-md-sys-outline-variant border-l-4 border-l-[#5865F2];
  }
  .discord-header {
    @apply flex items-center gap-3 mb-3;
  }
  .discord-avatar {
    @apply w-9 h-9 rounded-full bg-md-sys-primary-container text-md-sys-on-primary-container flex items-center justify-center font-bold text-[1.1rem] shrink-0 shadow-md-elevation-1;
  }
  .discord-meta {
    @apply flex flex-col gap-1 grow;
  }
  .discord-user-info {
    @apply flex items-baseline gap-2 flex-wrap;
  }
  .discord-nickname {
    @apply text-white font-bold text-[0.95rem] leading-tight;
  }
  .discord-username {
    @apply text-md-sys-outline text-[0.78rem];
  }
  .discord-timestamp {
    @apply text-md-sys-text-tertiary text-[0.78rem] leading-none;
  }
  .discord-text {
    @apply text-md-sys-on-background text-[0.85rem] leading-relaxed whitespace-pre-wrap wrap-break-word;
    font-family: inherit;
  }
</style>

