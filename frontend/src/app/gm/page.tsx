"use client";

import { useEffect, useState, useRef } from "react";
// We need to disable SSR for Konva components to avoid "window is not defined" or canvas issues
import dynamic from "next/dynamic";
import Sidebar from "@/components/Sidebar";
import { useSocket } from "@/hooks/useSocket";
import { API_BASE, mapAssetUrl } from "@/lib/api";

const MapCanvas = dynamic(() => import("@/components/MapCanvas"), { ssr: false });

export default function GMPage() {
    const { socket } = useSocket();
    const [maps, setMaps] = useState<any[]>([]);
    const [activeMapId, setActiveMapId] = useState<string | null>(null);
    const [activeMap, setActiveMap] = useState<any>(null);
    const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
    const [brushSize, setBrushSize] = useState(50);
    const [brushShape, setBrushShape] = useState<'round' | 'square'>('round');
    const [panMode, setPanMode] = useState(true);
    const [centerTrigger, setCenterTrigger] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'maps' | 'sounds' | 'settings' | null>('maps');

    // Sounds State
    const [sounds, setSounds] = useState<any[]>([]);
    const [playingAmbientId, setPlayingAmbientId] = useState<string | null>(null);
    const [isAmbientPaused, setIsAmbientPaused] = useState(false);
    const [volume, setVolume] = useState(0.5); // This will be Ambient Volume
    const [sfxVolume, setSfxVolume] = useState(0.7);
    const [playingSfxId, setPlayingSfxId] = useState<string | null>(null);

    const ambientAudio = useRef<HTMLAudioElement | null>(null);
    const sfxAudio = useRef<HTMLAudioElement | null>(null);

    const ambientPlayPromise = useRef<Promise<void> | null>(null);

    // Update volume of current ambient if playing
    useEffect(() => {
        if (ambientAudio.current) {
            ambientAudio.current.volume = volume;
        }
        if (socket) {
            socket.emit('volume-update', { category: 'ambient', volume });
        }
    }, [volume, socket]);

    // Update volume of all active SFX
    useEffect(() => {
        if (sfxAudio.current) {
            sfxAudio.current.volume = sfxVolume;
        }
        if (socket) {
            socket.emit('volume-update', { category: 'sfx', volume: sfxVolume });
        }
    }, [sfxVolume, socket]);

    // Fetch maps & sounds on load
    useEffect(() => {
        fetchMaps();
        fetchSounds();
    }, []);

    const fetchSounds = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/sounds`);
            const data = await res.json();
            setSounds(data);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchMaps = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/maps`);
            const data = await res.json();
            setMaps(data);
            if (data.length > 0 && !activeMapId) {
                // Select first by default if none selected
                setActiveMapId(data[0]._id);
                setActiveMap(data[0]);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleSelectMap = async (id: string) => {
        setActiveMapId(id);

        // Show cached version first for speed
        const cachedMap = maps.find(m => m._id === id);
        if (cachedMap) setActiveMap(cachedMap);

        // Fetch fresh data from server to ensure we have saved FOW
        try {
            const res = await fetch(`${API_BASE}/api/maps`);
            const data = await res.json();
            setMaps(data);

            const freshMap = data.find((m: any) => m._id === id);
            if (freshMap) {
                setActiveMap(freshMap);
            }
        } catch (e) {
            console.error("Error refreshing maps:", e);
        }
    };

    const handleUploadMap = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;

        const file = e.target.files[0];
        const isVideo = file.type.startsWith('video/');
        const isGif = file.type === 'image/gif';
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', file.name.split('.')[0]);
        formData.append('type', isVideo ? 'video' : 'image');

        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/maps`, {
                method: 'POST',
                body: formData
            });
            const newMap = await res.json();
            setMaps([newMap, ...maps]);
            setActiveMapId(newMap._id);
            setActiveMap(newMap);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleActivateMap = async (id: string) => {
        try {
            await fetch(`${API_BASE}/api/maps/${id}/activate`, { method: 'PUT' });

            // Update local state
            setMaps(maps.map(m => ({ ...m, isActive: m._id === id })));

            if (socket) {
                socket.emit('map-change', id);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleDeleteMap = async (id: string) => {
        const wasActive = maps.find(m => m._id === id)?.isActive;
        try {
            const res = await fetch(`${API_BASE}/api/maps/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Error al eliminar');
            setMaps(maps.filter(m => m._id !== id));
            if (activeMapId === id) {
                const remaining = maps.filter(m => m._id !== id);
                if (remaining.length > 0) {
                    setActiveMapId(remaining[0]._id);
                    setActiveMap(remaining[0]);
                } else {
                    setActiveMapId(null);
                    setActiveMap(null);
                }
            }
            if (wasActive && socket) {
                socket.emit('map-change');
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleUpdateMap = async (id: string, updates: any) => {
        try {
            const res = await fetch(`${API_BASE}/api/maps/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (!res.ok) throw new Error('Error al actualizar');
            const updatedMap = await res.json();
            setMaps(maps.map(m => m._id === id ? { ...m, ...updatedMap } : m));
            if (activeMapId === id) {
                setActiveMap((prev: any) => ({ ...prev, ...updatedMap }));
            }
        } catch (e) {
            console.error(e);
        }
    };

    // --- Sound Handlers ---

    const handleUploadSound = async (e: React.ChangeEvent<HTMLInputElement>, category: 'ambient' | 'sfx') => {
        if (!e.target.files?.[0]) return;
        const file = e.target.files[0];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', file.name.split('.')[0]);
        formData.append('category', category);

        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/sounds`, {
                method: 'POST',
                body: formData
            });
            const newSound = await res.json();
            setSounds(prev => [newSound, ...prev]);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteSound = async (id: string) => {
        try {
            await fetch(`${API_BASE}/api/sounds/${id}`, { method: 'DELETE' });
            setSounds(prev => prev.filter(s => s._id !== id));
            if (playingAmbientId === id) handleStopSound('ambient');
            if (playingSfxId === id) handleStopSound('sfx');
        } catch (e) {
            console.error(e);
        }
    };

    const handleUpdateSound = async (id: string, updates: any) => {
        try {
            const res = await fetch(`${API_BASE}/api/sounds/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (!res.ok) throw new Error('Error al actualizar');
            const updatedSound = await res.json();
            setSounds(prev => prev.map(s => s._id === id ? { ...s, ...updatedSound } : s));
        } catch (e) {
            console.error(e);
        }
    };

    const handlePlaySound = async (sound: any) => {
        if (sound.category === 'ambient') {
            // If it's the same sound and it's paused, resume it
            if (playingAmbientId === sound._id && isAmbientPaused && ambientAudio.current) {
                try {
                    ambientAudio.current.volume = volume; // Restore volume
                    ambientPlayPromise.current = ambientAudio.current.play();
                    await ambientPlayPromise.current;
                    setIsAmbientPaused(false);
                    if (socket) socket.emit('sound-resume', { category: 'ambient' });
                } catch (e) {
                    console.error("Resume error:", e);
                }
                return;
            }

            // Stop current ambient aggressively
            if (ambientAudio.current) {
                ambientAudio.current.pause();
                ambientAudio.current.src = "";
                ambientAudio.current.load();
                ambientAudio.current = null;
            }

            // Play new
            const audio = new Audio(mapAssetUrl(sound.url));
            audio.loop = true;
            audio.volume = volume;
            ambientAudio.current = audio;
            setPlayingAmbientId(sound._id);
            setIsAmbientPaused(false);

            try {
                ambientPlayPromise.current = audio.play();
                await ambientPlayPromise.current;
            } catch (e) {
                console.error("Playback error:", e);
            }

            // Broadcast
            if (socket) {
                socket.emit('sound-play', {
                    id: sound._id,
                    url: mapAssetUrl(sound.url),
                    category: 'ambient',
                    loop: true,
                    volume: volume
                });
            }
        } else {
            // SFX: Stop current if any
            if (sfxAudio.current) {
                sfxAudio.current.pause();
                sfxAudio.current.src = "";
                sfxAudio.current.load();
                sfxAudio.current = null;
            }

            // Play new
            const audio = new Audio(mapAssetUrl(sound.url));
            audio.volume = sfxVolume;
            audio.onended = () => {
                setPlayingSfxId(null);
                sfxAudio.current = null;
            };

            try {
                await audio.play();
            } catch (e) {
                console.error("SFX Playback error:", e);
            }
            sfxAudio.current = audio;
            setPlayingSfxId(sound._id);

            if (socket) {
                socket.emit('sound-play', {
                    id: sound._id,
                    url: mapAssetUrl(sound.url),
                    category: 'sfx',
                    loop: false,
                    volume: sfxVolume
                });
            }
        }
    };

    const handleStopSound = (category: 'ambient' | 'sfx', id?: string) => {
        if (category === 'ambient') {
            if (ambientAudio.current) {
                ambientAudio.current.pause();
                ambientAudio.current.src = "";
                ambientAudio.current.load();
                ambientAudio.current = null;
            }
            setPlayingAmbientId(null);
            setIsAmbientPaused(false);
            if (socket) socket.emit('sound-stop', { category: 'ambient' });
        } else if (category === 'sfx') {
            if (sfxAudio.current) {
                sfxAudio.current.pause();
                sfxAudio.current.src = "";
                sfxAudio.current.load();
                sfxAudio.current = null;
            }
            setPlayingSfxId(null);
            if (socket) socket.emit('sound-stop', { category: 'sfx' });
        }
    };

    const handlePauseSound = async (category: 'ambient') => {
        if (category === 'ambient' && ambientAudio.current) {
            try {
                // Wait for any pending play to finish before pausing
                if (ambientPlayPromise.current) {
                    await ambientPlayPromise.current;
                }
                ambientAudio.current.volume = 0; // Absolute silence
                ambientAudio.current.pause();
                setIsAmbientPaused(true);
                if (socket) socket.emit('sound-pause', { category: 'ambient' });
            } catch (e) {
                console.error("Pause error:", e);
            }
        }
    };

    const handleFowDraw = (action: any) => {
        if (!activeMap) return;

        // Optimistically update local state
        // Use functional update to ensure we have the absolute latest state of the map
        setActiveMap((prevMap: any) => {
            // If for some reason the map changed underneath, abort (shouldn't happen often)
            if (!prevMap || prevMap._id !== activeMap._id) return prevMap;

            const updatedFow = [...(prevMap.fowInfo || []), action];

            // Side effect: Save to DB
            // We do this here to access the 'updatedFow' calculated from the fresh 'prevMap'
            fetch(`${API_BASE}/api/maps/${prevMap._id}/fow`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fowInfo: updatedFow })
            }).then(() => {
                setMaps((currentMaps) => currentMaps.map(m =>
                    m._id === prevMap._id ? { ...m, fowInfo: updatedFow } : m
                ));
            }).catch(err => console.error("Error saving FOW:", err));

            if (socket) {
                socket.emit('fow-update', { mapId: prevMap._id, action });
            }

            return { ...prevMap, fowInfo: updatedFow };
        });
    };

    const handleToggleFog = (type: 'fill' | 'clear') => {
        if (!activeMap) return;
        const action = {
            tool: type,
            id: `${Date.now()}-${Math.random()}`
        };
        handleFowDraw(action);
    };

    const sidebarWidth = activeTab ? 384 : 64; // 80 (w-80 panel) + 64 (w-16 dock) = 384px

    return (
        <div className="h-screen w-screen bg-black overflow-hidden relative">
            <Sidebar
                activeTab={activeTab}
                onTabChange={setActiveTab}
                maps={maps}
                activeMapId={activeMapId}
                onSelectMap={handleSelectMap}
                onUploadMap={handleUploadMap}
                onDeleteMap={handleDeleteMap}
                onUpdateMap={handleUpdateMap}
                onToggleFog={handleToggleFog}
                onSetTool={setTool}
                selectedTool={tool}
                brushSize={brushSize}
                onSetBrushSize={setBrushSize}
                brushShape={brushShape}
                onSetBrushShape={setBrushShape}
                onActivateMap={handleActivateMap}
                panMode={panMode}
                onSetPanMode={setPanMode}
                onCenterMap={() => setCenterTrigger((t) => t + 1)}
                sounds={sounds}
                onUploadSound={handleUploadSound}
                onDeleteSound={handleDeleteSound}
                onUpdateSound={handleUpdateSound}
                onPlaySound={handlePlaySound}
                onPauseSound={handlePauseSound}
                onStopSound={handleStopSound}
                playingAmbientId={playingAmbientId}
                isAmbientPaused={isAmbientPaused}
                playingSfxId={playingSfxId}
                volume={volume}
                onSetVolume={setVolume}
                sfxVolume={sfxVolume}
                onSetSfxVolume={setSfxVolume}
            />

            <main
                className="absolute inset-0 z-0 transition-all duration-500 ease-in-out"
                style={{
                    width: '100vw',
                    transform: `translateX(${activeTab ? '384px' : '0px'})`,
                }}
            >
                {activeMap ? (
                    <MapCanvas
                        mapUrl={mapAssetUrl(activeMap.url)}
                        fowActions={activeMap.fowInfo}
                        isGm={true}
                        mapType={activeMap.type || 'image'}
                        initialView={activeMap.viewState}
                        selectedTool={tool}
                        brushSize={brushSize}
                        brushShape={brushShape}
                        onFowDraw={handleFowDraw}
                        panMode={panMode}
                        centerTrigger={centerTrigger}
                        onViewChange={(view) => {
                            if (socket && activeMapId) {
                                socket.emit('map-view-update', { mapId: activeMapId, ...view });
                            }
                        }}
                    />
                ) : (
                    <div className="flex items-center justify-center h-full text-zinc-500">
                        {isLoading ? "Subiendo..." : "Selecciona o sube un mapa"}
                    </div>
                )}
            </main>
        </div>
    );
}
