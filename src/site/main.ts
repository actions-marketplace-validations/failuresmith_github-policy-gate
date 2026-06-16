import { PolicyGeneratorApp } from './logic/app';

const appElement = document.querySelector('#app');
const modalElement = document.querySelector('#expression-modal');

if (
  !(appElement instanceof HTMLElement) ||
  !(modalElement instanceof HTMLElement)
) {
  throw new Error('App container or modal root was not found.');
}

const app = new PolicyGeneratorApp(appElement, modalElement);
app.initialize();
