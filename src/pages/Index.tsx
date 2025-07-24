import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Login } from '@/components/Login';
import { CreateProject } from '@/components/CreateProject';
import { Clock } from 'lucide-react';

const Index = () => {
  const [view, setView] = useState<'home' | 'login' | 'create'>('home');

  if (view === 'login') {
    return <Login />;
  }

  if (view === 'create') {
    return (
      <CreateProject 
        onBack={() => setView('home')} 
        onSuccess={() => setView('login')} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-primary rounded-3xl mb-8 shadow-primary">
          <Clock className="w-10 h-10 text-primary-foreground" />
        </div>
        <h1 className="text-5xl font-bold text-foreground mb-4">TimeTrack Pro</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Professional time tracking solution for teams and projects
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            size="lg"
            className="bg-gradient-primary hover:opacity-90 shadow-primary px-8"
            onClick={() => setView('login')}
          >
            Access Existing Project
          </Button>
          <Button 
            size="lg"
            variant="outline"
            className="px-8"
            onClick={() => setView('create')}
          >
            Create New Project
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
