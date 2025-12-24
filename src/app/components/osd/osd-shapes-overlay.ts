import OpenSeadragon from "openseadragon";

export interface ImagePoint {
    x: number;
    y: number;
}

export interface ImageRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface ShapeOptions {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
}

export type ShapeType = "rect" | "polygon";

export interface ShapeBase {
    id: string;
    type: ShapeType;
    node: SVGElement;
    onClick?: (shape: ShapeBase, evt: MouseEvent) => void;
}

export class ShapesOverlay {
    private viewer: OpenSeadragon.Viewer;
    private svg: SVGSVGElement;
    private shapes: ShapeBase[] = [];

    constructor(viewer: OpenSeadragon.Viewer) {
        this.viewer = viewer;
        this.svg = this.createSVG();
        this.viewer.canvas.appendChild(this.svg);

        this.viewer.addHandler("viewport-change", () => this.update());
    }

    addRect(id: string, rect: ImageRect, options: ShapeOptions = {}): ShapeBase {
        const node = this.createNode("rect", options);
        const shape: ShapeBase & { rect: ImageRect } = {
            id,
            type: "rect",
            rect,
            node
        };

        this.bindClick(shape);
        this.svg.appendChild(node);
        this.shapes.push(shape);
        this.update();

        return shape;
    }

    addPolygon(id: string, points: ImagePoint[], options: ShapeOptions = {}): ShapeBase {
        const node = this.createNode("polygon", options);
        const shape: ShapeBase & { points: ImagePoint[] } = {
            id,
            type: "polygon",
            points,
            node
        };

        this.bindClick(shape);
        this.svg.appendChild(node);
        this.shapes.push(shape);
        this.update();

        return shape;
    }

    onShapeClick(shape: ShapeBase, handler: (shape: ShapeBase, evt: MouseEvent) => void) {
        shape.onClick = handler;
    }

    clear() {
        this.shapes.forEach(s => s.node.remove());
        this.shapes = [];
    }

    private createSVG(): SVGSVGElement {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.style.position = "absolute";
        svg.style.inset = "0";
        svg.style.width = "100%";
        svg.style.height = "100%";
        svg.style.pointerEvents = "none";
        svg.style.userSelect = "none";
        return svg;
    }

    private createNode(tag: "rect" | "polygon", options: ShapeOptions): SVGElement {
        const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
        node.setAttribute("fill", options.fill ?? "rgba(255,0,0,0.3)");
        node.setAttribute("stroke", options.stroke ?? "red");
        node.setAttribute("stroke-width", String(options.strokeWidth ?? 2));
        node.style.cursor = "pointer";
        node.style.pointerEvents = "auto";
        return node;
    }

    private bindClick(shape: ShapeBase) {
        shape.node.addEventListener("click", e => {
            e.stopPropagation();
            shape.onClick?.(shape, e);
        });

        shape.node.addEventListener(
            "mouseenter",
            () => this.viewer.setMouseNavEnabled(false),
        );

        shape.node.addEventListener(
            "mouseleave",
            () => this.viewer.setMouseNavEnabled(true),
        );
    }

    private imageToViewer(pt: ImagePoint): OpenSeadragon.Point {
        const item = this.viewer.world.getItemAt(0);
        if (!item) {
            return new OpenSeadragon.Point(NaN, NaN);
        }

        // image -> viewport
        const viewportPoint = item.imageToViewportCoordinates(pt.x, pt.y);
        // viewport -> viewer element (pixels)
        const result = this.viewer.viewport.viewportToViewerElementCoordinates(viewportPoint);
        return result;
    }


    private update() {
        this.shapes.forEach(shape => {
            if (shape.type === "rect") {
                const rect = (shape as any).rect as ImageRect;

                const topLeft = this.imageToViewer({ x: rect.x, y: rect.y });
                const bottomRight = this.imageToViewer({ x: rect.x + rect.width, y: rect.y + rect.height });

                shape.node.setAttribute("x", String(topLeft.x));
                shape.node.setAttribute("y", String(topLeft.y));
                shape.node.setAttribute("width", String(bottomRight.x - topLeft.x));
                shape.node.setAttribute("height", String(bottomRight.y - topLeft.y));
            }

            if (shape.type === "polygon") {
                const pts = ((shape as any).points as ImagePoint[])
                    .map(p => {
                        const v = this.imageToViewer(p);
                        return `${v.x},${v.y}`;
                    })
                    .join(" ");

                shape.node.setAttribute("points", pts);
            }
        });
    }
}
