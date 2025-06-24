import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Calendar, Clock, Monitor, PlayCircle, Edit, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Schedule, Playlist, Screen } from "@shared/schema";
import Header from "@/components/layout/header";

const scheduleFormSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  playlistId: z.number().optional(),
  screenIds: z.array(z.number()).min(1, "Selecciona al menos una pantalla"),
  startDate: z.string().min(1, "La fecha de inicio es requerida"),
  endDate: z.string().optional(),
  startTime: z.string().min(1, "La hora de inicio es requerida"),
  endTime: z.string().min(1, "La hora de fin es requerida"),
  daysOfWeek: z.array(z.number()).min(1, "Selecciona al menos un día"),
  priority: z.number().min(1).max(4).default(1),
  isActive: z.boolean().default(true),
});

type ScheduleFormData = z.infer<typeof scheduleFormSchema>;

const daysOfWeek = [
  { value: 0, label: "Domingo", short: "Dom" },
  { value: 1, label: "Lunes", short: "Lun" },
  { value: 2, label: "Martes", short: "Mar" },
  { value: 3, label: "Miércoles", short: "Mié" },
  { value: 4, label: "Jueves", short: "Jue" },
  { value: 5, label: "Viernes", short: "Vie" },
  { value: 6, label: "Sábado", short: "Sáb" },
];

const timeSlots = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return `${hour}:00`;
});

