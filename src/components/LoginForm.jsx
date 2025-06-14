// src/components/LoginForm.jsx
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { supabase } from "../supabase"

export default function LoginForm() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // normalize username
    const normalized = username.trim().toLowerCase()
    console.log('➡️ normalized username:', normalized)

    // 1) Try Admin
    const adminRes = await supabase
      .from('admin_users')
      .select('*')
      .eq('username', normalized)
      .maybeSingle()

    console.log('🔍 adminRes:', adminRes)
    if (adminRes.data) {
      if (adminRes.data.password !== password) {
        console.warn('❌ password mismatch for admin')
        setError('Invalid username or password')
        setLoading(false)
        return
      }

      // fetch organization
      const orgRes = await supabase
        .from('organizations')
        .select('*')
        .eq('id', adminRes.data.organization_id)
        .single()

      console.log('🏢 orgRes (admin):', orgRes)
      if (!orgRes.data) {
        setError('Organization record not found.')
      } else {
        // Allow login even if subscription is expired
        // The SubscriptionValidator component will handle showing the modal
        localStorage.setItem('userSession', JSON.stringify({
          type: 'admin',
          username: adminRes.data.username,
          full_name: adminRes.data.full_name || adminRes.data.username,
          organization_id: adminRes.data.organization_id
        }))
        navigate('/home')
        return
      }

      setLoading(false)
      return
    }

    // 2) Try Staff
    const staffRes = await supabase
      .from('staff')
      .select('*')
      .eq('username', normalized)
      .maybeSingle()

    console.log('🔍 staffRes:', staffRes)
    if (staffRes.data) {
      if (staffRes.data.password !== password) {
        console.warn('❌ password mismatch for staff')
        setError('Invalid username or password')
        setLoading(false)
        return
      }

      // fetch organization
      const orgRes = await supabase
        .from('organizations')
        .select('*')
        .eq('id', staffRes.data.organization_id)
        .single()

      console.log('🏢 orgRes (staff):', orgRes)
      if (!orgRes.data) {
        setError('Organization record not found.')
      } else {
        // Allow login even if subscription is expired
        // The SubscriptionValidator component will handle showing the modal
        localStorage.setItem('userSession', JSON.stringify({
          type: 'staff',
          username: staffRes.data.username,
          full_name: staffRes.data.name || staffRes.data.username,
          organization_id: staffRes.data.organization_id
        }))
        navigate('/home')
        return
      }

      setLoading(false)
      return
    }

    // 3) Neither found
    console.error('🚫 No admin or staff found')
    setError('Invalid username or password')
    setLoading(false)
  }

  return (
    <Card className="w-full max-w-md mx-auto mt-20">
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Sign in to your account</CardDescription>
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
  )
}
