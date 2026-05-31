import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Line, Rect, Group, Circle, Shape } from 'react-konva';
import useImage from 'use-image';
import Konva from 'konva';
import { mapAssetUrl } from '@/lib/api';
import type { FowAction, ViewState, MapTrap } from './MapCanvas.types';

export type { FowAction, ViewState, MapTrap };

export interface MapCanvasProps {
  mapUrl: string;
  fowActions: FowAction[];
  isGm: boolean;
  mapType?: 'image' | 'video';
  syncScale?: number;
  syncPosition?: { x: number; y: number };
  syncContainerSize?: { width: number; height: number };
  initialView?: ViewState | null;
  onViewChange?: (view: ViewState) => void;
  panMode?: boolean;
  centerTrigger?: number;
  selectedTool?: 'brush' | 'eraser' | 'paint' | 'paint-eraser';
  brushSize?: number;
  brushShape?: 'round' | 'square';
  paintColor?: string;
  onFowDraw?: (action: FowAction) => void;
  traps?: MapTrap[];
  placeTrapMode?: boolean;
  onMapClick?: (normalized: { x: number; y: number }) => void;
  onTrapMove?: (trapId: string, normalized: { x: number; y: number }) => void;
  /** Si true, el mapa se dibuja espejado (solo para proyección) */
  mirrorMap?: boolean;
}

function coverRect(
  containerW: number,
  containerH: number,
  contentW: number,
  contentH: number
): { x: number; y: number; w: number; h: number } {
  if (contentW <= 0 || contentH <= 0) return { x: 0, y: 0, w: containerW, h: containerH };
  const scale = Math.max(containerW / contentW, containerH / contentH);
  const w = contentW * scale;
  const h = contentH * scale;
  return { x: (containerW - w) / 2, y: (containerH - h) / 2, w, h };
}

const URLImage = ({
  src,
  rect,
  onNaturalSize,
  layerRef,
}: {
  src: string;
  rect: { x: number; y: number; w: number; h: number };
  onNaturalSize?: (w: number, h: number) => void;
  layerRef?: React.RefObject<Konva.Layer | null>;
}) => {
  const [image] = useImage(src, 'anonymous');
  const isGif = src.toLowerCase().endsWith('.gif');
  React.useEffect(() => {
    if (image && onNaturalSize) onNaturalSize(image.naturalWidth || 0, image.naturalHeight || 0);
    let anim: Konva.Animation | null = null;
    if (isGif && image && layerRef?.current) {
      anim = new Konva.Animation(() => {}, layerRef.current);
      anim.start();
    }
    return () => { if (anim) anim.stop(); };
  }, [image, onNaturalSize, isGif, layerRef]);
  if (!image) return null;
  return <KonvaImage image={image} x={rect.x} y={rect.y} width={rect.w} height={rect.h} />;
}

/** Icono de trampa de oso: anillo, placa central y “dientes” */
function BearTrapIcon({
  x,
  y,
  width,
  height,
  fill,
  stroke,
  ...rest
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke?: string;
  [k: string]: unknown;
}) {
  const strokeColor = stroke ?? 'rgba(0,0,0,0.5)';
  return (
    <Shape
      x={x}
      y={y}
      width={width}
      height={height}
      sceneFunc={(ctx, shape) => {
        const w = shape.width();
        const h = shape.height();
        const s = Math.min(w, h) / 24;
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.scale(s, s);
        ctx.translate(-12, -12);
        // Anillo exterior
        ctx.beginPath();
        ctx.arc(12, 12, 10, 0, Math.PI * 2);
        ctx.fillStyle = shape.getAttr('fill') ?? strokeColor ?? '#333';
        ctx.fill();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        // Placa central (disparador)
        ctx.beginPath();
        ctx.arc(12, 12, 4, 0, Math.PI * 2);
        ctx.fillStyle = strokeColor;
        ctx.fill();
        ctx.strokeStyle = shape.getAttr('fill') ?? strokeColor ?? '#333';
        ctx.lineWidth = 0.8;
        ctx.stroke();
        // Dientes (4 triángulos hacia dentro)
        [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].forEach((angle) => {
          ctx.beginPath();
          ctx.moveTo(12 + 6 * Math.cos(angle), 12 + 6 * Math.sin(angle));
          ctx.lineTo(12 + 9 * Math.cos(angle), 12 + 9 * Math.sin(angle));
          const a2 = angle + 0.4;
          ctx.lineTo(12 + 7 * Math.cos(a2), 12 + 7 * Math.sin(a2));
          ctx.closePath();
          ctx.fillStyle = strokeColor;
          ctx.fill();
        });
        ctx.restore();
      }}
      hitFunc={(ctx, shape) => {
        ctx.beginPath();
        ctx.rect(0, 0, shape.width(), shape.height());
        ctx.fillStrokeShape(shape);
      }}
      fill={fill}
      {...rest}
    />
  );
}

