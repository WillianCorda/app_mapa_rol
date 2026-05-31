import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getApiBase, parseJsonResponse } from '@/lib/api';
import { Button } from '@/components/ui/button';
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
import { Plus, BookOpen, LogOut, Trash2, Download, Upload } from 'lucide-react';

type Campaign = { id?: string; _id?: string; name: string; gmUserId: string; createdAt: string };
const campaignId = (c: Campaign) => c.id ?? c._id ?? '';

export default function Campaigns() {
  const navigate = useNavigate();
  const { user, campaign, logout, setCampaign, createCampaign, loadCampaigns, deleteCampaign } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCampaigns().then((list) => setCampaigns(list as Campaign[])).finally(() => setLoading(false));
  }, [loadCampaigns]);

  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [loading, user, navigate]);

  const handleSelect = async (c: Campaign) => {
    await setCampaign(c as { id: string; name: string; gmUserId: string; createdAt: string });
    navigate('/gm');
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const c = await createCampaign(newName || 'Nueva partida');
      setCampaigns((prev) => [c as Campaign, ...prev]);
      setNewName('');
      navigate('/gm');
    } catch (_) {}
    finally {
      setCreating(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleConfirmDelete = async () => {
    if (!campaignToDelete) return;
    const id = campaignId(campaignToDelete);
    if (!id) return;
    setDeleting(true);
    try {
      await deleteCampaign(id);
      setCampaigns((prev) => prev.filter((c) => campaignId(c) !== id));
      setCampaignToDelete(null);
    } catch (_) {}
    finally {
      setDeleting(false);
    }
  };

  const handleExport = async (c: Campaign) => {
    const id = campaignId(c);
    if (!id) return;
    setExportingId(id);
    try {
      const res = await fetch(`${getApiBase()}/api/campaigns/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert((err as { message?: string }).message || 'No se pudo exportar. Prueba a actualizar la lista de partidas.');
        return;
      }
      const blob = await res.blob();
      const disp = res.headers.get('Content-Disposition');
      const match = disp && disp.match(/filename="?([^"]+)"?/);
      const filename = match ? match[1] : `partida-${(c.name || 'exportada').replace(/[^a-zA-Z0-9-_]/g, '_')}.hexara`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportingId(null);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${getApiBase()}/api/campaigns/import`, { method: 'POST', body: form });
      const data = (await parseJsonResponse<Campaign & { message?: string }>(res).catch(() => ({}))) as Campaign & { message?: string };
      if (!res.ok) throw new Error(data.message || 'Error al importar');
      const newCampaign = data as Campaign;
      setCampaigns((prev) => [newCampaign, ...prev]);
      await setCampaign(newCampaign as { id: string; name: string; gmUserId: string; createdAt: string });
      navigate('/gm');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al importar la partida.');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  if (!user) return null;

  return (
    <div className="h-screen w-screen bg-zinc-950 flex flex-col items-center justify-center text-white p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-zinc-500 text-sm">Conectado como</p>
            <p className="font-medieval text-relief-medieval text-lg">{user.username}</p>
          </div>
          <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-1" /> Salir
          </Button>
        </div>
        <h1 className="font-medieval text-relief-medieval text-xl text-center">Mis partidas</h1>
        <p className="text-zinc-500 text-sm text-center">Elige una partida o crea una nueva. Mapas, sonidos y configuración son por partida.</p>

        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nombre de la partida"
              className="bg-zinc-900 border-zinc-700 text-white flex-1"
            />
            <Button onClick={handleCreate} disabled={creating} className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-1" /> Nueva partida
            </Button>
          </div>
        </div>

        {loading ? (
          <p className="text-zinc-500 text-center">Cargando...</p>
        ) : campaigns.length === 0 ? (
          <p className="text-zinc-500 text-center py-8">Aún no tienes partidas. Crea una arriba para empezar.</p>
        ) : (
          <ul className="space-y-2 max-h-[16rem] overflow-y-auto scroll-custom">
            {campaigns.map((c) => (
              <li key={campaignId(c)} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleSelect(c)}
                  className={`flex-1 flex items-center gap-3 p-4 rounded-xl border text-left transition-colors ${
                    campaign && campaignId(campaign) === campaignId(c)
                      ? 'bg-red-900/20 border-red-500/50 text-white'
                      : 'bg-zinc-900/50 border-zinc-700 hover:border-zinc-600 text-zinc-200'
                  }`}
                >
                  <BookOpen className="h-5 w-5 text-zinc-500 shrink-0" />
                  <span className="font-medium truncate">{c.name}</span>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-zinc-500 hover:text-amber-400 hover:bg-amber-950/30"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExport(c);
                  }}
                  disabled={exportingId === campaignId(c)}
                  title="Exportar partida (.hexara)"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-zinc-500 hover:text-red-400 hover:bg-red-950/50"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCampaignToDelete(c);
                  }}
                  title="Borrar partida"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800">
          <p className="text-zinc-500 text-sm">Importar partida desde otro PC</p>
          <input
            ref={importInputRef}
            type="file"
            accept=".hexara"
            className="hidden"
            onChange={handleImport}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            disabled={importing}
            onClick={() => importInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            {importing ? 'Importando...' : 'Seleccionar archivo .hexara'}
          </Button>
        </div>

        <AlertDialog open={!!campaignToDelete} onOpenChange={(open) => !open && setCampaignToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar partida?</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Está seguro que desea eliminar la partida &quot;{campaignToDelete?.name}&quot;? Se borrarán todos los mapas, sonidos y datos de esta partida. Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setCampaignToDelete(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700">
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <p className="text-center">
          <Link to="/" className="text-zinc-500 hover:text-white text-sm">Volver al inicio</Link>
        </p>
      </div>
    </div>
  );
}
