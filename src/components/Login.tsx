import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Clock, Building2, Users } from 'lucide-react';

export const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [adminForm, setAdminForm] = useState({ projectName: '', password: '' });
  const [workerForm, setWorkerForm] = useState({ projectName: '', workerCode: '', password: '' });
  const [projects, setProjects] = useState<any[]>([]);
  const [isProjectsLoading, setIsProjectsLoading] = useState(true);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchProjects = async () => {
      setIsProjectsLoading(true);
      const { data, error } = await supabase.from('inNout').select('*').order('created_at', { ascending: false });
      if (!error) setProjects(data || []);
      setIsProjectsLoading(false);
    };
    fetchProjects();
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: project, error } = await supabase
        .from('inNout')
        .select('*')
        .eq('name', adminForm.projectName)
        .single();

      if (error || !project) {
        toast({
          title: "Error",
          description: "Project not found",
          variant: "destructive"
        });
        return;
      }

      // In a real app, you'd hash the password and compare
      // For demo purposes, we'll do a simple comparison
      if (project.password_hash === adminForm.password) {
        login('admin', project.id);
        navigate('/admin');
        toast({
          title: "Login successful",
          description: `Welcome to ${project.name}`,
        });
      } else {
        toast({
          title: "Error",
          description: "Invalid password",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Login failed. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleWorkerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // First find the project
      const { data: project, error: projectError } = await supabase
        .from('inNout')
        .select('*')
        .eq('name', workerForm.projectName)
        .single();

      if (projectError || !project) {
        toast({
          title: "Error",
          description: "Project not found",
          variant: "destructive"
        });
        return;
      }

      // Then find the worker
      const { data: worker, error: workerError } = await supabase
        .from('workers')
        .select('*')
        .eq('project_id', project.id)
        .eq('worker_code', workerForm.workerCode)
        .single();

      if (workerError || !worker) {
        toast({
          title: "Error",
          description: "Worker not found",
          variant: "destructive"
        });
        return;
      }

      // Check password
      if (worker.password_hash === workerForm.password) {
        login('worker', project.id, worker.id);
        navigate('/worker');
        toast({
          title: "Login successful",
          description: `Welcome ${worker.name}`,
        });
      } else {
        toast({
          title: "Error",
          description: "Invalid password",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Login failed. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-primary rounded-2xl mb-4 shadow-primary">
            <Clock className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">TimeTrack Pro</h1>
          <p className="text-muted-foreground">Professional time tracking for your team</p>
        </div>

        <Card className="shadow-card border-0 bg-gradient-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-center">Sign In</CardTitle>
            <CardDescription className="text-center">Choose your access type</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="admin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="admin" className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Admin
                </TabsTrigger>
                <TabsTrigger value="worker" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Worker
                </TabsTrigger>
              </TabsList>

              <TabsContent value="admin">
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-project">Project</Label>
                    <select
                      id="admin-project"
                      className="w-full border rounded-md px-3 py-2 text-base bg-background"
                      value={adminForm.projectName}
                      onChange={e => setAdminForm(prev => ({ ...prev, projectName: e.target.value }))}
                      required
                      disabled={isProjectsLoading}
                    >
                      <option value="" disabled>Select a project</option>
                      {projects.map(project => (
                        <option key={project.id} value={project.name}>{project.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-password">Password</Label>
                    <Input
                      id="admin-password"
                      type="password"
                      placeholder="Enter password"
                      value={adminForm.password}
                      onChange={(e) => setAdminForm(prev => ({ ...prev, password: e.target.value }))}
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-primary hover:opacity-90 transition-all duration-300 shadow-primary"
                    disabled={isLoading || isProjectsLoading}
                  >
                    {isLoading ? <LoadingSpinner size="sm" /> : 'Sign In as Admin'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="worker">
                <form onSubmit={handleWorkerLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="worker-project">Project</Label>
                    <select
                      id="worker-project"
                      className="w-full border rounded-md px-3 py-2 text-base bg-background"
                      value={workerForm.projectName}
                      onChange={e => setWorkerForm(prev => ({ ...prev, projectName: e.target.value }))}
                      required
                      disabled={isProjectsLoading}
                    >
                      <option value="" disabled>Select a project</option>
                      {projects.map(project => (
                        <option key={project.id} value={project.name}>{project.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="worker-code">Worker Code</Label>
                    <Input
                      id="worker-code"
                      placeholder="Enter your worker code"
                      value={workerForm.workerCode}
                      onChange={(e) => setWorkerForm(prev => ({ ...prev, workerCode: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="worker-password">Password</Label>
                    <Input
                      id="worker-password"
                      type="password"
                      placeholder="Enter password"
                      value={workerForm.password}
                      onChange={(e) => setWorkerForm(prev => ({ ...prev, password: e.target.value }))}
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-primary hover:opacity-90 transition-all duration-300"
                    disabled={isLoading || isProjectsLoading}
                  >
                    {isLoading ? <LoadingSpinner size="sm" /> : 'Sign In as Worker'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-sm text-muted-foreground">
          Don't have a project? Contact your administrator.
        </div>
      </div>
    </div>
  );
};