const VIDEO_EXT = /\.(mp4|webm|mov|ogg|ogv)(\?|$)/i;
function isVideoUrl(url: string) {
  return VIDEO_EXT.test(url);
}

/** Imagen de trampa con soporte de filtro gris (desactivada) y cache */
function TrapImageNode({
  image,
  grayscale,
  ...commonProps
}: {
  image: HTMLImageElement;
  grayscale: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  draggable: boolean;
  listening: boolean;
  filters: unknown[];
  onMouseDown?: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  dragBoundFunc?: (pos: { x: number; y: number }) => { x: number; y: number };
  onDragEnd?: (e: Konva.KonvaEventObject<DragEvent>) => void;
}) {
  const ref = useRef<Konva.Image>(null);
  useEffect(() => {
    if (ref.current && grayscale) ref.current.cache();
  }, [grayscale]);
  return <KonvaImage ref={ref} image={image} {...commonProps} />;
}

/** Trampa con vídeo: redibuja el layer para actualizar frames */
function TrapVideoNode({
  src,
  layerRef: _layerRef,
  grayscale = false,
  ...commonProps
}: {
  src: string;
  layerRef: React.RefObject<Konva.Layer | null>;
  grayscale?: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  draggable: boolean;
  listening: boolean;
  filters: unknown[];
  onMouseDown?: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  dragBoundFunc?: (pos: { x: number; y: number }) => { x: number; y: number };
  onDragEnd?: (e: Konva.KonvaEventObject<DragEvent>) => void;
}) {
  const animRef = useRef<Konva.Animation | null>(null);
  const imageNodeRef = useRef<Konva.Image>(null);
  const [videoReady, setVideoReady] = useState(false);
  const videoEl = useMemo(() => {
    if (typeof document === 'undefined' || !src) return null;
    const el = document.createElement('video');
    el.src = src;
    el.muted = true;
    el.loop = true;
    el.preload = 'auto';
    el.setAttribute('loop', '');
    el.playsInline = true;
    el.setAttribute('crossOrigin', 'anonymous');
    el.load();
    return el;
  }, [src]);
  useEffect(() => {
    if (!videoEl) return;
    setVideoReady(false);
    const onCanPlay = () => setVideoReady(true);
    videoEl.addEventListener('canplay', onCanPlay);
    if (videoEl.readyState >= 2) setVideoReady(true);
    return () => {
      videoEl.removeEventListener('canplay', onCanPlay);
    };
  }, [videoEl]);
  useEffect(() => {
    if (!videoEl || !videoReady) return;
    let cancelled = false;
    const startAnimation = () => {
      const node = imageNodeRef.current;
      const layer = node?.getLayer?.();
      if (!layer || cancelled) return;
      videoEl.play().catch(() => {});
      const anim = new Konva.Animation(() => {
        if (!cancelled && layer.getStage()) {
          if (grayscale && node) node.cache();
          layer.batchDraw();
        }
      }, layer);
      animRef.current = anim;
      anim.start();
    };
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) startAnimation();
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
      animRef.current?.stop();
      animRef.current = null;
      videoEl.pause();
    };
  }, [videoEl, videoReady, grayscale]);
  if (!videoEl) return null;
  return <KonvaImage ref={imageNodeRef} image={videoEl} {...commonProps} />;
}

