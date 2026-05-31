import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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
import { User, Plus, Trash2 } from 'lucide-react';

type UserItem = { id: string; username: string };

export default function Login() {
  const navigate = useNavigate();
  const { login, register, loadUsers, deleteUser } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [entering, setEntering] = useState<string | null>(null);
  const [showNewUser, setShowNewUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [creating, setCreating] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUsers().then(setUsers).finally(() => setLoading(false));
  }, [loadUsers]);

  const handleSelectUser = async (u: UserItem) => {
    setError('');
    setEntering(u.id);
    try {
      await login(u.username);
      navigate('/campaigns');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo entrar');
    } finally {
      setEntering(null);
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    const id = userToDelete.id || (userToDelete as { _id?: string })._id;
    if (!id) return;
    setDeleting(true);
    try {
      await deleteUser(id);
      setUsers((prev) => prev.filter((u) => (u.id || (u as { _id?: string })._id) !== id));
      setUserToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar');
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newUserName.trim();
    if (!name || name.length < 2) {
      setError('Nombre de al menos 2 caracteres.');
      return;
    }
    setError('');
    setCreating(true);
    try {
      await register(name);
      setNewUserName('');
      setShowNewUser(false);
      navigate('/campaigns');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-zinc-950 flex flex-col items-center justify-center text-white p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <img src="./Hexara.png" alt="Hexara" className="w-24 h-24 mx-auto object-contain mb-4" />
          <h1 className="font-medieval text-relief-medieval text-xl">Elige usuario</h1>
          <p className="text-zinc-500 text-sm mt-1">Toca un usuario para entrar</p>
        </div>

        {loading ? (
          <p className="text-zinc-500 text-center py-8">Cargando...</p>
        ) : (
          <>
            <ul className="space-y-2 max-h-[18rem] overflow-y-auto scroll-custom">
              {users.map((u) => (
                <li key={u.id || u.username} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleSelectUser(u)}
                    disabled={entering !== null}
                    className="flex-1 flex items-center gap-3 p-4 rounded-xl border border-zinc-700 bg-zinc-900/50 text-left text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800/50 hover:text-white transition-colors disabled:opacity-50"
                  >
                    <User className="h-5 w-5 text-zinc-500 shrink-0" />
                    <span className="font-medium truncate">{u.username}</span>
                    {entering === u.id ? <span className="ml-auto text-zinc-500 text-sm">...</span> : null}
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-zinc-500 hover:text-red-400 hover:bg-red-950/50"
                    onClick={(e) => {
                      e.stopPropagation();
                      setUserToDelete(u);
                    }}
                    title="Eliminar usuario"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>

            <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
                  <AlertDialogDescription>
                    ¿Está seguro que desea eliminar a &quot;{userToDelete?.username}&quot;? Se borrarán también todas sus partidas, mapas y sonidos. Esta acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleConfirmDeleteUser} disabled={deleting} className="bg-red-600 hover:bg-red-700">
                    {deleting ? 'Eliminando...' : 'Eliminar'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {showNewUser ? (
              <form onSubmit={handleCreateUser} className="space-y-2 p-4 rounded-xl border border-zinc-700 bg-zinc-900/50">
                <label className="block text-zinc-400 text-sm">Nuevo usuario</label>
                <Input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Nombre"
                  className="bg-zinc-800 border-zinc-700 text-white"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700" disabled={creating}>
                    {creating ? '...' : 'Crear y entrar'}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => { setShowNewUser(false); setError(''); }}>
                    Cancelar
                  </Button>
                </div>
              </form>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                onClick={() => setShowNewUser(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuevo usuario
              </Button>
            )}

            {error ? <p className="text-red-400 text-sm text-center">{error}</p> : null}
          </>
        )}

        <p className="text-center">
          <Link to="/" className="text-zinc-500 hover:text-white text-sm">
            Volver al inicio
          </Link>
        </p>
      </div>
    </div>
  );
}
