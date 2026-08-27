<script lang="ts">
  import { untrack } from 'svelte';
  import { getYoutubeInfo, saveSong } from '$lib/api';
  import { cleanSongTitle, isYouTubeLink } from '$lib/format';
  import type { Song } from '$lib/types';

  const CURATOR = 'the_pervy_s4ge';

  let {
    song = null,
    suggestedDay,
    users,
    currentUser,
    onClose,
    onSaved
  }: {
    song?: Song | null;
    suggestedDay: string;
    users: string[];
    currentUser: string;
    onClose: () => void;
    onSaved: (songs: Song[], targetUser: string) => void;
  } = $props();

  // Snapshot props once at mount — the parent re-mounts this modal per open
  // (keyed on the song id), so reading initial values here is intentional.
  const initial = untrack(() => song);
  const initialDay = untrack(() => suggestedDay);
  const isEditMode = initial !== null;

  // Which user's collection this song belongs to. Editing only applies to the
  // curator's own songs, so the picker is offered in add mode only. In edit
  // mode this must be the song's actual owner (not necessarily currentUser —
  // e.g. when editing from an all-users search result).
  let targetUser = $state(untrack(() => (isEditMode ? (initial?.owner ?? currentUser) : currentUser)));
  const targetIsCurator = true;

  let formUrl = $state(initial?.link ?? '');
  let formDay = $state(isEditMode ? (initial?.day ?? '').replace(/\s+special/i, '').trim() : initialDay);
  let formSong = $state(initial?.cleanedSong ?? '');
  let formArtist = $state(initial?.cleanedArtist ?? '');
  let formRawTitle = $state(initial?.rawTitle ?? '');
  let formNotes = $state(initial?.originalMessage ?? '');
  let formAuthorName = $state(initial?.authorName || (untrack(() => targetUser) === CURATOR ? 'ThePervySage' : untrack(() => targetUser)));
  let formIsSpecial = $state((initial?.day ?? '').toLowerCase().includes('special'));

  let userEditedAuthorName = $state(false);
  $effect(() => {
    if (!isEditMode && !userEditedAuthorName) {
      formAuthorName = targetUser === CURATOR ? 'ThePervySage' : targetUser;
    }
  });

  let isLoadingYTApi = $state(false);
  let ytApiError = $state('');
  let isSubmitting = $state(false);

  async function handleUrlChange() {
    if (!isYouTubeLink(formUrl)) {
      ytApiError = 'Please enter a valid YouTube or YouTube Music link';
      return;
    }
    ytApiError = '';
    isLoadingYTApi = true;
    try {
      const data = await getYoutubeInfo(formUrl);
      formRawTitle = data.title || '';
      const { song: s, artist } = cleanSongTitle(formRawTitle);
      formSong = s;
      const cleanedAuthor = (data.author_name || '').replace(/\s*-\s*Topic$/i, '').trim();
      formArtist = artist || cleanedAuthor;
    } catch (err) {
      console.error(err);
      ytApiError = 'Could not fetch video info. You can still enter details manually.';
    } finally {
      isLoadingYTApi = false;
    }
  }

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    if (!formUrl || (targetIsCurator && !formDay)) return;
    isSubmitting = true;

    const payload = {
      id: isEditMode ? (initial?.id ?? undefined) : undefined,
      targetUser,
      day: formIsSpecial ? `${formDay} Special` : formDay,
      link: formUrl,
      cleanedSong: formSong,
      cleanedArtist: formArtist,
      rawTitle: formRawTitle,
      originalMessage: formNotes,
      authorName: formAuthorName
    };

    try {
      const songs = await saveSong(payload, isEditMode);
      onSaved(songs, targetUser);
    } catch (err) {
      console.error(err);
      alert('Failed to save the song. Check your fields and try again.');
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div class="modal-backdrop" onclick={onClose} role="presentation">
  <div class="modal-content" onclick={(e) => e.stopPropagation()} role="presentation">
    <div class="modal-header">
      <h2>{isEditMode ? 'Edit Music Link' : 'Add Music Link'}</h2>
      <button class="btn-close" onclick={onClose} aria-label="Close modal">&times;</button>
    </div>

    <form onsubmit={submit}>
      <div class="form-grid">
        {#if !isEditMode}
          <div class="form-group full-width">
            <label for="targetUser">Add to User <span class="required">*</span></label>
            <select id="targetUser" class="sort-select" bind:value={targetUser}>
              {#each users as user}
                <option value={user}>{user === CURATOR ? 'the_pervy_s4ge (Curator)' : user}</option>
              {/each}
            </select>
          </div>
        {/if}

        <div class="form-group full-width">
          <label for="url">YouTube URL <span class="required">*</span></label>
          <div class="input-url-container">
            <input
              type="text"
              id="url"
              bind:value={formUrl}
              onblur={handleUrlChange}
              placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
              required
            />
            {#if isLoadingYTApi}
              <div class="input-spinner"></div>
            {/if}
          </div>
          {#if ytApiError}
            <span class="form-error-msg">{ytApiError}</span>
          {/if}
        </div>

        {#if targetIsCurator}
          <div class="form-group">
            <label for="day">Day Code / Pattern <span class="required">*</span></label>
            <input type="text" id="day" bind:value={formDay} placeholder="e.g. Day 33" required />
          </div>

          <div class="form-group flex-row">
            <label class="checkbox-label" for="isSpecial">
              <input type="checkbox" id="isSpecial" bind:checked={formIsSpecial} class="checkbox-input" />
              <span>Mark as Special Day</span>
            </label>
          </div>

          <div class="form-group">
            <label for="rawTitle">YouTube Original Video Title</label>
            <input type="text" id="rawTitle" bind:value={formRawTitle} placeholder="Fetched automatically" />
          </div>

          <div class="form-group">
            <label for="song">Cleaned Song Title</label>
            <input type="text" id="song" bind:value={formSong} placeholder="Song Name" />
          </div>

          <div class="form-group">
            <label for="artist">Cleaned Artist</label>
            <input type="text" id="artist" bind:value={formArtist} placeholder="Artist / Movie" />
          </div>

          <div class="form-group">
            <label for="authorName">Discord Nickname</label>
            <input
              type="text"
              id="authorName"
              bind:value={formAuthorName}
              oninput={() => userEditedAuthorName = true}
              placeholder="e.g. ThePervySage"
            />
          </div>
        {/if}

        <div class="form-group full-width">
          <label for="notes">Original Message / Optional Comments</label>
          <textarea id="notes" bind:value={formNotes} rows="3" placeholder="Add thoughts, comments or lyrics context..."></textarea>
        </div>

        {#if !targetIsCurator}
          <div class="form-group full-width">
            <span class="form-hint">The song title and artist are fetched automatically and it's added as @{targetUser}'s latest day.</span>
          </div>
        {/if}
      </div>

      <div class="form-actions">
        <button type="button" class="btn btn-cancel" onclick={onClose}>Cancel</button>
        <button type="submit" class="btn btn-submit" disabled={isSubmitting || !formUrl || (targetIsCurator && !formDay)}>
          {#if isSubmitting}
            <div class="spinner-btn"></div> Saving...
          {:else}
            Save Link
          {/if}
        </button>
      </div>
    </form>
  </div>
</div>

<style lang="postcss">
  @reference "../../app.css";

  .modal-backdrop {
    @apply fixed inset-0 bg-black/56 flex items-center justify-center z-1000 p-6;
  }
  .modal-content {
    @apply bg-md-sys-surface-container-high rounded-[28px] w-full max-w-170 shadow-md-elevation-3 overflow-hidden border-none relative;
    animation: modalOpen 0.3s cubic-bezier(0.2, 0, 0, 1);
  }
  @keyframes modalOpen {
    from { transform: scale(0.96) translateY(12px); opacity: 0; }
    to { transform: scale(1) translateY(0); opacity: 1; }
  }
  .modal-header {
    @apply flex justify-between items-center px-9 py-7 border-b border-solid border-md-sys-outline-variant relative z-10;
  }
  .modal-header h2 {
    @apply text-[1.5rem] font-normal text-md-sys-text-primary;
  }
  .btn-close {
    @apply bg-transparent border-none text-md-sys-outline text-[2rem] cursor-pointer leading-none flex items-center justify-center w-9 h-9 rounded-full transition-colors duration-150;
  }
  .btn-close:hover {
    @apply text-md-sys-on-background bg-md-sys-on-background/8;
  }
  form {
    @apply p-8 relative z-10;
  }
  .form-grid {
    @apply grid grid-cols-2 gap-5 mb-8;
  }
  .form-group {
    @apply flex flex-col gap-1.5;
  }
  .full-width {
    @apply col-span-2;
  }
  label {
    @apply text-[0.75rem] font-bold text-md-sys-outline uppercase tracking-[0.5px];
  }
  .required {
    @apply text-md-sys-error;
  }
  input, textarea {
    @apply bg-transparent border border-solid border-md-sys-outline rounded px-4 py-3 text-md-sys-on-background text-[0.9rem] outline-none transition-all duration-200;
    transition-timing-function: cubic-bezier(0.2, 0, 0, 1);
  }
  input:focus, textarea:focus {
    @apply border-md-sys-primary border-2 px-3.75 py-2.75;
  }
  .input-url-container {
    @apply relative flex items-center;
  }
  .input-url-container input {
    @apply w-full pr-11;
  }
  .input-spinner {
    @apply absolute right-4 border-2 border-solid border-md-sys-surface-bright w-4.5 h-4.5 rounded-full border-l-md-sys-primary;
    animation: spin 0.8s linear infinite;
  }
  .form-error-msg {
    @apply text-md-sys-error text-[0.75rem] mt-1;
  }
  .form-hint {
    @apply text-md-sys-text-tertiary text-[0.78rem] leading-relaxed;
  }
  .flex-row {
    flex-direction: row !important;
    align-items: center !important;
    gap: 0.625rem !important;
    margin-top: 0.25rem !important;
  }
  .checkbox-label {
    @apply flex items-center gap-2.5 cursor-pointer text-[0.88rem] text-md-sys-on-background normal-case font-medium;
  }
  .checkbox-input {
    @apply w-5 h-5 rounded border-2 border-solid border-md-sys-outline bg-transparent cursor-pointer;
    accent-color: var(--md-sys-color-primary);
  }
  .form-actions {
    @apply flex justify-end gap-3 border-t border-solid border-md-sys-outline-variant pt-6;
  }
  .btn-cancel {
    @apply bg-transparent text-md-sys-primary;
  }
  .btn-cancel:hover {
    @apply bg-md-sys-primary/8;
  }
  .btn-submit {
    @apply bg-md-sys-primary text-md-sys-on-primary font-medium;
  }
  .btn-submit:hover:not(:disabled) {
    @apply bg-[#bcccf6];
  }
  .btn-submit:disabled {
    @apply opacity-[0.38] cursor-not-allowed;
  }
  .spinner-btn {
    @apply border-2 border-solid border-black/15 w-3.5 h-3.5 rounded-full border-l-md-sys-on-primary inline-block mr-1.5;
    animation: spin 0.8s linear infinite;
  }
  .sort-select {
    @apply bg-md-sys-surface-container-high border border-solid border-md-sys-outline-variant text-md-sys-on-background pl-4 pr-10 py-3 rounded-lg text-[0.88rem] font-medium outline-none cursor-pointer transition-all duration-200 appearance-none w-full;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%238c9099' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 1rem center;
    background-size: 1rem;
  }
  .sort-select:focus {
    @apply border-md-sys-primary;
  }
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @media (max-width: 768px) {
    .form-grid {
      @apply grid-cols-1 gap-5;
    }
    .full-width {
      @apply col-span-1;
    }
    form {
      @apply p-6;
    }
  }
</style>

