-- Create workers table
CREATE TABLE public.workers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    worker_code TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(project_id, worker_code)
);

-- Create time_entries table for in/out tracking
CREATE TABLE public.time_entries (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    clock_in TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    clock_out TIMESTAMP WITH TIME ZONE,
    work_description TEXT,
    total_hours DECIMAL(5,2),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- Create policies for workers table
CREATE POLICY "Anyone can view workers" 
ON public.workers 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create workers" 
ON public.workers 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update workers" 
ON public.workers 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete workers" 
ON public.workers 
FOR DELETE 
USING (true);

-- Create policies for time_entries table
CREATE POLICY "Anyone can view time entries" 
ON public.time_entries 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create time entries" 
ON public.time_entries 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update time entries" 
ON public.time_entries 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete time entries" 
ON public.time_entries 
FOR DELETE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_workers_updated_at
    BEFORE UPDATE ON public.workers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_time_entries_updated_at
    BEFORE UPDATE ON public.time_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to calculate total hours when clocking out
CREATE OR REPLACE FUNCTION public.calculate_total_hours()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.clock_out IS NOT NULL AND OLD.clock_out IS NULL THEN
        NEW.total_hours = EXTRACT(EPOCH FROM (NEW.clock_out - NEW.clock_in)) / 3600;
        NEW.status = 'completed';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_hours_on_clockout
    BEFORE UPDATE ON public.time_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_total_hours();