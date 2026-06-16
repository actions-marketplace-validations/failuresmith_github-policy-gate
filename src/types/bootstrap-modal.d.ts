declare module 'bootstrap/js/dist/modal' {
  export default class Modal {
    public constructor(element: Element, config?: object);
    public hide(): void;
    public show(): void;
  }
}
