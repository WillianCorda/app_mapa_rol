import { useState, useEffect } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Campaigns from './pages/Campaigns';
import GM from './pages/GM';
import Player from './pages/Player';
import Proyeccion from './pages/Proyeccion';

function RequireGM({ children }: { children: React.ReactNode }) {
  const { user, campaign, loading } = useAuth();
  if (loading) return <div className="h-screen w-screen bg-zinc-950 flex items-center justify-center text-zinc-500">Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!campaign) return <Navigate to="/campaigns" replace />;
  return <>{children}</>;
}

function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return (
    <div key={location.pathname} className="animate-route-in min-h-screen w-full">
      {children}
    </div>
  );
}

const SPLASH_DURATION_MS = 2800;
const SPLASH_FADE_MS = 350;

export default function App() {
  const [splashVisible, setSplashVisible] = useState(true);
  const [splashExiting, setSplashExiting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSplashExiting(true), SPLASH_DURATION_MS);
    return () => clearTimeout(t);
  }, []);

  const handleSplashTransitionEnd = (e: React.TransitionEvent) => {
    if (e.propertyName === 'opacity' && splashExiting) setSplashVisible(false);
  };

  return (
    <>
      {splashVisible && (
        <div
          className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-8 bg-zinc-950 transition-opacity duration-500 ${splashExiting ? 'opacity-0' : 'opacity-100'
            }`}
          style={{ transitionDuration: `${SPLASH_FADE_MS}ms` }}
          onTransitionEnd={handleSplashTransitionEnd}
        >
          <div className="w-[26rem] h-[26rem] overflow-hidden flex items-center justify-center animate-splash-logo">
            <img
              src="./Hexara.png"
              alt="Hexara"
              className="max-w-[110%] max-h-[110%] w-auto h-auto object-contain block"
            />
          </div>
          <p className="text-zinc-200 text-xl font-semibold tracking-wide text-center px-4 animate-splash-logo" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
            Bienvenido a Hexara, disfruta tu partida
          </p>
          <p className="text-zinc-500 text-sm tracking-widest text-center animate-splash-logo" style={{ animationDelay: '0.35s', animationFillMode: 'both' }}>
            By Willian Corda
          </p>
        </div>
      )}
      <Routes>
        <Route path="/" element={<PageTransition><Home /></PageTransition>} />
        <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
        <Route path="/campaigns" element={<PageTransition><Campaigns /></PageTransition>} />
        <Route path="/gm" element={<PageTransition><RequireGM><GM /></RequireGM></PageTransition>} />
        <Route path="/player" element={<PageTransition><Player /></PageTransition>} />
        <Route path="/proyeccion" element={<PageTransition><Proyeccion /></PageTransition>} />
      </Routes>
    </>
  );
}
