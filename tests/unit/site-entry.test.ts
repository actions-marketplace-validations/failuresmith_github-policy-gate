// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('bootstrap/js/dist/modal', () => ({
  default: class Modal {
    public constructor(_element: Element) {}
    public hide(): void {}
    public show(): void {}
  },
}));

describe('site entrypoint', () => {
  beforeEach(() => {
    vi.resetModules();
    globalThis.document.body.innerHTML = `
      <main id="app"></main>
      <div id="expression-modal">
        <div data-modal-body></div>
      </div>
    `;
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('boots the static site entrypoint', async () => {
    await import('../../src/site/main');

    expect(globalThis.document.body.textContent).toContain(
      'Build the policy in a few clicks.',
    );
    expect(
      globalThis.document.querySelector('[data-step-id="export"]'),
    ).not.toBeNull();
  });
});
