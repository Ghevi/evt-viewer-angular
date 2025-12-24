import { ShapesOverlay } from "./osd-overlay";

export interface OpenSeaDragonOverlay {
  canvas: () => HTMLCanvasElement;
  context2d: () => CanvasRenderingContext2D;
}

declare module 'openseadragon' {
  interface Viewer {
    canvasOverlay: ({ }) => OpenSeaDragonOverlay;
    shapesOverlay?: ShapesOverlay;
    addShapes(): ShapesOverlay;
  }
}

