import { useEffect, useState, useRef } from 'react';
import MapCanvas from '@/components/MapCanvas';
import { useSocket } from '@/hooks/useSocket';
import { getApiBase, mapAssetUrl, parseJsonResponse } from '@/lib/api';
import { Mic } from 'lucide-react';

const defaultView = {
  scale: 1,
  position: { x: 0, y: 0 },
  containerWidth: undefined as number | undefined,
  containerHeight: undefined as number | undefined,
};

export default function ProyeccionPage() {
  const { socket, isConnected } = useSocket();
  const [activeMap, setActiveMap] = useState<any>(null);
  const [viewState, setViewState] = useState(defaultView);
  const [isLoading, setIsLoading] = useState(true);
  const voiceContext = useRef<AudioContext | null>(null);
  const [isGmSpeaking, setIsGmSpeaking] = useState(false);
  const speakerTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showGameClock, setShowGameClock] = useState(false);
  const [gameClockTime, setGameClockTime] = useState({ hours: 12, minutes: 0 });
  const [gameClockPosition, setGameClockPosition] = useState({ x: 0.5, y: 0.08 });

  const fetchActiveMap = async (noCache = false) => {
    setIsLoading(true);
    try {
      const url = noCache ? `${getApiBase()}/api/maps/active?_=${Date.now()}` : `${getApiBase()}/api/maps/active`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await parseJsonResponse<{ viewState?: unknown }>(res) as any;
        setActiveMap(data);
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
      socket.emit('game-clock-request');
      socket.on('game-clock-state', (data: { visible?: boolean; hours?: number; minutes?: number; position?: { x: number; y: number } }) => {
        if (data && typeof data.visible === 'boolean') setShowGameClock(data.visible);
        if (data && typeof data.hours === 'number') setGameClockTime((t) => ({ ...t, hours: data.hours! }));
        if (data && typeof data.minutes === 'number') setGameClockTime((t) => ({ ...t, minutes: data.minutes! }));
        if (data?.position && typeof data.position.x === 'number' && typeof data.position.y === 'number') setGameClockPosition({ x: data.position.x, y: data.position.y });
      });
      socket.on('game-clock-update', (data: { visible?: boolean; hours?: number; minutes?: number; position?: { x: number; y: number } }) => {
        if (data && typeof data.visible === 'boolean') setShowGameClock(data.visible);
        if (data && typeof data.hours === 'number') setGameClockTime((t) => ({ ...t, hours: data.hours! }));
        if (data && typeof data.minutes === 'number') setGameClockTime((t) => ({ ...t, minutes: data.minutes! }));
        if (data?.position && typeof data.position.x === 'number' && typeof data.position.y === 'number') setGameClockPosition({ x: data.position.x, y: data.position.y });
      });
      socket.on('map-change', (payload: { mapId?: string; activeMap?: any } | undefined) => {
        if (payload && payload.activeMap) {
          setActiveMap(payload.activeMap);
          setViewState(payload.activeMap.viewState || defaultView);
        } else {
          fetchActiveMap(true);
        }
      });
      socket.on('map-view-update', (data: any) => {
        setViewState((v) => ({
          scale: data.scale ?? v.scale,
          position: data.position ?? v.position,
          containerWidth: data.containerWidth ?? v.containerWidth,
          containerHeight: data.containerHeight ?? v.containerHeight,
        }));
      });
      socket.on('fow-update', ({ mapId, action }: { mapId: string; action: any }) => {
        setActiveMap((prev: any) => {
          if (prev && (prev._id === mapId || prev.id === mapId)) {
            if (prev.fowInfo?.some((a: any) => a.id === action.id)) return prev;
            return { ...prev, fowInfo: [...(prev.fowInfo || []), action] };
          }
          return prev;
        });
      });
      socket.on('trap-update', ({ mapId, trap, traps: trapsList }: { mapId: string; trap?: any; traps?: any[] }) => {
        setActiveMap((prev: any) => {
          if (!prev || (prev._id !== mapId && prev.id !== mapId)) return prev;
          const current = prev.traps || [];
          if (trapsList != null) return { ...prev, traps: trapsList };
          if (trap) {
            const next = current.some((t: any) => t.id === trap.id)
              ? current.map((t: any) => (t.id === trap.id ? trap : t))
              : [...current, trap];
            return { ...prev, traps: next };
          }
          return prev;
        });
      });
      socket.on('voice-data', async (data: ArrayBuffer) => {
        try {
          if (!voiceContext.current) {
            voiceContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          }
          const buffer = await voiceContext.current.decodeAudioData(data);
          const source = voiceContext.current.createBufferSource();
          source.buffer = buffer;
          source.connect(voiceContext.current.destination);
          source.start();
          setIsGmSpeaking(true);
          if (speakerTimeout.current) clearTimeout(speakerTimeout.current);
          speakerTimeout.current = setTimeout(() => setIsGmSpeaking(false), 2000);
        } catch (e) {
          console.error('Voice decode error:', e);
        }
      });
      socket.on('voice-start', () => setIsGmSpeaking(true));
      socket.on('voice-stop', () => setIsGmSpeaking(false));
    }

    return () => {
      if (socket) {
        socket.off('game-clock-state');
        socket.off('game-clock-update');
        socket.off('map-change');
        socket.off('fow-update');
        socket.off('trap-update');
        socket.off('map-view-update');
        socket.off('voice-data');
        socket.off('voice-start');
        socket.off('voice-stop');
      }
    };
  }, [socket]);

  if (isLoading && !activeMap) {
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center gap-8 text-white font-black uppercase tracking-[0.3em] animate-pulse">
        <img src="./Hexara.png" alt="Hexara" className="w-[26rem] h-[26rem] object-contain opacity-90" />
        Cargando proyección...
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-black overflow-hidden flex items-center justify-center relative">
      {activeMap ? (
        <>
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
          traps={(activeMap.traps || []).filter((t: any) => t.activated)}
          mirrorMap={!!activeMap.mirrorForProjection}
        />
        {showGameClock && (
          <div
            className="absolute z-10 pointer-events-none select-none"
            style={{
              left: `${gameClockPosition.x * 100}%`,
              top: `${gameClockPosition.y * 100}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className="font-medieval text-relief-medieval px-5 py-2.5 rounded-lg border-2 border-amber-800/80 bg-amber-950/95 shadow-lg shadow-black/40 text-amber-100 text-2xl tabular-nums tracking-wider min-w-[5rem] text-center">
              {String(gameClockTime.hours).padStart(2, '0')}:{String(gameClockTime.minutes).padStart(2, '0')}
            </div>
          </div>
        )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center gap-8">
          <img src="./Hexara.png" alt="Hexara" className="w-[26rem] h-[26rem] object-contain opacity-90" />
          <span className="text-zinc-700 font-black uppercase tracking-[0.4em] animate-pulse">
            Esperando al GM...
          </span>
        </div>
      )}

      {isGmSpeaking && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] animate-pulse">
          <div className="bg-red-600/20 backdrop-blur-xl border border-red-500/30 px-6 py-2.5 rounded-full flex items-center gap-4 shadow-lg">
            <Mic className="h-4 w-4 text-red-500" />
            <span className="text-[11px] font-black text-white uppercase tracking-wider">GM Hablando</span>
          </div>
        </div>
      )}

      <div className="fixed bottom-6 right-6 flex items-center gap-3 px-4 py-2 bg-zinc-950/90 backdrop-blur-md rounded-2xl border border-white/5 pointer-events-none z-[100] shadow-xl">
        <div
          className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}
        />
        <span className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold">
          {isConnected ? 'En Sincronía' : 'Error de Conexión'}
        </span>
      </div>
    </div>
  );
}
