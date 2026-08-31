// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('bootstrap/js/dist/modal', () => ({
  default: class Modal {
    public constructor(_element: Element) {}
    public hide(): void {}
    public show(): void {}
  },
}));

import { PolicyGeneratorApp } from '../../src/site/logic/app';

function dispatchInput(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
): void {
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

function click(selector: string): void {
  const element = globalThis.document.querySelector(selector);
  if (!(element instanceof HTMLElement)) {
    throw new Error(`Missing element for selector: ${selector}`);
  }
  element.click();
}

describe('PolicyGeneratorApp', () => {
  let clipboardWriteText: ReturnType<typeof vi.fn>;
  let createObjectUrl: ReturnType<typeof vi.fn>;
  let revokeObjectUrl: ReturnType<typeof vi.fn>;
  let linkClickSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    globalThis.document.body.innerHTML = `
      <main id="app"></main>
      <div id="expression-modal">
        <div data-modal-body></div>
      </div>
    `;
    globalThis.localStorage.clear();
    clipboardWriteText = vi.fn().mockResolvedValue(undefined);
    createObjectUrl = vi.fn(() => 'blob:policy-file');
    revokeObjectUrl = vi.fn();

    Object.defineProperty(globalThis.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: clipboardWriteText,
      },
    });

    Object.defineProperty(globalThis.URL, 'createObjectURL', {
      configurable: true,
      value: createObjectUrl,
    });

    Object.defineProperty(globalThis.URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectUrl,
    });

    linkClickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
  });

  it('renders the quick start wizard and updates policy output on the export step', () => {
    const app = new PolicyGeneratorApp(
      globalThis.document.querySelector('#app') as HTMLElement,
      globalThis.document.querySelector('#expression-modal') as HTMLElement,
    );

    app.initialize();

    expect(globalThis.document.body.textContent).toContain(
      'Start with a baseline',
    );
    expect(globalThis.document.body.textContent).toContain('Safe default pack');

    click('[data-step-id="review"]');

    const titlePatterns = globalThis.document.querySelector(
      '[data-preset-id="title-format"][data-field="patterns"]',
    ) as HTMLTextAreaElement;
    titlePatterns.value = '^security: .+';
    dispatchInput(titlePatterns);

    click('[data-step-id="export"]');

    expect(globalThis.document.body.textContent).toContain('Workflow YAML');
    expect(globalThis.document.body.textContent).toContain('Policy YAML');
    expect(globalThis.document.body.textContent).toContain('^security: .+');
  });

  it('supports advanced mode with modal-based expression creation', () => {
    const app = new PolicyGeneratorApp(
      globalThis.document.querySelector('#app') as HTMLElement,
      globalThis.document.querySelector('#expression-modal') as HTMLElement,
    );

    app.initialize();

    click('[data-mode="advanced"]');
    click('[data-action="add-policy"]');

    const messageField = globalThis.document.querySelector(
      '[data-policy-uid="policy-1"][data-field="message"]',
    ) as HTMLTextAreaElement;
    messageField.value = 'Custom policy message.';
    dispatchInput(messageField);

    click(
      '[data-policy-uid="policy-1"][data-section="require"][data-mode="create-root"]',
    );

    const predicateSelect = globalThis.document.querySelector(
      '#expression-modal [data-field="predicateType"]',
    ) as HTMLSelectElement;
    predicateSelect.value = 'changed';
    dispatchInput(predicateSelect);

    const linesField = globalThis.document.querySelector(
      '#expression-modal [data-field="primaryLines"]',
    ) as HTMLTextAreaElement;
    linesField.value = 'src/**';
    dispatchInput(linesField);

    (
      globalThis.document.querySelector(
        '#expression-modal form',
      ) as HTMLFormElement
    ).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(globalThis.document.body.textContent).toContain('custom-policy-1');
    expect(globalThis.document.body.textContent).toContain('src/**');
  });

  it('copies and downloads generated outputs from the export step', async () => {
    const app = new PolicyGeneratorApp(
      globalThis.document.querySelector('#app') as HTMLElement,
      globalThis.document.querySelector('#expression-modal') as HTMLElement,
    );

    app.initialize();
    click('[data-step-id="export"]');
    click('[data-action="copy-output"][data-target="workflow"]');
    click('[data-action="download-output"][data-target="policy"]');

    expect(clipboardWriteText).toHaveBeenCalled();
    expect(createObjectUrl).toHaveBeenCalled();
    expect(linkClickSpy).toHaveBeenCalled();
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:policy-file');
  });
});
