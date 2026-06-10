"use client";
import { Camera, Mesh, Plane, Program, Renderer, Texture, Transform } from "ogl";
import type { OGLRenderingContext } from "ogl";
import { useEffect, useRef } from "react";

function debounce(func: (...args: unknown[]) => void, wait: number) {
  let timeout: ReturnType<typeof setTimeout>;
  return function (this: unknown, ...args: unknown[]) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

function lerp(p1: number, p2: number, t: number) {
  return p1 + (p2 - p1) * t;
}

function autoBind(instance: object) {
  const proto = Object.getPrototypeOf(instance);
  Object.getOwnPropertyNames(proto).forEach((key) => {
    if (key !== "constructor" && typeof (instance as Record<string, unknown>)[key] === "function") {
      (instance as Record<string, unknown>)[key] = (
        (instance as Record<string, unknown>)[key] as (...a: unknown[]) => unknown
      ).bind(instance);
    }
  });
}

function createTextTexture(
  gl: OGLRenderingContext,
  text: string,
  font = "bold 30px monospace",
  color = "white"
) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d")!;
  context.font = font;
  const metrics = context.measureText(text);
  const textWidth = Math.ceil(metrics.width);
  const textHeight = Math.ceil(parseInt(font, 10) * 1.2);
  canvas.width = textWidth + 20;
  canvas.height = textHeight + 20;
  context.font = font;
  context.fillStyle = color;
  context.textBaseline = "middle";
  context.textAlign = "center";
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new Texture(gl, { generateMipmaps: false });
  (texture as unknown as { image: HTMLCanvasElement }).image = canvas;
  return { texture, width: canvas.width, height: canvas.height };
}

interface GalleryItem {
  image: string;
  text: string;
}

interface ScreenViewport {
  screen: { width: number; height: number };
  viewport: { width: number; height: number };
}

class Title {
  gl: OGLRenderingContext;
  plane: Mesh | null = null;
  program: Program | null = null;

  constructor(
    gl: OGLRenderingContext,
    scene: Transform,
    geometry: Plane,
    text: string,
    textColor: string,
    font: string
  ) {
    this.gl = gl;
    this.createMesh(scene, geometry, text, textColor, font);
  }

