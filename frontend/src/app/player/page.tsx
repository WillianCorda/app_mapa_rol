"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { useSocket } from "@/hooks/useSocket";
import { API_BASE, mapAssetUrl } from "@/lib/api";

const MapCanvas = dynamic(() => import("@/components/MapCanvas"), { ssr: false });

const defaultView = { scale: 1, position: { x: 0, y: 0 }, containerWidth: undefined as number | undefined, containerHeight: undefined as number | undefined };

export default function PlayerPage() {
    const { socket, isConnected } = useSocket();
    const [activeMap, setActiveMap] = useState<any>(null);
    const [viewState, setViewState] = useState(defaultView);
    const [isLoading, setIsLoading] = useState(true);
    const ambientAudio = useRef<HTMLAudioElement | null>(null);
    const sfxAudio = useRef<HTMLAudioElement | null>(null);

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


            socket.on('map-view-update', (data) => {
                // We update the view state regardless of whether the map is already loaded locally
                // because the GM might be panning while the player is still loading the image.
                setViewState((v) => ({
                    scale: data.scale ?? v.scale,
                    position: data.position ?? v.position,
                    containerWidth: data.containerWidth ?? v.containerWidth,
                    containerHeight: data.containerHeight ?? v.containerHeight,
                }));
            });

            socket.on('fow-update', ({ mapId, action }) => {
                setActiveMap((prev: any) => {
                    if (prev && prev._id === mapId) {
                        // Avoid duplicates if possible, though IDs should be unique
                        if (prev.fowInfo?.some((a: any) => a.id === action.id)) return prev;
                        return { ...prev, fowInfo: [...(prev.fowInfo || []), action] };
                    }
                    return prev;
                });
            });

            /* Disabling sound for player view as requested
            socket.on('sound-play', (data) => {
                console.log('Playing sound:', data);
                if (data.category === 'ambient') {
                    if (ambientAudio.current) {
                        ambientAudio.current.pause();
                        ambientAudio.current = null;
                    }
                    const audio = new Audio(data.url);
                    audio.loop = true;
                    audio.volume = data.volume || 0.5;
                    audio.play().catch(e => console.error("Error autoplaying ambient:", e));
                    ambientAudio.current = audio;
                } else {
                    if (sfxAudio.current) {
                        sfxAudio.current.pause();
                        sfxAudio.current = null;
                    }
                    const audio = new Audio(data.url);
                    audio.volume = data.volume || 0.7;
                    audio.onended = () => { sfxAudio.current = null; };
                    audio.play().catch(e => console.error("Error playing SFX:", e));
                    sfxAudio.current = audio;
                }
            });

            socket.on('volume-update', (data: { category: 'ambient' | 'sfx', volume: number }) => {
                if (data.category === 'ambient' && ambientAudio.current) {
                    ambientAudio.current.volume = data.volume;
                } else if (data.category === 'sfx' && sfxAudio.current) {
                    sfxAudio.current.volume = data.volume;
                }
            });

            socket.on('sound-pause', (data: { category: 'ambient' | 'sfx' }) => {
                if (data.category === 'ambient' && ambientAudio.current) {
                    ambientAudio.current.pause();
                } else if (data.category === 'sfx' && sfxAudio.current) {
                    sfxAudio.current.pause();
                }
            });

            socket.on('sound-resume', (data: { category: 'ambient' | 'sfx' }) => {
                if (data.category === 'ambient' && ambientAudio.current) {
                    ambientAudio.current.play().catch(e => console.error("Error resuming:", e));
                } else if (data.category === 'sfx' && sfxAudio.current) {
                    sfxAudio.current.play().catch(e => console.error("Error resuming:", e));
                }
            });

            socket.on('sound-stop', (data: { category: 'ambient' | 'sfx', id?: string }) => {
                if (data.category === 'ambient') {
                    if (ambientAudio.current) {
                        ambientAudio.current.pause();
                        ambientAudio.current.src = "";
                        ambientAudio.current.load();
                        ambientAudio.current = null;
                    }
                } else if (data.category === 'sfx') {
                    if (sfxAudio.current) {
                        sfxAudio.current.pause();
                        sfxAudio.current.src = "";
                        sfxAudio.current.load();
                        sfxAudio.current = null;
                    }
                }
            });
            */
        }

        return () => {
            if (socket) {
                socket.off('map-change');
                socket.off('fow-update');
                socket.off('map-view-update');
                socket.off('sound-play');
                socket.off('sound-stop');
                socket.off('sound-pause');
                socket.off('sound-resume');
                socket.off('volume-update');
            }
            if (ambientAudio.current) {
                ambientAudio.current.pause();
                ambientAudio.current = null;
            }
            if (sfxAudio.current) {
                sfxAudio.current.pause();
                sfxAudio.current = null;
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

            {/* Status indicator */}
            <div className="fixed bottom-4 right-4 flex items-center gap-2 px-3 py-1 bg-zinc-900/80 rounded-full border border-zinc-800 pointer-events-none z-[100]">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`} />
                <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium">
                    {isConnected ? 'Sincronizado' : 'Reconectando...'}
                </span>
            </div>
        </div>
    );
}
