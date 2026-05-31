import { useNavigate } from 'react-router-dom';

export default function Player() {
  const navigate = useNavigate();

  return (
    <div className="h-screen w-screen bg-zinc-950 flex flex-col items-center justify-center text-white p-4">
      <p className="text-zinc-500 text-lg">Vista de jugador</p>
      <p className="text-zinc-600 text-sm mt-2">Próximamente.</p>
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mt-6 px-5 py-2.5 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg font-medium transition-colors"
      >
        Volver
      </button>
    </div>
  );
}