  createMesh(
    scene: Transform,
    geometry: Plane,
    text: string,
    textColor: string,
    font: string
  ) {
    const { texture, width, height } = createTextTexture(this.gl, text, font, textColor);
    const program = new Program(this.gl, {
      vertex: `
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragment: `
        precision highp float;
        uniform sampler2D tMap;
        varying vec2 vUv;
        void main() {
          vec4 color = texture2D(tMap, vUv);
          if (color.a < 0.01) discard;
          gl_FragColor = color;
        }
      `,
      uniforms: { tMap: { value: texture } },
      transparent: true,
    });
    this.program = program;
    const aspect = width / height;
    const textHeight = 0.15;
    const textWidth = textHeight * aspect;
    const mesh = new Mesh(
      this.gl,
      {
        geometry: new Plane(this.gl, {
          width: textWidth,
          height: textHeight,
        }),
        program,
      }
    );
    (mesh as unknown as { setParent: (p: Transform) => void }).setParent(scene);
    this.plane = mesh;
  }

  update(x: number, y: number, z: number) {
    if (!this.plane) return;
    (this.plane as unknown as { position: { set: (x: number, y: number, z: number) => void } }).position.set(x, y, z);
  }
}

class Media {
  element: GalleryItem;
  gl: OGLRenderingContext;
  scene: Transform;
  geometry: Plane;
  screen: { width: number; height: number };
  viewport: { width: number; height: number };
  bend: number;
  textColor: string;
  borderRadius: number;
  font: string;
  index: number;
  length: number;
  extra: number = 0;
  mesh: Mesh | null = null;
  program: Program | null = null;
  title: Title | null = null;
  bounds: { left: number; top: number; width: number; height: number } = {
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  };
  x: number = 0;
  widthTotal: number = 0;
  width: number = 0;
  height: number = 0;
  isBefore: boolean = false;
  isAfter: boolean = false;

  constructor({
    element,
    gl,
    scene,
    geometry,
    screen,
    viewport,
    bend,
    textColor,
    borderRadius,
    font,
    index,
    length,
  }: {
    element: GalleryItem;
    gl: OGLRenderingContext;
    scene: Transform;
    geometry: Plane;
    screen: { width: number; height: number };
    viewport: { width: number; height: number };
    bend: number;
    textColor: string;
    borderRadius: number;
    font: string;
    index: number;
    length: number;
  }) {
    this.element = element;
    this.gl = gl;
    this.scene = scene;
    this.geometry = geometry;
    this.screen = screen;
    this.viewport = viewport;
    this.bend = bend;
    this.textColor = textColor;
    this.borderRadius = borderRadius;
    this.font = font;
    this.index = index;
    this.length = length;

    this.createShader();
    this.createMesh();
    this.createTitle();
    this.onResize({ screen, viewport });
  }

  createShader() {
    const texture = new Texture(this.gl, {
      generateMipmaps: false,
    });

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = this.element.image;
    img.onload = () => {
      (texture as unknown as { image: HTMLImageElement }).image = img;
    };

    const program = new Program(this.gl, {
      depthTest: false,
      depthWrite: false,
      vertex: `
        precision highp float;
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        uniform float uBendAmount;
        uniform float uWidthSegments;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 pos = position;
          float segment = floor(uv.x * uWidthSegments);
          float segCenter = (segment + 0.5) / uWidthSegments;
          float angle = (segCenter - 0.5) * uBendAmount;
          float radius = 1.0 / max(abs(uBendAmount), 0.0001);
          if (abs(uBendAmount) > 0.0001) {
            pos.z = radius - radius * cos(angle);
            pos.x = radius * sin(angle) * (1.0 / max(abs(uBendAmount), 0.0001)) * uBendAmount;
          }
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragment: `
        precision highp float;
        uniform sampler2D tMap;
        uniform float uBorderRadius;
        varying vec2 vUv;
        float roundedBoxSDF(vec2 p, vec2 b, float r) {
          vec2 d = abs(p) - b + vec2(r);
          return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
        }
        void main() {
          vec4 color = texture2D(tMap, vUv);
          vec2 uv = vUv - 0.5;
          float dist = roundedBoxSDF(uv, vec2(0.5 - uBorderRadius), uBorderRadius);
          float alpha = 1.0 - smoothstep(-0.005, 0.005, dist);
          gl_FragColor = vec4(color.rgb, color.a * alpha);
        }
      `,
      uniforms: {
        tMap: { value: texture },
        uBendAmount: { value: this.bend },
        uWidthSegments: { value: 20.0 },
        uBorderRadius: { value: this.borderRadius },
      },
      transparent: true,
    });

    this.program = program;
  }

  createMesh() {
    const mesh = new Mesh(this.gl, {
      geometry: this.geometry,
      program: this.program!,
    });
    (mesh as unknown as { setParent: (p: Transform) => void }).setParent(this.scene);
    this.mesh = mesh;
  }

  createTitle() {
    this.title = new Title(
      this.gl,
      this.scene,
      this.geometry,
      this.element.text,
      this.textColor,
      this.font
    );
  }

  update(scroll: { current: number; last: number }, direction: number) {
    if (!this.mesh) return;

    const meshPos = (this.mesh as unknown as { position: { x: number; y: number; z: number } }).position;
    meshPos.x = this.x - scroll.current - this.extra;

    const viewportWidth = this.viewport.width;
    const halfWidth = viewportWidth / 2;

    this.isBefore = meshPos.x + this.width / 2 < -halfWidth;
    this.isAfter = meshPos.x - this.width / 2 > halfWidth;

    if (direction > 0 && this.isBefore) {
      this.extra -= this.widthTotal;
      this.isBefore = false;
      this.isAfter = false;
    }
    if (direction < 0 && this.isAfter) {
      this.extra += this.widthTotal;
      this.isBefore = false;
      this.isAfter = false;
    }

    if (this.title && this.title.plane) {
      const titlePos = (this.title.plane as unknown as { position: { x: number; y: number; z: number } }).position;
      titlePos.x = meshPos.x;
      titlePos.y = meshPos.y - this.height / 2 - 0.1;
      titlePos.z = meshPos.z;
    }
  }

