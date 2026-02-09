"use client";

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Line, Rect, Group, Circle } from 'react-konva';
import useImage from 'use-image';
import Konva from 'konva';

// Data types
export type FowAction = {
    tool: 'brush' | 'eraser' | 'clear' | 'fill';
    points?: number[];
    size?: number;
    id: string;
    brushShape?: 'round' | 'square';
    /** Si true, points y size están en coordenadas normalizadas (0–1) para que coincidan en GM y jugador */
    normalized?: boolean;
};

export type ViewState = {
    scale: number;
    position: { x: number; y: number };
    /** Dimensiones del contenedor del GM para que el jugador use el mismo encuadre */
    containerWidth?: number;
    containerHeight?: number;
};

interface MapCanvasProps {
    mapUrl: string;
    fowActions: FowAction[];
    isGm: boolean;
    mapType?: 'image' | 'video';
    /** Vista sincronizada desde el GM (solo jugador) */
    syncScale?: number;
    syncPosition?: { x: number; y: number };
    /** Dimensiones del contenedor del GM: el jugador dibuja con el mismo encuadre y escala a su ventana */
    syncContainerSize?: { width: number; height: number };
    /** Vista inicial (p. ej. guardada en servidor) para restaurar zoom/pan del GM al refrescar */
    initialView?: ViewState | null;
    /** Llamado cuando el GM cambia zoom/pan para replicar en jugadores */
    onViewChange?: (view: ViewState) => void;
    /** Modo "mover mapa": clic y arrastrar desplaza el mapa (solo GM) */
    panMode?: boolean;
    /** Si cambia (ej. incremento), centra el mapa (scale 1, posición 0,0) y emite onViewChange */
    centerTrigger?: number;
    // Interaction props (GM only)
    selectedTool?: 'brush' | 'eraser';
    brushSize?: number;
    brushShape?: 'round' | 'square';
    onFowDraw?: (action: FowAction) => void;
}

/** Calcula el rectángulo "cover": llena todo el contenedor sin bandas negras (puede recortar bordes) */
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
    return {
        x: (containerW - w) / 2,
        y: (containerH - h) / 2,
        w,
        h,
    };
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
            anim = new Konva.Animation(() => { }, layerRef.current);
            anim.start();
        }
        return () => {
            if (anim) anim.stop();
        };
    }, [image, onNaturalSize, isGif, layerRef]);
    if (!image) return null;
    return (
        <KonvaImage image={image} x={rect.x} y={rect.y} width={rect.w} height={rect.h} />
    );
};

