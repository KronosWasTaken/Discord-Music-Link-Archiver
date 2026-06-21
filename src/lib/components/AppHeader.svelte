<script lang="ts">
  let {
    songCount,
    dayCount,
    currentUser,
    isCurator,
    onAdd
  }: {
    songCount: number;
    dayCount: number;
    currentUser: string;
    isCurator: boolean;
    onAdd: () => void;
  } = $props();

  const isCuratorUser = $derived(currentUser.toLowerCase() === 'the_pervy_s4ge');
  const csvHref = $derived(isCuratorUser ? '/csv/ThePervySage' : `/csv/${currentUser}`);
  const csvName = $derived(isCuratorUser ? 'ThePervySage.csv' : `${currentUser}.csv`);
</script>

<header>
  <div class="header-title-container">
    <h1>The Pervy Sage Lounge</h1>
    <div class="meta-bar">
      <span class="meta-highlight">{songCount}</span> songs
      <span class="meta-dot"></span>
      <span class="meta-highlight">{dayCount}</span> unique days
      <span class="meta-dot"></span>
      <span>Curated by @{currentUser}</span>
    </div>
  </div>

  <div class="action-buttons">
    <button onclick={onAdd} class="btn btn-add" title="Add New Music Link">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      Add Music Link
    </button>

    <a href={csvHref} download={csvName} class="btn btn-csv">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
      Download CSV
    </a>
  </div>
</header>

<style lang="postcss">
  @reference "../../app.css";

  header {
    @apply flex justify-between items-center flex-wrap gap-6 max-w-[1200px] mx-auto mb-10 pb-6 border-b border-md-sys-outline-variant;
  }
  .header-title-container {
    @apply flex flex-col gap-1;
  }
  h1 {
    @apply text-[2.2rem] font-bold text-md-sys-text-primary tracking-[-0.5px];
  }
  .meta-bar {
    @apply flex items-center gap-2 text-[0.85rem] text-md-sys-text-secondary font-normal;
  }
  .meta-dot {
    @apply w-1 h-1 rounded-full bg-md-sys-outline inline-block;
  }
  .meta-highlight {
    @apply text-md-sys-primary font-semibold;
  }
  .action-buttons {
    @apply flex gap-3;
  }
  .btn-add {
    @apply bg-md-sys-primary text-md-sys-on-primary shadow-md-elevation-1;
  }
  .btn-add:hover {
    @apply bg-[#bcccf6] shadow-md-elevation-2;
  }
  .btn-add svg {
    @apply w-[18px] h-[18px];
  }
  .btn-csv {
    @apply bg-transparent border border-solid border-md-sys-outline text-md-sys-primary;
  }
  .btn-csv:hover {
    @apply bg-md-sys-primary/8 border-md-sys-primary;
  }
  .btn-csv svg {
    @apply w-4 h-4;
  }

  @media (max-width: 768px) {
    header {
      @apply flex-col items-start gap-5 mb-8;
    }
    .action-buttons {
      @apply w-full gap-2.5;
    }
    .btn-add, .btn-csv {
      @apply grow py-2.5 px-4;
    }
  }
</style>