  onResize({ screen, viewport }: ScreenViewport) {
    this.screen = screen;
    this.viewport = viewport;

    const itemsPerRow = 4;
    const gap = viewport.width * 0.04;
    this.width = (viewport.width - gap * (itemsPerRow - 1)) / itemsPerRow;
    this.height = this.width * 1.5;

    const totalItems = this.length;
    const totalGap = gap * (totalItems - 1);
    this.widthTotal = totalItems * this.width + totalGap;

    const x = this.index * (this.width + gap);
    const center = (totalItems - 1) * (this.width + gap) / 2;
    this.x = (x - center) * 1;

    if (this.mesh) {
      const meshScale = (this.mesh as unknown as { scale: { set: (x: number, y: number, z: number) => void } }).scale;
      meshScale.set(this.width, this.height, 1);
      const meshPos = (this.mesh as unknown as { position: { x: number; y: number; z: number } }).position;
      meshPos.y = 0;
      meshPos.z = 0;
    }
  }
}

class App {
  container: HTMLDivElement;
  renderer: Renderer | null = null;
  gl: OGLRenderingContext | null = null;
  camera: Camera | null = null;
  scene: Transform | null = null;
  geometry: Plane | null = null;
  medias: Media[] = [];
  screen: { width: number; height: number } = { width: 0, height: 0 };
  viewport: { width: number; height: number } = { width: 0, height: 0 };
  scroll: { current: number; target: number; last: number; ease: number } = {
    current: 0,
    target: 0,
    last: 0,
    ease: 0.05,
  };
  direction: number = 0;
  raf: number = 0;
  touchStart: { x: number; y: number } = { x: 0, y: 0 };
  touchLast: { x: number; y: number } = { x: 0, y: 0 };
  isDown: boolean = false;
  options: {
    items?: GalleryItem[];
    bend?: number;
    textColor?: string;
    borderRadius?: number;
    font?: string;
    scrollSpeed?: number;
    scrollEase?: number;
  };

  constructor(
    container: HTMLDivElement,
    options: {
      items?: GalleryItem[];
      bend?: number;
      textColor?: string;
      borderRadius?: number;
      font?: string;
      scrollSpeed?: number;
      scrollEase?: number;
    }
  ) {
    this.container = container;
    this.options = options;
    this.scroll.ease = options.scrollEase ?? 0.05;
    autoBind(this);
    this.createRenderer();
    this.createCamera();
    this.createScene();
    this.createGeometry();
    this.createMedias(
      options.items ?? [],
      options.bend ?? 3,
      options.textColor ?? "#eeeef8",
      options.borderRadius ?? 0.05,
      options.font ?? "bold 24px monospace"
    );
    this.onResize();
    this.addEventListeners();
    this.update();
  }

  createRenderer() {
    this.renderer = new Renderer({ alpha: true, antialias: true });
    this.gl = (this.renderer as unknown as { gl: OGLRenderingContext }).gl;
    const canvas = (this.gl as unknown as { canvas: HTMLCanvasElement }).canvas;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    this.container.appendChild(canvas);
  }

  createCamera() {
    this.camera = new Camera(this.gl!, { fov: 45 });
    (this.camera as unknown as { position: { z: number } }).position.z = 5;
  }

  createScene() {
    this.scene = new Transform();
  }

  createGeometry() {
    this.geometry = new Plane(this.gl!, {
      widthSegments: 20,
      heightSegments: 1,
    });
  }

  createMedias(
    items: GalleryItem[],
    bend: number,
    textColor: string,
    borderRadius: number,
    font: string
  ) {
    this.medias = items.map(
      (item, index) =>
        new Media({
          element: item,
          gl: this.gl!,
          scene: this.scene!,
          geometry: this.geometry!,
          screen: this.screen,
          viewport: this.viewport,
          bend,
          textColor,
          borderRadius,
          font,
          index,
          length: items.length,
        })
    );
  }

  onTouchDown(e: MouseEvent | TouchEvent) {
    this.isDown = true;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    this.touchStart.x = clientX;
    this.touchLast.x = clientX;
  }

