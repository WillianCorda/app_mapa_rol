import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { mapAssetUrl, getApiBase } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Eraser,
  Brush,
  Trash2,
  Maximize,
  Upload,
  Monitor,
  Map as MapIcon,
  Hand,
  Crosshair,
  Pencil,
  Music,
  Settings2,
  X,
  Square,
  Circle,
  Play,
  Pause,
  StopCircle,
  Music2,
  Headphones,
  Mic,
  Volume2,
  Palette,
  Repeat,
  Presentation,
  BookOpen,
  LogOut,
  FileText,
  Plus,
  Search,
  ImagePlus,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FlipVertical,
  Clock,
} from 'lucide-react';

/** Icono de cabeza de bestia/monstruo para el bestiario */
function BeastHeadIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <ellipse cx="12" cy="12" rx="8" ry="9" />
      <path d="M7.5 9.5 L9.5 11 M16.5 9.5 L14.5 11" strokeLinecap="round" />
      <path d="M9 15.5 Q12 17.5 15 15.5" />
      <path d="M6 6 L5 4 M18 6 L19 4" />
    </svg>
  );
}

declare global {
  interface Window {
    electronAPI?: { openProjectionWindow?: () => Promise<void> };
  }
}

function CustomVoiceForm({
  onAdd,
  onPreview,
  onStartPreviewMic,
  onStopPreviewMic,
}: {
  onAdd: (voice: { name: string; pitch: number; reverbDecay?: number; chorusRate?: number; chorusDepth?: number; distortion?: number }) => void;
  onPreview?: (params: { pitch: number; reverbDecay?: number; chorusRate?: number; chorusDepth?: number; distortion?: number } | null) => void;
  onStartPreviewMic?: () => void;
  onStopPreviewMic?: () => void;
}) {
  const [name, setName] = useState('');
  const [pitch, setPitch] = useState(0);
  const [reverbOn, setReverbOn] = useState(false);
  const [reverbDecay, setReverbDecay] = useState(2);
  const [chorusOn, setChorusOn] = useState(false);
  const [chorusRate, setChorusRate] = useState(3);
  const [chorusDepth, setChorusDepth] = useState(0.5);
  const [distortionOn, setDistortionOn] = useState(false);
  const [distortion, setDistortion] = useState(0.2);
  const [isPreviewing, setIsPreviewing] = useState(false);

  const getPreviewParams = () => ({
    pitch,
    ...(reverbOn ? { reverbDecay } : {}),
    ...(chorusOn ? { chorusRate, chorusDepth } : {}),
    ...(distortionOn ? { distortion } : {}),
  });

  const handleTogglePreview = () => {
    if (!onPreview) return;
    if (isPreviewing) {
      onPreview(null);
      setIsPreviewing(false);
      onStopPreviewMic?.();
    } else {
      onPreview(getPreviewParams());
      setIsPreviewing(true);
      onStartPreviewMic?.();
    }
  };

  // Actualizar preview en tiempo real cuando cambian los parámetros
  useEffect(() => {
    if (onPreview && isPreviewing) onPreview(getPreviewParams());
  }, [pitch, reverbOn, reverbDecay, chorusOn, chorusRate, chorusDepth, distortionOn, distortion, isPreviewing]);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (isPreviewing && onPreview) {
      onPreview(null);
      setIsPreviewing(false);
      onStopPreviewMic?.();
    }
    onAdd({
      name: trimmed,
      pitch,
      ...(reverbOn ? { reverbDecay } : {}),
      ...(chorusOn ? { chorusRate, chorusDepth } : {}),
      ...(distortionOn ? { distortion } : {}),
    });
    setName('');
    setPitch(0);
    setReverbOn(false);
    setChorusOn(false);
    setDistortionOn(false);
  };

  return (
    <div className="space-y-2 text-[9px]">
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre de la voz" className="h-8 text-[10px]" />
      <div>
        <p className="text-zinc-500">Tono (semitones): {pitch}</p>
        <Slider value={[pitch]} min={-12} max={12} step={1} onValueChange={(v) => setPitch(v[0])} />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="rev" checked={reverbOn} onChange={(e) => setReverbOn(e.target.checked)} className="rounded" />
        <label htmlFor="rev">Reverb</label>
        {reverbOn && (
          <Slider value={[reverbDecay]} min={0.5} max={4} step={0.1} onValueChange={(v) => setReverbDecay(v[0])} className="flex-1 max-w-[80px]" />
        )}
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="chor" checked={chorusOn} onChange={(e) => setChorusOn(e.target.checked)} className="rounded" />
        <label htmlFor="chor">Chorus</label>
        {chorusOn && (
          <>
            <span className="text-zinc-500">R:</span>
            <Slider value={[chorusRate]} min={1} max={6} step={0.5} onValueChange={(v) => setChorusRate(v[0])} className="flex-1 max-w-[60px]" />
            <span className="text-zinc-500">D:</span>
            <Slider value={[chorusDepth]} min={0.2} max={0.8} step={0.05} onValueChange={(v) => setChorusDepth(v[0])} className="flex-1 max-w-[60px]" />
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="dist" checked={distortionOn} onChange={(e) => setDistortionOn(e.target.checked)} className="rounded" />
        <label htmlFor="dist">Distorsión</label>
        {distortionOn && (
          <Slider value={[distortion]} min={0.05} max={0.6} step={0.05} onValueChange={(v) => setDistortion(v[0])} className="flex-1 max-w-[80px]" />
        )}
      </div>
      {onPreview != null && (
        <Button
          variant={isPreviewing ? 'default' : 'outline'}
          size="sm"
          className={`w-full rounded-lg text-[9px] h-8 ${isPreviewing ? 'bg-green-600 hover:bg-green-700' : 'border-green-500/50 text-green-400 hover:bg-green-500/20'}`}
          onClick={handleTogglePreview}
          title={isPreviewing ? 'Dejar de probar (usa solo los parámetros de esta voz)' : 'Probar esta voz en vivo; se activará el micrófono solo para la vista previa'}
        >
          <Volume2 className="h-3 w-3 mr-1 inline" />
          {isPreviewing ? 'Dejar de probar' : 'Probar en vivo'}
        </Button>
      )}
      {onPreview != null && (
        <p className="text-[8px] text-zinc-500">Probar en vivo usa el micrófono solo para esta voz (independiente del micrófono para partida).</p>
      )}
      <Button variant="outline" size="sm" className="w-full rounded-lg text-[9px] h-8" onClick={handleSubmit}>Añadir voz</Button>
    </div>
  );
}

export interface SidebarProps {
  activeTab: 'maps' | 'sounds' | 'voice' | 'notes' | 'bestiary' | 'settings' | null;
  onTabChange: (tab: 'maps' | 'sounds' | 'voice' | 'notes' | 'bestiary' | 'settings' | null) => void;
  maps: any[];
  activeMapId: string | null;
  onSelectMap: (id: string) => void;
  onUploadMap: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDeleteMap: (id: string) => void;
  onUpdateMap: (id: string, updates: any) => void;
  onToggleFog: (type: 'fill' | 'clear') => void;
  traps?: { id: string; x: number; y: number; width?: number; height?: number; name?: string; activated: boolean; imageUrl?: string }[];
  trapTemplates?: { id: string; name: string; imageUrl?: string }[];
  trapsModalOpen?: boolean;
  onOpenTrapsModal?: () => void;
  onCloseTrapsModal?: () => void;
  trapsModalView?: 'list' | 'create';
  onSetTrapsModalView?: (view: 'list' | 'create') => void;
  placeTrapMode?: boolean;
  onSetPlaceTrapMode?: (v: boolean) => void;
  onPlaceTrapFromTemplate?: (template: { id: string; name: string; imageUrl?: string }) => void;
  onCreateTrapTemplate?: (name: string, imageUrl?: string) => Promise<void>;
  onDeleteTrapTemplate?: (id: string) => void;
  onToggleTrap?: (trapId: string) => void;
  onDeleteTrap?: (trapId: string) => void;
  onUpdateTrap?: (trapId: string, updates: { width?: number; height?: number; imageUrl?: string | null; name?: string }) => void;
  onUploadTrapImage?: (file: File) => Promise<string>;
  onSetTool: (tool: 'brush' | 'eraser' | 'paint' | 'paint-eraser') => void;
  selectedTool: 'brush' | 'eraser' | 'paint' | 'paint-eraser';
  brushSize: number;
  paintColor?: string;
  onSetPaintColor?: (color: string) => void;
  onSetBrushSize: (size: number) => void;
  brushShape: 'round' | 'square';
  onSetBrushShape: (shape: 'round' | 'square') => void;
  onActivateMap: (id: string) => void;
  panMode: boolean;
  onSetPanMode: (v: boolean) => void;
  onCenterMap?: () => void;
  sounds: any[];
  onUploadSound: (e: React.ChangeEvent<HTMLInputElement>, category: 'ambient' | 'sfx') => void;
  onDeleteSound: (id: string) => void;
  onUpdateSound: (id: string, updates: any) => void;
  onPlaySound: (sound: any) => void;
  onPauseSound: (category: 'ambient') => void;
  onStopSound: (category: 'ambient' | 'sfx', id?: string) => void;
  playingAmbientId: string | null;
  isAmbientPaused: boolean;
  playingSfxIds: string[];
  sfxLoopById?: Record<string, boolean>;
  onSetSfxLoop?: (soundId: string) => void;
  volume: number;
  onSetVolume: (v: number) => void;
  sfxVolume: number;
  onSetSfxVolume: (v: number) => void;
  isMicActive: boolean;
  onToggleMic: () => void;
  voiceProfile: string;
  onSetVoiceProfile: (profile: string) => void;
  voiceVolume: number;
  onSetVoiceVolume: (v: number) => void;
  noiseGateOn: boolean;
  onSetNoiseGateOn: (v: boolean) => void;
  inputGain: number;
  onSetInputGain: (v: number) => void;
  micError?: string | null;
  defaultVoiceProfiles?: string[];
  customVoices?: { id: string; name: string; pitch: number; reverbDecay?: number; chorusRate?: number; chorusDepth?: number; distortion?: number }[];
  onAddCustomVoice?: (voice: { name: string; pitch: number; reverbDecay?: number; chorusRate?: number; chorusDepth?: number; distortion?: number }) => void;
  onDeleteCustomVoice?: (id: string) => void;
  onPreviewVoice?: (params: { pitch: number; reverbDecay?: number; chorusRate?: number; chorusDepth?: number; distortion?: number } | null) => void;
  notes?: { id: string; title: string; content: string; createdAt?: string }[];
  selectedNoteId?: string | null;
  onSelectNote?: (id: string | null) => void;
  onAddNote?: () => void;
  onUpdateNote?: (id: string, updates: { title?: string; content?: string }) => void;
  onDeleteNote?: (id: string) => void;
  bestiary?: { id: string; name: string; type?: string; description?: string; stats?: string; imageUrl?: string; createdAt?: string }[];
  selectedBeastId?: string | null;
  onSelectBeast?: (id: string | null) => void;
  onAddBeast?: () => void;
  onUpdateBeast?: (id: string, updates: { name?: string; type?: string; description?: string; stats?: string }) => void;
  onDeleteBeast?: (id: string) => void;
  onUploadBeastImage?: (beastId: string, file: File) => void;
  onRemoveBeastImage?: (beastId: string) => void;
  onSaveBestiary?: () => void;
  showGameClock?: boolean;
  onToggleGameClock?: () => void;
  gameClockTime?: { hours: number; minutes: number };
  onSetGameClockTime?: (time: { hours: number; minutes: number }) => void;
  gameClockEditOpen?: boolean;
  onSetGameClockEditOpen?: (open: boolean) => void;
}

type Tab = 'maps' | 'sounds' | 'voice' | 'notes' | 'bestiary' | 'settings' | null;

export default function Sidebar(props: SidebarProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const micTurnedOnForPreviewRef = useRef(false);
  const {
    activeTab,
    onTabChange,
    maps,
    activeMapId,
    onSelectMap,
    onUploadMap,
    onDeleteMap,
    onUpdateMap,
    onToggleFog,
    traps = [],
    trapTemplates = [],
    trapsModalOpen = false,
    onOpenTrapsModal,
    onCloseTrapsModal,
    trapsModalView = 'list',
    onSetTrapsModalView,
    placeTrapMode = false,
    onSetPlaceTrapMode,
    onPlaceTrapFromTemplate,
    onCreateTrapTemplate,
    onDeleteTrapTemplate,
    onToggleTrap,
    onDeleteTrap,
    onUpdateTrap,
    onUploadTrapImage,
    onSetTool,
    selectedTool,
    brushSize,
    onSetBrushSize,
    brushShape,
    onSetBrushShape,
    paintColor = '#ef4444',
    onSetPaintColor,
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
    playingSfxIds,
    sfxLoopById = {},
    onSetSfxLoop,
    volume,
    onSetVolume,
    sfxVolume,
    onSetSfxVolume,
    isMicActive,
    onToggleMic,
    voiceProfile,
    onSetVoiceProfile,
    voiceVolume,
    onSetVoiceVolume,
    noiseGateOn = true,
    onSetNoiseGateOn,
    inputGain = 2,
    onSetInputGain,
    micError = null,
    defaultVoiceProfiles = [],
    customVoices = [],
    onAddCustomVoice,
    onDeleteCustomVoice,
    onPreviewVoice,
    notes = [],
    selectedNoteId = null,
    onSelectNote,
    onAddNote,
    onUpdateNote,
    onDeleteNote,
    bestiary = [],
    selectedBeastId = null,
    onSelectBeast,
    onAddBeast,
    onUpdateBeast,
    onDeleteBeast,
    onUploadBeastImage,
    onRemoveBeastImage,
    onSaveBestiary,
    showGameClock = false,
    onToggleGameClock,
    gameClockTime = { hours: 12, minutes: 0 },
    onSetGameClockTime,
    gameClockEditOpen = false,
    onSetGameClockEditOpen,
  } = props;

  const [mapToDelete, setMapToDelete] = useState<{ id: string; name: string } | null>(null);
  const [editingMap, setEditingMap] = useState<{ id: string; name: string } | null>(null);
  const [editingSound, setEditingSound] = useState<{ id: string; name: string } | null>(null);
  const [newName, setNewName] = useState('');
  const [searchBeastQuery, setSearchBeastQuery] = useState('');
  const [beastToDelete, setBeastToDelete] = useState<{ id: string; name: string } | null>(null);
  const beastImageInputRef = useRef<HTMLInputElement>(null);
  const [editingTrapId, setEditingTrapId] = useState<string | null>(null);
  const [editTrapName, setEditTrapName] = useState('');
  const [editTrapImageUrl, setEditTrapImageUrl] = useState<string | null>(null);
  const trapMediaInputRef = useRef<HTMLInputElement>(null);
  const [createTrapName, setCreateTrapName] = useState('');
  const [createTrapImageUrl, setCreateTrapImageUrl] = useState<string | null>(null);
  const [createTrapSubmitting, setCreateTrapSubmitting] = useState(false);
  const createTrapImageInputRef = useRef<HTMLInputElement>(null);
  const [gameClockEditHours, setGameClockEditHours] = useState(12);
  const [gameClockEditMinutes, setGameClockEditMinutes] = useState(0);

  const [narratorText, setNarratorText] = useState('');
  const [isNarrating, setIsNarrating] = useState(false);
  const [narratorVoiceId, setNarratorVoiceId] = useState('');
  const [narratorRate, setNarratorRate] = useState(0.9);
  const [narratorPitch, setNarratorPitch] = useState(0.85);
  const [narratorVoices, setNarratorVoices] = useState<SpeechSynthesisVoice[]>([]);
  const narratorUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [narratorSource, setNarratorSource] = useState<'system' | 'google' | 'elevenlabs'>('system');
  const [ttsGoogleConfigured, setTtsGoogleConfigured] = useState(false);
  const [ttsElevenlabsConfigured, setTtsElevenlabsConfigured] = useState(false);
  const [ttsGoogleApiKey, setTtsGoogleApiKey] = useState('');
  const [ttsElevenlabsApiKey, setTtsElevenlabsApiKey] = useState('');
  const [ttsSaving, setTtsSaving] = useState(false);
  const [narratorCloudExpanded, setNarratorCloudExpanded] = useState(false);
  const [narratorElevenlabsVoiceId, setNarratorElevenlabsVoiceId] = useState('21m00Tcm4TlvDq8ikWAM');
  const [narratorElevenlabsVoices, setNarratorElevenlabsVoices] = useState<{ voice_id: string; name: string }[]>([]);
  const [narratorGoogleVoice, setNarratorGoogleVoice] = useState('es-AR-Standard-A');
  const cloudAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const loadVoices = () => setNarratorVoices(speechSynthesis.getVoices());
    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
    return () => { speechSynthesis.onvoiceschanged = null; };
  }, []);

  useEffect(() => {
    if (activeTab !== 'voice' && activeTab !== 'settings') return;
    fetch(`${getApiBase()}/api/tts/config`)
      .then((r) => r.json())
      .then((data) => {
        setTtsGoogleConfigured(!!data.googleConfigured);
        setTtsElevenlabsConfigured(!!data.elevenlabsConfigured);
      })
      .catch(() => { setTtsGoogleConfigured(false); setTtsElevenlabsConfigured(false); });
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'voice' || narratorSource !== 'elevenlabs' || !ttsElevenlabsConfigured) return;
    fetch(`${getApiBase()}/api/tts/elevenlabs-voices`)
      .then((r) => r.json())
      .then((data) => {
        if (data.voices && Array.isArray(data.voices)) setNarratorElevenlabsVoices(data.voices);
      })
      .catch(() => setNarratorElevenlabsVoices([]));
  }, [activeTab, narratorSource, ttsElevenlabsConfigured]);

  const narratorVoicesSorted = [...narratorVoices].sort((a, b) => {
    const grave = (v: SpeechSynthesisVoice) => {
      const n = (v.name || '').toLowerCase();
      if (/pablo|raúl|raul|diego|andrés|andres|jorge|carlos|antonio|alvaro|enrique|miguel|sergio|david|luis|pedro|pablo|ricardo/i.test(n)) return 2;
      if (/sabina|helena|laura|elena|maría|maria|sofía|sofia|luciana|paula|penélope|penelope/i.test(n)) return 0;
      return 1;
    };
    const esRegion = (v: SpeechSynthesisVoice) => (v.lang === 'es-AR' ? 2 : v.lang.startsWith('es') ? 1 : 0);
    if (a.lang.startsWith('es') && b.lang.startsWith('es')) {
      if (esRegion(b) !== esRegion(a)) return esRegion(b) - esRegion(a);
      return grave(b) - grave(a);
    }
    if (a.lang.startsWith('es')) return -1;
    if (b.lang.startsWith('es')) return 1;
    return 0;
  });

  const narratorVoiceLabel = (v: SpeechSynthesisVoice) => {
    if (!v.lang.startsWith('es')) return `${v.name} (${v.lang})`;
    const region = v.lang === 'es-AR' ? 'Argentina' : v.lang === 'es-MX' ? 'México' : v.lang === 'es-ES' ? 'España' : v.lang;
    return `${v.name} (${region})`;
  };

  const handleNarrate = async () => {
    const text = narratorText.trim();
    if (!text) return;
    if (narratorSource === 'google') {
      if (!ttsGoogleConfigured) return;
      setIsNarrating(true);
      try {
        const res = await fetch(`${getApiBase()}/api/tts/synthesize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voiceName: narratorGoogleVoice, languageCode: narratorGoogleVoice.slice(0, 5) }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setIsNarrating(false);
          alert(data.message || 'Error al sintetizar.');
          return;
        }
        const audio = new Audio('data:audio/mp3;base64,' + data.audioBase64);
        cloudAudioRef.current = audio;
        audio.onended = () => { setIsNarrating(false); cloudAudioRef.current = null; };
        audio.onerror = () => { setIsNarrating(false); cloudAudioRef.current = null; };
        await audio.play();
      } catch (e) {
        setIsNarrating(false);
        alert((e as Error).message || 'Error de conexión.');
      }
      return;
    }
    if (narratorSource === 'elevenlabs') {
      if (!ttsElevenlabsConfigured) return;
      setIsNarrating(true);
      try {
        const res = await fetch(`${getApiBase()}/api/tts/synthesize-elevenlabs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voiceId: narratorElevenlabsVoiceId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setIsNarrating(false);
          alert(data.message || 'Error al sintetizar.');
          return;
        }
        const audio = new Audio('data:audio/mpeg;base64,' + data.audioBase64);
        cloudAudioRef.current = audio;
        audio.onended = () => { setIsNarrating(false); cloudAudioRef.current = null; };
        audio.onerror = () => { setIsNarrating(false); cloudAudioRef.current = null; };
        await audio.play();
      } catch (e) {
        setIsNarrating(false);
        alert((e as Error).message || 'Error de conexión.');
      }
      return;
    }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'es-ES';
    u.rate = narratorRate;
    u.pitch = narratorPitch;
    if (narratorVoiceId) {
      const voice = narratorVoicesSorted.find((v) => v.voiceURI === narratorVoiceId || v.name === narratorVoiceId);
      if (voice) u.voice = voice;
    }
    u.onend = () => setIsNarrating(false);
    narratorUtteranceRef.current = u;
    setIsNarrating(true);
    speechSynthesis.speak(u);
  };

  const handleStopNarrator = () => {
    if ((narratorSource === 'google' || narratorSource === 'elevenlabs') && cloudAudioRef.current) {
      cloudAudioRef.current.pause();
      cloudAudioRef.current.currentTime = 0;
      cloudAudioRef.current = null;
      setIsNarrating(false);
      return;
    }
    speechSynthesis.cancel();
    setIsNarrating(false);
  };

  useEffect(() => {
    if (editingTrapId) {
      const t = traps.find((x) => x.id === editingTrapId);
      if (t) {
        setEditTrapName(t.name || '');
        setEditTrapImageUrl(t.imageUrl ?? null);
      }
    }
  }, [editingTrapId, traps]);

  useEffect(() => {
    if (gameClockEditOpen && gameClockTime) {
      setGameClockEditHours(Math.max(0, Math.min(23, gameClockTime.hours)));
      setGameClockEditMinutes(Math.max(0, Math.min(59, gameClockTime.minutes)));
    }
  }, [gameClockEditOpen, gameClockTime?.hours, gameClockTime?.minutes]);

  const handleConfirmDelete = () => {
    if (mapToDelete) {
      onDeleteMap(mapToDelete.id);
      setMapToDelete(null);
    }
  };

  const handleConfirmDeleteBeast = () => {
    if (beastToDelete) {
      onDeleteBeast?.(beastToDelete.id);
      setBeastToDelete(null);
    }
  };

  const handleStartRename = (map: any) => {
    setEditingMap({ id: map._id || map.id, name: map.name });
    setNewName(map.name);
  };

  const handleConfirmRename = () => {
    if (editingMap && newName.trim()) {
      onUpdateMap(editingMap.id, { name: newName.trim() });
      setEditingMap(null);
    }
  };

  const handleStartRenameSound = (sound: any) => {
    setEditingSound({ id: sound._id || sound.id, name: sound.name });
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

  const handleKeyDownMap = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleConfirmRename();
  };

  const toggleTab = (tab: Tab) => {
    onTabChange(activeTab === tab ? null : tab);
  };

  return (
    <div className="absolute top-0 left-0 h-full flex shrink-0 border-r border-white/5 z-50">
      <div className="h-full w-16 bg-zinc-950/90 border-r border-white/5 flex flex-col items-center py-6 gap-6 text-white relative z-20">
        <div className="mb-2 flex items-center justify-center">
          <img src="./Hexara.png" alt="Hexara" className="h-12 w-12 object-contain" />
        </div>
        <div className="flex flex-col gap-4 w-full px-2">
          <Button
            variant="ghost"
            size="icon"
            className={`h-11 w-11 rounded-xl ${activeTab === 'maps' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-zinc-500 hover:text-zinc-100 hover:bg-white/5'}`}
            onClick={() => toggleTab('maps')}
          >
            <MapIcon className="h-5 w-5" />
            {activeTab === 'maps' && <div className="absolute -left-2 top-2 bottom-2 w-1 bg-blue-500 rounded-r-full" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-11 w-11 rounded-xl ${activeTab === 'sounds' ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' : 'text-zinc-500 hover:text-zinc-100 hover:bg-white/5'}`}
            onClick={() => toggleTab('sounds')}
          >
            <Music className="h-5 w-5" />
            {activeTab === 'sounds' && <div className="absolute -left-2 top-2 bottom-2 w-1 bg-purple-500 rounded-r-full" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-11 w-11 rounded-xl ${activeTab === 'voice' ? 'bg-red-600/20 text-red-400 border border-red-500/30' : 'text-zinc-500 hover:text-zinc-100 hover:bg-white/5'}`}
            onClick={() => toggleTab('voice')}
          >
            <Mic className={`h-5 w-5 ${isMicActive ? 'scale-110' : ''}`} />
            {activeTab === 'voice' && <div className="absolute -left-2 top-2 bottom-2 w-1 bg-red-500 rounded-r-full" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-11 w-11 rounded-xl ${activeTab === 'notes' ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30' : 'text-zinc-500 hover:text-zinc-100 hover:bg-white/5'}`}
            onClick={() => toggleTab('notes')}
          >
            <FileText className="h-5 w-5" />
            {activeTab === 'notes' && <div className="absolute -left-2 top-2 bottom-2 w-1 bg-amber-500 rounded-r-full" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-11 w-11 rounded-xl ${activeTab === 'bestiary' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'text-zinc-500 hover:text-zinc-100 hover:bg-white/5'}`}
            onClick={() => toggleTab('bestiary')}
          >
            <BeastHeadIcon className="h-5 w-5" />
            {activeTab === 'bestiary' && <div className="absolute -left-2 top-2 bottom-2 w-1 bg-emerald-500 rounded-r-full" />}
          </Button>
        </div>
        <div className="mt-auto">
          <Button
            variant="ghost"
            size="icon"
            className={`h-10 w-10 rounded-xl ${activeTab === 'settings' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}
            onClick={() => toggleTab('settings')}
          >
            <Settings2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className={`h-full bg-zinc-900/95 border-r border-white/5 flex flex-col transition-all duration-300 overflow-hidden relative z-10 ${activeTab ? 'w-80' : 'w-0'}`}>
        <div className="w-full h-full flex flex-col">
          <div className="p-5 border-b border-white/5 flex justify-between items-center">
            <h2 className="font-bold text-zinc-100 uppercase tracking-wider text-[10px]">
              {activeTab === 'maps' ? 'Mapas' : activeTab === 'sounds' ? 'Audio' : activeTab === 'voice' ? 'Voz' : activeTab === 'notes' ? 'Notas' : activeTab === 'bestiary' ? 'Bestiario' : 'Ajustes'}
            </h2>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-white" onClick={() => onTabChange(null)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          <ScrollArea className="flex-1 scroll-custom">
            <div className="p-5 space-y-6">
              {activeTab === 'maps' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="ghost" size="sm" className={`h-10 rounded-xl ${panMode ? 'bg-blue-600/20 border border-blue-500/40 text-blue-100' : 'bg-white/5 text-zinc-400'}`} onClick={() => onSetPanMode(true)}>
                      <Hand className="h-4 w-4 mr-1" /> Mano
                    </Button>
                    <Button variant="ghost" size="sm" className="h-10 rounded-xl bg-white/5 text-zinc-400" onClick={() => onCenterMap?.()}>
                      <Crosshair className="h-4 w-4 mr-1" /> Centrar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="col-span-2 h-10 rounded-xl bg-amber-600/10 border border-amber-500/30 hover:bg-amber-600/20 text-amber-200 font-medium"
                      onClick={() => window.electronAPI?.openProjectionWindow?.()}
                    >
                      <Presentation className="h-4 w-4 mr-1" /> Proyección
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[9px] uppercase font-bold text-zinc-500">Niebla de guerra</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="ghost" className={`h-12 rounded-xl flex flex-col gap-0.5 ${!panMode && selectedTool === 'brush' ? 'bg-indigo-600/20 border border-indigo-500/40' : 'bg-white/5 text-zinc-400'}`} onClick={() => { onSetPanMode(false); onSetTool('brush'); }}>
                        <Brush className="h-4 w-4" /> <span className="text-[8px]">Cubrir</span>
                      </Button>
                      <Button variant="ghost" className={`h-12 rounded-xl flex flex-col gap-0.5 ${!panMode && selectedTool === 'eraser' ? 'bg-indigo-600/20 border border-indigo-500/40' : 'bg-white/5 text-zinc-400'}`} onClick={() => { onSetPanMode(false); onSetTool('eraser'); }}>
                        <Eraser className="h-4 w-4" /> <span className="text-[8px]">Revelar</span>
                      </Button>
                      <Button variant="ghost" className={`h-12 rounded-xl flex flex-col gap-0.5 ${!panMode && selectedTool === 'paint' ? 'bg-amber-600/20 border border-amber-500/40' : 'bg-white/5 text-zinc-400'}`} onClick={() => { onSetPanMode(false); onSetTool('paint'); }}>
                        <Palette className="h-4 w-4" /> <span className="text-[8px]">Pincel</span>
                      </Button>
                      <Button variant="ghost" className={`h-12 rounded-xl flex flex-col gap-0.5 ${!panMode && selectedTool === 'paint-eraser' ? 'bg-amber-600/20 border border-amber-500/40' : 'bg-white/5 text-zinc-400'}`} onClick={() => { onSetPanMode(false); onSetTool('paint-eraser'); }}>
                        <Eraser className="h-4 w-4" /> <span className="text-[8px]">Goma</span>
                      </Button>
                    </div>
                    {selectedTool === 'paint' && onSetPaintColor && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <span className="text-[9px] text-amber-200">Color</span>
                        <input type="color" value={paintColor} onChange={(e) => onSetPaintColor(e.target.value)} className="h-8 w-12 cursor-pointer rounded border border-white/10 bg-black/40" />
                      </div>
                    )}
                    <div className="space-y-2">
                      <p className="text-[9px] text-zinc-500">Grosor: {brushSize}px</p>
                      <Slider value={[brushSize]} min={5} max={300} step={5} onValueChange={(v) => onSetBrushSize(v[0])} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="ghost" size="sm" className={`h-8 rounded-lg ${brushShape === 'round' ? 'bg-indigo-600/20 border border-indigo-500/40' : 'bg-white/5'}`} onClick={() => onSetBrushShape('round')}>
                        <Circle className="h-3 w-3 mr-1" /> Redondo
                      </Button>
                      <Button variant="ghost" size="sm" className={`h-8 rounded-lg ${brushShape === 'square' ? 'bg-indigo-600/20 border border-indigo-500/40' : 'bg-white/5'}`} onClick={() => onSetBrushShape('square')}>
                        <Square className="h-3 w-3 mr-1" /> Cuadrado
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="ghost" size="sm" className="h-9 rounded-xl bg-white/5 text-zinc-400 text-[9px]" onClick={() => onToggleFog('fill')}><Maximize className="h-3 w-3 mr-1" /> Cubrir todo</Button>
                      <Button variant="ghost" size="sm" className="h-9 rounded-xl bg-red-950/20 text-red-400 text-[9px]" onClick={() => onToggleFog('clear')}><Trash2 className="h-3 w-3 mr-1" /> Limpiar</Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[9px] uppercase font-bold text-zinc-500">Trampas</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`w-full h-9 rounded-xl text-[9px] ${placeTrapMode ? 'bg-amber-600/20 border border-amber-500/40 text-amber-200' : 'bg-white/5 text-zinc-400'}`}
                      onClick={() => onOpenTrapsModal?.()}
                    >
                      <AlertTriangle className="h-3 w-3 mr-1" /> Trampas
                    </Button>
                    <div className="max-h-[200px] overflow-y-auto space-y-1.5 scroll-custom">
                      {traps.map((t) => {
                        const sizeNorm = typeof t.width === 'number' ? t.width : 0.05;
                        const sizePct = Math.round(sizeNorm * 100);
                        return (
                          <div key={t.id} className="p-2 rounded-lg border border-white/5 bg-white/[0.02] space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] truncate flex-1 min-w-0">{t.name || `Trampa`}</span>
                              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg shrink-0 text-zinc-500 hover:text-white" title="Editar" onClick={() => setEditingTrapId(t.id)}><Pencil className="h-3 w-3" /></Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg shrink-0 text-zinc-500 hover:text-amber-400" title={t.activated ? 'Desactivar' : 'Activar'} onClick={() => onToggleTrap?.(t.id)}>
                                {t.activated ? <AlertTriangle className="h-3.5 w-3.5 text-amber-400" /> : <AlertTriangle className="h-3.5 w-3.5 opacity-50" />}
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg shrink-0 text-zinc-500 hover:text-red-400" title="Eliminar" onClick={() => onDeleteTrap?.(t.id)}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[8px] text-zinc-500 shrink-0">Tamaño</span>
                              <Slider
                                value={[Math.max(2, Math.min(50, sizePct))]}
                                min={2}
                                max={50}
                                step={1}
                                className="flex-1"
                                onValueChange={([v]) => {
                                  const n = v / 100;
                                  onUpdateTrap?.(t.id, { width: n, height: n });
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                      {traps.length === 0 && <p className="text-[9px] text-zinc-600 py-2">Ninguna trampa</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[9px] uppercase font-bold text-zinc-500">Reloj de partida</p>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`flex-1 h-9 rounded-xl text-[9px] ${showGameClock ? 'bg-amber-600/20 border border-amber-500/40 text-amber-200' : 'bg-white/5 text-zinc-400'}`}
                        onClick={() => onToggleGameClock?.()}
                      >
                        <Clock className="h-3 w-3 mr-1" /> {showGameClock ? 'Ocultar' : 'Mostrar'}
                      </Button>
                      {showGameClock && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 rounded-xl text-[9px] bg-white/5 text-zinc-400"
                          onClick={() => onSetGameClockEditOpen?.(true)}
                        >
                          Editar
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[9px] uppercase font-bold text-zinc-500">Biblioteca</p>
                    <label className="flex items-center justify-center gap-2 p-3 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 border-dashed rounded-xl cursor-pointer">
                      <Upload className="h-4 w-4 text-blue-400" />
                      <span className="text-[10px] font-bold text-blue-200 uppercase">Añadir mapa</span>
                      <input type="file" className="hidden" accept="image/*,video/*" onChange={onUploadMap} />
                    </label>
                    <div className="max-h-[240px] overflow-y-auto space-y-2 scroll-custom">
                      {maps.map((map) => {
                        const id = map._id || map.id;
                        const isActive = activeMapId === id;
                        return (
                          <div
                            key={id}
                            className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between gap-2 ${isActive ? 'bg-blue-600/15 border-blue-500/30' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05]'}`}
                            onClick={() => onSelectMap(id)}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${isActive ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-800 text-zinc-600'}`}>
                                {map.type === 'video' ? <Monitor className="h-4 w-4" /> : <MapIcon className="h-4 w-4" />}
                              </div>
                              <div className="min-w-0">
                                <div className="text-[11px] font-bold truncate text-zinc-200">{map.name}</div>
                                {map.isActive && <div className="h-1 w-1 rounded-full bg-green-500 inline-block ml-0.5" />}
                              </div>
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg text-zinc-500 hover:text-white" onClick={(e) => { e.stopPropagation(); handleStartRename(map); }} title="Renombrar"><Pencil className="h-3 w-3" /></Button>
                              <Button size="icon" variant="ghost" className={`h-7 w-7 rounded-lg ${map.mirrorForProjection ? 'text-amber-400' : 'text-zinc-500 hover:text-amber-400'}`} onClick={(e) => { e.stopPropagation(); onUpdateMap(id, { mirrorForProjection: !map.mirrorForProjection }); }} title="Voltear en proyección (arriba/abajo)"><FlipVertical className="h-3 w-3" /></Button>
                              <Button size="icon" variant="ghost" className={`h-7 w-7 rounded-lg ${map.isActive ? 'text-green-400' : 'text-zinc-500 hover:text-green-400'}`} onClick={(e) => { e.stopPropagation(); onActivateMap(id); }} title="Activar"><Monitor className="h-3 w-3" /></Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg text-zinc-500 hover:text-red-400" onClick={(e) => { e.stopPropagation(); setMapToDelete({ id, name: map.name }); }} title="Borrar"><Trash2 className="h-3 w-3" /></Button>
                            </div>
                          </div>
                        );
                      })}
                      {maps.length === 0 && <p className="text-[10px] text-zinc-600 text-center py-6">Sin mapas</p>}
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'sounds' && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-[9px] text-zinc-500">Vol. ambiente: {Math.round(volume * 100)}%</p>
                    <Slider value={[volume * 100]} min={0} max={100} step={1} onValueChange={(v) => onSetVolume(v[0] / 100)} />
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center justify-center gap-2 p-3 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 border-dashed rounded-xl cursor-pointer">
                      <Music2 className="h-4 w-4 text-indigo-400" />
                      <span className="text-[9px] font-bold text-indigo-200 uppercase">Nuevo ambiente</span>
                      <input type="file" className="hidden" accept="audio/*" onChange={(e) => onUploadSound(e, 'ambient')} />
                    </label>
                    <div className="max-h-[180px] overflow-y-auto space-y-2 scroll-custom">
                      {sounds.filter((s) => s.category === 'ambient').map((sound) => {
                        const id = sound._id || sound.id;
                        const isPlaying = playingAmbientId === id;
                        return (
                          <div key={id} className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${isPlaying ? 'bg-indigo-600/15 border-indigo-500/40' : 'bg-white/[0.02] border-white/5'}`}>
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {editingSound?.id === id ? (
                                <Input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} onBlur={handleConfirmRenameSound} onKeyDown={handleKeyDownSound} className="h-7 text-[10px]" onClick={(e) => e.stopPropagation()} />
                              ) : (
                                <span className="text-[10px] font-bold truncate text-zinc-300" title={sound.name}>{sound.name}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-0.5">
                              {isPlaying ? (
                                <>
                                  <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={(e) => { e.stopPropagation(); isAmbientPaused ? onPlaySound(sound) : onPauseSound('ambient'); }}>{isAmbientPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}</Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg text-zinc-500" onClick={(e) => { e.stopPropagation(); onStopSound('ambient'); }}><StopCircle className="h-3.5 w-3.5" /></Button>
                                </>
                              ) : (
                                <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg text-zinc-500" onClick={(e) => { e.stopPropagation(); onPlaySound(sound); }}><Play className="h-3.5 w-3.5" /></Button>
                              )}
                              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg text-zinc-500" onClick={(e) => { e.stopPropagation(); handleStartRenameSound(sound); }}><Pencil className="h-3 w-3" /></Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg text-zinc-500 hover:text-red-400" onClick={(e) => { e.stopPropagation(); onDeleteSound(id); }}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[9px] text-zinc-500">Vol. SFX: {Math.round(sfxVolume * 100)}%</p>
                    <Slider value={[sfxVolume * 100]} min={0} max={100} step={1} onValueChange={(v) => onSetSfxVolume(v[0] / 100)} />
                  </div>
                  <label className="flex items-center justify-center gap-2 p-3 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/20 border-dashed rounded-xl cursor-pointer">
                    <Headphones className="h-4 w-4 text-purple-400" />
                    <span className="text-[9px] font-bold text-purple-200 uppercase">Nuevo efecto</span>
                    <input type="file" className="hidden" accept="audio/*" onChange={(e) => onUploadSound(e, 'sfx')} />
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 max-h-[200px] overflow-y-auto scroll-custom">
                    {sounds.filter((s) => s.category === 'sfx').map((sound) => {
                      const id = sound._id || sound.id;
                      const isPlaying = playingSfxIds.includes(id);
                      const isEditing = editingSound?.id === id;
                      const isLoop = sfxLoopById[id] ?? false;
                      return (
                        <div
                          key={id}
                          role="button"
                          tabIndex={0}
                          onClick={() => !isEditing && (isPlaying ? onStopSound('sfx', id) : onPlaySound(sound))}
                          onKeyDown={(e) => { if (!isEditing && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); isPlaying ? onStopSound('sfx', id) : onPlaySound(sound); } }}
                          className={`rounded-lg border flex flex-col gap-0.5 p-1 min-w-0 cursor-pointer ${isPlaying ? 'bg-purple-600/15 border-purple-500/40' : 'bg-white/[0.02] border-white/5'}`}
                        >
                          {isEditing ? (
                            <Input
                              autoFocus
                              value={newName}
                              onChange={(e) => setNewName(e.target.value)}
                              onBlur={handleConfirmRenameSound}
                              onKeyDown={handleKeyDownSound}
                              className="h-6 text-[9px] bg-black/40 border-purple-500/30 flex-1 min-w-0"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <>
                              <div className="flex items-center gap-1 min-w-0 w-full rounded py-0.5 text-left overflow-hidden">
                                {isPlaying ? <StopCircle className="h-3 w-3 shrink-0 text-purple-400" /> : <div className="h-1.5 w-1.5 rounded-full bg-purple-500 shrink-0" />}
                                <span className="truncate text-[9px] font-medium text-zinc-200">{sound.name}</span>
                              </div>
                              <div className="flex items-center justify-end gap-0.5">
                                <button type="button" onClick={(e) => { e.stopPropagation(); handleStartRenameSound(sound); }} title="Editar" className="h-5 w-5 flex items-center justify-center rounded text-zinc-500 hover:text-purple-400 hover:bg-white/10"><Pencil className="h-2.5 w-2.5" /></button>
                                {onSetSfxLoop && (
                                  <Button variant="ghost" size="icon" className={`h-5 w-5 min-w-[20px] rounded ${isLoop ? 'text-purple-400 bg-purple-500/20' : 'text-zinc-500 hover:text-purple-400'}`} onClick={(e) => { e.stopPropagation(); onSetSfxLoop(id); }} title={isLoop ? 'Quitar loop' : 'Loop'}><Repeat className="h-2.5 w-2.5" /></Button>
                                )}
                                <Button variant="ghost" size="icon" className="h-5 w-5 min-w-[20px] rounded text-zinc-500 hover:text-red-400" onClick={(e) => { e.stopPropagation(); onDeleteSound(id); }} title="Eliminar"><Trash2 className="h-2.5 w-2.5" /></Button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === 'voice' && (
                <div className="space-y-4">
                  <p className="text-[10px] text-zinc-500">Efectos de voz para el GM</p>
                  {micError && (
                    <p className="text-[10px] text-red-400 bg-red-950/30 border border-red-500/30 rounded-lg px-2 py-1.5">{micError}</p>
                  )}
                  <Button variant={isMicActive ? 'destructive' : 'outline'} size="sm" className="w-full" onClick={onToggleMic}>
                    <Mic className="h-4 w-4 mr-2" />
                    {isMicActive ? 'Desactivar micrófono' : 'Activar micrófono'}
                  </Button>
                  <div className="space-y-2">
                    <p className="text-[9px] text-zinc-500">Vol. voz: {Math.round(voiceVolume * 100)}%</p>
                    <Slider value={[voiceVolume * 100]} min={0} max={100} step={1} onValueChange={(v) => onSetVoiceVolume(v[0] / 100)} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[9px] text-zinc-500">Ganancia de entrada: {inputGain.toFixed(1)}×</p>
                    <Slider value={[inputGain]} min={1} max={4} step={0.5} onValueChange={(v) => onSetInputGain(v[0])} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[9px] text-zinc-500">Supresión de ruido</p>
                    <Button variant="ghost" size="sm" className={`rounded-lg text-[9px] h-8 px-3 ${noiseGateOn ? 'bg-green-600/20 border border-green-500/40 text-green-400' : 'border border-white/10'}`} onClick={() => onSetNoiseGateOn(!noiseGateOn)}>{noiseGateOn ? 'On' : 'Off'}</Button>
                  </div>
                  <p className="text-[9px] text-zinc-500">Perfil (el micrófono sigue activo hasta que lo desactives):</p>
                  <div className="grid grid-cols-4 gap-1.5 max-h-[14rem] overflow-y-auto overflow-x-hidden">
                    {[...defaultVoiceProfiles.map((p) => ({ id: p, name: p.charAt(0).toUpperCase() + p.slice(1) })), ...customVoices.map((v) => ({ id: v.id, name: v.name }))].map(({ id, name }) => (
                      <Button key={id} variant="ghost" size="sm" className={`rounded-lg text-[9px] ${voiceProfile === id ? 'bg-red-600/20 border border-red-500/40' : ''}`} onClick={() => onSetVoiceProfile(id)}>{name}</Button>
                    ))}
                  </div>
                  {onAddCustomVoice != null && onDeleteCustomVoice != null && (
                    <div className="space-y-3 pt-3 border-t border-white/10">
                      <p className="text-[9px] text-zinc-500 uppercase">Crear voz</p>
                      <CustomVoiceForm
                        onAdd={onAddCustomVoice}
                        onPreview={onPreviewVoice}
                        onStartPreviewMic={onPreviewVoice ? () => {
                          if (!isMicActive) {
                            micTurnedOnForPreviewRef.current = true;
                            onToggleMic();
                          } else {
                            micTurnedOnForPreviewRef.current = false;
                          }
                        } : undefined}
                        onStopPreviewMic={onPreviewVoice ? () => {
                          if (micTurnedOnForPreviewRef.current) {
                            onToggleMic();
                            micTurnedOnForPreviewRef.current = false;
                          }
                        } : undefined}
                      />
                      {customVoices.length > 0 ? (
                        <>
                          <p className="text-[9px] text-zinc-500">Mis voces:</p>
                          <ul className="space-y-1 max-h-[9rem] overflow-y-auto scroll-custom">
                            {customVoices.map((v) => (
                              <li key={v.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.04] px-2 py-1.5">
                                <span className="text-[10px] truncate min-w-0">{v.name}</span>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button variant="ghost" size="sm" className="h-7 px-2 rounded-md text-[9px] text-green-400 hover:bg-green-500/20 border border-green-500/30" onClick={() => onSetVoiceProfile(v.id)} title="Probar esta voz con el micrófono">
                                    <Volume2 className="h-3 w-3 mr-1" />
                                    Probar
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded text-red-400 hover:bg-red-500/20" onClick={() => onDeleteCustomVoice(v.id)} title="Eliminar voz">
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : (
                        <p className="text-[9px] text-zinc-600">Crea una voz arriba; aquí aparecerá la lista con un botón <strong>Probar</strong> para cada una.</p>
                      )}
                    </div>
                  )}

                  <div className="space-y-3 pt-4 border-t border-white/10">
                    <p className="text-[9px] text-zinc-500 uppercase font-medium">Narrador</p>
                    <div className="flex flex-wrap gap-1.5">
                      <Button variant="ghost" size="sm" className={`rounded-lg text-[9px] ${narratorSource === 'system' ? 'bg-white/10 border border-white/20' : ''}`} onClick={() => setNarratorSource('system')}>Sistema</Button>
                      <Button variant="ghost" size="sm" className={`rounded-lg text-[9px] ${narratorSource === 'google' ? 'bg-amber-600/20 border border-amber-500/40' : ''}`} onClick={() => setNarratorSource('google')}>Google (AR)</Button>
                      <Button variant="ghost" size="sm" className={`rounded-lg text-[9px] ${narratorSource === 'elevenlabs' ? 'bg-emerald-600/20 border border-emerald-500/40' : ''}`} onClick={() => setNarratorSource('elevenlabs')}>ElevenLabs</Button>
                    </div>
                    {narratorSource === 'google' && !ttsGoogleConfigured && (
                      <p className="text-[9px] text-amber-200/90">Configura la API key de Google en <strong>Ajustes → Narrador</strong>.</p>
                    )}
                    {narratorSource === 'elevenlabs' && !ttsElevenlabsConfigured && (
                      <p className="text-[9px] text-amber-200/90">Configura la API key de ElevenLabs en <strong>Ajustes → Narrador</strong>.</p>
                    )}
                    {narratorSource === 'google' && ttsGoogleConfigured && (
                      <div className="space-y-1.5">
                        <label className="text-[9px] text-zinc-500">Voz (Google)</label>
                        <select value={narratorGoogleVoice} onChange={(e) => setNarratorGoogleVoice(e.target.value)} className="voice-select w-full rounded-lg border border-white/10 px-2 py-1.5 text-[10px] focus:outline-none focus:ring-2 focus:ring-amber-500/50">
                          <option value="es-AR-Standard-A">Argentina (masculino)</option>
                          <option value="es-AR-Standard-B">Argentina (femenino)</option>
                          <option value="es-AR-Wavenet-A">Argentina neural (M)</option>
                          <option value="es-AR-Wavenet-B">Argentina neural (F)</option>
                          <option value="es-ES-Standard-A">España (M)</option>
                          <option value="es-ES-Standard-B">España (F)</option>
                          <option value="es-MX-Standard-A">México (M)</option>
                          <option value="es-MX-Standard-B">México (F)</option>
                        </select>
                      </div>
                    )}
                    {narratorSource === 'elevenlabs' && ttsElevenlabsConfigured && narratorElevenlabsVoices.length > 0 && (
                      <div className="space-y-1.5">
                        <label className="text-[9px] text-zinc-500">Voz (ElevenLabs)</label>
                        <select value={narratorElevenlabsVoiceId} onChange={(e) => setNarratorElevenlabsVoiceId(e.target.value)} className="voice-select w-full rounded-lg border border-white/10 px-2 py-1.5 text-[10px] focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
                          {narratorElevenlabsVoices.map((v) => (
                            <option key={v.voice_id} value={v.voice_id}>{v.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <p className="text-[9px] text-zinc-600">Escribe el texto y pulsa Narrar para que se lea en voz alta.</p>
                    <textarea
                      value={narratorText}
                      onChange={(e) => setNarratorText(e.target.value)}
                      placeholder="Ej.: Los aventureros entran en una taberna oscura..."
                      className="w-full min-h-[80px] rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-[11px] text-white placeholder:text-zinc-500 resize-y focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      rows={4}
                    />
                    {narratorSource === 'system' && (
                      <>
                    <div className="space-y-1.5">
                      <p className="text-[9px] text-zinc-500">Velocidad: {narratorRate < 1 ? 'Lento' : narratorRate > 1 ? 'Rápido' : 'Normal'} ({narratorRate.toFixed(1)})</p>
                      <Slider value={[narratorRate]} min={0.5} max={1.5} step={0.1} onValueChange={(v) => setNarratorRate(v[0])} />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[9px] text-zinc-500">Tono: {narratorPitch < 1 ? 'Más grave' : narratorPitch > 1 ? 'Más agudo' : 'Normal'} ({narratorPitch.toFixed(1)})</p>
                      <Slider value={[narratorPitch]} min={0.5} max={1.5} step={0.05} onValueChange={(v) => setNarratorPitch(v[0])} />
                    </div>
                    <p className="text-[9px] text-amber-200/80">En Windows el tono a veces no cambia. Para voz más grave, elige una voz de la lista (ej. Pablo, Raúl).</p>
                    {narratorVoices.length > 0 && (
                      <div className="space-y-1.5">
                        <label className="text-[9px] text-zinc-500">Voz (Argentina, México, España…; las primeras suelen ser más graves)</label>
                        <select
                          value={narratorVoiceId}
                          onChange={(e) => setNarratorVoiceId(e.target.value)}
                          className="voice-select w-full rounded-lg border border-white/10 px-2 py-1.5 text-[10px] focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        >
                          <option value="">Predeterminada (español)</option>
                          {narratorVoicesSorted.filter((v) => v.lang.startsWith('es')).map((v) => (
                            <option key={v.voiceURI} value={v.voiceURI}>{narratorVoiceLabel(v)}</option>
                          ))}
                          {narratorVoicesSorted.filter((v) => !v.lang.startsWith('es')).length > 0 && (
                            <>
                              <option disabled>— Otras —</option>
                              {narratorVoicesSorted.filter((v) => !v.lang.startsWith('es')).map((v) => (
                                <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>
                              ))}
                            </>
                          )}
                        </select>
                      </div>
                    )}
                      </>
                    )}
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1 rounded-lg border-amber-500/40 text-amber-200 hover:bg-amber-600/20" onClick={handleNarrate} disabled={!narratorText.trim() || isNarrating || (narratorSource === 'google' && !ttsGoogleConfigured) || (narratorSource === 'elevenlabs' && !ttsElevenlabsConfigured)}>
                        <Volume2 className="h-3.5 w-3.5 mr-1.5" />
                        Narrar
                      </Button>
                      <Button variant="ghost" size="sm" className="rounded-lg text-red-400 hover:bg-red-500/20" onClick={handleStopNarrator} disabled={!isNarrating}>
                        <StopCircle className="h-3.5 w-3.5 mr-1.5" />
                        Detener
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notes' && (
                <div className="space-y-3">
                  <p className="text-[9px] text-zinc-500 uppercase">Notas privadas del GM. Se guardan en la partida y se exportan con ella.</p>
                  <Button variant="outline" size="sm" className="w-full rounded-xl border-amber-500/30 text-amber-200 hover:bg-amber-600/20" onClick={onAddNote}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Nueva nota
                  </Button>
                  <div className="flex flex-col gap-2 max-h-[140px] overflow-y-auto scroll-custom">
                    {notes.map((note) => {
                      const id = note.id;
                      const isSelected = selectedNoteId === id;
                      return (
                        <div
                          key={id}
                          role="button"
                          tabIndex={0}
                          className={`p-2.5 rounded-xl border text-left truncate ${isSelected ? 'bg-amber-600/20 border-amber-500/40' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.06]'}`}
                          onClick={() => onSelectNote?.(id)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectNote?.(id); } }}
                        >
                          <span className="text-[10px] font-medium text-zinc-200 block truncate">{note.title || 'Sin título'}</span>
                        </div>
                      );
                    })}
                  </div>
                  {selectedNoteId && (() => {
                    const note = notes.find((n) => n.id === selectedNoteId);
                    if (!note) return null;
                    return (
                      <div className="space-y-2 border-t border-white/5 pt-3">
                        <Input
                          className="text-[11px] font-semibold bg-white/[0.04] border-white/10"
                          placeholder="Título de la nota"
                          value={note.title}
                          onChange={(e) => onUpdateNote?.(note.id, { title: e.target.value })}
                        />
                        <textarea
                          className="w-full min-h-[160px] rounded-xl bg-white/[0.04] border border-white/10 text-zinc-200 text-sm p-3 resize-y focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/30 placeholder:text-zinc-600"
                          placeholder="Contenido..."
                          value={note.content}
                          onChange={(e) => onUpdateNote?.(note.id, { content: e.target.value })}
                        />
                        <Button variant="ghost" size="sm" className="w-full rounded-lg text-red-400 hover:bg-red-500/20 hover:text-red-300" onClick={() => onDeleteNote?.(note.id)}>
                          <Trash2 className="h-3 w-3 mr-1" /> Eliminar nota
                        </Button>
                      </div>
                    );
                  })()}
                  {notes.length === 0 && <p className="text-[9px] text-zinc-600">Sin notas. Crea una con el botón de arriba.</p>}
                </div>
              )}

              {activeTab === 'bestiary' && (
                <div className="space-y-3">
                  <p className="text-[9px] text-zinc-500 uppercase">Bestias y monstruos que encontrarán los héroes. Se guardan en la partida y se exportan.</p>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                    <Input
                      className="pl-8 h-9 text-[11px] bg-white/[0.04] border-white/10"
                      placeholder="Buscar por nombre o tipo..."
                      value={searchBeastQuery}
                      onChange={(e) => setSearchBeastQuery(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" size="sm" className="w-full rounded-xl border-emerald-500/30 text-emerald-200 hover:bg-emerald-600/20" onClick={onAddBeast}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Nueva bestia
                  </Button>
                  <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto scroll-custom">
                    {bestiary
                      .filter((b) => !searchBeastQuery.trim() || (b.name || '').toLowerCase().includes(searchBeastQuery.toLowerCase()) || (b.type || '').toLowerCase().includes(searchBeastQuery.toLowerCase()))
                      .map((beast) => {
                      const id = beast.id;
                      const isSelected = selectedBeastId === id;
                      return (
                        <div
                          key={id}
                          className={`rounded-xl border flex items-center gap-2 min-w-0 ${isSelected ? 'bg-emerald-600/20 border-emerald-500/40' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.06]'}`}
                        >
                          <div
                            role="button"
                            tabIndex={0}
                            className="p-2.5 flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
                            onClick={() => onSelectBeast?.(id)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectBeast?.(id); } }}
                          >
                            {beast.imageUrl ? (
                              <img src={mapAssetUrl(beast.imageUrl)} alt="" className="h-9 w-9 rounded-lg object-cover shrink-0 border border-white/10" />
                            ) : (
<div className="h-9 w-9 rounded-lg bg-white/5 border border-white/10 shrink-0 flex items-center justify-center">
                              <BeastHeadIcon className="h-4 w-4 text-zinc-600" />
                            </div>
                            )}
                            <div className="min-w-0 flex-1 truncate text-left">
                              <span className="text-[10px] font-semibold text-emerald-300 block truncate">{beast.name || 'Sin nombre'}</span>
                              {beast.type && <span className="text-[8px] text-zinc-500 block truncate">{beast.type}</span>}
                            </div>
                          </div>
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10" onClick={(e) => { e.stopPropagation(); setBeastToDelete({ id, name: beast.name || 'Sin nombre' }); }} title="Eliminar bestia">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                  {selectedBeastId && (() => {
                    const beast = bestiary.find((b) => b.id === selectedBeastId);
                    if (!beast) return null;
                    return (
                      <div className="space-y-2 border-t border-white/5 pt-3">
                        <Input
                          className="text-[11px] font-semibold bg-white/[0.04] border-white/10"
                          placeholder="Nombre de la bestia"
                          value={beast.name}
                          onChange={(e) => onUpdateBeast?.(beast.id, { name: e.target.value })}
                        />
                        <Input
                          className="text-[10px] bg-white/[0.04] border-white/10"
                          placeholder="Tipo (ej. Bestia, No muerto, Dragón)"
                          value={beast.type ?? ''}
                          onChange={(e) => onUpdateBeast?.(beast.id, { type: e.target.value })}
                        />
                        <div>
                          <label className="text-[9px] text-zinc-500 uppercase block mb-1">Imagen (solo GM)</label>
                          <div className="flex items-center gap-2 flex-wrap">
                            {beast.imageUrl ? (
                              <>
                                <img src={mapAssetUrl(beast.imageUrl)} alt={beast.name} className="h-20 w-20 object-cover rounded-lg border border-white/10" />
                                <div className="flex flex-col gap-1">
                                  <label className="cursor-pointer">
                                    <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-600/20 text-emerald-200 text-[9px] px-2 py-1.5 border border-emerald-500/30 hover:bg-emerald-600/30">Cambiar</span>
                                    <input type="file" ref={beastImageInputRef} className="hidden" accept="image/*,.webp,image/webp" onChange={(e) => { const f = e.target.files?.[0]; if (f && onUploadBeastImage) { onUploadBeastImage(beast.id, f); e.target.value = ''; } }} />
                                  </label>
                                  <Button type="button" variant="ghost" size="sm" className="h-7 text-[9px] text-red-400 hover:bg-red-500/20" onClick={() => onRemoveBeastImage?.(beast.id)}>Quitar imagen</Button>
                                </div>
                              </>
                            ) : (
                              <label className="cursor-pointer flex items-center gap-1 rounded-lg bg-white/5 text-zinc-400 text-[9px] px-2 py-1.5 border border-white/10 hover:bg-white/10">
                                <ImagePlus className="h-3.5 w-3.5" /> Subir imagen
                                <input type="file" ref={beastImageInputRef} className="hidden" accept="image/*,.webp,image/webp" onChange={(e) => { const f = e.target.files?.[0]; if (f && onUploadBeastImage) { onUploadBeastImage(beast.id, f); e.target.value = ''; } }} />
                              </label>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="text-[9px] text-zinc-500 uppercase block mb-1">Descripción / lore</label>
                          <textarea
                            className="w-full min-h-[80px] rounded-lg bg-white/[0.04] border border-white/10 text-zinc-200 text-[10px] p-2 resize-y focus:outline-none focus:ring-2 focus:ring-emerald-500/40 placeholder:text-zinc-600"
                            placeholder="Aspecto, comportamiento, hábitat..."
                            value={beast.description ?? ''}
                            onChange={(e) => onUpdateBeast?.(beast.id, { description: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-zinc-500 uppercase block mb-1">Estadísticas (CA, PG, ataques, etc.)</label>
                          <textarea
                            className="w-full min-h-[80px] rounded-lg bg-white/[0.04] border border-white/10 text-zinc-200 text-[10px] p-2 resize-y focus:outline-none focus:ring-2 focus:ring-emerald-500/40 placeholder:text-zinc-600 font-mono"
                            placeholder="CA 15, PG 45, Fuerza +2, Ataque +5..."
                            value={beast.stats ?? ''}
                            onChange={(e) => onUpdateBeast?.(beast.id, { stats: e.target.value })}
                          />
                        </div>
                        {onSaveBestiary && (
                          <Button variant="default" size="sm" className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2" onClick={onSaveBestiary}>
                            {beast.imageUrl ? <img src={mapAssetUrl(beast.imageUrl)} alt="" className="h-5 w-5 rounded object-cover shrink-0" /> : null}
                            <span>Guardar bestia</span>
                          </Button>
                        )}
                      </div>
                    );
                  })()}
                  {bestiary.length === 0 && <p className="text-[9px] text-zinc-600">Sin bestias. Añade una con el botón de arriba.</p>}
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                    <p className="text-[9px] text-zinc-500 uppercase">Modo</p>
                    <p className="text-sm text-blue-500 font-medium">Game Master</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between gap-2 text-left rounded-lg hover:bg-white/[0.04] -m-1 p-1 transition-colors"
                      onClick={() => setNarratorCloudExpanded((v) => !v)}
                    >
                      <p className="text-[9px] text-zinc-500 uppercase font-medium">Narrador en la nube</p>
                      {narratorCloudExpanded ? <ChevronUp className="h-4 w-4 text-zinc-500 shrink-0" /> : <ChevronDown className="h-4 w-4 text-zinc-500 shrink-0" />}
                    </button>
                    <div
                      className="overflow-hidden transition-[max-height] duration-300 ease-out"
                      style={{ maxHeight: narratorCloudExpanded ? 420 : 0 }}
                    >
                      <div className="space-y-4 pt-3 mt-1 border-t border-white/10">
                        <div className="space-y-3">
                          <p className="text-[9px] text-zinc-500">Google (voz Argentina)</p>
                          <Input
                            type="password"
                            placeholder="API key de Google Cloud"
                            value={ttsGoogleApiKey}
                            onChange={(e) => setTtsGoogleApiKey(e.target.value)}
                            className="bg-white/5 border-white/10 text-[11px]"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-lg border-amber-500/40 text-amber-200 hover:bg-amber-600/20"
                            disabled={ttsSaving}
                            onClick={async () => {
                              setTtsSaving(true);
                              try {
                                const res = await fetch(`${getApiBase()}/api/tts/config`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ googleApiKey: ttsGoogleApiKey.trim() }),
                                });
                                if (res.ok) {
                                  setTtsGoogleConfigured(!!ttsGoogleApiKey.trim());
                                  setTtsGoogleApiKey('');
                                }
                              } finally {
                                setTtsSaving(false);
                              }
                            }}
                          >
                            {ttsSaving ? 'Guardando…' : 'Guardar Google'}
                          </Button>
                          {ttsGoogleConfigured && <p className="text-[9px] text-green-400/90">Google configurado.</p>}
                        </div>
                        <div className="border-t border-white/10 pt-3 space-y-3">
                          <p className="text-[9px] text-zinc-500">ElevenLabs (voces IA)</p>
                          <Input
                            type="password"
                            placeholder="API key de ElevenLabs (elevenlabs.io)"
                            value={ttsElevenlabsApiKey}
                            onChange={(e) => setTtsElevenlabsApiKey(e.target.value)}
                            className="bg-white/5 border-white/10 text-[11px]"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-lg border-emerald-500/40 text-emerald-200 hover:bg-emerald-600/20"
                            disabled={ttsSaving}
                            onClick={async () => {
                              setTtsSaving(true);
                              try {
                                const res = await fetch(`${getApiBase()}/api/tts/config`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ elevenlabsApiKey: ttsElevenlabsApiKey.trim() }),
                                });
                                if (res.ok) {
                                  setTtsElevenlabsConfigured(!!ttsElevenlabsApiKey.trim());
                                  setTtsElevenlabsApiKey('');
                                }
                              } finally {
                                setTtsSaving(false);
                              }
                            }}
                          >
                            {ttsSaving ? 'Guardando…' : 'Guardar ElevenLabs'}
                          </Button>
                          {ttsElevenlabsConfigured && <p className="text-[9px] text-green-400/90">ElevenLabs configurado. Usa Voz → Narrador → ElevenLabs.</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 h-10 rounded-xl bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                    onClick={() => navigate('/campaigns')}
                  >
                    <BookOpen className="h-4 w-4" />
                    Cambiar partida
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 h-10 rounded-xl bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                    onClick={async () => {
                      await logout();
                      navigate('/');
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    Cerrar sesión
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      <AlertDialog open={!!mapToDelete} onOpenChange={(open) => !open && setMapToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar mapa?</AlertDialogTitle>
            <AlertDialogDescription>Se borrará &quot;{mapToDelete?.name}&quot; permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMapToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!beastToDelete} onOpenChange={(open) => !open && setBeastToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar bestia?</AlertDialogTitle>
            <AlertDialogDescription>
            ¿Está seguro de que desea eliminar la bestia <span className="font-semibold text-emerald-300">&quot;{beastToDelete?.name}&quot;</span>? Se borrará permanentemente.
          </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBeastToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteBeast}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!editingMap} onOpenChange={(open) => !open && setEditingMap(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Renombrar mapa</AlertDialogTitle>
            <AlertDialogDescription>Nuevo nombre para: {editingMap?.name}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre..." autoFocus onKeyDown={handleKeyDownMap} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEditingMap(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRename}>Guardar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!editingTrapId} onOpenChange={(open) => !open && setEditingTrapId(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Editar trampa</AlertDialogTitle>
            <AlertDialogDescription>Nombre e imagen, video o gif de la trampa.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1.5">Nombre</label>
              <Input
                value={editTrapName}
                onChange={(e) => setEditTrapName(e.target.value)}
                placeholder="Nombre de la trampa"
                className="bg-white/5 border-white/10"
                onKeyDown={(e) => e.key === 'Enter' && editingTrapId && onUpdateTrap?.(editingTrapId, { name: editTrapName.trim() || 'Trampa', imageUrl: editTrapImageUrl }) && setEditingTrapId(null)}
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1.5">Imagen / video / gif</label>
              <input
                ref={trapMediaInputRef}
                type="file"
                className="hidden"
                accept="image/*,video/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !onUploadTrapImage) return;
                  try {
                    const url = await onUploadTrapImage(file);
                    setEditTrapImageUrl(url);
                  } catch (_) {}
                  e.target.value = '';
                }}
              />
              {editTrapImageUrl ? (
                <div className="space-y-2">
                  <div className="rounded-lg border border-white/10 bg-black/30 overflow-hidden flex items-center justify-center min-h-[120px]">
                    {/\.(mp4|webm|mov|ogg|ogv)(\?|$)/i.test(editTrapImageUrl) ? (
                      <video src={mapAssetUrl(editTrapImageUrl)} className="max-h-40 max-w-full object-contain" controls muted loop playsInline />
                    ) : (
                      <img src={mapAssetUrl(editTrapImageUrl)} alt="" className="max-h-40 max-w-full object-contain" />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" className="text-[10px]" onClick={() => trapMediaInputRef.current?.click()}>
                      Cambiar
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="text-[10px] text-red-400 hover:text-red-300" onClick={() => setEditTrapImageUrl(null)}>
                      Quitar
                    </Button>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg border border-dashed border-white/20 bg-white/[0.02] hover:bg-white/[0.05] cursor-pointer" onClick={() => trapMediaInputRef.current?.click()}>
                  <ImagePlus className="h-10 w-10 text-zinc-500" />
                  <span className="text-[10px] text-zinc-400">Agregar imagen, video o gif</span>
                </label>
              )}
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEditingTrapId(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (editingTrapId) {
                  onUpdateTrap?.(editingTrapId, { name: editTrapName.trim() || 'Trampa', imageUrl: editTrapImageUrl });
                  setEditingTrapId(null);
                }
              }}
            >
              Guardar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {trapsModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => onCloseTrapsModal?.()}>
          <div className="bg-zinc-900 rounded-xl border border-white/10 shadow-xl max-w-md w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-semibold text-white">
                {trapsModalView === 'list' ? 'Trampas' : 'Crear trampa'}
              </h3>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-zinc-400 hover:text-white" onClick={() => trapsModalView === 'create' ? onSetTrapsModalView?.('list') : onCloseTrapsModal?.()}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {trapsModalView === 'list' ? (
                <>
                  <div className="space-y-2">
                    {trapTemplates.map((t) => (
                      <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg border border-white/5 bg-white/[0.02]">
                        {t.imageUrl ? (
                          <img src={mapAssetUrl(t.imageUrl)} alt="" className="h-10 w-10 rounded-lg object-cover border border-white/10 shrink-0" />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                            <AlertTriangle className="h-5 w-5 text-zinc-500" />
                          </div>
                        )}
                        <span className="text-[11px] font-medium text-zinc-200 truncate flex-1 min-w-0">{t.name}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="sm" className="h-8 text-[10px] text-amber-400 hover:text-amber-300" onClick={() => onPlaceTrapFromTemplate?.(t)}>
                            Colocar trampa
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-red-400" title="Eliminar plantilla" onClick={() => onDeleteTrapTemplate?.(t.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {trapTemplates.length === 0 && (
                      <p className="text-[10px] text-zinc-500 py-4 text-center">No hay plantillas. Crea una para usarla en el mapa.</p>
                    )}
                  </div>
                  <Button variant="outline" size="sm" className="w-full rounded-xl text-[10px] border-white/20 text-zinc-300" onClick={() => onSetTrapsModalView?.('create')}>
                    <Plus className="h-3.5 w-3.5 mr-2" /> Crear trampa
                  </Button>
                </>
              ) : (
                <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); }}>
                  <div>
                    <label className="text-[10px] text-zinc-500 block mb-1">Nombre</label>
                    <Input
                      value={createTrapName}
                      onChange={(e) => setCreateTrapName(e.target.value)}
                      placeholder="Ej. Trampa de pinchos"
                      className="bg-white/5 border-white/10 text-[11px] h-9"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 block mb-1">Imagen (opcional)</label>
                    <input
                      ref={createTrapImageInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*,video/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !onUploadTrapImage) return;
                        try {
                          const url = await onUploadTrapImage(file);
                          setCreateTrapImageUrl(url);
                        } catch (err) {
                          console.error(err);
                        }
                        e.target.value = '';
                      }}
                    />
                    {createTrapImageUrl ? (
                      <div className="flex items-center gap-2">
                        {createTrapImageUrl.match(/\.(webm|mp4|ogg)$/i) ? (
                          <video src={mapAssetUrl(createTrapImageUrl)} className="h-16 w-16 rounded-lg object-cover border border-white/10" muted loop playsInline />
                        ) : (
                          <img src={mapAssetUrl(createTrapImageUrl)} alt="" className="h-16 w-16 rounded-lg object-cover border border-white/10" />
                        )}
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" size="sm" className="text-[10px]" onClick={() => createTrapImageInputRef.current?.click()}>Cambiar</Button>
                          <Button type="button" variant="ghost" size="sm" className="text-[10px] text-red-400" onClick={() => setCreateTrapImageUrl(null)}>Quitar</Button>
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg border border-dashed border-white/20 bg-white/[0.02] hover:bg-white/[0.05] cursor-pointer" onClick={() => createTrapImageInputRef.current?.click()}>
                        <ImagePlus className="h-8 w-8 text-zinc-500" />
                        <span className="text-[10px] text-zinc-400">Añadir imagen o vídeo</span>
                      </label>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="ghost" size="sm" className="text-[10px]" onClick={() => onSetTrapsModalView?.('list')}>Volver</Button>
                    <Button
                      type="button"
                      size="sm"
                      className="text-[10px] bg-amber-600 hover:bg-amber-700"
                      disabled={!createTrapName.trim() || createTrapSubmitting}
                      onClick={async () => {
                        if (!createTrapName.trim() || !onCreateTrapTemplate) return;
                        setCreateTrapSubmitting(true);
                        try {
                          await onCreateTrapTemplate(createTrapName.trim(), createTrapImageUrl ?? undefined);
                          setCreateTrapName('');
                          setCreateTrapImageUrl(null);
                        } finally {
                          setCreateTrapSubmitting(false);
                        }
                      }}
                    >
                      {createTrapSubmitting ? 'Guardando...' : 'Crear plantilla'}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal editar reloj de partida */}
      {gameClockEditOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60" onClick={() => onSetGameClockEditOpen?.(false)}>
          <div className="bg-zinc-900 border border-white/10 rounded-xl p-4 shadow-xl min-w-[200px]" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-medium text-white mb-3">Editar hora de partida</h3>
            <div className="flex gap-3 items-center mb-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-400">Horas (0–23)</label>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={gameClockEditHours}
                  onChange={e => setGameClockEditHours(Math.max(0, Math.min(23, parseInt(e.target.value, 10) || 0)))}
                  className="w-16 px-2 py-1.5 rounded bg-zinc-800 border border-white/10 text-white text-sm"
                />
              </div>
              <span className="text-zinc-500 mt-5">:</span>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-400">Minutos (0–59)</label>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={gameClockEditMinutes}
                  onChange={e => setGameClockEditMinutes(Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0)))}
                  className="w-16 px-2 py-1.5 rounded bg-zinc-800 border border-white/10 text-white text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="ghost" size="sm" className="text-[10px]" onClick={() => onSetGameClockEditOpen?.(false)}>Cancelar</Button>
              <Button
                type="button"
                size="sm"
                className="text-[10px]"
                onClick={() => {
                  onSetGameClockTime?.({ hours: gameClockEditHours, minutes: gameClockEditMinutes });
                  onSetGameClockEditOpen?.(false);
                }}
              >
                Guardar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