/** Nodo de una trampa: imagen, vídeo o icono de oso. inMapGroup=true cuando está dentro del Group con offset mapRect (coordenadas en espacio del mapa). */
function TrapNode({
  trap,
  tw,
  th,
  cx,
  cy,
  fill,
  canDrag,
  onTrapMove,
  mapRect,
  layerRef,
  inMapGroup = false,
}: {
  trap: MapTrap;
  tw: number;
  th: number;
  cx: number;
  cy: number;
  fill: string;
  canDrag: boolean;
  onTrapMove?: (trapId: string, normalized: { x: number; y: number }) => void;
  mapRect: { x: number; y: number; w: number; h: number };
  layerRef?: React.RefObject<Konva.Layer | null>;
  inMapGroup?: boolean;
}) {
  const src = trap.imageUrl ? mapAssetUrl(trap.imageUrl) : '';
  const [image] = useImage(src || '', 'anonymous');
  const isVideo = trap.imageUrl ? isVideoUrl(trap.imageUrl) : false;
  const iw = image ? (image.naturalWidth || image.width) || 1 : 1;
  const ih = image ? (image.naturalHeight || image.height) || 1 : 1;
  const scale = iw > 0 && ih > 0 ? Math.min(tw / iw, th / ih) : 1;
  const w = trap.imageUrl && image ? iw * scale : tw;
  const h = trap.imageUrl && image ? ih * scale : th;
  const trapX = cx - w / 2;
  const trapY = cy - h / 2;
  const grayscale = !trap.activated;
  const commonProps = {
    name: 'trap',
    x: trapX,
    y: trapY,
    width: w,
    height: h,
    filters: grayscale ? [Konva.Filters.Grayscale] : [],
    draggable: canDrag,
    listening: canDrag,
    onMouseDown: canDrag ? (e: Konva.KonvaEventObject<MouseEvent>) => e.evt?.stopPropagation?.() : undefined,
    dragBoundFunc: canDrag
      ? inMapGroup
        ? (pos: { x: number; y: number }) => ({
            x: Math.max(0, Math.min(mapRect.w - w, pos.x)),
            y: Math.max(0, Math.min(mapRect.h - h, pos.y)),
          })
        : (pos: { x: number; y: number }) => ({
            x: Math.max(mapRect.x, Math.min(mapRect.x + mapRect.w - w, pos.x)),
            y: Math.max(mapRect.y, Math.min(mapRect.y + mapRect.h - h, pos.y)),
          })
      : undefined,
    onDragEnd:
      canDrag && onTrapMove
        ? (e: Konva.KonvaEventObject<DragEvent>) => {
            const node = e.target;
            const pos = node.position();
            const centerX = pos.x + w / 2;
            const centerY = pos.y + h / 2;
            const normX = mapRect.w > 0 ? Math.max(0, Math.min(1, inMapGroup ? centerX / mapRect.w : (centerX - mapRect.x) / mapRect.w)) : trap.x;
            const normY = mapRect.h > 0 ? Math.max(0, Math.min(1, inMapGroup ? centerY / mapRect.h : (centerY - mapRect.y) / mapRect.h)) : trap.y;
            onTrapMove(trap.id, { x: normX, y: normY });
          }
        : undefined,
  };
  if (trap.imageUrl && isVideo && layerRef) {
    return <TrapVideoNode src={src} layerRef={layerRef} grayscale={grayscale} {...commonProps} />;
  }
  if (trap.imageUrl && image) {
    return <TrapImageNode image={image} grayscale={grayscale} {...commonProps} />;
  }
  if (trap.imageUrl && !image) {
    return <Rect {...commonProps} fill="transparent" listening={canDrag} />;
  }
  return <BearTrapIcon fill={fill} stroke="rgba(0,0,0,0.5)" {...commonProps} />;
}

function VideoFrame({
  src,
  rect,
  layerRef,
  onNaturalSize,
}: {
  src: string;
  rect: { x: number; y: number; w: number; h: number };
  layerRef: React.RefObject<Konva.Layer | null>;
  onNaturalSize?: (w: number, h: number) => void;
}) {
  const animRef = useRef<Konva.Animation | null>(null);
  const videoEl = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const el = document.createElement('video');
    el.src = src;
    el.muted = true;
    el.loop = true;
    el.setAttribute('loop', '');
    el.playsInline = true;
    el.setAttribute('crossOrigin', 'anonymous');
    el.addEventListener('ended', () => el.play().catch(() => {}));
    return el;
  }, [src]);
  useEffect(() => {
    if (!videoEl) return;
    const onMeta = () => { if (onNaturalSize) onNaturalSize(videoEl.videoWidth || 0, videoEl.videoHeight || 0); };
    videoEl.addEventListener('loadedmetadata', onMeta);
    if (videoEl.videoWidth) onMeta();
    const id = requestAnimationFrame(() => {
      const layer = layerRef?.current;
      if (!layer) return;
      videoEl.play().catch(() => {});
      const anim = new Konva.Animation(() => {}, layer);
      animRef.current = anim;
      anim.start();
    });
    return () => {
      cancelAnimationFrame(id);
      animRef.current?.stop();
      animRef.current = null;
      videoEl.pause();
      videoEl.removeEventListener('loadedmetadata', onMeta);
    };
  }, [videoEl, src, layerRef, onNaturalSize]);
  if (!videoEl) return null;
  return <KonvaImage image={videoEl} x={rect.x} y={rect.y} width={rect.w} height={rect.h} />;
}

