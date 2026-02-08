"use client";

import { useEffect, useState } from "react";
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
    const [panMode, setPanMode] = useState(true);
    const [centerTrigger, setCenterTrigger] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch maps on load
    useEffect(() => {
        fetchMaps();
    }, []);

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

    return (
        <div className="flex h-screen w-screen bg-black overflow-hidden relative">
            <Sidebar
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
                onActivateMap={handleActivateMap}
                panMode={panMode}
                onSetPanMode={setPanMode}
                onCenterMap={() => setCenterTrigger((t) => t + 1)}
            />

            <main className="flex-1 ml-16 relative">
                {activeMap ? (
                    <MapCanvas
                        mapUrl={mapAssetUrl(activeMap.url)}
                        fowActions={activeMap.fowInfo}
                        isGm={true}
                        mapType={activeMap.type || 'image'}
                        initialView={activeMap.viewState}
                        selectedTool={tool}
                        brushSize={brushSize}
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
