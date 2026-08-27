<script lang="ts">
  import type { ActionData } from './$types';

  let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
  <title>Sign In &bull; The Pervy Sage Lounge</title>
</svelte:head>

<div class="login-page">
  <div class="login-card">
    <h1>The Pervy Sage Lounge</h1>
    <p class="subtitle">Sign in to view the archive</p>

    <form method="POST">
      <div class="form-group">
        <label for="username">Username</label>
        <input id="username" name="username" type="text" autocomplete="username" required />
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input id="password" name="password" type="password" autocomplete="current-password" required />
      </div>

      {#if form?.error}
        <p class="form-error">{form.error}</p>
      {/if}

      <button type="submit" class="btn btn-submit">Sign In</button>
    </form>
  </div>
</div>

<style lang="postcss">
  @reference "../../app.css";

  .login-page {
    @apply min-h-screen flex items-center justify-center bg-md-sys-background px-6;
    font-family: 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  }
  .login-card {
    @apply w-full max-w-100 bg-md-sys-surface-container-high rounded-[28px] p-9 shadow-md-elevation-3 border border-solid border-md-sys-outline-variant;
  }
  h1 {
    @apply text-[1.6rem] font-bold text-md-sys-text-primary mb-1.5 tracking-[-0.5px];
  }
  .subtitle {
    @apply text-md-sys-text-secondary text-[0.9rem] mb-8;
  }
  .form-group {
    @apply flex flex-col gap-1.5 mb-5;
  }
  label {
    @apply text-[0.75rem] font-bold text-md-sys-outline uppercase tracking-[0.5px];
  }
  input {
    @apply bg-transparent border border-solid border-md-sys-outline rounded px-4 py-3 text-md-sys-on-background text-[0.9rem] outline-none transition-all duration-200;
    transition-timing-function: cubic-bezier(0.2, 0, 0, 1);
  }
  input:focus {
    @apply border-md-sys-primary border-2 px-3.75 py-2.75;
  }
  .form-error {
    @apply text-md-sys-error text-[0.85rem] mb-5 -mt-2;
  }
  .btn-submit {
    @apply bg-md-sys-primary text-md-sys-on-primary font-medium w-full;
  }
  .btn-submit:hover {
    @apply bg-[#bcccf6];
  }
</style>
