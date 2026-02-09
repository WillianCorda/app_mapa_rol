import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Eraser, Brush, Trash2, Maximize, Upload, Monitor, Map as MapIcon, Hand, Crosshair, Pencil, Music, Settings2, X, ChevronRight, Square, Circle, Play, Pause, StopCircle, Volume2, Music2, Headphones } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";

interface SidebarProps {
    activeTab: 'maps' | 'sounds' | 'settings' | null;
    onTabChange: (tab: 'maps' | 'sounds' | 'settings' | null) => void;
    maps: any[];
    activeMapId: string | null;
    onSelectMap: (id: string) => void;
    onUploadMap: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onDeleteMap: (id: string) => void;
    onUpdateMap: (id: string, updates: any) => void;
    onToggleFog: (type: 'fill' | 'clear') => void;
    onSetTool: (tool: 'brush' | 'eraser') => void;
    selectedTool: 'brush' | 'eraser';
    brushSize: number;
    onSetBrushSize: (size: number) => void;
    brushShape: 'round' | 'square';
    onSetBrushShape: (shape: 'round' | 'square') => void;
    onActivateMap: (id: string) => void;
    panMode: boolean;
    onSetPanMode: (v: boolean) => void;
    onCenterMap?: () => void;
    // Sounds Props
    sounds: any[];
    onUploadSound: (e: React.ChangeEvent<HTMLInputElement>, category: 'ambient' | 'sfx') => void;
    onDeleteSound: (id: string) => void;
    onUpdateSound: (id: string, updates: any) => void;
    onPlaySound: (sound: any) => void;
    onPauseSound: (category: 'ambient') => void;
    onStopSound: (category: 'ambient' | 'sfx', id?: string) => void;
    playingAmbientId: string | null;
    isAmbientPaused: boolean;
    playingSfxId: string | null;
    volume: number;
    onSetVolume: (v: number) => void;
    sfxVolume: number;
    onSetSfxVolume: (v: number) => void;
}

type Tab = 'maps' | 'sounds' | 'settings' | null;

