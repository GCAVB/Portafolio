export function initNavigation(Collapse) {
  const navbar =
    document.querySelector('#mainNavigation');

  if (!navbar) {
    return;
  }

  const toggle = document.querySelector(
    '[data-bs-target="#mainNavigation"]'
  );

  const links =
    navbar.querySelectorAll('a[href^="#"]');

  links.forEach((link) => {
    link.addEventListener('click', () => {
      if (!toggle) {
        return;
      }

      const toggleDisplay =
        window.getComputedStyle(toggle).display;

      if (toggleDisplay === 'none') {
        return;
      }

      Collapse
        .getOrCreateInstance(
          navbar,
          {
            toggle: false
          }
        )
        .hide();
    });
  });
}