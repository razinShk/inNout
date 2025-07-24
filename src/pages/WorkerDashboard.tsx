import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Worker, TimeEntry } from '@/types';
import { Clock, Play, Square, LogOut, Calendar, Timer, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export const WorkerDashboard = () => {
  const { logout, projectId, workerId } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [worker, setWorker] = useState<Worker | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClocking, setIsClocking] = useState(false);
  const [workDescription, setWorkDescription] = useState('');
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null);
  const [editClockIn, setEditClockIn] = useState('');
  const [editClockOut, setEditClockOut] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [showAddEntryModal, setShowAddEntryModal] = useState(false);
  const [addEntryForm, setAddEntryForm] = useState({ clock_in: '', clock_out: '', work_description: '' });
  const [isAddingEntry, setIsAddingEntry] = useState(false);

  useEffect(() => {
    if (projectId && workerId) {
      loadData();
    }
  }, [projectId, workerId]);

  const loadData = async () => {
    try {
      // Load worker details
      const { data: workerData, error: workerError } = await supabase
        .from('workers')
        .select('*')
        .eq('id', workerId)
        .single();

      if (workerError) throw workerError;
      setWorker(workerData);

      // Load time entries
      const { data: entriesData, error: entriesError } = await supabase
        .from('time_entries')
        .select('*')
        .eq('worker_id', workerId)
        .order('created_at', { ascending: false });

      if (entriesError) throw entriesError;
      setTimeEntries(entriesData || []);

      // Find current active entry
      const activeEntry = entriesData?.find(entry => entry.status === 'active');
      setCurrentEntry(activeEntry || null);
      
      if (activeEntry?.work_description) {
        setWorkDescription(activeEntry.work_description);
      }

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClockIn = async () => {
    setIsClocking(true);
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          worker_id: workerId,
          project_id: projectId,
          work_description: workDescription,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentEntry(data);
      loadData();
      toast({
        title: "Clocked In",
        description: "Your work session has started",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to clock in",
        variant: "destructive"
      });
    } finally {
      setIsClocking(false);
    }
  };

  const handleClockOut = async () => {
    if (!currentEntry) return;
    
    setIsClocking(true);
    try {
      const { error } = await supabase
        .from('time_entries')
        .update({
          clock_out: new Date().toISOString(),
          work_description: workDescription
        })
        .eq('id', currentEntry.id);

      if (error) throw error;

      setCurrentEntry(null);
      setWorkDescription('');
      loadData();
      toast({
        title: "Clocked Out",
        description: "Your work session has ended",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to clock out",
        variant: "destructive"
      });
    } finally {
      setIsClocking(false);
    }
  };

  const updateWorkDescription = async () => {
    if (!currentEntry) return;

    try {
      const { error } = await supabase
        .from('time_entries')
        .update({ work_description: workDescription })
        .eq('id', currentEntry.id);

      if (error) throw error;

      toast({
        title: "Updated",
        description: "Work description saved",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update description",
        variant: "destructive"
      });
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatHours = (hours?: number) => {
    if (!hours) return 'N/A';
    return `${hours.toFixed(2)}h`;
  };

  const getElapsedTime = () => {
    if (!currentEntry) return '00:00:00';
    
    const start = new Date(currentEntry.clock_in);
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const [elapsedTime, setElapsedTime] = useState('00:00:00');

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentEntry) {
      interval = setInterval(() => {
        setElapsedTime(getElapsedTime());
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentEntry]);

  const openEditModal = (entry: TimeEntry) => {
    setEditEntry(entry);
    setEditClockIn(entry.clock_in ? new Date(entry.clock_in).toISOString().slice(0, 16) : '');
    setEditClockOut(entry.clock_out ? new Date(entry.clock_out).toISOString().slice(0, 16) : '');
    setEditDescription(entry.work_description || '');
  };

  const closeEditModal = () => {
    setEditEntry(null);
    setEditClockIn('');
    setEditClockOut('');
    setEditDescription('');
  };

  const handleSaveEdit = async () => {
    if (!editEntry) return;
    setIsSavingEdit(true);
    try {
      const { error } = await supabase
        .from('time_entries')
        .update({
          clock_in: editClockIn ? new Date(editClockIn).toISOString() : null,
          clock_out: editClockOut ? new Date(editClockOut).toISOString() : null,
          work_description: editDescription
        })
        .eq('id', editEntry.id);
      if (error) throw error;
      toast({
        title: 'Updated',
        description: 'Time entry updated successfully',
      });
      closeEditModal();
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update time entry',
        variant: 'destructive',
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const openAddEntryModal = () => {
    setAddEntryForm({ clock_in: '', clock_out: '', work_description: '' });
    setShowAddEntryModal(true);
  };
  const closeAddEntryModal = () => {
    setShowAddEntryModal(false);
  };
  const handleAddTimeEntry = async () => {
    setIsAddingEntry(true);
    try {
      const { error } = await supabase.from('time_entries').insert({
        worker_id: workerId,
        project_id: projectId,
        clock_in: addEntryForm.clock_in ? new Date(addEntryForm.clock_in).toISOString() : null,
        clock_out: addEntryForm.clock_out ? new Date(addEntryForm.clock_out).toISOString() : null,
        work_description: addEntryForm.work_description,
        status: addEntryForm.clock_out ? 'completed' : 'active',
      });
      if (error) throw error;
      toast({ title: 'Success', description: 'Time entry added.' });
      closeAddEntryModal();
      loadData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to add time entry', variant: 'destructive' });
    } finally {
      setIsAddingEntry(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <header className="bg-card border-b shadow-soft">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-primary p-2 rounded-lg">
                <Clock className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Welcome, {worker?.name}</h1>
                <p className="text-muted-foreground">Worker ID: {worker?.worker_code}</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Current Session Card */}
        <Card className="mb-8 shadow-card border-0 bg-gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {currentEntry ? (
                <>
                  <Timer className="w-5 h-5 text-success" />
                  Active Session
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Start New Session
                </>
              )}
              <Button size="sm" variant="outline" className="ml-auto" onClick={openAddEntryModal}>
                Add
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {currentEntry && (
              <div className="text-center py-6">
                <div className="text-4xl font-mono font-bold text-primary mb-2">
                  {elapsedTime}
                </div>
                <p className="text-muted-foreground">
                  Started at {formatTime(currentEntry.clock_in)}
                </p>
              </div>
            )}
            
            <div className="space-y-3">
              <Label htmlFor="work-description" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Work Description
              </Label>
              <Textarea
                id="work-description"
                placeholder="Describe what you're working on..."
                value={workDescription}
                onChange={(e) => setWorkDescription(e.target.value)}
                rows={3}
              />
              {currentEntry && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={updateWorkDescription}
                  className="ml-auto block"
                >
                  Save Description
                </Button>
              )}
            </div>

            <div className="flex gap-4">
              {!currentEntry ? (
                <Button
                  onClick={handleClockIn}
                  disabled={isClocking || !workDescription.trim()}
                  className="flex-1 bg-gradient-success hover:opacity-90"
                  size="lg"
                >
                  {isClocking ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <Play className="w-5 h-5 mr-2" />
                      Clock In
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleClockOut}
                  disabled={isClocking}
                  variant="destructive"
                  className="flex-1"
                  size="lg"
                >
                  {isClocking ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <Square className="w-5 h-5 mr-2" />
                      Clock Out
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Work History */}
        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Work History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      {new Date(entry.clock_in).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {new Date(entry.clock_in).toLocaleTimeString()}
                    </TableCell>
                    <TableCell>
                      {entry.clock_out 
                        ? new Date(entry.clock_out).toLocaleTimeString() 
                        : 'Active'
                      }
                    </TableCell>
                    <TableCell>{formatHours(entry.total_hours)}</TableCell>
                    <TableCell>
                      <Badge variant={entry.status === 'active' ? 'default' : 'secondary'}>
                        {entry.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {entry.work_description || 'No description'}
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" onClick={() => openEditModal(entry)}>
                            Edit
                          </Button>
                        </DialogTrigger>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
      {/* Edit Time Entry Modal */}
      {editEntry && (
        <Dialog open={!!editEntry} onOpenChange={v => { if (!v) closeEditModal(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Time Entry</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-clock-in">In Time</Label>
                <Input
                  id="edit-clock-in"
                  type="datetime-local"
                  value={editClockIn}
                  onChange={e => setEditClockIn(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="edit-clock-out">Out Time</Label>
                <Input
                  id="edit-clock-out"
                  type="datetime-local"
                  value={editClockOut}
                  onChange={e => setEditClockOut(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Work Description</Label>
                <Textarea
                  id="edit-description"
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={closeEditModal} disabled={isSavingEdit}>Cancel</Button>
                <Button onClick={handleSaveEdit} loading={isSavingEdit} disabled={isSavingEdit}>Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {/* Add Time Entry Modal */}
      {showAddEntryModal && (
        <Dialog open={showAddEntryModal} onOpenChange={v => { if (!v) closeAddEntryModal(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Time Entry</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="add-clock-in">In Time</Label>
                <Input
                  id="add-clock-in"
                  type="datetime-local"
                  value={addEntryForm.clock_in}
                  onChange={e => setAddEntryForm(f => ({ ...f, clock_in: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="add-clock-out">Out Time</Label>
                <Input
                  id="add-clock-out"
                  type="datetime-local"
                  value={addEntryForm.clock_out}
                  onChange={e => setAddEntryForm(f => ({ ...f, clock_out: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="add-description">Work Description</Label>
                <Textarea
                  id="add-description"
                  value={addEntryForm.work_description}
                  onChange={e => setAddEntryForm(f => ({ ...f, work_description: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={closeAddEntryModal} disabled={isAddingEntry}>Cancel</Button>
                <Button onClick={handleAddTimeEntry} loading={isAddingEntry} disabled={isAddingEntry}>Add</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};