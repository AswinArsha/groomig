// src/components/SuperAdmin/SuperAdminLogin.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { supabase } from "../../supabase";
import toast from 'react-hot-toast';

export default function SuperAdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('Attempting login with username:', username.trim());
      const { data: superAdmin, error: fetchError } = await supabase
        .from('super_admins')
        .select('*')
        .eq('username', username.trim())
        .single();

      console.log('Supabase response:', { superAdmin, fetchError });

      if (fetchError) throw fetchError;

      if (!superAdmin) {
        console.log('No super admin found with username:', username.trim());
        setError('Invalid username or password');
        return;
      }

      if (superAdmin.password_hash !== password) {
        console.log('Password mismatch');
        setError('Invalid username or password');
        return;
      }

      console.log('Login successful for user:', superAdmin.username);

      localStorage.setItem('superAdminSession', JSON.stringify({
        id: superAdmin.id,
        username: superAdmin.username,
        type: 'super_admin'
      }));

      toast.success('Welcome back, Super Admin!');
      navigate('/admin/dashboard');

    } catch (error) {
      console.error('Login error:', error.message);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto mt-20">
      <CardHeader>
        <CardTitle>Super Admin Login</CardTitle>
        <CardDescription>Access the super admin dashboard</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="*********"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-inherit"
                onClick={() => setShowPassword(v => !v)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              : 'Sign in'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}