const VIEW_SYNC_THROTTLE_MS = 80;

export default function MapCanvas({
  mapUrl,
  fowActions,
  isGm,
  mapType = 'image',
  syncScale,
  syncPosition,
  syncContainerSize,
  initialView,
  onViewChange,
  panMode = false,
  centerTrigger,
  selectedTool,
  brushSize = 50,
  brushShape = 'round',
  paintColor = '#ef4444',
  onFowDraw,
  traps = [],
  placeTrapMode = false,
  onMapClick,
  onTrapMove,
  mirrorMap = false,
}: MapCanvasProps) {
  const isDrawing = useRef(false);
  const stageRef = useRef<Konva.Stage>(null);
  const mapLayerRef = useRef<Konva.Layer>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const isPanning = useRef(false);
  const lastPanPosition = useRef({ x: 0, y: 0 });
  const viewSyncTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCenter = useRef<{ x: number; y: number } | null>(null);
  const lastDist = useRef<number>(0);
  const prevSizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const prevMapRectRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  const displayScale = syncScale ?? scale;
  const displayPosition = syncPosition ?? position;
  const effectiveWidth = syncContainerSize?.width ?? containerSize.width;
  const effectiveHeight = syncContainerSize?.height ?? containerSize.height;

  const emitViewChange = useCallback(
    (newScale: number, newPosition: { x: number; y: number }) => {
      if (!onViewChange) return;
      if (viewSyncTimeout.current) clearTimeout(viewSyncTimeout.current);
      viewSyncTimeout.current = setTimeout(() => {
        onViewChange({
          scale: newScale,
          position: newPosition,
          containerWidth: containerSize.width,
          containerHeight: containerSize.height,
        });
        viewSyncTimeout.current = null;
      }, VIEW_SYNC_THROTTLE_MS);
    },
    [onViewChange, containerSize.width, containerSize.height]
  );

  useEffect(() => {
    if (syncScale !== undefined) return;
    const s = initialView?.scale;
    const p = initialView?.position;
    if (s != null && p != null && typeof p.x === 'number' && typeof p.y === 'number') {
      setScale(s);
      setPosition(p);
    }
  }, [initialView?.scale, initialView?.position, syncScale]);

  useEffect(() => {
    if (syncScale !== undefined || centerTrigger == null || centerTrigger < 1) return;
    setScale(1);
    setPosition({ x: 0, y: 0 });
    onViewChange?.({
      scale: 1,
      position: { x: 0, y: 0 },
      containerWidth: containerSize.width,
      containerHeight: containerSize.height,
    });
  }, [centerTrigger]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0]?.contentRect ?? { width: 800, height: 600 };
      setContainerSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const [contentNaturalSize, setContentNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const mapRect = useMemo(() => {
    if (contentNaturalSize && contentNaturalSize.w > 0 && contentNaturalSize.h > 0)
      return coverRect(effectiveWidth, effectiveHeight, contentNaturalSize.w, contentNaturalSize.h);
    return { x: 0, y: 0, w: effectiveWidth, h: effectiveHeight };
  }, [effectiveWidth, effectiveHeight, contentNaturalSize]);
  const reportNaturalSize = useCallback((w: number, h: number) => {
    setContentNaturalSize((prev) => (prev && prev.w === w && prev.h === h ? prev : { w, h }));
  }, []);

  useEffect(() => {
    if (syncScale !== undefined || !contentNaturalSize || mapRect.w <= 0 || mapRect.h <= 0) {
      prevSizeRef.current = { w: effectiveWidth, h: effectiveHeight };
      prevMapRectRef.current = mapRect;
      return;
    }
    const prev = prevSizeRef.current;
    const sizeChanged = prev.w !== effectiveWidth || prev.h !== effectiveHeight;
    if (sizeChanged && prev.w > 0 && prev.h > 0 && prevMapRectRef.current) {
      const oldRect = prevMapRectRef.current;
      const stageW = prev.w;
      const stageH = prev.h;
      const centerStageX = (stageW / 2 - position.x) / scale;
      const centerStageY = (stageH / 2 - position.y) / scale;
      const centerNormX = (centerStageX - oldRect.x) / oldRect.w;
      const centerNormY = (centerStageY - oldRect.y) / oldRect.h;
      const visibleNormW = stageW / (scale * oldRect.w);
      const newScale = Math.max(0.5, Math.min(5, effectiveWidth / (visibleNormW * mapRect.w)));
      const newPosX = effectiveWidth / 2 - newScale * (mapRect.x + centerNormX * mapRect.w);
      const newPosY = effectiveHeight / 2 - newScale * (mapRect.y + centerNormY * mapRect.h);
      setScale(newScale);
      setPosition({ x: newPosX, y: newPosY });
      onViewChange?.({
        scale: newScale,
        position: { x: newPosX, y: newPosY },
        containerWidth: effectiveWidth,
        containerHeight: effectiveHeight,
      });
    }
    prevSizeRef.current = { w: effectiveWidth, h: effectiveHeight };
    prevMapRectRef.current = mapRect;
  }, [effectiveWidth, effectiveHeight, mapRect, contentNaturalSize, syncScale, scale, position, onViewChange]);

  const [currentLine, setCurrentLine] = useState<FowAction | null>(null);

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    if (syncScale !== undefined) return;
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const oldScale = scale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const mousePointTo = { x: (pointer.x - position.x) / oldScale, y: (pointer.y - position.y) / oldScale };
    const scaleBy = 1.1;
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    const clampedScale = Math.max(0.5, Math.min(5, newScale));
    const newPos = { x: pointer.x - mousePointTo.x * clampedScale, y: pointer.y - mousePointTo.y * clampedScale };
    setScale(clampedScale);
    setPosition(newPos);
    emitViewChange(clampedScale, newPos);
  };

  const getDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }) =>
    Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
  const getCenter = (p1: { x: number; y: number }, p2: { x: number; y: number }) => ({
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  });

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    if (e.target.name() === 'trap') return;
    if (placeTrapMode && onMapClick && isGm) {
      const pos = stage.getPointerPosition();
      if (pos && mapRect.w > 0 && mapRect.h > 0) {
        const layerX = (pos.x - displayPosition.x) / displayScale;
        const layerY = (pos.y - displayPosition.y) / displayScale;
        const contentX = layerX - mapRect.x;
        const contentY = layerY - mapRect.y;
        const normX = Math.max(0, Math.min(1, contentX / mapRect.w));
        const normY = Math.max(0, Math.min(1, contentY / mapRect.h));
        onMapClick({ x: normX, y: normY });
      }
      return;
    }
    const isMiddleButton = 'button' in e.evt && e.evt.button === 1;
    const isSpacePan = 'button' in e.evt && e.evt.button === 0 && e.evt.shiftKey;
    const isPanModeLeftClick = panMode && 'button' in e.evt && e.evt.button === 0;
    if (syncScale === undefined && (isMiddleButton || isSpacePan || isPanModeLeftClick)) {
      isPanning.current = true;
      const pointer = stage.getPointerPosition();
      if (pointer) lastPanPosition.current = pointer;
      return;
    }
    if (!isGm || !selectedTool || panMode) return;
    isDrawing.current = true;
    const pos = stage.getPointerPosition();
    if (!pos) return;
    const layerX = (pos.x - position.x) / scale;
    const layerY = (pos.y - position.y) / scale;
    const contentX = layerX - mapRect.x;
    const contentY = layerY - mapRect.y;
    const normX = mapRect.w > 0 ? contentX / mapRect.w : 0;
    const normY = mapRect.h > 0 ? contentY / mapRect.h : 0;
    const newAction: FowAction = {
      tool: selectedTool,
      points: [normX, normY],
      size: mapRect.w > 0 ? brushSize / mapRect.w : 0,
      id: `${Date.now()}-${Math.random()}`,
      brushShape,
      ...(selectedTool === 'paint' ? { color: paintColor } : {}),
      normalized: true,
    };
    setCurrentLine(newAction);
  };

  const handleTouchStart = (e: Konva.KonvaEventObject<TouchEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const touches = e.evt.touches;
    if (syncScale === undefined) {
      if (touches.length === 1 && panMode) {
        isPanning.current = true;
        lastPanPosition.current = { x: touches[0].clientX, y: touches[0].clientY };
      } else if (touches.length === 2) {
        isPanning.current = false;
        const tp1 = { x: touches[0].clientX, y: touches[0].clientY };
        const tp2 = { x: touches[1].clientX, y: touches[1].clientY };
        lastDist.current = getDistance(tp1, tp2);
        lastCenter.current = getCenter(tp1, tp2);
      }
    }
    if (isGm && selectedTool && !panMode && touches.length === 1) handleMouseDown(e);
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const stage = e.target.getStage();
    const point = stage?.getPointerPosition();
    if (!point) return;
    const logicalPoint = {
      x: (point.x - displayPosition.x) / displayScale,
      y: (point.y - displayPosition.y) / displayScale,
    };
    if (isGm && !panMode) setCursorPos(logicalPoint);
    else setCursorPos(null);
    if (syncScale === undefined && isPanning.current) {
      const dx = point.x - lastPanPosition.current.x;
      const dy = point.y - lastPanPosition.current.y;
      setPosition((p) => ({ x: p.x + dx, y: p.y + dy }));
      emitViewChange(scale, { x: position.x + dx, y: position.y + dy });
      lastPanPosition.current = point;
      return;
    }
    if (!isDrawing.current || !currentLine) return;
    const layerX = (point.x - position.x) / scale;
    const layerY = (point.y - position.y) / scale;
    const contentX = layerX - mapRect.x;
    const contentY = layerY - mapRect.y;
    const normX = mapRect.w > 0 ? contentX / mapRect.w : 0;
    const normY = mapRect.h > 0 ? contentY / mapRect.h : 0;
    setCurrentLine((prev) =>
      prev ? { ...prev, points: [...(prev.points || []), normX, normY] } : null
    );
  };

  const handleTouchMove = (e: Konva.KonvaEventObject<TouchEvent>) => {
    if (syncScale !== undefined) return;
    const stage = stageRef.current;
    if (!stage) return;
    const touches = e.evt.touches;
    if (touches.length === 2 && lastCenter.current) {
      e.evt.preventDefault();
      const tp1 = { x: touches[0].clientX, y: touches[0].clientY };
      const tp2 = { x: touches[1].clientX, y: touches[1].clientY };
      const dist = getDistance(tp1, tp2);
      const center = getCenter(tp1, tp2);
      const newScale = (dist / lastDist.current) * scale;
      const clampedScale = Math.max(0.5, Math.min(5, newScale));
      const stagePos = stage.position();
      const pointTo = {
        x: (lastCenter.current.x - stagePos.x) / scale,
        y: (lastCenter.current.y - stagePos.y) / scale,
      };
      setScale(clampedScale);
      setPosition({ x: center.x - pointTo.x * clampedScale, y: center.y - pointTo.y * clampedScale });
      emitViewChange(clampedScale, { x: center.x - pointTo.x * clampedScale, y: center.y - pointTo.y * clampedScale });
      lastDist.current = dist;
      lastCenter.current = center;
    } else if (touches.length === 1) handleMouseMove(e);
  };

  const handleMouseUp = () => {
    isPanning.current = false;
    lastCenter.current = null;
    lastDist.current = 0;
    if (!isDrawing.current || !currentLine) return;
    isDrawing.current = false;
    if (onFowDraw && mapRect.w > 0 && mapRect.h > 0)
      onFowDraw({
        ...currentLine,
        size: currentLine.size ?? 50 / mapRect.w,
        normalized: true,
      });
    setCurrentLine(null);
  };

  const paintLayerActions = useMemo(() => {
    const list = fowActions.filter((a) => a.tool === 'paint' || a.tool === 'paint-eraser');
    if (currentLine && (currentLine.tool === 'paint' || currentLine.tool === 'paint-eraser')) list.push(currentLine);
    return list;
  }, [fowActions, currentLine]);

  let startIndex = 0;
  for (let i = fowActions.length - 1; i >= 0; i--) {
    if (fowActions[i].tool === 'clear' || fowActions[i].tool === 'fill') {
      startIndex = i;
      break;
    }
  }
  const fogActions = fowActions.slice(startIndex).filter((a) => a.tool !== 'paint' && a.tool !== 'paint-eraser');
  const renderFogActions =
    currentLine && currentLine.tool !== 'paint' && currentLine.tool !== 'paint-eraser'
      ? [...fogActions, currentLine]
      : fogActions;

  const fogOpacity = isGm ? 0.5 : 1.0;
  const fogLayerRef = useRef<Konva.Layer>(null);
  const trapsLayerRef = useRef<Konva.Layer>(null);
  useEffect(() => {
    const layer = fogLayerRef.current;
    if (layer) {
      const canvas = layer.getCanvas()._canvas as HTMLCanvasElement;
      canvas.style.opacity = fogOpacity.toString();
    }
  }, [fogOpacity]);

  const scaleToFit =
    syncContainerSize && effectiveWidth > 0 && effectiveHeight > 0
      ? Math.min(containerSize.width / effectiveWidth, containerSize.height / effectiveHeight)
      : 1;
  const stageW = effectiveWidth;
  const stageH = effectiveHeight;

  const stageNode = (
    <Stage
      width={stageW}
      height={stageH}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleMouseUp}
      onMouseLeave={() => setCursorPos(null)}
      ref={stageRef}
      scaleX={displayScale}
      scaleY={mirrorMap ? -displayScale : displayScale}
      x={displayPosition.x}
      y={mirrorMap ? displayPosition.y + stageH * displayScale : displayPosition.y}
      draggable={false}
      style={{ cursor: isPanning.current ? 'grabbing' : 'crosshair' }}
    >
      <Layer ref={mapLayerRef}>
          {mapType === 'video' ? (
            <VideoFrame src={mapUrl} rect={mapRect} layerRef={mapLayerRef} onNaturalSize={reportNaturalSize} />
          ) : (
            <URLImage src={mapUrl} rect={mapRect} layerRef={mapLayerRef} onNaturalSize={reportNaturalSize} />
          )}
      </Layer>
      <Layer>
        <Group x={mapRect.x} y={mapRect.y}>
          {paintLayerActions.map((action, i) => {
            const points = (action.points ?? []).map((p, j) => {
              if (action.normalized && mapRect.w > 0 && mapRect.h > 0)
                return j % 2 === 0 ? p * mapRect.w : p * mapRect.h;
              if (effectiveWidth > 0 && effectiveHeight > 0)
                return j % 2 === 0 ? (p / effectiveWidth) * mapRect.w : (p / effectiveHeight) * mapRect.h;
              return p;
            });
              const strokeWidth =
                action.normalized && mapRect.w > 0
                  ? (action.size ?? 0) * mapRect.w
                  : (action.size ?? 50) * (mapRect.w / effectiveWidth) || 50;
              const isEraser = action.tool === 'paint-eraser';
              return (
                <Line
                  key={isEraser ? `eraser-${action.id || i}` : action.id || i}
                  points={points}
                  stroke={isEraser ? 'black' : action.color || '#ef4444'}
                  strokeWidth={strokeWidth}
                  tension={action.brushShape === 'square' ? 0 : 0.5}
                  lineCap={action.brushShape === 'square' ? 'square' : 'round'}
                  lineJoin={action.brushShape === 'square' ? 'miter' : 'round'}
                  globalCompositeOperation={isEraser ? 'destination-out' : 'source-over'}
                  listening={false}
                />
              );
            })}
        </Group>
      </Layer>
      <Layer ref={fogLayerRef}>
        <Group x={mapRect.x} y={mapRect.y} key={startIndex}>
          {renderFogActions.length > 0 && renderFogActions[0].tool === 'fill' && (
            <Rect width={mapRect.w} height={mapRect.h} fill="black" listening={false} />
          )}
          {renderFogActions.map((action, i) => {
            if (action.tool === 'fill' || action.tool === 'clear') return null;
            const points = (action.points ?? []).map((p, j) => {
              if (action.normalized && mapRect.w > 0 && mapRect.h > 0)
                return j % 2 === 0 ? p * mapRect.w : p * mapRect.h;
              if (effectiveWidth > 0 && effectiveHeight > 0)
                return j % 2 === 0 ? (p / effectiveWidth) * mapRect.w : (p / effectiveHeight) * mapRect.h;
              return p;
            });
            const strokeWidth =
              action.normalized && mapRect.w > 0
                ? (action.size ?? 0) * mapRect.w
                : (action.size ?? 50) * (mapRect.w / effectiveWidth) || 50;
            return (
              <Line
                key={action.id || i}
                points={points}
                stroke="black"
                strokeWidth={strokeWidth}
                tension={action.brushShape === 'square' ? 0 : 0.5}
                lineCap={action.brushShape === 'square' ? 'square' : 'round'}
                lineJoin={action.brushShape === 'square' ? 'miter' : 'round'}
                globalCompositeOperation={action.tool === 'brush' ? 'source-over' : 'destination-out'}
                listening={false}
              />
            );
          })}
        </Group>
      </Layer>
      <Layer ref={trapsLayerRef} listening={isGm}>
        <Group x={mapRect.x} y={mapRect.y}>
          {(isGm ? traps : traps.filter((t) => t.activated)).map((t) => {
            const tw = (t.width ?? 0.05) * mapRect.w;
            const th = (t.height ?? 0.05) * mapRect.h;
            const cx = t.x * mapRect.w;
            const cy = t.y * mapRect.h;
            const fill = t.activated ? '#dc2626' : '#6b7280';
            const canDrag = isGm && !!onTrapMove && (!selectedTool || panMode);
            return (
              <TrapNode
                key={t.id}
                trap={t}
                tw={tw}
                th={th}
                cx={cx}
                cy={cy}
                fill={fill}
                canDrag={canDrag}
                onTrapMove={onTrapMove}
                mapRect={mapRect}
                layerRef={trapsLayerRef}
                inMapGroup
              />
            );
          })}
        </Group>
      </Layer>
      {isGm && cursorPos && !panMode && selectedTool && (
        <Layer>
          {brushShape === 'round' ? (
            <>
              <Circle
                x={cursorPos.x}
                y={cursorPos.y}
                radius={brushSize / 2}
                stroke="white"
                strokeWidth={1 / displayScale}
                dash={[5, 5]}
                listening={false}
                shadowColor="black"
                shadowBlur={2}
                shadowOpacity={0.8}
              />
              <Circle
                x={cursorPos.x}
                y={cursorPos.y}
                radius={brushSize / 2}
                stroke={
                  selectedTool === 'paint'
                    ? paintColor!
                    : selectedTool === 'paint-eraser'
                      ? 'rgba(255,255,255,0.8)'
                      : 'rgba(59, 130, 246, 0.5)'
                }
                strokeWidth={4 / displayScale}
                listening={false}
              />
            </>
          ) : (
            <>
              <Rect
                x={cursorPos.x - brushSize / 2}
                y={cursorPos.y - brushSize / 2}
                width={brushSize}
                height={brushSize}
                stroke="white"
                strokeWidth={1 / displayScale}
                dash={[5, 5]}
                listening={false}
                shadowColor="black"
                shadowBlur={2}
                shadowOpacity={0.8}
              />
              <Rect
                x={cursorPos.x - brushSize / 2}
                y={cursorPos.y - brushSize / 2}
                width={brushSize}
                height={brushSize}
                stroke={
                  selectedTool === 'paint'
                    ? paintColor!
                    : selectedTool === 'paint-eraser'
                      ? 'rgba(255,255,255,0.8)'
                      : 'rgba(59, 130, 246, 0.5)'
                }
                strokeWidth={4 / displayScale}
                listening={false}
              />
            </>
          )}
        </Layer>
      )}
    </Stage>
  );

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden">
      {syncContainerSize ? (
        <div className="w-full h-full flex items-center justify-center overflow-hidden">
          <div
            style={{
              width: stageW,
              height: stageH,
              transform: `scale(${scaleToFit})`,
              transformOrigin: 'center center',
            }}
          >
            {stageNode}
          </div>
        </div>
      ) : (
        stageNode
      )}
    </div>
  );
}