export default function Sidebar({
    activeTab,
    onTabChange,
    maps,
    activeMapId,
    onSelectMap,
    onUploadMap,
    onDeleteMap,
    onUpdateMap,
    onToggleFog,
    onSetTool,
    selectedTool,
    brushSize,
    onSetBrushSize,
    brushShape,
    onSetBrushShape,
    onActivateMap,
    panMode,
    onSetPanMode,
    onCenterMap,
    sounds,
    onUploadSound,
    onDeleteSound,
    onUpdateSound,
    onPlaySound,
    onPauseSound,
    onStopSound,
    playingAmbientId,
    isAmbientPaused,
    playingSfxId,
    volume,
    onSetVolume,
    sfxVolume,
    onSetSfxVolume
}: SidebarProps) {
    const [mapToDelete, setMapToDelete] = useState<{ id: string; name: string } | null>(null);
    const [editingMap, setEditingMap] = useState<{ id: string; name: string } | null>(null);
    const [editingSound, setEditingSound] = useState<{ id: string; name: string } | null>(null);
    const [newName, setNewName] = useState("");

    const handleConfirmDelete = () => {
        if (mapToDelete) {
            onDeleteMap(mapToDelete.id);
            setMapToDelete(null);
        }
    };

    const handleStartRename = (map: any) => {
        setEditingMap({ id: map._id, name: map.name });
        setNewName(map.name);
    };

    const handleConfirmRename = () => {
        if (editingMap && newName.trim()) {
            onUpdateMap(editingMap.id, { name: newName.trim() });
            setEditingMap(null);
        }
    };

    const handleStartRenameSound = (sound: any) => {
        setEditingSound({ id: sound._id, name: sound.name });
        setNewName(sound.name);
    };

    const handleConfirmRenameSound = () => {
        if (editingSound) {
            if (newName.trim() && newName.trim() !== editingSound.name) {
                onUpdateSound(editingSound.id, { name: newName.trim() });
            }
            setEditingSound(null);
        }
    };

    const handleKeyDownSound = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleConfirmRenameSound();
        if (e.key === 'Escape') setEditingSound(null);
    };

    const toggleTab = (tab: Tab) => {
        onTabChange(activeTab === tab ? null : tab);
    };

    return (
        <div className="absolute top-0 left-0 h-full flex shrink-0 transition-all duration-500 ease-in-out border-r border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.5)] z-50">
            {/* Dock - Sleek Modern Sidebar */}
            <div className="h-full w-16 bg-zinc-950/90 backdrop-blur-xl border-r border-white/5 flex flex-col items-center py-6 gap-6 text-white shadow-2xl relative z-20">
                <div className="mb-2">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.4)]">
                        <MapIcon className="h-5 w-5 text-white" />
                    </div>
                </div>

                <div className="flex flex-col gap-4 w-full px-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className={`h-11 w-11 rounded-xl transition-all duration-300 group relative
                            ${activeTab === 'maps'
                                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                                : 'text-zinc-500 hover:text-zinc-100 hover:bg-white/5'}`}
                        onClick={() => toggleTab('maps')}
                    >
                        <MapIcon className="h-5 w-5" />
                        {activeTab === 'maps' && <div className="absolute -left-2 top-2 bottom-2 w-1 bg-blue-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.8)]" />}
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        className={`h-11 w-11 rounded-xl transition-all duration-300 group relative
                            ${activeTab === 'sounds'
                                ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                                : 'text-zinc-500 hover:text-zinc-100 hover:bg-white/5'}`}
                        onClick={() => toggleTab('sounds')}
                    >
                        <Music className="h-5 w-5" />
                        {activeTab === 'sounds' && <div className="absolute -left-2 top-2 bottom-2 w-1 bg-purple-500 rounded-r-full shadow-[0_0_10px_rgba(168,85,247,0.8)]" />}
                    </Button>
                </div>

                <div className="mt-auto flex flex-col items-center gap-6 w-full px-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className={`h-10 w-10 rounded-xl transition-all duration-300
                            ${activeTab === 'settings'
                                ? 'bg-zinc-800 text-white'
                                : 'text-zinc-500 hover:text-white'}`}
                        onClick={() => toggleTab('settings')}
                    >
                        <Settings2 className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            {/* Expanded Content Panel */}
            <div
                className={`h-full bg-zinc-900/95 backdrop-blur-2xl border-r border-white/5 flex flex-col transition-all duration-500 ease-in-out overflow-hidden shadow-2xl relative z-10
                    ${activeTab ? 'w-80' : 'w-0'}`}
            >
                <div className="w-full h-full flex flex-col">
                    <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${activeTab === 'maps' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'}`}>
                                {activeTab === 'maps' ? <MapIcon className="h-4 w-4" /> : <Music className="h-4 w-4" />}
                            </div>
                            <h2 className="font-bold text-zinc-100 uppercase tracking-[0.2em] text-[10px]">
                                {activeTab === 'maps' ? 'Módulo de Mapas' : activeTab === 'sounds' ? 'Módulo de Audio' : 'Configuración'}
                            </h2>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-white hover:bg-white/10 rounded-full transition-colors" onClick={() => onTabChange(null)}>
                            <X className="h-3.5 w-3.5" />
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="p-5 space-y-8">
                            {activeTab === 'maps' && (
                                <>
                                    {/* Navigation Section */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <div className="h-[1px] flex-1 bg-white/5" />
                                            <div className="text-[9px] uppercase font-bold text-zinc-500 tracking-[0.2em] px-2">Navegación</div>
                                            <div className="h-[1px] flex-1 bg-white/5" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className={`w-full justify-center gap-2 rounded-xl h-11 transition-all border ${panMode ? 'bg-blue-600/20 border-blue-500/40 text-blue-100 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'bg-white/2 border-white/5 hover:bg-white/10 text-zinc-400'}`}
                                                onClick={() => onSetPanMode(true)}
                                            >
                                                <Hand className="h-4 w-4" /> <span className="text-[10px] font-bold uppercase tracking-wider">Mano</span>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="w-full justify-center gap-2 rounded-xl h-11 bg-white/2 border border-white/5 hover:bg-white/10 text-zinc-400 transition-all font-bold"
                                                onClick={() => onCenterMap?.()}
                                            >
                                                <Crosshair className="h-4 w-4" /> <span className="text-[10px] font-bold uppercase tracking-wider">Centrar</span>
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Fog Tools */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <div className="h-[1px] flex-1 bg-white/5" />
                                            <div className="text-[9px] uppercase font-bold text-zinc-500 tracking-[0.2em] px-2 text-center text-nowrap">Niebla de Guerra</div>
                                            <div className="h-[1px] flex-1 bg-white/5" />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <Button
                                                variant="ghost"
                                                className={`w-full h-14 rounded-xl transition-all border flex flex-col gap-1 items-center justify-center ${!panMode && selectedTool === 'brush' ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-100 shadow-[0_0_15px_rgba(99,102,241,0.15)]' : 'bg-white/2 border-white/5 hover:bg-white/10 text-zinc-400'}`}
                                                onClick={() => {
                                                    onSetPanMode(false);
                                                    onSetTool('brush');
                                                }}
                                            >
                                                <Brush className="h-5 w-5" />
                                                <span className="text-[8px] font-bold uppercase tracking-widest leading-none">Cubrir</span>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                className={`w-full h-14 rounded-xl transition-all border flex flex-col gap-1 items-center justify-center ${!panMode && selectedTool === 'eraser' ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-100 shadow-[0_0_15px_rgba(99,102,241,0.15)]' : 'bg-white/2 border-white/5 hover:bg-white/10 text-zinc-400'}`}
                                                onClick={() => {
                                                    onSetPanMode(false);
                                                    onSetTool('eraser');
                                                }}
                                            >
                                                <Eraser className="h-5 w-5" />
                                                <span className="text-[8px] font-bold uppercase tracking-widest leading-none">Revelar</span>
                                            </Button>
                                        </div>

                                        <div className="space-y-4 bg-white/[0.03] p-4 rounded-2xl border border-white/5 shadow-inner">
                                            <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest text-zinc-500">
                                                <span>Grosor</span>
                                                <span className="text-indigo-400 tabular-nums font-mono">{brushSize}px</span>
                                            </div>
                                            <Slider
                                                value={[brushSize]}
                                                max={300}
                                                min={5}
                                                step={5}
                                                onValueChange={(vals) => onSetBrushSize(vals[0])}
                                                className="py-1"
                                            />

                                            <div className="flex flex-col gap-2 mt-4">
                                                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Forma</span>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className={`h-9 rounded-xl border flex items-center justify-center gap-2 transition-all ${brushShape === 'round'
                                                            ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-100 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                                                            : 'bg-zinc-800/40 border-white/5 text-zinc-500'}`}
                                                        onClick={() => onSetBrushShape('round')}
                                                    >
                                                        <Circle className="h-3 w-3" />
                                                        <span className="text-[8px] font-bold uppercase">Redondo</span>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className={`h-9 rounded-xl border flex items-center justify-center gap-2 transition-all ${brushShape === 'square'
                                                            ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-100 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                                                            : 'bg-zinc-800/40 border-white/5 text-zinc-500'}`}
                                                        onClick={() => onSetBrushShape('square')}
                                                    >
                                                        <Square className="h-3 w-3" />
                                                        <span className="text-[8px] font-bold uppercase">Cuadrado</span>
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <Button variant="ghost" className="h-9 text-[9px] uppercase font-bold tracking-widest bg-zinc-800/40 hover:bg-zinc-800 border border-white/5 rounded-xl gap-2 active:scale-95 transition-all text-nowrap px-1" onClick={() => onToggleFog('fill')}>
                                                <Maximize className="h-3 w-3" /> Cubrir Todo
                                            </Button>
                                            <Button variant="ghost" className="h-9 text-[9px] uppercase font-bold tracking-widest bg-red-950/10 hover:bg-red-900/30 border border-red-500/10 text-red-400 rounded-xl gap-2 active:scale-95 transition-all text-nowrap px-1" onClick={() => onToggleFog('clear')}>
                                                <Trash2 className="h-3 w-3" /> Limpiar Todo
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Map Library */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <div className="h-[1px] flex-1 bg-white/5" />
                                            <div className="text-[9px] uppercase font-bold text-zinc-500 tracking-[0.2em] px-2 text-center text-nowrap">Biblioteca</div>
                                            <div className="h-[1px] flex-1 bg-white/5" />
                                        </div>

                                        <label className="flex items-center justify-center gap-3 p-3.5 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 border-dashed rounded-2xl cursor-pointer group transition-all duration-300">
                                            <Upload className="h-4 w-4 text-blue-400 group-hover:scale-110 transition-transform" />
                                            <span className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">Añadir Mapa</span>
                                            <input type="file" className="hidden" onChange={onUploadMap} accept="image/*,video/*" />
                                        </label>

                                        <div className="bg-black/20 rounded-2xl p-2 border border-white/5 max-h-[260px] overflow-y-auto custom-scrollbar space-y-2">
                                            {maps.map(map => (
                                                <div
                                                    key={map._id}
                                                    className={`group relative p-3 rounded-2xl border transition-all duration-300 cursor-pointer w-full flex
                                                        ${activeMapId === map._id
                                                            ? 'bg-blue-600/15 border-blue-500/30'
                                                            : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10'}`}
                                                    onClick={() => onSelectMap(map._id)}
                                                >
                                                    <div className="relative flex items-center justify-between gap-3 z-10 w-full">
                                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm border
                                                                ${activeMapId === map._id ? 'bg-blue-500/20 text-blue-400 border-blue-500/20' : 'bg-zinc-800 text-zinc-600 border-white/5'}`}>
                                                                {map.type === 'video' ? <Monitor className="h-4 w-4" /> : <MapIcon className="h-4 w-4" />}
                                                            </div>
                                                            <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
                                                                <div
                                                                    className={`text-[11px] font-bold truncate tracking-tight transition-colors ${activeMapId === map._id ? 'text-blue-100' : 'text-zinc-300 hover:text-white'}`}
                                                                    title={map.name}
                                                                >
                                                                    {map.name.length > 20 ? map.name.substring(0, 20) + "..." : map.name}
                                                                </div>
                                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                                    <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest leading-none">
                                                                        {map.url?.toLowerCase().endsWith('.gif') ? 'GIF' : (map.type || 'imagen')}
                                                                    </span>
                                                                    {map.isActive && <div className="h-1 w-1 rounded-full bg-green-500 animate-pulse" />}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-0.5 shrink-0 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-300">
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-7 w-7 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10"
                                                                onClick={(e) => { e.stopPropagation(); handleStartRename(map); }}
                                                                title="Renombrar"
                                                            >
                                                                <Pencil className="h-3 w-3" />
                                                            </Button>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className={`h-7 w-7 rounded-lg transition-all ${map.isActive ? 'text-green-400 bg-green-500/10' : 'text-zinc-500 hover:text-green-400 hover:bg-white/10'}`}
                                                                onClick={(e) => { e.stopPropagation(); onActivateMap(map._id); }}
                                                                title="Lanzar"
                                                            >
                                                                <Monitor className="h-3 w-3" />
                                                            </Button>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-7 w-7 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                                                                onClick={(e) => { e.stopPropagation(); setMapToDelete({ id: map._id, name: map.name }); }}
                                                                title="Borrar"
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {maps.length === 0 && <p className="text-[10px] text-zinc-600 text-center py-10 italic uppercase tracking-widest opacity-50">Biblioteca Vacía</p>}
                                        </div>
                                    </div>
                                </>
                            )}

                            {activeTab === 'sounds' && (
                                <div className="space-y-8 pb-10">
                                    {/* Master Volume Control */}
                                    <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/5 shadow-inner space-y-3">
                                        <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest text-zinc-500">
                                            <div className="flex items-center gap-2">
                                                <Music2 className="h-3 w-3 text-indigo-400" />
                                                <span>Volumen Ambiente</span>
                                            </div>
                                            <span className="text-indigo-400 tabular-nums font-mono">{Math.round(volume * 100)}%</span>
                                        </div>
                                        <Slider
                                            value={[volume * 100]}
                                            max={100}
                                            min={0}
                                            step={1}
                                            onValueChange={(vals) => onSetVolume(vals[0] / 100)}
                                            className="py-1"
                                        />
                                    </div>

                                    {/* Ambient Music Section */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <div className="h-[1px] flex-1 bg-white/5" />
                                            <div className="text-[9px] uppercase font-bold text-zinc-500 tracking-[0.2em] px-2 text-center text-nowrap">Ambiente Continuo</div>
                                            <div className="h-[1px] flex-1 bg-white/5" />
                                        </div>

                                        <label className="flex items-center justify-center gap-2 p-3 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 border-dashed rounded-xl cursor-pointer group transition-all duration-300">
                                            <Music2 className="h-4 w-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                                            <span className="text-[9px] font-bold text-indigo-200 uppercase tracking-widest">Nuevo Ambiente</span>
                                            <input type="file" className="hidden" onChange={(e) => onUploadSound(e, 'ambient')} accept="audio/*" />
                                        </label>

                                        <div className="bg-black/20 rounded-2xl p-2 border border-white/5 max-h-[230px] overflow-y-auto custom-scrollbar space-y-2">
                                            {sounds.filter(s => s.category === 'ambient').map(sound => (
                                                <div key={sound._id} className={`group p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${playingAmbientId === sound._id ? 'bg-indigo-600/15 border-indigo-500/40' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05]'}`}>
                                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border ${playingAmbientId === sound._id ? 'bg-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-zinc-800 text-zinc-600 border-white/5'}`}>
                                                            {playingAmbientId === sound._id ? <Volume2 className="h-4 w-4 animate-pulse" /> : <Headphones className="h-4 w-4" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            {editingSound?.id === sound._id ? (
                                                                <Input
                                                                    autoFocus
                                                                    value={newName}
                                                                    onChange={(e) => setNewName(e.target.value)}
                                                                    onBlur={handleConfirmRenameSound}
                                                                    onKeyDown={handleKeyDownSound}
                                                                    className="h-7 text-[10px] bg-black/60 border-indigo-500/30 text-white px-2 font-bold focus:ring-1 focus:ring-indigo-500"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                            ) : (
                                                                <span className={`text-[10px] font-bold truncate block tracking-tight transition-colors ${playingAmbientId === sound._id ? 'text-indigo-100' : 'text-zinc-400 group-hover:text-white'}`} title={sound.name}>{sound.name}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        {playingAmbientId === sound._id ? (
                                                            <>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    title={isAmbientPaused ? "Reanudar" : "Pausar"}
                                                                    className={`h-7 w-7 rounded-lg text-white ${isAmbientPaused ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20 shadow-lg'}`}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        isAmbientPaused ? onPlaySound(sound) : onPauseSound('ambient');
                                                                    }}
                                                                >
                                                                    {isAmbientPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                                                                </Button>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    title="Detener"
                                                                    className="h-7 w-7 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onStopSound('ambient');
                                                                    }}
                                                                >
                                                                    <Square className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </>
                                                        ) : (
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                title="Reproducir"
                                                                className="h-7 w-7 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onPlaySound(sound);
                                                                }}
                                                            >
                                                                <Play className="h-3.5 w-3.5" />
                                                            </Button>
                                                        )}
                                                        <Button size="icon" variant="ghost" title="Editar" className="h-7 w-7 rounded-lg text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/10" onClick={(e) => { e.stopPropagation(); handleStartRenameSound(sound); }}>
                                                            <Pencil className="h-3 w-3" />
                                                        </Button>
                                                        <Button size="icon" variant="ghost" title="Eliminar" className="h-7 w-7 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10" onClick={(e) => { e.stopPropagation(); onDeleteSound(sound._id); }}>
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                            {sounds.filter(s => s.category === 'ambient').length === 0 && <p className="text-[9px] text-zinc-600 text-center py-6 italic uppercase tracking-widest opacity-50">Sin Ambientes</p>}
                                        </div>
                                    </div>

                                    {/* SFX Section */}
                                    <div className="space-y-4">
                                        <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/5 shadow-inner space-y-3">
                                            <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest text-zinc-500">
                                                <div className="flex items-center gap-2">
                                                    <Headphones className="h-3 w-3 text-purple-400" />
                                                    <span>Volumen Efectos</span>
                                                </div>
                                                <span className="text-purple-400 tabular-nums font-mono">{Math.round(sfxVolume * 100)}%</span>
                                            </div>
                                            <Slider
                                                value={[sfxVolume * 100]}
                                                max={100}
                                                min={0}
                                                step={1}
                                                onValueChange={(vals) => onSetSfxVolume(vals[0] / 100)}
                                                className="py-1"
                                            />
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <div className="h-[1px] flex-1 bg-white/5" />
                                            <div className="text-[9px] uppercase font-bold text-zinc-500 tracking-[0.2em] px-2 text-center text-nowrap">Efectos de sonido</div>
                                            <div className="h-[1px] flex-1 bg-white/5" />
                                        </div>

                                        <label className="flex items-center justify-center gap-2 p-3 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/20 border-dashed rounded-xl cursor-pointer group transition-all duration-300">
                                            <Headphones className="h-4 w-4 text-purple-400 group-hover:scale-110 transition-transform" />
                                            <span className="text-[9px] font-bold text-purple-200 uppercase tracking-widest">Nuevo Efecto</span>
                                            <input type="file" className="hidden" onChange={(e) => onUploadSound(e, 'sfx')} accept="audio/*" />
                                        </label>

                                        <div className="bg-black/20 rounded-2xl p-2 border border-white/5 max-h-[210px] overflow-y-auto custom-scrollbar">
                                            <div className="grid grid-cols-2 gap-2">
                                                {sounds.filter(s => s.category === 'sfx').map(sound => {
                                                    const isPlaying = playingSfxId === sound._id;
                                                    const isEditing = editingSound?.id === sound._id;

                                                    return (
                                                        <div key={sound._id} className="relative group">
                                                            {isEditing ? (
                                                                <div className="h-10 px-2 rounded-xl border border-purple-500/40 bg-purple-600/10 flex items-center">
                                                                    <Input
                                                                        autoFocus
                                                                        value={newName}
                                                                        onChange={(e) => setNewName(e.target.value)}
                                                                        onBlur={handleConfirmRenameSound}
                                                                        onKeyDown={handleKeyDownSound}
                                                                        className="h-6 text-[10px] bg-black/40 border-white/10 text-white px-1 font-bold"
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <Button
                                                                        variant="ghost"
                                                                        className={`h-10 w-full px-2 rounded-xl border flex items-center gap-2 justify-start min-w-0 overflow-hidden transition-all ${isPlaying ? 'bg-purple-600/20 border-purple-500/40 text-purple-100 shadow-[0_0_15px_rgba(168,85,247,0.1)]' : 'bg-white/[0.03] border-white/5 hover:bg-purple-600/10 hover:border-purple-500/30 text-zinc-400 hover:text-white'}`}
                                                                        onClick={() => isPlaying ? onStopSound('sfx') : onPlaySound(sound)}
                                                                    >
                                                                        {isPlaying ? (
                                                                            <StopCircle className="h-3.5 w-3.5 text-purple-400 shrink-0 animate-pulse" />
                                                                        ) : (
                                                                            <div className="h-2 w-2 rounded-full bg-purple-500 shrink-0 group-hover:animate-ping" />
                                                                        )}
                                                                        <span className="truncate text-[10px] font-bold uppercase tracking-tight">{sound.name}</span>
                                                                    </Button>

                                                                    {/* Overlay Actions */}
                                                                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900/80 backdrop-blur-sm pl-1 py-0.5 rounded-lg border border-white/5">
                                                                        <Button
                                                                            size="icon"
                                                                            variant="ghost"
                                                                            className="h-6 w-6 text-zinc-500 hover:text-purple-400"
                                                                            onClick={(e) => { e.stopPropagation(); handleStartRenameSound(sound); }}
                                                                        >
                                                                            <Pencil className="h-2.5 w-2.5" />
                                                                        </Button>
                                                                        <Button
                                                                            size="icon"
                                                                            variant="ghost"
                                                                            className="h-6 w-6 text-zinc-500 hover:text-red-400"
                                                                            onClick={(e) => { e.stopPropagation(); onDeleteSound(sound._id); }}
                                                                        >
                                                                            <Trash2 className="h-2.5 w-2.5" />
                                                                        </Button>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        {sounds.filter(s => s.category === 'sfx').length === 0 && <p className="text-[9px] text-zinc-600 text-center py-6 italic uppercase tracking-widest opacity-50">Sin Efectos</p>}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'settings' && (
                                <div className="space-y-6">
                                    <div className="bg-white/[0.02] p-6 rounded-2xl border border-white/5 space-y-4">
                                        <div className="text-[9px] uppercase font-bold text-zinc-600 tracking-widest">Información</div>
                                        <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider">
                                            <span className="text-zinc-500">Conexión</span>
                                            <span className="text-green-500">Activa</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider">
                                            <span className="text-zinc-500">Modo</span>
                                            <span className="text-blue-500">Game Master</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Dialogs */}
            <AlertDialog open={!!mapToDelete} onOpenChange={(open) => !open && setMapToDelete(null)}>
                <AlertDialogContent className="bg-zinc-950/90 backdrop-blur-2xl border border-white/10 text-white rounded-3xl shadow-2xl max-w-sm">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-base font-bold uppercase tracking-widest text-center">¿Eliminar mapa?</AlertDialogTitle>
                        <AlertDialogDescription className="text-zinc-400 text-[10px] text-center uppercase tracking-[0.2em] leading-relaxed pt-2">
                            Esto borrará permanentemente <br />
                            <span className="text-red-400 font-bold">&quot;{mapToDelete?.name}&quot;</span> <br />
                            del sistema.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-col gap-2 pt-6">
                        <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600/80 hover:bg-red-600 h-10 rounded-xl text-[10px] font-bold uppercase tracking-widest">Proceder</AlertDialogAction>
                        <AlertDialogCancel className="bg-zinc-900 border-white/5 h-10 rounded-xl text-[10px] font-bold uppercase tracking-widest">Cancelar</AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!editingMap} onOpenChange={(open) => !open && setEditingMap(null)}>
                <AlertDialogContent className="bg-zinc-950/90 backdrop-blur-2xl border border-white/10 text-white rounded-3xl shadow-2xl max-w-sm">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-base font-bold uppercase tracking-widest text-center">Renombrar</AlertDialogTitle>
                        <AlertDialogDescription className="text-zinc-400 text-[10px] text-center uppercase tracking-widest pt-1">
                            Nuevo nombre para: {editingMap?.name}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                        <Input
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="bg-zinc-900 border-white/10 h-11 rounded-xl text-center font-bold tracking-widest uppercase text-[11px]"
                            placeholder="NOMBRE DEL MAPA..."
                            autoFocus
                            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmRename(); }}
                        />
                    </div>
                    <AlertDialogFooter className="flex-col sm:flex-col gap-2 pt-2">
                        <AlertDialogAction onClick={handleConfirmRename} className="bg-blue-600/80 hover:bg-blue-600 h-10 rounded-xl text-[10px] font-bold uppercase tracking-widest">Guardar</AlertDialogAction>
                        <AlertDialogCancel className="bg-zinc-900 border-white/5 h-10 rounded-xl text-[10px] font-bold uppercase tracking-widest text-zinc-500">Descartar</AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