/** Reproduce el video en el canvas y redibuja la capa cada frame. */
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
        // Respaldo: si algún navegador no respeta loop, volver a reproducir al terminar
        el.addEventListener('ended', () => el.play().catch(() => { }));
        return el;
    }, [src]);

    useEffect(() => {
        if (!videoEl) return;
        const onMeta = () => {
            if (onNaturalSize) onNaturalSize(videoEl.videoWidth || 0, videoEl.videoHeight || 0);
        };
        videoEl.addEventListener('loadedmetadata', onMeta);
        if (videoEl.videoWidth) onMeta();
        const id = requestAnimationFrame(() => {
            const layer = layerRef?.current;
            if (!layer) return;
            videoEl.play().catch(() => { });
            const anim = new Konva.Animation(() => { }, layer);
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
    return (
        <KonvaImage image={videoEl} x={rect.x} y={rect.y} width={rect.w} height={rect.h} />
    );
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
    onFowDraw
}: MapCanvasProps) {
    const isDrawing = useRef(false);
    const stageRef = useRef<Konva.Stage>(null);
    const mapLayerRef = useRef<Konva.Layer>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [cursorPos, setCursorPos] = useState<{ x: number, y: number } | null>(null);
    const isPanning = useRef(false);
    const lastPanPosition = useRef({ x: 0, y: 0 });
    const viewSyncTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Mobile pinch-zoom state
    const lastCenter = useRef<{ x: number, y: number } | null>(null);
    const lastDist = useRef<number>(0);

    const displayScale = syncScale ?? scale;
    const displayPosition = syncPosition ?? position;

    // Dimensiones efectivas: si el jugador recibe vista del GM, usamos el contenedor del GM para mismo encuadre
    const effectiveWidth = syncContainerSize?.width ?? containerSize.width;
    const effectiveHeight = syncContainerSize?.height ?? containerSize.height;

    const emitViewChange = useCallback((newScale: number, newPosition: { x: number; y: number }) => {
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
    }, [onViewChange, containerSize.width, containerSize.height]);

    // GM: restaurar vista guardada al cargar/refrescar o al cambiar de mapa
    useEffect(() => {
        if (syncScale !== undefined) return;
        const s = initialView?.scale;
        const p = initialView?.position;
        if (s != null && p != null && typeof p.x === 'number' && typeof p.y === 'number') {
            setScale(s);
            setPosition(p);
        }
    }, [initialView?.scale, initialView?.position, syncScale]);

    // Centrar mapa cuando el GM pulsa el botón (centerTrigger se incrementa)
    useEffect(() => {
        if (syncScale !== undefined || centerTrigger == null || centerTrigger < 1) return;
        const centered = { scale: 1, position: { x: 0, y: 0 } };
        setScale(1);
        setPosition({ x: 0, y: 0 });
        onViewChange?.({
            ...centered,
            containerWidth: containerSize.width,
            containerHeight: containerSize.height,
        });
    }, [centerTrigger]); // eslint-disable-line react-hooks/exhaustive-deps -- solo reaccionar al trigger

    // Medir el contenedor real (área del mapa en GM o ventana en jugador)
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

    // GM: enviar vista inicial al medir contenedor para que el jugador reciba encuadre de inmediato
    useEffect(() => {
        if (!isGm || !onViewChange || containerSize.width <= 0 || containerSize.height <= 0) return;
        onViewChange({
            scale: displayScale,
            position: displayPosition,
            containerWidth: containerSize.width,
            containerHeight: containerSize.height,
        });
    }, [isGm, containerSize.width, containerSize.height]); // Solo cuando cambia el contenedor; no incluir displayScale/displayPosition para evitar loops

    // Dimensiones naturales del contenido (imagen/video) para mismo aspecto en GM y jugador
    const [contentNaturalSize, setContentNaturalSize] = useState<{ w: number; h: number } | null>(null);
    const mapRect = useMemo(() => {
        if (contentNaturalSize && contentNaturalSize.w > 0 && contentNaturalSize.h > 0) {
            return coverRect(effectiveWidth, effectiveHeight, contentNaturalSize.w, contentNaturalSize.h);
        }
        return { x: 0, y: 0, w: effectiveWidth, h: effectiveHeight };
    }, [effectiveWidth, effectiveHeight, contentNaturalSize]);
    const reportNaturalSize = useCallback((w: number, h: number) => {
        setContentNaturalSize((prev) =>
            prev && prev.w === w && prev.h === h ? prev : { w, h }
        );
    }, []);

    // Current line being drawn
    const [currentLine, setCurrentLine] = useState<FowAction | null>(null);

    const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
        if (syncScale !== undefined) return;
        e.evt.preventDefault();

        const stage = stageRef.current;
        if (!stage) return;

        const oldScale = scale;
        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        const mousePointTo = {
            x: (pointer.x - position.x) / oldScale,
            y: (pointer.y - position.y) / oldScale,
        };

        // Zoom factor
        const scaleBy = 1.1;
        const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;

        // Limit zoom range
        const clampedScale = Math.max(0.5, Math.min(5, newScale));

        const newPos = {
            x: pointer.x - mousePointTo.x * clampedScale,
            y: pointer.y - mousePointTo.y * clampedScale,
        };

        setScale(clampedScale);
        setPosition(newPos);
        emitViewChange(clampedScale, newPos);
    };

    const getDistance = (p1: { x: number, y: number }, p2: { x: number, y: number }) => {
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    };

    const getCenter = (p1: { x: number, y: number }, p2: { x: number, y: number }) => {
        return {
            x: (p1.x + p2.x) / 2,
            y: (p1.y + p2.y) / 2,
        };
    };

    const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
        const stage = e.target.getStage();
        if (!stage) return;

        const isMiddleButton = 'button' in e.evt && e.evt.button === 1;
        const isSpacePan = 'button' in e.evt && e.evt.button === 0 && e.evt.shiftKey;
        const isPanModeLeftClick = panMode && 'button' in e.evt && e.evt.button === 0;

        if (syncScale === undefined && (isMiddleButton || isSpacePan || isPanModeLeftClick)) {
            isPanning.current = true;
            const pointer = stage.getPointerPosition();
            if (pointer) {
                lastPanPosition.current = pointer;
            }
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
            brushShape: brushShape,
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
                isPanning.current = false; // Stop 1-finger pan if 2nd finger added
                const p1 = { x: touches[0].clientX, y: touches[1].clientX };
                const p2 = { x: touches[0].clientY, y: touches[1].clientY };
                // Re-calculating correctly for Konva touch data
                const tp1 = { x: touches[0].clientX, y: touches[0].clientY };
                const tp2 = { x: touches[1].clientX, y: touches[1].clientY };

                lastDist.current = getDistance(tp1, tp2);
                lastCenter.current = getCenter(tp1, tp2);
            }
        }

        // Only draw if 1 finger and NOT in pan mode
        if (isGm && selectedTool && !panMode && touches.length === 1) {
            handleMouseDown(e);
        }
    };

    const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
        const stage = e.target.getStage();
        const point = stage?.getPointerPosition();
        if (!point) return;

        // Convert raw pointer position to logical stage position (accounting for zoom/pan)
        const logicalPoint = {
            x: (point.x - displayPosition.x) / displayScale,
            y: (point.y - displayPosition.y) / displayScale
        };

        // Update cursor preview position
        if (isGm && !panMode) {
            setCursorPos(logicalPoint);
        } else {
            setCursorPos(null);
        }

        if (syncScale === undefined && isPanning.current) {
            const dx = point.x - lastPanPosition.current.x;
            const dy = point.y - lastPanPosition.current.y;
            const newPos = { x: position.x + dx, y: position.y + dy };
            setPosition(newPos);
            emitViewChange(scale, newPos);
            lastPanPosition.current = point;
            return;
        }

        // Handle drawing
        if (!isDrawing.current || !currentLine) return;

        const layerX = (point.x - position.x) / scale;
        const layerY = (point.y - position.y) / scale;
        const contentX = layerX - mapRect.x;
        const contentY = layerY - mapRect.y;
        const normX = mapRect.w > 0 ? contentX / mapRect.w : 0;
        const normY = mapRect.h > 0 ? contentY / mapRect.h : 0;

        setCurrentLine(prev => prev ? {
            ...prev,
            points: [...(prev.points || []), normX, normY]
        } : null);
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

            // Calculate position to keep center point stable
            const stagePos = stage.position();
            const pointTo = {
                x: (lastCenter.current.x - stagePos.x) / scale,
                y: (lastCenter.current.y - stagePos.y) / scale,
            };

            const newPos = {
                x: center.x - pointTo.x * clampedScale,
                y: center.y - pointTo.y * clampedScale,
            };

            setScale(clampedScale);
            setPosition(newPos);
            emitViewChange(clampedScale, newPos);

            lastDist.current = dist;
            lastCenter.current = center;
        } else if (touches.length === 1) {
            handleMouseMove(e);
        }
    };

    const handleMouseUp = () => {
        // Stop panning and touch gestures
        isPanning.current = false;
        lastCenter.current = null;
        lastDist.current = 0;

        // Stop drawing
        if (!isDrawing.current || !currentLine) return;
        isDrawing.current = false;
        if (onFowDraw && mapRect.w > 0 && mapRect.h > 0) {
            const normalized: FowAction = {
                ...currentLine,
                size: currentLine.size ?? (50 / mapRect.w),
                normalized: true,
            };
            onFowDraw(normalized);
        }
        setCurrentLine(null);
    };

    // Calculate rendering
    // We render ALL actions. 
    // Optimization: In a real app with thousands of strokes, we should cache to an image.
    // Ideally, we start with a "Fill" rect if the first action is 'fill'.
    // If empty, we start clear.
    // The user requirement: "boton para agregar completamente... boton para quitar completamente".
    // "Agregar completamente" -> Adds 'fill' action.
    // "Quitar completamente" -> Adds 'clear' action.
    // Logic: We iterate actions. If 'clear' encountered, we restart drawing from there. 
    // This optimization prevents rendering infinite history.

    // Find the last 'clear' or 'fill' to start rendering from
    let startIndex = 0;
    // Iterate backwards
    for (let i = fowActions.length - 1; i >= 0; i--) {
        if (fowActions[i].tool === 'clear' || fowActions[i].tool === 'fill') {
            startIndex = i;
            break;
        }
    }

    const relevantActions = fowActions.slice(startIndex);
    // Also include currentLine if drawing
    const renderActions = currentLine ? [...relevantActions, currentLine] : relevantActions;

    // Determine opacity:
    // GM: 0.5 (Gray transparent)
    // Player: 1.0 (Black solid)
    const fogOpacity = isGm ? 0.5 : 1.0;
    const fogLayerRef = useRef<Konva.Layer>(null);

    useEffect(() => {
        const layer = fogLayerRef.current;
        if (layer) {
            const canvas = layer.getCanvas()._canvas as HTMLCanvasElement;
            canvas.style.opacity = fogOpacity.toString();
        }
    }, [fogOpacity]); // fowActions causes re-render anyway

    // Jugador con vista sync: escalar para llenar toda la pantalla (sin bandas negras); puede recortar bordes
    const scaleToFit = syncContainerSize && effectiveWidth > 0 && effectiveHeight > 0
        ? Math.max(containerSize.width / effectiveWidth, containerSize.height / effectiveHeight)
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
            scaleY={displayScale}
            x={displayPosition.x}
            y={displayPosition.y}
            draggable={false}
            className={isPanning.current ? "cursor-grabbing" : "cursor-crosshair"}
        >
            {/* Map Layer - mismo rect "contain" en GM y jugador para que la niebla coincida */}
            <Layer ref={mapLayerRef}>
                {mapType === 'video' ? (
                    <VideoFrame src={mapUrl} rect={mapRect} layerRef={mapLayerRef} onNaturalSize={reportNaturalSize} />
                ) : (
                    <URLImage src={mapUrl} rect={mapRect} layerRef={mapLayerRef} onNaturalSize={reportNaturalSize} />
                )}
            </Layer>

            {/* Fog Layer - Opacity handled by CSS in useEffect to prevent stroke overlap accumulation */}
            <Layer ref={fogLayerRef}>
                {/* 
                   CRITICAL FIX: 
                   For 'destination-out' (Eraser) to work on top of a 'Fill' (Rect), they must be in the same buffer context.
                   Konva Groups handle isolation.
                   
                   Also, if 'Fill' action is present, we draw a full black Rect first.
                   Any subsequent 'Eraser' action will cut through it.
                   Any 'Brush' action will add to it (but its black-on-black).
                */}
                <Group x={mapRect.x} y={mapRect.y} key={startIndex}>
                    {relevantActions.length > 0 && relevantActions[0].tool === 'fill' && (
                        <Rect
                            width={mapRect.w}
                            height={mapRect.h}
                            fill="black"
                            listening={false}
                        />
                    )}

                    {renderActions.map((action, i) => {
                        if (action.tool === 'fill' || action.tool === 'clear') return null;

                        const points = (action.points ?? []).map((p, j) => {
                            if (action.normalized && mapRect.w > 0 && mapRect.h > 0) {
                                return j % 2 === 0 ? p * mapRect.w : p * mapRect.h;
                            }
                            if (effectiveWidth > 0 && effectiveHeight > 0) {
                                return j % 2 === 0 ? (p / effectiveWidth) * mapRect.w : (p / effectiveHeight) * mapRect.h;
                            }
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
                                globalCompositeOperation={
                                    action.tool === 'brush' ? 'source-over' : 'destination-out'
                                }
                            />
                        );
                    })}
                </Group>
            </Layer>

            {/* GM Overlay: Brush Cursor Preview */}
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
                                stroke="rgba(59, 130, 246, 0.5)"
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
                                stroke="rgba(59, 130, 246, 0.5)"
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
