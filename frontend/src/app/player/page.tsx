"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useSocket } from "@/hooks/useSocket";
import { API_BASE, mapAssetUrl } from "@/lib/api";

const MapCanvas = dynamic(() => import("@/components/MapCanvas"), { ssr: false });

const defaultView = { scale: 1, position: { x: 0, y: 0 }, containerWidth: undefined as number | undefined, containerHeight: undefined as number | undefined };

export default function PlayerPage() {
    const { socket } = useSocket();
    const [activeMap, setActiveMap] = useState<any>(null);
    const [viewState, setViewState] = useState(defaultView);
    const [isLoading, setIsLoading] = useState(true);

    const fetchActiveMap = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/maps/active`);
            if (res.ok) {
                const data = await res.json();
                setActiveMap(data);
                // Usar vista guardada en el servidor para que al refrescar coincida con la del GM
                setViewState(data.viewState || defaultView);
            } else {
                setActiveMap(null);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchActiveMap();

        if (socket) {
            socket.on('map-change', () => {
                fetchActiveMap();
            });

            socket.on('fow-update', ({ mapId, action }) => {
                setActiveMap((prev: any) => {
                    if (prev?._id === mapId) {
                        return { ...prev, fowInfo: [...(prev.fowInfo || []), action] };
                    }
                    return prev;
                });
            });

            socket.on('map-view-update', ({ mapId, scale, position, containerWidth, containerHeight }) => {
                setActiveMap((prev: any) => {
                    if (prev?._id === mapId) {
                        setViewState((v) => ({
                            scale: scale ?? v.scale,
                            position: position ?? v.position,
                            containerWidth: containerWidth ?? v.containerWidth,
                            containerHeight: containerHeight ?? v.containerHeight,
                        }));
                    }
                    return prev;
                });
            });
        }

        return () => {
            if (socket) {
                socket.off('map-change');
                socket.off('fow-update');
                socket.off('map-view-update');
            }
        }
    }, [socket]);

    if (isLoading && !activeMap) {
        return <div className="h-screen w-screen bg-black flex items-center justify-center text-white">Cargando partida...</div>;
    }

    /* 
       Note: The user requirement for Player View is:
       "solo el mapa ... niebla de guerra debe ser color negro liso notransparente"
    */

    return (
        <div className="h-screen w-screen bg-black overflow-hidden flex items-center justify-center">
            {activeMap ? (
                <MapCanvas
                    mapUrl={mapAssetUrl(activeMap.url)}
                    fowActions={activeMap.fowInfo || []}
                    isGm={false}
                    mapType={activeMap.type || 'image'}
                    syncScale={viewState.scale}
                    syncPosition={viewState.position}
                    syncContainerSize={
                        viewState.containerWidth != null && viewState.containerHeight != null
                            ? { width: viewState.containerWidth, height: viewState.containerHeight }
                            : undefined
                    }
                />
            ) : (
                <div className="text-zinc-500">Esperando al GM...</div>
            )}
        </div>
    );
}