  onTouchMove(e: MouseEvent | TouchEvent) {
    if (!this.isDown) return;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const delta = this.touchLast.x - clientX;
    this.touchLast.x = clientX;
    const speed = this.options.scrollSpeed ?? 2;
    this.scroll.target += delta * speed * 0.01;
    this.direction = delta > 0 ? 1 : -1;
  }

  onTouchUp() {
    this.isDown = false;
  }

  onWheel(e: WheelEvent) {
    const speed = this.options.scrollSpeed ?? 2;
    this.scroll.target += e.deltaY * speed * 0.003;
    this.direction = e.deltaY > 0 ? 1 : -1;
  }

  onResize() {
    const rect = this.container.getBoundingClientRect();
    this.screen = { width: rect.width, height: rect.height };

    if (this.renderer) {
      (this.renderer as unknown as { setSize: (w: number, h: number) => void }).setSize(
        rect.width,
        rect.height
      );
    }

    if (this.camera) {
      const cam = this.camera as unknown as {
        perspective: (opts: { aspect: number }) => void;
        fov: number;
        position: { z: number };
      };
      cam.perspective({ aspect: rect.width / rect.height });
      const fovRad = (cam.fov * Math.PI) / 180;
      const height = 2 * Math.tan(fovRad / 2) * cam.position.z;
      const width = height * (rect.width / rect.height);
      this.viewport = { width, height };
    }

    for (const media of this.medias) {
      media.onResize({ screen: this.screen, viewport: this.viewport });
    }
  }

  update() {
    this.scroll.current = lerp(
      this.scroll.current,
      this.scroll.target,
      this.scroll.ease
    );

    for (const media of this.medias) {
      media.update(this.scroll, this.direction);
    }

    if (this.renderer && this.scene && this.camera) {
      (this.renderer as unknown as { render: (opts: { scene: Transform; camera: Camera }) => void }).render({
        scene: this.scene,
        camera: this.camera,
      });
    }

    this.scroll.last = this.scroll.current;
    this.raf = requestAnimationFrame(this.update);
  }

  addEventListeners() {
    const canvas = (this.gl as unknown as { canvas: HTMLCanvasElement }).canvas;
    canvas.addEventListener("mousedown", this.onTouchDown);
    window.addEventListener("mousemove", this.onTouchMove);
    window.addEventListener("mouseup", this.onTouchUp);
    canvas.addEventListener("touchstart", this.onTouchDown, { passive: true });
    canvas.addEventListener("touchmove", this.onTouchMove, { passive: true });
    canvas.addEventListener("touchend", this.onTouchUp);
    canvas.addEventListener("wheel", this.onWheel, { passive: true });
    window.addEventListener("resize", debounce(this.onResize, 150));
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    const canvas = (this.gl as unknown as { canvas: HTMLCanvasElement }).canvas;
    canvas.removeEventListener("mousedown", this.onTouchDown);
    window.removeEventListener("mousemove", this.onTouchMove);
    window.removeEventListener("mouseup", this.onTouchUp);
    canvas.removeEventListener("touchstart", this.onTouchDown);
    canvas.removeEventListener("touchmove", this.onTouchMove);
    canvas.removeEventListener("touchend", this.onTouchUp);
    canvas.removeEventListener("wheel", this.onWheel);
    if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
  }
}

interface CircularGalleryProps {
  items?: GalleryItem[];
  bend?: number;
  textColor?: string;
  borderRadius?: number;
  font?: string;
  scrollSpeed?: number;
  scrollEase?: number;
  className?: string;
}

export function CircularGallery({
  items,
  bend = 3,
  textColor = "#eeeef8",
  borderRadius = 0.05,
  font = "bold 24px monospace",
  scrollSpeed = 2,
  scrollEase = 0.05,
  className = "",
}: CircularGalleryProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const app = new App(containerRef.current, {
      items,
      bend,
      textColor,
      borderRadius,
      font,
      scrollSpeed,
      scrollEase,
    });
    return () => {
      app.destroy();
    };
  }, [items, bend, textColor, borderRadius, font, scrollSpeed, scrollEase]);

  return (
    <div
      className={`w-full h-full overflow-hidden cursor-grab active:cursor-grabbing ${className}`}
      ref={containerRef}
    />
  );
}
