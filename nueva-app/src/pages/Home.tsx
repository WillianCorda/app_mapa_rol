import { Link } from 'react-router-dom';
import { Shield, Users } from 'lucide-react';

export default function Home() {
  return (
    <div className="h-screen w-screen bg-zinc-950 flex flex-col items-center justify-center text-white p-4">
      <div className="max-w-2xl w-full text-center space-y-6">
        <img src="./Hexara.png" alt="Hexara" className="w-72 h-72 sm:w-[26rem] sm:h-[26rem] mx-auto object-contain" />
        <p className="font-medieval text-relief-medieval text-lg sm:text-xl font-semibold">
          Hexara Interactive Rol Map
          <span className="block text-sm mt-1 opacity-90" style={{ textShadow: '0 1px 0 rgba(0,0,0,0.6), 0 2px 4px rgba(0,0,0,0.4)' }}>App de escritorio</span>
        </p>
        <p className="text-lg text-zinc-400">
          Gestión de mapas y niebla de guerra. Selecciona tu rol.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
          <Link
            to="/gm"
            className="block p-6 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-red-500/50 transition-all group"
          >
            <div className="mb-4 w-12 h-12 rounded-full bg-red-900/20 flex items-center justify-center group-hover:bg-red-500/20">
              <Shield className="w-6 h-6 text-red-500" />
            </div>
            <h2 className="text-white font-semibold text-lg">Game Master</h2>
            <p className="text-zinc-500 text-sm mt-1">Controla el mapa, la niebla y la sesión.</p>
          </Link>

          <Link
            to="/player"
            className="block p-6 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-blue-500/50 transition-all group"
          >
            <div className="mb-4 w-12 h-12 rounded-full bg-blue-900/20 flex items-center justify-center group-hover:bg-blue-500/20">
              <Users className="w-6 h-6 text-blue-500" />
            </div>
            <h2 className="text-white font-semibold text-lg">Player</h2>
            <p className="text-zinc-500 text-sm mt-1">Vista de jugador.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
