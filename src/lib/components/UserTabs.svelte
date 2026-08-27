<script lang="ts">
  const CURATOR = 'the_pervy_s4ge';

  let {
    users,
    currentUser,
    onSelect
  }: {
    users: string[];
    currentUser: string;
    onSelect: (user: string) => void;
  } = $props();
</script>

<div class="user-tabs-container">
  {#each users as user}
    <button class="user-tab-btn" class:active={currentUser === user} onclick={() => onSelect(user)}>
      {user === CURATOR ? 'the_pervy_s4ge (Curator)' : user}
    </button>
  {/each}
</div>

<style lang="postcss">
  @reference "../../app.css";

  .user-tabs-container {
    @apply flex gap-2 max-w-300 mx-auto mb-8 overflow-x-auto p-1 border-b border-md-sys-outline-variant;
    scrollbar-width: none;
  }
  .user-tabs-container::-webkit-scrollbar {
    display: none;
  }
  .user-tab-btn {
    @apply bg-transparent border-none text-md-sys-text-secondary px-5 py-3 text-[0.95rem] font-medium cursor-pointer transition-all outline-none whitespace-nowrap;
    border-bottom: 3px solid transparent;
    font-family: inherit;
    transition-duration: 200ms;
    transition-timing-function: cubic-bezier(0.2, 0, 0, 1);
  }
  .user-tab-btn:hover {
    @apply text-md-sys-primary bg-md-sys-primary/4;
  }
  .user-tab-btn.active {
    @apply text-md-sys-primary border-b-md-sys-primary font-bold;
  }
</style>

