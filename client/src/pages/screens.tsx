// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Trash2 } from 'lucide-react';
import { AlertModal } from '@/components/alerts/alert-modal';

const fetchScreens = async () => {
  const response = await fetch('/api/screens');
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

const pairScreen = async ({ code, name }) => {
  const response = await fetch('/api/player/pair', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, name }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to pair screen');
  }
  return response.json();
};

const deleteScreen = async (id: string) => {
    const response = await fetch(`/api/screens/${id}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        throw new Error('Failed to delete screen');
    }
    return response.json();
};


export function Screens() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [pairingCode, setPairingCode] = useState('');
  const [screenName, setScreenName] = useState('');
  const [isPairingDialogOpen, setPairingDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedScreenId, setSelectedScreenId] = useState<string | null>(null);


  const { data: screens, isLoading, error } = useQuery({
    queryKey: ['screens'],
    queryFn: fetchScreens,
    // --- NUEVO: Actualización automática cada 5 segundos ---
    refetchInterval: 5000, 
  });

  const pairMutation = useMutation({
    mutationFn: pairScreen,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screens'] });
      setPairingDialogOpen(false);
      setPairingCode('');
      setScreenName('');
      toast({
        title: 'Éxito',
        description: 'Pantalla vinculada correctamente.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `No se pudo vincular la pantalla: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteScreen,
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['screens'] });
        toast({
            title: 'Éxito',
            description: 'Pantalla eliminada correctamente.',
        });
    },
    onError: (error: Error) => {
        toast({
            title: 'Error',
            description: `No se pudo eliminar la pantalla: ${error.message}`,
            variant: 'destructive',
        });
    },
    onSettled: () => {
        setIsAlertOpen(false);
        setSelectedScreenId(null);
    }
  });


  const handlePairSubmit = (e) => {
    e.preventDefault();
    if (pairingCode && screenName) {
      pairMutation.mutate({ code: pairingCode, name: screenName });
    }
  };

  const openDeleteConfirm = (screenId: string) => {
    setSelectedScreenId(screenId);
    setIsAlertOpen(true);
  };

  const confirmDelete = () => {
    if(selectedScreenId) {
        deleteMutation.mutate(selectedScreenId);
    }
  };


  const getStatusBadge = (status) => {
    switch (status) {
      case 'online':
        return <Badge className="bg-green-500">En línea</Badge>;
      case 'offline':
        return <Badge variant="destructive">Fuera de línea</Badge>;
      case 'paired':
         return <Badge className="bg-blue-500">Vinculada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) return <div>Cargando pantallas...</div>;
  if (error) return <div>Error al cargar las pantallas: {error.message}</div>;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Pantallas</h1>
        <Dialog open={isPairingDialogOpen} onOpenChange={setPairingDialogOpen}>
          <DialogTrigger asChild>
            <Button>Vincular Nueva Pantalla</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Vincular Nueva Pantalla</DialogTitle>
            </DialogHeader>
            <form onSubmit={handlePairSubmit}>
              <div className="grid gap-4 py-4">
                <Input
                  placeholder="Nombre de la pantalla"
                  value={screenName}
                  onChange={(e) => setScreenName(e.target.value)}
                />
                <Input
                  placeholder="Código de Vinculación"
                  value={pairingCode}
                  onChange={(e) => setPairingCode(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={pairMutation.isLoading}>
                {pairMutation.isLoading ? 'Vinculando...' : 'Vincular'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>ID</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {screens?.map((screen) => (
            <TableRow key={screen.id}>
              <TableCell>{screen.name || 'N/A'}</TableCell>
              <TableCell>{getStatusBadge(screen.status)}</TableCell>
              <TableCell className="font-mono">{screen.id}</TableCell>
              <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => openDeleteConfirm(screen.id)}>
                      <Trash2 className="h-4 w-4" />
                  </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
       <AlertModal
          isOpen={isAlertOpen}
          onClose={() => setIsAlertOpen(false)}
          onConfirm={confirmDelete}
          loading={deleteMutation.isLoading}
        />
    </div>
  );
}