<template>
  <svg
    aria-hidden="true"
    class="brand-mark"
    viewBox="0 0 160 160"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      x="10"
      y="10"
      width="140"
      height="140"
      rx="34"
      class="brand-mark__outer"
    />
    <rect
      x="34"
      y="28"
      width="82"
      height="104"
      rx="18"
      class="brand-mark__book"
    />
    <path d="M54 56H94" class="brand-mark__line brand-mark__line--primary" />
    <path d="M54 76H106" class="brand-mark__line brand-mark__line--warm" />
    <path d="M54 96H86" class="brand-mark__line brand-mark__line--cool" />
    <circle cx="112" cy="104" r="22" class="brand-mark__seal" />
    <path d="M102 104.5L109.5 112L122 96" class="brand-mark__check" />
  </svg>
</template>

<style scoped>
.brand-mark {
  width: 4.5rem;
  height: 4.5rem;
  filter: drop-shadow(0 14px 26px rgba(16, 59, 55, 0.18));
}

.brand-mark__outer {
  fill: #103b37;
}

.brand-mark__book {
  fill: #f5efdf;
}

.brand-mark__line {
  fill: none;
  stroke-linecap: round;
  stroke-width: 8;
}

.brand-mark__line--primary {
  stroke: #0f6b57;
}

.brand-mark__line--warm {
  stroke: #c76a2b;
}

.brand-mark__line--cool {
  stroke: #4d8092;
}

.brand-mark__seal {
  fill: #c76a2b;
}

.brand-mark__check {
  fill: none;
  stroke: #f5efdf;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 6;
}
</style>