// Componente del calendario de programación
const ScheduleCalendar = ({ schedules, playlists, screens }: {
  schedules: Schedule[];
  playlists: Playlist[];
  screens: Screen[];
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Calcular días de la semana actual
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    return day;
  });

  // Obtener programaciones para un día y hora específicos
  const getSchedulesForSlot = (dayOfWeek: number, timeSlot: string) => {
    return schedules.filter(schedule => {
      if (!schedule.isActive) return false;
      if (!schedule.daysOfWeek?.includes(dayOfWeek)) return false;

      const scheduleStart = schedule.startTime;
      const scheduleEnd = schedule.endTime;

      return timeSlot >= scheduleStart && timeSlot < scheduleEnd;
    });
  };

  const getPlaylistName = (playlistId: number) => {
    return playlists.find(p => p.id === playlistId)?.name || "Sin playlist";
  };

  const getScreenNames = (screenIds: number[]) => {
    return screenIds.map(id => 
      screens.find(s => s.id === id)?.name || "Pantalla eliminada"
    ).join(", ");
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentDate(newDate);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Calendario de Programación
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium min-w-[200px] text-center">
              {startOfWeek.toLocaleDateString('es-ES', { 
                day: 'numeric', 
                month: 'long' 
              })} - {weekDays[6].toLocaleDateString('es-ES', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}
            </span>
            <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Header con días de la semana */}
            <div className="grid grid-cols-8 gap-1 mb-2">
              <div className="p-2 text-xs font-medium text-gray-500">Hora</div>
              {weekDays.map((day, index) => (
                <div key={index} className="p-2 text-center">
                  <div className="text-xs font-medium text-gray-700">
                    {daysOfWeek[day.getDay()].short}
                  </div>
                  <div className="text-sm font-bold">
                    {day.getDate()}
                  </div>
                </div>
              ))}
            </div>

            {/* Grid de horas y programaciones */}
            <div className="space-y-1">
              {timeSlots.map((timeSlot) => (
                <div key={timeSlot} className="grid grid-cols-8 gap-1">
                  <div className="p-2 text-xs font-medium text-gray-500 border-r">
                    {timeSlot}
                  </div>
                  {weekDays.map((day, dayIndex) => {
                    const dayOfWeek = day.getDay();
                    const schedulesInSlot = getSchedulesForSlot(dayOfWeek, timeSlot);

                    return (
                      <div 
                        key={dayIndex} 
                        className={`p-1 min-h-[40px] border border-gray-200 rounded cursor-pointer hover:bg-gray-50 ${
                          selectedTimeSlot === timeSlot && selectedDay === dayOfWeek 
                            ? 'bg-blue-100 border-blue-300' 
                            : ''
                        }`}
                        onClick={() => {
                          setSelectedTimeSlot(timeSlot);
                          setSelectedDay(dayOfWeek);
                        }}
                      >
                        {schedulesInSlot.map((schedule) => (
                          <div 
                            key={schedule.id} 
                            className="mb-1 p-1 bg-blue-500 text-white text-xs rounded truncate"
                            title={`${schedule.name} - ${getPlaylistName(schedule.playlistId!)} - ${getScreenNames(schedule.screenIds!)}`}
                          >
                            <div className="font-medium truncate">{schedule.name}</div>
                            <div className="text-xs opacity-75 truncate">
                              {getPlaylistName(schedule.playlistId!)}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Panel de detalles */}
        {selectedTimeSlot && selectedDay !== null && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2">
              {daysOfWeek[selectedDay].label} - {selectedTimeSlot}
            </h4>
            {(() => {
              const schedulesInSlot = getSchedulesForSlot(selectedDay, selectedTimeSlot);
              if (schedulesInSlot.length === 0) {
                return (
                  <p className="text-sm text-gray-500">
                    No hay programaciones para este horario
                  </p>
                );
              }
              return (
                <div className="space-y-2">
                  {schedulesInSlot.map((schedule) => (
                    <div key={schedule.id} className="p-3 bg-white rounded border">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{schedule.name}</div>
                          <div className="text-sm text-gray-600">
                            Playlist: {getPlaylistName(schedule.playlistId!)}
                          </div>
                          <div className="text-sm text-gray-600">
                            Pantallas: {getScreenNames(schedule.screenIds!)}
                          </div>
                          <div className="text-sm text-gray-600">
                            Horario: {schedule.startTime} - {schedule.endTime}
                          </div>
                        </div>
                        <Badge variant={schedule.isActive ? "default" : "secondary"}>
                          {schedule.isActive ? "Activa" : "Inactiva"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default function Scheduling() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
  const { toast } = useToast();

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["/api/schedules"],
    queryFn: () => apiRequest("/api/schedules").then(res => res.json()),
    retry: 1,
  });

  const { data: playlists = [] } = useQuery({
    queryKey: ["/api/playlists"],
    queryFn: () => apiRequest("/api/playlists").then(res => res.json()),
    retry: 1,
  });

  const { data: screens = [] } = useQuery({
    queryKey: ["/api/screens"],
    queryFn: () => apiRequest("/api/screens").then(res => res.json()),
    retry: 1,
  });

  const form = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      name: "",
      playlistId: undefined,
      screenIds: [],
      startDate: new Date().toISOString().split('T')[0],
      endDate: "",
      startTime: "09:00",
      endTime: "17:00",
      daysOfWeek: [],
      priority: 1,
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ScheduleFormData) => {
      const payload = {
        ...data,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
      };
      await apiRequest("/api/schedules", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      setIsCreateOpen(false);
      form.reset();
      toast({
        title: "Programación creada",
        description: "La programación se ha creado exitosamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/schedules/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      toast({
        title: "Programación eliminada",
        description: "La programación se ha eliminado exitosamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      await apiRequest(`/api/schedules/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ScheduleFormData) => {
    createMutation.mutate({
      ...data,
      startDate: data.startDate,
      endDate: data.endDate || undefined,
    });
  };

  const formatDays = (days: number[] | null) => {
    if (!days) return "Sin días";
    return days.map(d => daysOfWeek.find(day => day.value === d)?.label).join(", ");
  };

  const getPlaylistName = (playlistId: number) => {
    return playlists.find(p => p.id === playlistId)?.name || "Playlist eliminada";
  };

  const getScreenNames = (screenIds: number[] | null) => {
    if (!screenIds) return "Sin pantallas";
    return screenIds.map(id => 
      screens.find(s => s.id === id)?.name || "Pantalla eliminada"
    ).join(", ");
  };

  return (
    <div className="space-y-6">
      <Header
        title="Sistema de Programación"
        subtitle="Gestiona horarios y calendarios para contenido automático"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border">
              <Button
                variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('calendar')}
                className="rounded-r-none"
              >
                <Calendar className="w-4 h-4 mr-1" />
                Calendario
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <Monitor className="w-4 h-4 mr-1" />
                Lista
              </Button>
            </div>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Programación
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-3 bg-slate-200 rounded"></div>
                  <div className="h-3 bg-slate-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : viewMode === 'calendar' ? (
        <ScheduleCalendar 
          schedules={schedules} 
          playlists={playlists} 
          screens={screens} 
        />
      ) : schedules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="w-12 h-12 text-slate-400 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              No hay programaciones configuradas
            </h3>
            <p className="text-slate-500 text-center mb-4">
              Crea tu primera programación para automatizar la reproducción de contenido
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Crear Programación
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {schedules.map((schedule) => (
            <Card key={schedule.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{schedule.name}</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Badge variant={schedule.isActive ? "default" : "secondary"}>
                      {schedule.isActive ? "Activa" : "Inactiva"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleMutation.mutate({
                        id: schedule.id,
                        isActive: !schedule.isActive
                      })}
                    >
                      {schedule.isActive ? "Pausar" : "Activar"}
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  Prioridad: {schedule.priority}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <PlayCircle className="w-4 h-4 text-blue-500" />
                  <span className="text-sm">{getPlaylistName(schedule.playlistId!)}</span>
                </div>

                <div className="flex items-center space-x-2">
                  <Monitor className="w-4 h-4 text-green-500" />
                  <span className="text-sm">{getScreenNames(schedule.screenIds)}</span>
                </div>

                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-purple-500" />
                  <span className="text-sm">
                    {schedule.startTime} - {schedule.endTime}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-orange-500" />
                  <span className="text-sm">{formatDays(schedule.daysOfWeek)}</span>
                </div>

                <div className="pt-2 border-t">
                  <div className="text-xs text-slate-500">
                    {new Date(schedule.startDate).toLocaleDateString()} 
                    {schedule.endDate && ` - ${new Date(schedule.endDate).toLocaleDateString()}`}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteMutation.mutate(schedule.id)}
                    disabled={deleteMutation.isPending}
                  >
                    Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Programación</DialogTitle>
            <DialogDescription>
              Configura horarios automáticos para reproducir contenido en tus pantallas
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto px-1">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Programación matutina" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="playlistId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Playlist</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona una playlist" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {playlists.map((playlist) => (
                          <SelectItem key={playlist.id} value={playlist.id.toString()}>
                            {playlist.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="screenIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pantallas</FormLabel>
                    <div className="grid grid-cols-2 gap-2">
                      {screens.map((screen) => (
                        <div key={screen.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`screen-${screen.id}`}
                            checked={field.value.includes(screen.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                field.onChange([...field.value, screen.id]);
                              } else {
                                field.onChange(field.value.filter(id => id !== screen.id));
                              }
                            }}
                          />
                          <label
                            htmlFor={`screen-${screen.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {screen.name}
                          </label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de inicio</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de fin (opcional)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora de inicio</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora de fin</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="daysOfWeek"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Días de la semana</FormLabel>
                    <div className="grid grid-cols-4 gap-2">
                      {daysOfWeek.map((day) => (
                        <div key={day.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`day-${day.value}`}
                            checked={field.value.includes(day.value)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                field.onChange([...field.value, day.value]);
                              } else {
                                field.onChange(field.value.filter(d => d !== day.value));
                              }
                            }}
                          />
                          <label
                            htmlFor={`day-${day.value}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {day.label}
                          </label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridad</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona prioridad" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">1 - Baja</SelectItem>
                        <SelectItem value="2">2 - Media</SelectItem>
                        <SelectItem value="3">3 - Alta</SelectItem>
                        <SelectItem value="4">4 - Crítica</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creando..." : "Crear Programación"}
                </Button>
              </div>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}