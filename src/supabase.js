import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://exkscztgagvuuxjhvypk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4a3NjenRnYWd2dXV4amh2eXBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAzNTEzMjEsImV4cCI6MjA0NTkyNzMyMX0.2weCQdWxNLfdtxAllP1FAKxwCMZnVTwNqqaIX9skCtk';
export const supabase = createClient(supabaseUrl, supabaseKey)
