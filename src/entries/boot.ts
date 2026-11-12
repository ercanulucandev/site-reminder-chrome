/** İlk çizimde tema yanıp sönmesini önlemek için sistem temasını hemen uygula */
export function applyInitialTheme(): void {
  if (matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.classList.add('dark');
  }
}
