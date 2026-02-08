import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
import { Eraser, Brush, Trash2, Maximize, Upload, Monitor, Map as MapIcon, Hand, Crosshair } from "lucide-react";
import { useState } from "react";

interface SidebarProps {
    maps: any[];
    activeMapId: string | null;
    onSelectMap: (id: string) => void;
    onUploadMap: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onDeleteMap: (id: string) => void;
    onToggleFog: (type: 'fill' | 'clear') => void;
    onSetTool: (tool: 'brush' | 'eraser') => void;
    selectedTool: 'brush' | 'eraser';
    brushSize: number;
    onSetBrushSize: (size: number) => void;
    onActivateMap: (id: string) => void;
    panMode: boolean;
    onSetPanMode: (v: boolean) => void;
    onCenterMap?: () => void;
}

export default function Sidebar({
    maps,
    activeMapId,
    onSelectMap,
    onUploadMap,
    onDeleteMap,
    onToggleFog,
    onSetTool,
    selectedTool,
    brushSize,
    onSetBrushSize,
    onActivateMap,
    panMode,
    onSetPanMode,
    onCenterMap
}: SidebarProps) {
    const [mapToDelete, setMapToDelete] = useState<{ id: string; name: string } | null>(null);

    const handleConfirmDelete = () => {
        if (mapToDelete) {
            onDeleteMap(mapToDelete.id);
            setMapToDelete(null);
        }
    };

    return (
        <div className="fixed left-0 top-0 h-full z-50 flex">
            {/* Persistent Toolbar on the left */}
            <div className="h-full w-16 bg-zinc-900 border-r border-zinc-800 flex flex-col items-center py-4 gap-4 text-white hover:w-16 transition-all">
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="outline" size="icon" className="mb-2 bg-blue-900/20 border-blue-500/50 hover:bg-blue-900/40 text-blue-400" title="Gestión de Mapas">
                            <MapIcon className="h-5 w-5" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="ml-16 w-80 bg-zinc-900 border-zinc-800 text-white">
                        <SheetHeader>
                            <SheetTitle className="text-white">Gestión de Mapas</SheetTitle>
                        </SheetHeader>
                        <div className="py-4 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Subir Mapa</label>
                                <div className="flex items-center gap-2">
                                    <Button variant="secondary" className="w-full relative overflow-hidden">
                                        <Upload className="mr-2 h-4 w-4" />
                                        Subir Imagen/Video
                                        <input
                                            type="file"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            onChange={onUploadMap}
                                            accept="image/*,video/*"
                                        />
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Mapas Disponibles</label>
                                <ScrollArea className="h-[400px] w-full rounded-md border border-zinc-800 p-2">
                                    {maps.map(map => (
                                        <div
                                            key={map._id}
                                            className={`p-2 rounded cursor-pointer mb-2 flex items-center justify-between gap-1 ${activeMapId === map._id ? 'bg-zinc-800' : 'hover:bg-zinc-800/50'}`}
                                            onClick={() => onSelectMap(map._id)}
                                        >
                                            <span className="truncate max-w-[120px] flex-1">{map.name}</span>
                                            <div className="flex items-center gap-0.5 shrink-0">
                                                <Button
                                                    size="icon"
                                                    variant={map.isActive ? "default" : "ghost"}
                                                    className="h-6 w-6"
                                                    title="Mostrar a Jugadores"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onActivateMap(map._id);
                                                    }}
                                                >
                                                    <Monitor className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-950/40"
                                                    title="Eliminar mapa"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setMapToDelete({ id: map._id, name: map.name });
                                                    }}
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                    {maps.length === 0 && <p className="text-sm text-zinc-500 text-center py-4">No hay mapas cargados</p>}
                                </ScrollArea>
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>

                <AlertDialog open={!!mapToDelete} onOpenChange={(open) => !open && setMapToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Eliminar mapa</AlertDialogTitle>
                            <AlertDialogDescription>
                                ¿Está seguro de eliminar el mapa &quot;{mapToDelete?.name}&quot;? Esta acción no se puede deshacer.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700">Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleConfirmDelete}>Eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <div className="h-px w-8 bg-zinc-700 my-2" />

                <Button
                    variant={panMode ? "default" : "ghost"}
                    size="icon"
                    onClick={() => onSetPanMode(true)}
                    title="Mover mapa (arrastrar con el ratón)"
                >
                    <Hand className="h-5 w-5" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onCenterMap?.()}
                    title="Centrar mapa"
                >
                    <Crosshair className="h-5 w-5" />
                </Button>

                <div className="h-px w-8 bg-zinc-700 my-2" />

                <Button
                    variant={!panMode && selectedTool === 'brush' ? "default" : "ghost"}
                    size="icon"
                    onClick={() => {
                        onSetPanMode(false);
                        onSetTool('brush');
                    }}
                    title="Pincel de Niebla"
                >
                    <Brush className="h-5 w-5" />
                </Button>
                <Button
                    variant={!panMode && selectedTool === 'eraser' ? "default" : "ghost"}
                    size="icon"
                    onClick={() => {
                        onSetPanMode(false);
                        onSetTool('eraser');
                    }}
                    title="Borrador de Niebla"
                >
                    <Eraser className="h-5 w-5" />
                </Button>

                <div className="h-px w-8 bg-zinc-700 my-2" />

                <Button variant="ghost" size="icon" onClick={() => onToggleFog('fill')} title="Cubrir todo">
                    <Maximize className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onToggleFog('clear')} title="Limpiar todo">
                    <Trash2 className="h-5 w-5" />
                </Button>

                <div className="h-px w-8 bg-zinc-700 my-2" />

                {/* Brush Size Slider Indicator */}
                <div className="flex flex-col items-center gap-2">
                    <span className="text-[10px] uppercase text-zinc-500">Size</span>
                    <Slider
                        orientation="vertical"
                        value={[brushSize]}
                        max={200}
                        step={5}
                        onValueChange={(vals) => onSetBrushSize(vals[0])}
                        className="h-24 w-4"
                    />
                </div>

            </div>
        </div>
    );
}
