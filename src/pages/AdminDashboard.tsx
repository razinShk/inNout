import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Project, Worker, TimeEntryWithWorker } from '@/types';
import { Building2, Users, Clock, Plus, LogOut, Settings, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

export const AdminDashboard = () => {
  const { logout, projectId } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntryWithWorker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingWorker, setIsAddingWorker] = useState(false);
  const [workerForm, setWorkerForm] = useState({
    name: '',
    email: '',
    worker_code: '',
    password: ''
  });
  const [showAddEntryModal, setShowAddEntryModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [addEntryForm, setAddEntryForm] = useState({ clock_in: '', clock_out: '', work_description: '' });
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    if (projectId) {
      loadData();
    }
  }, [projectId]);

  const loadData = async () => {
    try {
      // Load project details
      const { data: projectData, error: projectError } = await supabase
        .from('inNout')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      // Load workers
      const { data: workersData, error: workersError } = await supabase
        .from('workers')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (workersError) throw workersError;
      setWorkers(workersData || []);

      // Load time entries
      const { data: entriesData, error: entriesError } = await supabase
        .from('time_entries')
        .select(`
          *,
          workers:worker_id (name, worker_code)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (entriesError) throw entriesError;
      setTimeEntries(entriesData || []);

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

  const handleAddWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingWorker(true);

    try {
      const { error } = await supabase
        .from('workers')
        .insert({
          project_id: projectId,
          name: workerForm.name,
          email: workerForm.email,
          worker_code: workerForm.worker_code,
          password_hash: workerForm.password // In production, hash this
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Worker added successfully"
      });

      setWorkerForm({ name: '', email: '', worker_code: '', password: '' });
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add worker",
        variant: "destructive"
      });
    } finally {
      setIsAddingWorker(false);
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

  const openAddEntryModal = (worker: Worker) => {
    setSelectedWorker(worker);
    setAddEntryForm({ clock_in: '', clock_out: '', work_description: '' });
    setShowAddEntryModal(true);
  };
  const closeAddEntryModal = () => {
    setShowAddEntryModal(false);
    setSelectedWorker(null);
  };
  const handleAddTimeEntry = async () => {
    if (!selectedWorker) return;
    setIsAddingEntry(true);
    try {
      const { error } = await supabase.from('time_entries').insert({
        worker_id: selectedWorker.id,
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

  const handleExportToExcel = (workerId: string) => {
    const worker = workers.find(w => w.id === workerId);
    if (!worker) return;
    const filteredEntries = timeEntries.filter(entry => {
      const entryDate = new Date(entry.clock_in);
      return (
        entry.worker_id === worker.id &&
        entryDate.getMonth() + 1 === filterMonth &&
        entryDate.getFullYear() === filterYear
      );
    });
    const data = filteredEntries.map(entry => ({
      'Clock In': formatTime(entry.clock_in),
      'Clock Out': entry.clock_out ? formatTime(entry.clock_out) : 'Active',
      'Hours': entry.total_hours ? entry.total_hours.toFixed(2) : 'N/A',
      'Status': entry.status,
      'Description': entry.work_description || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Time Entries');
    XLSX.writeFile(wb, `${worker.name}_TimeEntries_${filterYear}_${filterMonth}.xlsx`);
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-primary p-2 rounded-lg">
                <Building2 className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{project?.name}</h1>
                <p className="text-muted-foreground">Admin Dashboard</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-card shadow-card border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Total Workers</p>
                  <p className="text-3xl font-bold text-foreground">{workers.length}</p>
                </div>
                <Users className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card shadow-card border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Active Sessions</p>
                  <p className="text-3xl font-bold text-foreground">
                    {timeEntries.filter(entry => entry.status === 'active').length}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card shadow-card border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Total Entries</p>
                  <p className="text-3xl font-bold text-foreground">{timeEntries.length}</p>
                </div>
                <Calendar className="w-8 h-8 text-warning" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Workers Section */}
        <Card className="mb-8 shadow-card border-0">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Workers Management
            </CardTitle>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-gradient-primary hover:opacity-90 shadow-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Worker
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Worker</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddWorker} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={workerForm.name}
                      onChange={(e) => setWorkerForm(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email (Optional)</Label>
                    <Input
                      id="email"
                      type="email"
                      value={workerForm.email}
                      onChange={(e) => setWorkerForm(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="worker_code">Worker Code</Label>
                    <Input
                      id="worker_code"
                      value={workerForm.worker_code}
                      onChange={(e) => setWorkerForm(prev => ({ ...prev, worker_code: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={workerForm.password}
                      onChange={(e) => setWorkerForm(prev => ({ ...prev, password: e.target.value }))}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isAddingWorker}>
                    {isAddingWorker ? <LoadingSpinner size="sm" /> : 'Add Worker'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Worker Code</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workers.map((worker) => (
                  <TableRow key={worker.id}>
                    <TableCell className="font-medium">{worker.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{worker.worker_code}</Badge>
                    </TableCell>
                    <TableCell>{worker.email || 'N/A'}</TableCell>
                    <TableCell>{formatTime(worker.created_at)}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => openAddEntryModal(worker)}>
                        Add
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Add Time Entry Modal */}
        {showAddEntryModal && selectedWorker && (
          <Dialog open={showAddEntryModal} onOpenChange={v => { if (!v) closeAddEntryModal(); }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Time Entry for {selectedWorker.name}</DialogTitle>
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

        {/* Time Entries Section */}
        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Recent Time Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-4 items-center">
              <div>
                <label htmlFor="filter-month" className="mr-2">Month:</label>
                <select
                  id="filter-month"
                  value={filterMonth}
                  onChange={e => setFilterMonth(Number(e.target.value))}
                  className="border rounded px-2 py-1"
                >
                  {[...Array(12)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>{format(new Date(2000, i, 1), 'MMMM')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="filter-year" className="mr-2">Year:</label>
                <select
                  id="filter-year"
                  value={filterYear}
                  onChange={e => setFilterYear(Number(e.target.value))}
                  className="border rounded px-2 py-1"
                >
                  {Array.from(new Set(timeEntries.map(e => new Date(e.clock_in).getFullYear()))).sort((a, b) => b - a).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
            <Tabs value={selectedWorkerId || (workers[0]?.id ?? '')} onValueChange={setSelectedWorkerId} className="w-full">
              <TabsList className="overflow-x-auto flex gap-2 mb-4">
                {workers.map(worker => (
                  <TabsTrigger key={worker.id} value={worker.id} className="min-w-max">
                    {worker.name}
                  </TabsTrigger>
                ))}
              </TabsList>
              {workers.map(worker => {
                const filteredEntries = timeEntries.filter(entry => {
                  const entryDate = new Date(entry.clock_in);
                  return (
                    entry.worker_id === worker.id &&
                    entryDate.getMonth() + 1 === filterMonth &&
                    entryDate.getFullYear() === filterYear
                  );
                });
                return (
                  <TabsContent key={worker.id} value={worker.id}>
                    <div className="flex justify-end mb-2">
                      <Button size="sm" variant="outline" onClick={() => handleExportToExcel(worker.id)}>
                        Export to Excel
                      </Button>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Clock In</TableHead>
                          <TableHead>Clock Out</TableHead>
                          <TableHead>Hours</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Description</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEntries.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground">No entries for this period.</TableCell>
                          </TableRow>
                        ) : (
                          filteredEntries.map((entry: any) => (
                            <TableRow key={entry.id}>
                              <TableCell>{formatTime(entry.clock_in)}</TableCell>
                              <TableCell>{entry.clock_out ? formatTime(entry.clock_out) : 'Active'}</TableCell>
                              <TableCell>{formatHours(entry.total_hours)}</TableCell>
                              <TableCell>
                                <Badge variant={entry.status === 'active' ? 'default' : 'secondary'}>
                                  {entry.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-xs truncate">
                                {entry.work_description || 'No description'}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card>

        {/* Worker Total Hours Table */}
        <Card className="shadow-card border-0 mt-8">
          <CardHeader>
            <CardTitle>Total Hours by Worker</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Worker Code</TableHead>
                  <TableHead>Total Hours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workers.map(worker => {
                  const total = timeEntries.filter(e => e.worker_id === worker.id && e.total_hours).reduce((sum, e) => sum + (e.total_hours || 0), 0);
                  return (
                    <TableRow key={worker.id}>
                      <TableCell>{worker.name}</TableCell>
                      <TableCell>{worker.worker_code}</TableCell>
                      <TableCell>{total.toFixed(2)}h</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};