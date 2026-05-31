import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import MapCanvas from '@/components/MapCanvas';
import { useSocket } from '@/hooks/useSocket';
import { getApiBase, mapAssetUrl, parseJsonResponse } from '@/lib/api';

export type CustomVoice = {
  id: string;
  name: string;
  pitch: number;
  reverbDecay?: number;
  chorusRate?: number;
  chorusDepth?: number;
  distortion?: number;
};

const DEFAULT_VOICE_PROFILES = ['normal', 'demonio', 'demonia', 'trol', 'trolesa', 'goblin', 'gremlin', 'gremlina', 'duende', 'duenda', 'gnomo', 'gnoma', 'hadita', 'hada', 'ángel', 'ángela', 'fantasma', 'espectra', 'titán', 'titánide', 'dios', 'diosa'];
const CUSTOM_VOICES_STORAGE_KEY = 'gm-custom-voices';

type MapTrap = { id: string; x: number; y: number; width?: number; height?: number; name?: string; activated?: boolean; imageUrl?: string | null };

export default function GM() {
  const { socket } = useSocket();
  const [maps, setMaps] = useState<any[]>([]);
  const [activeMapId, setActiveMapId] = useState<string | null>(null);
  const [activeMap, setActiveMap] = useState<any>(null);
  const [tool, setTool] = useState<'brush' | 'eraser' | 'paint' | 'paint-eraser'>('brush');
  const [brushSize, setBrushSize] = useState(50);
  const [brushShape, setBrushShape] = useState<'round' | 'square'>('round');
  const [paintColor, setPaintColor] = useState('#ef4444');
  const [panMode, setPanMode] = useState(true);
  const [centerTrigger, setCenterTrigger] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'maps' | 'sounds' | 'voice' | 'notes' | 'bestiary' | 'settings' | null>('maps');
  type NoteItem = { id: string; title: string; content: string; createdAt?: string };
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const notesSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  type BeastItem = { id: string; name: string; type?: string; description?: string; stats?: string; imageUrl?: string; createdAt?: string };
  const [bestiary, setBestiary] = useState<BeastItem[]>([]);
  const [selectedBeastId, setSelectedBeastId] = useState<string | null>(null);
  const [beastModalOpen, setBeastModalOpen] = useState(false);
  const [beastModalVisible, setBeastModalVisible] = useState(false);
  const [beastModalExiting, setBeastModalExiting] = useState(false);
  const bestiarySaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [sounds, setSounds] = useState<any[]>([]);
  const [playingAmbientId, setPlayingAmbientId] = useState<string | null>(null);
  const [isAmbientPaused, setIsAmbientPaused] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [sfxVolume, setSfxVolume] = useState(0.7);
  const [playingSfxIds, setPlayingSfxIds] = useState<string[]>([]);
  const [sfxLoopById, setSfxLoopById] = useState<Record<string, boolean>>({});
  const [isMicActive, setIsMicActive] = useState(false);
  const [voiceProfile, setVoiceProfile] = useState('normal');
  const [voiceVolume, setVoiceVolume] = useState(0.6);
  const [noiseGateOn, setNoiseGateOn] = useState(true);
  const [inputGain, setInputGain] = useState(2);
  const [micError, setMicError] = useState<string | null>(null);
  const [customVoices, setCustomVoices] = useState<CustomVoice[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(CUSTOM_VOICES_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [previewVoiceParams, setPreviewVoiceParams] = useState<Omit<CustomVoice, 'id' | 'name'> | null>(null);
  const [placeTrapMode, setPlaceTrapMode] = useState(false);
  type TrapTemplate = { id: string; name: string; imageUrl?: string };
  const [trapTemplates, setTrapTemplates] = useState<TrapTemplate[]>([]);
  const [placeTrapTemplate, setPlaceTrapTemplate] = useState<TrapTemplate | null>(null);
  const [trapsModalOpen, setTrapsModalOpen] = useState(false);
  const [trapsModalView, setTrapsModalView] = useState<'list' | 'create'>('list');
  const [showGameClock, setShowGameClock] = useState(false);
  const [gameClockTime, setGameClockTime] = useState({ hours: 12, minutes: 0 });
  const [gameClockPosition, setGameClockPosition] = useState({ x: 0.5, y: 0.08 });
  const [gameClockEditOpen, setGameClockEditOpen] = useState(false);
  const mapAreaRef = useRef<HTMLDivElement>(null);
  const gameClockDragRef = useRef<{ active: boolean; startX: number; startY: number; startPos: { x: number; y: number } } | null>(null);

  const ambientAudio = useRef<HTMLAudioElement | null>(null);
  const sfxAudioMap = useRef<Record<string, HTMLAudioElement>>({});
  const voiceChain = useRef<{ userMedia: any; toneGain: any; effectNodes: any[]; dispose: () => void } | null>(null);
  const voiceGainRef = useRef<{ gain: { value: number } } | null>(null);
  const toneRef = useRef<any>(null);
  const customPreviewNodesRef = useRef<{ pitch?: any; distortion?: any; reverb?: any; chorus?: any }>({});

  useEffect(() => {
    if (ambientAudio.current) ambientAudio.current.volume = volume;
    if (socket) socket.emit('volume-update', { category: 'ambient', volume });
  }, [volume, socket]);
  useEffect(() => {
    Object.values(sfxAudioMap.current).forEach((el) => { if (el) el.volume = sfxVolume; });
    if (socket) socket.emit('volume-update', { category: 'sfx', volume: sfxVolume });
  }, [sfxVolume, socket]);

  useEffect(() => {
    const gain = voiceGainRef.current;
    if (gain) gain.gain.value = 2 + voiceVolume * 6;
  }, [voiceVolume]);

  useEffect(() => {
    if (socket) {
      socket.emit('game-clock-request');
      const onState = (data: { visible?: boolean; hours?: number; minutes?: number; position?: { x: number; y: number } }) => {
        if (data && typeof data.visible === 'boolean') setShowGameClock(data.visible);
        if (data && typeof data.hours === 'number') setGameClockTime((t) => ({ ...t, hours: Math.max(0, Math.min(23, data.hours!)) }));
        if (data && typeof data.minutes === 'number') setGameClockTime((t) => ({ ...t, minutes: Math.max(0, Math.min(59, data.minutes!)) }));
        if (data?.position && typeof data.position.x === 'number' && typeof data.position.y === 'number') setGameClockPosition({ x: data.position.x, y: data.position.y });
      };
      socket.on('game-clock-state', onState);
      return () => { socket.off('game-clock-state', onState); };
    }
  }, [socket]);

  useEffect(() => {
    if (socket) socket.emit('game-clock-update', { visible: showGameClock, hours: gameClockTime.hours, minutes: gameClockTime.minutes, position: gameClockPosition });
  }, [socket, showGameClock, gameClockTime.hours, gameClockTime.minutes, gameClockPosition.x, gameClockPosition.y]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = gameClockDragRef.current;
      if (!d?.active || !mapAreaRef.current) return;
      const rect = mapAreaRef.current.getBoundingClientRect();
      const normX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const normY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      setGameClockPosition({ x: normX, y: normY });
    };
    const onUp = () => {
      if (gameClockDragRef.current) gameClockDragRef.current.active = false;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  useEffect(() => {
    fetchMaps();
    fetchSounds();
    fetchNotes();
    fetchBestiary();
    fetchTrapTemplates();
  }, []);

  useEffect(() => {
    if (selectedBeastId && beastModalOpen) {
      setBeastModalExiting(false);
      const id = requestAnimationFrame(() => setBeastModalVisible(true));
      return () => cancelAnimationFrame(id);
    } else {
      setBeastModalVisible(false);
    }
  }, [selectedBeastId, beastModalOpen]);

  const fetchNotes = async () => {
    try {
      const res = await fetch(`${getApiBase()}/api/notes`);
      if (!res.ok) return;
      const data = await parseJsonResponse<{ notes?: NoteItem[] }>(res);
      const list = Array.isArray(data?.notes) ? data.notes : [];
      setNotes(list);
      if (list.length === 0) setSelectedNoteId(null);
      else if (!selectedNoteId || !list.some((n) => n.id === selectedNoteId)) setSelectedNoteId(list[0].id);
    } catch (e) {
      console.error(e);
    }
  };

  const saveNotesDebounced = (nextNotes: NoteItem[]) => {
    if (notesSaveTimeoutRef.current) clearTimeout(notesSaveTimeoutRef.current);
    notesSaveTimeoutRef.current = setTimeout(async () => {
      notesSaveTimeoutRef.current = null;
      try {
        await fetch(`${getApiBase()}/api/notes`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: nextNotes }),
        });
      } catch (e) {
        console.error(e);
      }
    }, 600);
  };

  const handleAddNote = () => {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const newNote: NoteItem = { id, title: 'Sin título', content: '', createdAt: new Date().toISOString() };
    const next = [newNote, ...notes];
    setNotes(next);
    setSelectedNoteId(id);
    saveNotesDebounced(next);
  };

  const handleUpdateNote = (id: string, updates: { title?: string; content?: string }) => {
    const next = notes.map((n) => (n.id === id ? { ...n, ...updates } : n));
    setNotes(next);
    saveNotesDebounced(next);
  };

  const handleDeleteNote = (id: string) => {
    const next = notes.filter((n) => n.id !== id);
    setNotes(next);
    if (selectedNoteId === id) setSelectedNoteId(next.length > 0 ? next[0].id : null);
    saveNotesDebounced(next);
  };

  const fetchBestiary = async () => {
    try {
      const res = await fetch(`${getApiBase()}/api/bestiary`);
      if (!res.ok) return;
      const data = await parseJsonResponse<{ bestiary?: BeastItem[] }>(res);
      const list = Array.isArray(data?.bestiary) ? data.bestiary : [];
      setBestiary(list);
      if (list.length === 0) setSelectedBeastId(null);
      else if (!selectedBeastId || !list.some((b) => b.id === selectedBeastId)) setSelectedBeastId(list[0].id);
    } catch (e) {
      console.error(e);
    }
  };

  const saveBestiaryDebounced = (nextBestiary: BeastItem[]) => {
    if (bestiarySaveTimeoutRef.current) clearTimeout(bestiarySaveTimeoutRef.current);
    bestiarySaveTimeoutRef.current = setTimeout(async () => {
      bestiarySaveTimeoutRef.current = null;
      try {
        await fetch(`${getApiBase()}/api/bestiary`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bestiary: nextBestiary }),
        });
      } catch (e) {
        console.error(e);
      }
    }, 600);
  };

  const handleAddBeast = () => {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const newBeast: BeastItem = { id, name: 'Nueva bestia', type: '', description: '', stats: '', createdAt: new Date().toISOString() };
    const next = [newBeast, ...bestiary];
    setBestiary(next);
    setSelectedBeastId(id);
    setBeastModalOpen(false);
    saveBestiaryDebounced(next);
  };

  const handleUpdateBeast = (id: string, updates: { name?: string; type?: string; description?: string; stats?: string }) => {
    const next = bestiary.map((b) => (b.id === id ? { ...b, ...updates } : b));
    setBestiary(next);
    saveBestiaryDebounced(next);
  };

  const handleDeleteBeast = (id: string) => {
    const next = bestiary.filter((b) => b.id !== id);
    setBestiary(next);
    if (selectedBeastId === id) { setSelectedBeastId(next.length > 0 ? next[0].id : null); setBeastModalOpen(false); }
    saveBestiaryDebounced(next);
  };

  const handleUploadBeastImage = async (beastId: string, file: File) => {
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${getApiBase()}/api/bestiary/${beastId}/image`, { method: 'POST', body: form });
      if (!res.ok) return;
      const data = await parseJsonResponse<{ bestiary?: BeastItem[] }>(res);
      if (Array.isArray(data?.bestiary)) setBestiary(data.bestiary);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveBeastImage = async (beastId: string) => {
    try {
      const res = await fetch(`${getApiBase()}/api/bestiary/${beastId}/image`, { method: 'DELETE' });
      if (!res.ok) return;
      const data = await parseJsonResponse<{ bestiary?: BeastItem[] }>(res);
      if (Array.isArray(data?.bestiary)) setBestiary(data.bestiary);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveBestiary = async () => {
    if (bestiarySaveTimeoutRef.current) {
      clearTimeout(bestiarySaveTimeoutRef.current);
      bestiarySaveTimeoutRef.current = null;
    }
    try {
      const res = await fetch(`${getApiBase()}/api/bestiary`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bestiary }),
      });
      if (res.ok) { setSelectedBeastId(null); setBeastModalOpen(false); }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(CUSTOM_VOICES_STORAGE_KEY, JSON.stringify(customVoices));
    } catch (_) {}
  }, [customVoices]);

  const fetchMaps = async () => {
    try {
      const res = await fetch(`${getApiBase()}/api/maps`);
      const data = await parseJsonResponse<any[]>(res);
      setMaps(data);
      if (data.length > 0 && !activeMapId) {
        setActiveMapId(data[0]._id || data[0].id);
        setActiveMap(data[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSounds = async () => {
    try {
      const res = await fetch(`${getApiBase()}/api/sounds`);
      const data = await parseJsonResponse<any[]>(res);
      setSounds(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTrapTemplates = async () => {
    try {
      const res = await fetch(`${getApiBase()}/api/trap-templates`);
      if (!res.ok) return;
      const data = await parseJsonResponse<TrapTemplate[]>(res);
      setTrapTemplates(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectMap = async (id: string) => {
    setActiveMapId(id);
    const cached = maps.find((m) => (m._id || m.id) === id);
    if (cached) setActiveMap(cached);
    try {
      await fetch(`${getApiBase()}/api/maps/${id}/activate`, { method: 'PUT' });
      const res = await fetch(`${getApiBase()}/api/maps`);
      const data = await parseJsonResponse<any[]>(res);
      setMaps(data);
      const fresh = data.find((m: any) => (m._id || m.id) === id);
      if (fresh) setActiveMap(fresh);
      if (socket) socket.emit('map-change', id);
    } catch (e) {
      console.error('Error refreshing maps:', e);
    }
  };

  const handleUploadMap = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', file.name.split('.')[0]);
    formData.append('type', isVideo ? 'video' : 'image');
    setIsLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/api/maps`, { method: 'POST', body: formData });
      const newMap = await parseJsonResponse<any>(res);
      const id = newMap._id || newMap.id;
      setMaps((prev) => [newMap, ...prev]);
      setActiveMapId(id);
      setActiveMap(newMap);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivateMap = async (id: string) => {
    try {
      await fetch(`${getApiBase()}/api/maps/${id}/activate`, { method: 'PUT' });
      setMaps((prev) => prev.map((m) => ({ ...m, isActive: (m._id || m.id) === id })));
      if (socket) socket.emit('map-change', id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteMap = async (id: string) => {
    const wasActive = maps.find((m) => (m._id || m.id) === id)?.isActive;
    try {
      const res = await fetch(`${getApiBase()}/api/maps/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      setMaps((prev) => prev.filter((m) => (m._id || m.id) !== id));
      if (activeMapId === id) {
        const remaining = maps.filter((m) => (m._id || m.id) !== id);
        if (remaining.length > 0) {
          setActiveMapId(remaining[0]._id || remaining[0].id);
          setActiveMap(remaining[0]);
        } else {
          setActiveMapId(null);
          setActiveMap(null);
        }
      }
      if (wasActive && socket) socket.emit('map-change');
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateMap = async (id: string, updates: any) => {
    try {
      const res = await fetch(`${getApiBase()}/api/maps/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Error al actualizar');
      const updated = await parseJsonResponse<Record<string, unknown>>(res);
      setMaps((prev) => prev.map((m) => ((m._id || m.id) === id ? { ...m, ...updated } : m)));
      if (activeMapId === id) setActiveMap((prev: any) => (prev ? { ...prev, ...updated } : prev));
      if (socket && activeMapId === id) socket.emit('map-change');
    } catch (e) {
      console.error(e);
    }
  };

  const handleUploadSound = async (e: React.ChangeEvent<HTMLInputElement>, category: 'ambient' | 'sfx') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', file.name.split('.')[0]);
    formData.append('category', category);
    setIsLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/api/sounds`, { method: 'POST', body: formData });
      const newSound = await parseJsonResponse<any>(res);
      setSounds((prev) => [newSound, ...prev]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSound = async (id: string) => {
    try {
      await fetch(`${getApiBase()}/api/sounds/${id}`, { method: 'DELETE' });
      setSounds((prev) => prev.filter((s) => (s._id || s.id) !== id));
      if (playingAmbientId === id) handleStopSound('ambient');
      if (playingSfxIds.includes(id)) handleStopSound('sfx', id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateSound = async (id: string, updates: any) => {
    try {
      const res = await fetch(`${getApiBase()}/api/sounds/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Error al actualizar');
      const updated = await parseJsonResponse<Record<string, unknown>>(res);
      setSounds((prev) => prev.map((s) => ((s._id || s.id) === id ? { ...s, ...updated } : s)));
    } catch (e) {
      console.error(e);
    }
  };

  const handlePlaySound = (sound: any) => {
    const id = sound._id || sound.id;
    if (sound.category === 'ambient') {
      if (playingAmbientId === id && isAmbientPaused && ambientAudio.current) {
        ambientAudio.current.volume = volume;
        ambientAudio.current.play().then(() => setIsAmbientPaused(false));
        if (socket) socket.emit('sound-resume', { category: 'ambient' });
        return;
      }
      if (ambientAudio.current) {
        ambientAudio.current.pause();
        ambientAudio.current.src = '';
        ambientAudio.current = null;
      }
      const audio = new Audio(mapAssetUrl(sound.url));
      audio.loop = true;
      audio.volume = volume;
      ambientAudio.current = audio;
      setPlayingAmbientId(id);
      setIsAmbientPaused(false);
      audio.play().catch(console.error);
      if (socket) socket.emit('sound-play', { id, url: mapAssetUrl(sound.url), category: 'ambient', loop: true, volume });
    } else {
      if (playingSfxIds.includes(id)) {
        handleStopSound('sfx', id);
        return;
      }
      const audio = new Audio(mapAssetUrl(sound.url));
      audio.volume = sfxVolume;
      audio.loop = sfxLoopById[id] ?? false;
      audio.onended = () => {
        setPlayingSfxIds((prev) => prev.filter((x) => x !== id));
        delete sfxAudioMap.current[id];
      };
      audio.play().catch(console.error);
      sfxAudioMap.current[id] = audio;
      setPlayingSfxIds((prev) => [...prev, id]);
      if (socket) socket.emit('sound-play', { id, url: mapAssetUrl(sound.url), category: 'sfx', loop: sfxLoopById[id] ?? false, volume: sfxVolume });
    }
  };

  const handleSetSfxLoop = (soundId: string) => {
    const newLoop = !(sfxLoopById[soundId] ?? false);
    setSfxLoopById((prev) => ({ ...prev, [soundId]: newLoop }));
    const el = sfxAudioMap.current[soundId];
    if (el) el.loop = newLoop;
  };

  const handleStopSound = (category: 'ambient' | 'sfx', id?: string) => {
    if (category === 'ambient') {
      if (ambientAudio.current) {
        ambientAudio.current.pause();
        ambientAudio.current.src = '';
        ambientAudio.current = null;
      }
      setPlayingAmbientId(null);
      setIsAmbientPaused(false);
      if (socket) socket.emit('sound-stop', { category: 'ambient' });
    } else if (id != null) {
      const el = sfxAudioMap.current[id];
      if (el) {
        el.pause();
        el.src = '';
        delete sfxAudioMap.current[id];
      }
      setPlayingSfxIds((prev) => prev.filter((x) => x !== id));
      if (socket) socket.emit('sound-stop', { category: 'sfx', id });
    } else {
      Object.values(sfxAudioMap.current).forEach((el) => { if (el) { el.pause(); el.src = ''; } });
      sfxAudioMap.current = {};
      setPlayingSfxIds([]);
      if (socket) socket.emit('sound-stop', { category: 'sfx' });
    }
  };

  const handlePauseSound = (category: 'ambient') => {
    if (category === 'ambient' && ambientAudio.current) {
      ambientAudio.current.pause();
      setIsAmbientPaused(true);
      if (socket) socket.emit('sound-pause', { category: 'ambient' });
    }
  };

  const buildVoiceChain = (
    Tone: any,
    userMedia: any,
    toneGain: any,
    dest: any,
    profile: string,
    nodes: { disconnect?: () => void; dispose?: () => void }[],
    reverbPromises: Promise<void>[],
    connectDest: boolean,
    gateOn: boolean,
    gainValue: number,
    customParams?: CustomVoice | null,
    customNodesOut?: { current: { pitch?: any; distortion?: any; reverb?: any; chorus?: any } }
  ) => {
    const chainEnd = connectDest ? [toneGain, dest] : [toneGain];
    const now = Tone.now();
    const setWet = (eff: { wet?: { value?: number; setValueAtTime?: (v: number, t: number) => void } }) => {
      if (eff.wet != null) {
        try {
          if (typeof (eff.wet as any).setValueAtTime === 'function') (eff.wet as any).setValueAtTime(1, now);
          (eff.wet as any).value = 1;
        } catch (_) {}
      }
    };
    const prefix: any[] = [];
    if (gainValue > 1) {
      const g = new Tone.Gain(gainValue);
      prefix.push(g);
      nodes.push(g);
    }
    if (gateOn) {
      const gate = new Tone.Gate(-54, 0.2);
      prefix.push(gate);
      nodes.push(gate);
    }
    const startNode = prefix.length > 0 ? prefix[prefix.length - 1] : userMedia;
    if (prefix.length > 0) userMedia.chain(...prefix);
    const chain = (...args: any[]) => startNode.chain(...args);
    if (customParams) {
      const p = new Tone.PitchShift(customParams.pitch);
      p.windowSize = 0.08;
      p.pitch = customParams.pitch;
      setWet(p);
      const effectNodes: any[] = [p];
      if (customNodesOut) customNodesOut.current.pitch = p;
      chain(p);
      let last: any = p;
      if (customParams.distortion != null && customParams.distortion > 0) {
        const d = new Tone.Distortion(Math.min(0.9, customParams.distortion));
        setWet(d);
        last.chain(d);
        last = d;
        effectNodes.push(d);
        if (customNodesOut) customNodesOut.current.distortion = d;
      } else if (customNodesOut) customNodesOut.current.distortion = undefined;
      if (customParams.reverbDecay != null && customParams.reverbDecay > 0) {
        const r = new Tone.Reverb(customParams.reverbDecay);
        setWet(r);
        if (r.ready) reverbPromises.push(r.ready);
        last.chain(r);
        last = r;
        effectNodes.push(r);
        if (customNodesOut) customNodesOut.current.reverb = r;
      } else if (customNodesOut) customNodesOut.current.reverb = undefined;
      if (customParams.chorusRate != null && customParams.chorusDepth != null) {
        const c = new Tone.Chorus(customParams.chorusRate, 2.5, customParams.chorusDepth);
        setWet(c);
        last.chain(c);
        last = c;
        effectNodes.push(c);
        if (customNodesOut) customNodesOut.current.chorus = c;
      } else if (customNodesOut) customNodesOut.current.chorus = undefined;
      const hasReverbOrChorus = (customParams.reverbDecay != null && customParams.reverbDecay > 0) || (customParams.chorusRate != null && customParams.chorusDepth != null);
      if (hasReverbOrChorus) {
        const boost = new Tone.Gain(2.2);
        last.chain(boost, ...chainEnd);
        effectNodes.push(boost);
      } else {
        last.chain(...chainEnd);
      }
      nodes.push(...effectNodes);
      return;
    }
    const boostQuiet = 2.2;
    switch (profile) {
      case 'demonio': {
        const p = new Tone.PitchShift(-10);
        p.windowSize = 0.08;
        p.pitch = -10;
        setWet(p);
        const d = new Tone.Distortion(0.3);
        setWet(d);
        chain(p, d, ...chainEnd);
        nodes.push(p, d);
        break;
      }
      case 'demonia': {
        const p = new Tone.PitchShift(-4);
        p.windowSize = 0.08;
        p.pitch = -4;
        setWet(p);
        const d = new Tone.Distortion(0.25);
        setWet(d);
        chain(p, d, ...chainEnd);
        nodes.push(p, d);
        break;
      }
        case 'trol': {
          const p = new Tone.PitchShift(-8);
          p.windowSize = 0.08;
          p.pitch = -8;
          setWet(p);
          const d = new Tone.Distortion(0.2);
          setWet(d);
          const r = new Tone.Reverb(2);
          setWet(r);
          if (r.ready) reverbPromises.push(r.ready);
          const boost = new Tone.Gain(boostQuiet);
          chain(p, d, r, boost, ...chainEnd);
          nodes.push(p, d, r, boost);
          break;
        }
        case 'trolesa': {
          const p = new Tone.PitchShift(-3);
          p.windowSize = 0.08;
          p.pitch = -3;
          setWet(p);
          const d = new Tone.Distortion(0.15);
          setWet(d);
          const r = new Tone.Reverb(2);
          setWet(r);
          if (r.ready) reverbPromises.push(r.ready);
          const boost = new Tone.Gain(boostQuiet);
          chain(p, d, r, boost, ...chainEnd);
          nodes.push(p, d, r, boost);
          break;
        }
        case 'goblin': {
          const p = new Tone.PitchShift(10);
          p.windowSize = 0.08;
          p.pitch = 10;
          setWet(p);
          chain(p, ...chainEnd);
          nodes.push(p);
          break;
        }
        case 'gremlin': {
          const p = new Tone.PitchShift(12);
          p.windowSize = 0.08;
          p.pitch = 12;
          setWet(p);
          const c = new Tone.Chorus(4, 2, 0.6);
          setWet(c);
          chain(p, c, ...chainEnd);
          nodes.push(p, c);
          break;
        }
        case 'gremlina': {
          const p = new Tone.PitchShift(14);
          p.windowSize = 0.08;
          p.pitch = 14;
          setWet(p);
          const c = new Tone.Chorus(3.5, 2.3, 0.5);
          setWet(c);
          chain(p, c, ...chainEnd);
          nodes.push(p, c);
          break;
        }
        case 'hadita': {
          const p = new Tone.PitchShift(8);
          p.windowSize = 0.08;
          p.pitch = 8;
          setWet(p);
          const r = new Tone.Reverb(1.5);
          setWet(r);
          if (r.ready) reverbPromises.push(r.ready);
          const c = new Tone.Chorus(3, 2.5, 0.4);
          setWet(c);
          const boost = new Tone.Gain(boostQuiet);
          chain(p, r, c, boost, ...chainEnd);
          nodes.push(p, r, c, boost);
          break;
        }
        case 'hada': {
          const p = new Tone.PitchShift(10);
          p.windowSize = 0.08;
          p.pitch = 10;
          setWet(p);
          const r = new Tone.Reverb(2);
          setWet(r);
          if (r.ready) reverbPromises.push(r.ready);
          const c = new Tone.Chorus(3, 2.5, 0.45);
          setWet(c);
          const boost = new Tone.Gain(boostQuiet);
          chain(p, r, c, boost, ...chainEnd);
          nodes.push(p, r, c, boost);
          break;
        }
        case 'ángel': {
          const p = new Tone.PitchShift(4);
          p.windowSize = 0.08;
          p.pitch = 4;
          setWet(p);
          const r = new Tone.Reverb(2);
          setWet(r);
          if (r.ready) reverbPromises.push(r.ready);
          const boost = new Tone.Gain(boostQuiet);
          chain(p, r, boost, ...chainEnd);
          nodes.push(p, r, boost);
          break;
        }
        case 'ángela': {
          const p = new Tone.PitchShift(6);
          p.windowSize = 0.08;
          p.pitch = 6;
          setWet(p);
          const r = new Tone.Reverb(2);
          setWet(r);
          if (r.ready) reverbPromises.push(r.ready);
          const boost = new Tone.Gain(boostQuiet);
          chain(p, r, boost, ...chainEnd);
          nodes.push(p, r, boost);
          break;
        }
        case 'fantasma': {
          const p = new Tone.PitchShift(-2);
          p.windowSize = 0.08;
          p.pitch = -2;
          setWet(p);
          const c = new Tone.Chorus(4, 2.5, 0.5);
          setWet(c);
          const r = new Tone.Reverb(3);
          setWet(r);
          if (r.ready) reverbPromises.push(r.ready);
          const boost = new Tone.Gain(boostQuiet);
          chain(p, c, r, boost, ...chainEnd);
          nodes.push(p, c, r, boost);
          break;
        }
        case 'espectra': {
          const p = new Tone.PitchShift(1);
          p.windowSize = 0.08;
          p.pitch = 1;
          setWet(p);
          const c = new Tone.Chorus(4, 2.5, 0.45);
          setWet(c);
          const r = new Tone.Reverb(2.5);
          setWet(r);
          if (r.ready) reverbPromises.push(r.ready);
          const boost = new Tone.Gain(boostQuiet);
          chain(p, c, r, boost, ...chainEnd);
          nodes.push(p, c, r, boost);
          break;
        }
        case 'titán': {
          const p = new Tone.PitchShift(-7);
          p.windowSize = 0.08;
          p.pitch = -7;
          setWet(p);
          const r = new Tone.Reverb(1.5);
          setWet(r);
          if (r.ready) reverbPromises.push(r.ready);
          const boost = new Tone.Gain(boostQuiet);
          chain(p, r, boost, ...chainEnd);
          nodes.push(p, r, boost);
          break;
        }
        case 'titánide': {
          const p = new Tone.PitchShift(-2);
          p.windowSize = 0.08;
          p.pitch = -2;
          setWet(p);
          const r = new Tone.Reverb(2);
          setWet(r);
          if (r.ready) reverbPromises.push(r.ready);
          const boost = new Tone.Gain(boostQuiet);
          chain(p, r, boost, ...chainEnd);
          nodes.push(p, r, boost);
          break;
        }
        case 'dios': {
          const p = new Tone.PitchShift(-5);
          p.windowSize = 0.08;
          p.pitch = -5;
          setWet(p);
          const r = new Tone.Reverb(3);
          setWet(r);
          if (r.ready) reverbPromises.push(r.ready);
          const boost = new Tone.Gain(boostQuiet);
          chain(p, r, boost, ...chainEnd);
          nodes.push(p, r, boost);
          break;
        }
        case 'diosa': {
          const p = new Tone.PitchShift(2);
          p.windowSize = 0.08;
          p.pitch = 2;
          setWet(p);
          const r = new Tone.Reverb(3);
          setWet(r);
          if (r.ready) reverbPromises.push(r.ready);
          const boost = new Tone.Gain(boostQuiet);
          chain(p, r, boost, ...chainEnd);
          nodes.push(p, r, boost);
          break;
        }
        case 'duende': {
          const p = new Tone.PitchShift(6);
          p.windowSize = 0.08;
          p.pitch = 6;
          setWet(p);
          const c = new Tone.Chorus(3.5, 2.2, 0.5);
          setWet(c);
          const r = new Tone.Reverb(1.8);
          setWet(r);
          if (r.ready) reverbPromises.push(r.ready);
          const boost = new Tone.Gain(boostQuiet);
          chain(p, c, r, boost, ...chainEnd);
          nodes.push(p, c, r, boost);
          break;
        }
        case 'gnomo': {
          const p = new Tone.PitchShift(-6);
          p.windowSize = 0.08;
          p.pitch = -6;
          setWet(p);
          const r = new Tone.Reverb(2.2);
          setWet(r);
          if (r.ready) reverbPromises.push(r.ready);
          const boost = new Tone.Gain(boostQuiet);
          chain(p, r, boost, ...chainEnd);
          nodes.push(p, r, boost);
          break;
        }
        case 'duenda': {
          const p = new Tone.PitchShift(9);
          p.windowSize = 0.08;
          p.pitch = 9;
          setWet(p);
          const c = new Tone.Chorus(3, 2.5, 0.45);
          setWet(c);
          const r = new Tone.Reverb(2);
          setWet(r);
          if (r.ready) reverbPromises.push(r.ready);
          const boost = new Tone.Gain(boostQuiet);
          chain(p, c, r, boost, ...chainEnd);
          nodes.push(p, c, r, boost);
          break;
        }
        case 'gnoma': {
          const p = new Tone.PitchShift(2);
          p.windowSize = 0.08;
          p.pitch = 2;
          setWet(p);
          const r = new Tone.Reverb(2);
          setWet(r);
          if (r.ready) reverbPromises.push(r.ready);
          const boost = new Tone.Gain(boostQuiet);
          chain(p, r, boost, ...chainEnd);
          nodes.push(p, r, boost);
          break;
        }
      default:
        chain(...chainEnd);
    }
  };

  const handleToggleMic = async () => {
    if (typeof window === 'undefined') return;
    setMicError(null);

    if (isMicActive) {
      try {
        if (voiceChain.current) {
          voiceChain.current.dispose();
        }
      } catch (e) {
        console.error('Desactivar micrófono:', e);
      } finally {
        voiceChain.current = null;
        setIsMicActive(false);
      }
      return;
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMicError('Tu sistema o esta app no permiten acceso al micrófono.');
        return;
      }

      const ToneModule = await import('tone');
      const Tone = (ToneModule as any).default ?? ToneModule;
      await Tone.start();
      toneRef.current = Tone;

      const userMedia = new Tone.UserMedia();
      await userMedia.open();

      const ctx = Tone.getContext();
      const dest = ctx.destination;
      const toneGain = new Tone.Gain(2 + voiceVolume * 6);
      voiceGainRef.current = toneGain;
      const nodes: { disconnect?: () => void; dispose?: () => void }[] = [];
      const reverbPromises: Promise<void>[] = [];

      const customParams = previewVoiceParams
        ? { ...previewVoiceParams, id: '', name: '' }
        : (voiceProfile.startsWith('custom-') ? customVoices.find((v) => v.id === voiceProfile) ?? null : null);
      buildVoiceChain(Tone, userMedia, toneGain, dest, voiceProfile, nodes, reverbPromises, true, noiseGateOn, inputGain, customParams);

      if (reverbPromises.length > 0) await Promise.all(reverbPromises);

      voiceChain.current = {
        userMedia,
        toneGain,
        effectNodes: nodes,
        dispose: () => {
          const c = voiceChain.current;
          if (!c) return;
          voiceChain.current = null;
          voiceGainRef.current = null;
          try {
            c.userMedia.close();
          } catch (_) {}
          try {
            c.toneGain.disconnect?.();
            c.toneGain.dispose?.();
          } catch (_) {}
          c.effectNodes.forEach((n) => {
            try {
              n.disconnect?.();
            } catch (_) {}
            try {
              n.dispose?.();
            } catch (_) {}
          });
        },
      };

      setIsMicActive(true);
    } catch (err: any) {
      console.error('Mic error:', err);
      setIsMicActive(false);
      if (err?.name === 'NotAllowedError' || err?.message?.includes('Permission')) {
        setMicError('Permiso de micrófono denegado. Actívalo en la ventana o en Windows (Configuración > Privacidad > Micrófono).');
      } else if (err?.name === 'NotFoundError') {
        setMicError('No se encontró ningún micrófono.');
      } else {
        setMicError(err?.message || 'No se pudo usar el micrófono. Revisa que esté conectado y permitido.');
      }
    }
  };

  // Solo reconstruir cuando cambie perfil, gate, ganancia, voces guardadas, o entrada/salida de preview (no en cada movimiento de slider)
  const previewShape = previewVoiceParams
    ? `${previewVoiceParams.reverbDecay != null}-${previewVoiceParams.chorusRate != null}-${previewVoiceParams.distortion != null}`
    : 'off';
  useEffect(() => {
    if (!isMicActive || !voiceChain.current || !toneRef.current) return;
    const chain = voiceChain.current;
    const Tone = toneRef.current;
    try {
      chain.userMedia.disconnect?.();
    } catch (_) {}
    chain.effectNodes.forEach((n) => {
      try {
        n.disconnect?.();
      } catch (_) {}
      try {
        n.dispose?.();
      } catch (_) {}
    });
    try {
      chain.toneGain.disconnect?.();
    } catch (_) {}
    customPreviewNodesRef.current = {};
    const nodes: { disconnect?: () => void; dispose?: () => void }[] = [];
    const reverbPromises: Promise<void>[] = [];
    const ctx = Tone.getContext();
    const dest = ctx.destination;
    const customParams = previewVoiceParams
      ? { ...previewVoiceParams, id: '', name: '' }
      : (voiceProfile.startsWith('custom-') ? customVoices.find((v) => v.id === voiceProfile) ?? null : null);
    buildVoiceChain(Tone, chain.userMedia, chain.toneGain, dest, voiceProfile, nodes, reverbPromises, true, noiseGateOn, inputGain, customParams, previewVoiceParams ? customPreviewNodesRef : undefined);
    Promise.all(reverbPromises).then(() => {
      chain.effectNodes = nodes;
    });
  }, [voiceProfile, noiseGateOn, inputGain, customVoices, previewShape]);

  // Actualizar solo los parámetros de los nodos en preview (sin reconstruir la cadena) para evitar microcortes
  useEffect(() => {
    if (!previewVoiceParams || !voiceChain.current) return;
    const ref = customPreviewNodesRef.current;
    try {
      if (ref.pitch != null) ref.pitch.pitch = previewVoiceParams.pitch;
      if (ref.distortion != null && previewVoiceParams.distortion != null) ref.distortion.distortion = Math.min(0.9, previewVoiceParams.distortion);
      if (ref.reverb != null && previewVoiceParams.reverbDecay != null) ref.reverb.decay = previewVoiceParams.reverbDecay;
      if (ref.chorus != null && previewVoiceParams.chorusRate != null && previewVoiceParams.chorusDepth != null) {
        ref.chorus.frequency = previewVoiceParams.chorusRate;
        ref.chorus.depth = previewVoiceParams.chorusDepth;
      }
    } catch (_) {}
  }, [previewVoiceParams]);

  useEffect(() => {
    return () => {
      if (voiceChain.current) {
        voiceChain.current.dispose();
      }
      voiceChain.current = null;
      toneRef.current = null;
      voiceGainRef.current = null;
    };
  }, []);

  const handleAddCustomVoice = (voice: Omit<CustomVoice, 'id'>) => {
    setPreviewVoiceParams(null);
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setCustomVoices((prev) => [...prev, { ...voice, id }]);
    setVoiceProfile(id);
  };

  const handleDeleteCustomVoice = (id: string) => {
    setCustomVoices((prev) => prev.filter((v) => v.id !== id));
    if (voiceProfile === id) setVoiceProfile('normal');
  };

  const handleFowDraw = (action: any) => {
    if (!activeMap) return;
    const mapId = activeMap._id || activeMap.id;
    setActiveMap((prev: any) => {
      if (!prev || (prev._id || prev.id) !== mapId) return prev;
      const updatedFow = [...(prev.fowInfo || []), action];
      fetch(`${getApiBase()}/api/maps/${mapId}/fow`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fowInfo: updatedFow }),
      })
        .then(() => setMaps((curr) => curr.map((m) => ((m._id || m.id) === mapId ? { ...m, fowInfo: updatedFow } : m))))
        .catch((err) => console.error('Error saving FOW:', err));
      if (socket) socket.emit('fow-update', { mapId, action });
      return { ...prev, fowInfo: updatedFow };
    });
  };

  const handleToggleFog = (type: 'fill' | 'clear') => {
    if (!activeMap) return;
    handleFowDraw({ tool: type, id: `${Date.now()}-${Math.random()}` });
  };

  const traps = activeMap?.traps ?? [];

  const handleMapClickForTrap = (normalized: { x: number; y: number }) => {
    if (!activeMap || !placeTrapMode) return;
    const mapId = activeMap._id || activeMap.id;
    const name = placeTrapTemplate ? placeTrapTemplate.name : `Trampa ${traps.length + 1}`;
    const imageUrl = placeTrapTemplate?.imageUrl;
    const newTrap = {
      id: crypto.randomUUID?.() ?? `trap-${Date.now()}-${Math.random()}`,
      x: normalized.x,
      y: normalized.y,
      width: 0.05,
      height: 0.05,
      name,
      activated: false,
      ...(imageUrl ? { imageUrl } : {}),
    };
    const nextTraps = [...traps, newTrap];
    setActiveMap((prev: any) => (prev && (prev._id || prev.id) === mapId ? { ...prev, traps: nextTraps } : prev));
    setMaps((curr) => curr.map((m) => ((m._id || m.id) === mapId ? { ...m, traps: nextTraps } : m)));
    fetch(`${getApiBase()}/api/maps/${mapId}/traps`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ traps: nextTraps }),
    }).catch((err) => console.error('Error saving traps:', err));
    setPlaceTrapMode(false);
    setPlaceTrapTemplate(null);
  };

  const handleToggleTrap = (trapId: string) => {
    if (!activeMap) return;
    const mapId = activeMap._id || activeMap.id;
    const nextTraps = traps.map((t: MapTrap) => (t.id === trapId ? { ...t, activated: !t.activated } : t));
    setActiveMap((prev: any) => (prev && (prev._id || prev.id) === mapId ? { ...prev, traps: nextTraps } : prev));
    setMaps((curr) => curr.map((m) => ((m._id || m.id) === mapId ? { ...m, traps: nextTraps } : m)));
    fetch(`${getApiBase()}/api/maps/${mapId}/traps`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ traps: nextTraps }),
    }).catch((err) => console.error('Error saving traps:', err));
    if (socket) socket.emit('trap-update', { mapId, traps: nextTraps });
  };

  const handleDeleteTrap = (trapId: string) => {
    if (!activeMap) return;
    const mapId = activeMap._id || activeMap.id;
    const nextTraps = traps.filter((t: MapTrap) => t.id !== trapId);
    setActiveMap((prev: any) => (prev && (prev._id || prev.id) === mapId ? { ...prev, traps: nextTraps } : prev));
    setMaps((curr) => curr.map((m) => ((m._id || m.id) === mapId ? { ...m, traps: nextTraps } : m)));
    fetch(`${getApiBase()}/api/maps/${mapId}/traps`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ traps: nextTraps }),
    }).catch((err) => console.error('Error saving traps:', err));
    if (socket) socket.emit('trap-update', { mapId, traps: nextTraps });
  };

  const handleUpdateTrap = (trapId: string, updates: { width?: number; height?: number; imageUrl?: string | null; name?: string }) => {
    if (!activeMap) return;
    const mapId = activeMap._id || activeMap.id;
    const nextTraps = traps.map((t: MapTrap) => {
      if (t.id !== trapId) return t;
      const next = { ...t, ...updates };
      if (Object.prototype.hasOwnProperty.call(updates, 'imageUrl') && updates.imageUrl == null) delete next.imageUrl;
      return next;
    });
    setActiveMap((prev: any) => (prev && (prev._id || prev.id) === mapId ? { ...prev, traps: nextTraps } : prev));
    setMaps((curr) => curr.map((m) => ((m._id || m.id) === mapId ? { ...m, traps: nextTraps } : m)));
    fetch(`${getApiBase()}/api/maps/${mapId}/traps`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ traps: nextTraps }),
    }).catch((err) => console.error('Error saving traps:', err));
    const updated = nextTraps.find((t: MapTrap) => t.id === trapId);
    if (socket && updated) socket.emit('trap-update', { mapId, trap: updated });
  };

  const handleUploadTrapImage = async (file: File): Promise<string> => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${getApiBase()}/api/campaigns/trap-image`, { method: 'POST', body: form });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.message || 'Error subiendo imagen');
    }
    const data = await parseJsonResponse<{ url: string }>(res);
    return data.url;
  };

  const handlePlaceTrapFromTemplate = (template: TrapTemplate) => {
    setPlaceTrapTemplate(template);
    setPlaceTrapMode(true);
    setTrapsModalOpen(false);
  };

  const handleCreateTrapTemplate = async (name: string, imageUrl?: string) => {
    try {
      const res = await fetch(`${getApiBase()}/api/trap-templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), imageUrl: imageUrl || undefined }),
      });
      if (!res.ok) throw new Error('Error al crear plantilla');
      await fetchTrapTemplates();
      setTrapsModalView('list');
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const handleDeleteTrapTemplate = async (id: string) => {
    try {
      await fetch(`${getApiBase()}/api/trap-templates/${id}`, { method: 'DELETE' });
      await fetchTrapTemplates();
      if (placeTrapTemplate && (placeTrapTemplate.id === id || (placeTrapTemplate as any)._id === id)) {
        setPlaceTrapTemplate(null);
        setPlaceTrapMode(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTrapMove = (trapId: string, normalized: { x: number; y: number }) => {
    if (!activeMap) return;
    const mapId = activeMap._id || activeMap.id;
    const nextTraps = traps.map((t: MapTrap) => (t.id === trapId ? { ...t, x: normalized.x, y: normalized.y } : t));
    setActiveMap((prev: any) => (prev && (prev._id || prev.id) === mapId ? { ...prev, traps: nextTraps } : prev));
    setMaps((curr) => curr.map((m) => ((m._id || m.id) === mapId ? { ...m, traps: nextTraps } : m)));
    fetch(`${getApiBase()}/api/maps/${mapId}/traps`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ traps: nextTraps }),
    }).catch((err) => console.error('Error saving traps:', err));
    const updated = nextTraps.find((t: MapTrap) => t.id === trapId);
    if (socket && updated) socket.emit('trap-update', { mapId, trap: updated });
  };

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
        traps={traps}
        trapTemplates={trapTemplates}
        trapsModalOpen={trapsModalOpen}
        onOpenTrapsModal={() => setTrapsModalOpen(true)}
        onCloseTrapsModal={() => { setTrapsModalOpen(false); setTrapsModalView('list'); }}
        trapsModalView={trapsModalView}
        onSetTrapsModalView={setTrapsModalView}
        placeTrapMode={placeTrapMode}
        onSetPlaceTrapMode={setPlaceTrapMode}
        onPlaceTrapFromTemplate={handlePlaceTrapFromTemplate}
        onCreateTrapTemplate={handleCreateTrapTemplate}
        onDeleteTrapTemplate={handleDeleteTrapTemplate}
        onToggleTrap={handleToggleTrap}
        onDeleteTrap={handleDeleteTrap}
        onUpdateTrap={handleUpdateTrap}
        onUploadTrapImage={handleUploadTrapImage}
        onSetTool={setTool}
        selectedTool={tool}
        brushSize={brushSize}
        onSetBrushSize={setBrushSize}
        brushShape={brushShape}
        onSetBrushShape={setBrushShape}
        paintColor={paintColor}
        onSetPaintColor={setPaintColor}
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
        playingSfxIds={playingSfxIds}
        sfxLoopById={sfxLoopById}
        onSetSfxLoop={handleSetSfxLoop}
        volume={volume}
        onSetVolume={setVolume}
        sfxVolume={sfxVolume}
        onSetSfxVolume={setSfxVolume}
        isMicActive={isMicActive}
        onToggleMic={handleToggleMic}
        voiceProfile={voiceProfile}
        onSetVoiceProfile={setVoiceProfile}
        voiceVolume={voiceVolume}
        onSetVoiceVolume={setVoiceVolume}
        noiseGateOn={noiseGateOn}
        onSetNoiseGateOn={setNoiseGateOn}
        inputGain={inputGain}
        onSetInputGain={setInputGain}
        micError={micError}
        defaultVoiceProfiles={DEFAULT_VOICE_PROFILES}
        customVoices={customVoices}
        onAddCustomVoice={handleAddCustomVoice}
        onDeleteCustomVoice={handleDeleteCustomVoice}
        onPreviewVoice={setPreviewVoiceParams}
        notes={notes}
        selectedNoteId={selectedNoteId}
        onSelectNote={setSelectedNoteId}
        onAddNote={handleAddNote}
        onUpdateNote={handleUpdateNote}
        onDeleteNote={handleDeleteNote}
        bestiary={bestiary}
        selectedBeastId={selectedBeastId}
        onSelectBeast={(id) => { setSelectedBeastId(id); setBeastModalOpen(true); }}
        onAddBeast={handleAddBeast}
        onUpdateBeast={handleUpdateBeast}
        onDeleteBeast={handleDeleteBeast}
        onUploadBeastImage={handleUploadBeastImage}
        onRemoveBeastImage={handleRemoveBeastImage}
        onSaveBestiary={handleSaveBestiary}
        showGameClock={showGameClock}
        onToggleGameClock={() => setShowGameClock((v) => !v)}
        gameClockTime={gameClockTime}
        onSetGameClockTime={setGameClockTime}
        gameClockEditOpen={gameClockEditOpen}
        onSetGameClockEditOpen={setGameClockEditOpen}
      />

      <main
        className="absolute top-0 right-0 bottom-0 z-0 transition-all duration-500"
        style={{
          left: activeTab ? 384 : 64,
          width: activeTab ? 'calc(100vw - 384px)' : 'calc(100vw - 64px)',
        }}
      >
        {selectedBeastId && beastModalOpen && (() => {
          const beast = bestiary.find((b) => b.id === selectedBeastId);
          if (!beast) return null;
          const closeModal = () => setBeastModalExiting(true);
          const handleTransitionEnd = (e: React.TransitionEvent) => {
            if (e.propertyName === 'opacity' && beastModalExiting) {
              setSelectedBeastId(null);
              setBeastModalOpen(false);
              setBeastModalExiting(false);
            }
          };
          const overlayVisible = beastModalVisible && !beastModalExiting;
          return (
            <div
              className={`absolute inset-0 z-20 flex items-center justify-start pl-4 pr-6 py-6 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${overlayVisible ? 'opacity-100' : 'opacity-0'}`}
              onClick={(e) => e.target === e.currentTarget && closeModal()}
              onTransitionEnd={handleTransitionEnd}
            >
              <div
                className={`relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-zinc-900/95 shadow-2xl transition-transform duration-200 ease-out scroll-custom ${overlayVisible ? 'translate-x-0' : '-translate-x-8'}`}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="absolute top-3 right-3 z-10 h-8 w-8 rounded-lg bg-white/10 text-zinc-400 hover:bg-white/20 hover:text-white flex items-center justify-center text-lg leading-none"
                  onClick={closeModal}
                  aria-label="Cerrar"
                >
                  ×
                </button>
                <div className="p-6 pt-12">
                  <div className="flex items-start gap-4 mb-5">
                    {beast.imageUrl ? (
                      <img src={mapAssetUrl(beast.imageUrl)} alt={beast.name} className="w-28 h-28 rounded-xl object-cover border border-white/10 shrink-0" />
                    ) : (
                      <div className="w-28 h-28 rounded-xl bg-white/5 border border-white/10 shrink-0 flex items-center justify-center text-zinc-600 text-3xl">?</div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="text-2xl font-bold text-emerald-300 truncate">{beast.name || 'Sin nombre'}</h3>
                      {beast.type && <p className="text-base text-zinc-400 mt-1">{beast.type}</p>}
                    </div>
                  </div>
                  {beast.description && (
                    <div className="mb-5">
                      <h4 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-2">Descripción</h4>
                      <p className="text-base text-zinc-300 whitespace-pre-wrap leading-relaxed">{beast.description}</p>
                    </div>
                  )}
                  {beast.stats && (
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-2">Estadísticas</h4>
                      <p className="text-base text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed">{beast.stats}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
        {activeMap ? (
          <div ref={mapAreaRef} className="relative w-full h-full flex flex-col">
            {showGameClock && (
              <div
                className="absolute z-10 pointer-events-auto cursor-grab active:cursor-grabbing select-none"
                style={{
                  left: `${gameClockPosition.x * 100}%`,
                  top: `${gameClockPosition.y * 100}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                onMouseDown={(e) => {
                  if (!mapAreaRef.current) return;
                  e.preventDefault();
                  gameClockDragRef.current = {
                    active: true,
                    startX: e.clientX,
                    startY: e.clientY,
                    startPos: { ...gameClockPosition },
                  };
                }}
              >
                <div className="font-medieval text-relief-medieval px-5 py-2.5 rounded-lg border-2 border-amber-800/80 bg-amber-950/95 shadow-lg shadow-black/40 text-amber-100 text-2xl tabular-nums tracking-wider min-w-[5rem] text-center">
                  {String(gameClockTime.hours).padStart(2, '0')}:{String(gameClockTime.minutes).padStart(2, '0')}
                </div>
              </div>
            )}
            <MapCanvas
            mapUrl={mapAssetUrl(activeMap.url)}
            fowActions={activeMap.fowInfo || []}
            isGm
            mapType={activeMap.type || 'image'}
            initialView={activeMap.viewState}
            selectedTool={tool}
            brushSize={brushSize}
            brushShape={brushShape}
            paintColor={paintColor}
            onFowDraw={handleFowDraw}
            panMode={panMode}
            centerTrigger={centerTrigger}
            traps={traps}
            placeTrapMode={placeTrapMode}
            onMapClick={handleMapClickForTrap}
            onTrapMove={handleTrapMove}
            onViewChange={(view) => {
              if (socket && activeMapId) socket.emit('map-view-update', { mapId: activeMapId, ...view });
            }}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-4">
            {isLoading ? 'Subiendo...' : 'Selecciona o sube un mapa'}
            <Link to="/" className="text-red-500 hover:underline">
              Volver al inicio
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
