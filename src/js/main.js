import 'bootstrap/dist/css/bootstrap.min.css';

import Collapse from 'bootstrap/js/dist/collapse.js';

import '../css/styles.css';

import {
  initNavigation
} from './modules/navigation.js';

import {
  initRevealAnimations
} from './modules/reveal.js';

import {
  initContactForm
} from './modules/contact.js';

function setCurrentYear() {
  const elements =
    document.querySelectorAll(
      '[data-current-year]'
    );

  elements.forEach((element) => {
    element.textContent =
      String(
        new Date().getFullYear()
      );
  });
}

function initialize() {
  setCurrentYear();

  initNavigation(Collapse);

  initRevealAnimations();

  initContactForm();
}

document.addEventListener(
  'DOMContentLoaded',
  initialize,
  {
    once: true
  }
);