<template>
  <section class="view-grid">
    <article class="panel panel--hero">
      <p class="panel__eyebrow">Starting point</p>
      <h2 class="panel__title">A shell built for the sideline, not for a desktop demo.</h2>
      <p class="panel__copy">
        This starter keeps the app lightweight and domain-neutral, but the critical PWA
        behaviors are already in place: mobile navigation, install flow, service worker updates,
        and a local database entrypoint ready for the first real records.
      </p>
      <div class="panel__stats">
        <div>
          <strong>Vue 3</strong>
          <span>Strict TypeScript app shell</span>
        </div>
        <div>
          <strong>Dexie</strong>
          <span>Schema versioning reserved up front</span>
        </div>
        <div>
          <strong>PWA</strong>
          <span>Install prompt and update path included</span>
        </div>
      </div>
    </article>

    <article class="panel">
      <p class="panel__eyebrow">Included now</p>
      <h3 class="panel__subtitle">What the boilerplate already proves</h3>
      <ul class="checklist">
        <li>App shell is cached after first load, so the UI can reopen offline.</li>
        <li>Pinia owns shared runtime state such as network, install, and update signals.</li>
        <li>Vue Router is in place with a mobile-first dock pattern instead of a placeholder page.</li>
        <li>Dexie is bootstrapped behind one module, ready for the first table version.</li>
      </ul>
    </article>

    <article class="panel panel--warm">
      <p class="panel__eyebrow">Intentionally deferred</p>
      <h3 class="panel__subtitle">What waits for the first real feature</h3>
      <ul class="checklist">
        <li>Domain entities, repositories, and sync conflict rules.</li>
        <li>Remote APIs, authentication, and background synchronization.</li>
        <li>Feature-specific state flows that would lock in the wrong abstractions too early.</li>
      </ul>
    </article>
  </section>
</template>

<style scoped>
.view-grid {
  display: grid;
  gap: 1rem;
}

.panel {
  padding: 1.3rem;
  border-radius: var(--radius-card);
  border: 1px solid var(--line);
  background: var(--bg-panel);
  box-shadow: var(--shadow-soft);
}

.panel--hero {
  background:
    linear-gradient(140deg, rgba(255, 251, 243, 0.95), rgba(220, 230, 215, 0.78)),
    linear-gradient(135deg, rgba(77, 128, 146, 0.1), transparent 50%);
}

.panel--warm {
  background:
    linear-gradient(140deg, rgba(255, 248, 241, 0.96), rgba(248, 231, 214, 0.78)),
    rgba(255, 251, 243, 0.94);
}

.panel__eyebrow {
  margin: 0 0 0.5rem;
  color: var(--accent);
  font: 700 0.82rem/1 var(--font-display);
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.panel__title,
.panel__subtitle {
  margin: 0;
  font-family: var(--font-display);
  line-height: 0.98;
  letter-spacing: -0.02em;
}

.panel__title {
  font-size: clamp(1.95rem, 5.6vw, 3rem);
  max-width: 12ch;
}

.panel__subtitle {
  font-size: 1.6rem;
}

.panel__copy {
  max-width: 40rem;
  margin: 1rem 0 0;
  color: var(--ink-soft);
  line-height: 1.6;
}

.panel__stats {
  display: grid;
  gap: 0.75rem;
  margin-top: 1.25rem;
}

.panel__stats div {
  padding: 0.95rem 1rem;
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.58);
}

.panel__stats strong,
.panel__stats span {
  display: block;
}

.panel__stats strong {
  font-family: var(--font-display);
  font-size: 1.15rem;
}

.panel__stats span {
  margin-top: 0.25rem;
  color: var(--ink-soft);
}

.checklist {
  margin: 1rem 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.8rem;
}

.checklist li {
  position: relative;
  padding-left: 1.45rem;
  color: var(--ink-soft);
  line-height: 1.55;
}

.checklist li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.4rem;
  width: 0.6rem;
  height: 0.6rem;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), var(--accent-hot));
}

@media (min-width: 900px) {
  .view-grid {
    grid-template-columns: 1.4fr 1fr 1fr;
    align-items: start;
  }

  .panel--hero {
    min-height: 100%;
  }
}
</style>
