import { PolicyGeneratorApp } from './logic/app';

// eslint-disable-next-line no-undef
const appElement = document.querySelector('#app');
// eslint-disable-next-line no-undef
const modalElement = document.querySelector('#expression-modal');

if (
  !(appElement instanceof HTMLElement) ||
  !(modalElement instanceof HTMLElement)
) {
  throw new Error('App container or modal root was not found.');
}

const app = new PolicyGeneratorApp(appElement, modalElement);
app.initialize();
