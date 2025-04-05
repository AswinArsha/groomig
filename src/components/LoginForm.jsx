import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "../supabase"

export default function LoginForm() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Check both staff and admin tables first
      const [staffResponse, adminResponse] = await Promise.all([
        supabase.from('staff').select('*').eq('username', username).single(),
        supabase.from('admin_users').select('*').eq('username', username).single()
      ])

      // If user exists in admin table and password matches, log in as admin
      if (!adminResponse.error && adminResponse.data && adminResponse.data.password === password) {
        localStorage.setItem('userSession', JSON.stringify({
          type: 'admin',
          username: adminResponse.data.username,
          user_metadata: {
            full_name: adminResponse.data.full_name || adminResponse.data.username
          }
        }))
        navigate('/home')
        return
      }

      // If user exists in staff table and password matches, log in as staff
      if (!staffResponse.error && staffResponse.data && staffResponse.data.password === password) {
        localStorage.setItem('userSession', JSON.stringify({
          type: 'staff',
          data: staffResponse.data
        }))
        navigate('/home')
        return
      }

      // If both logins fail, show error
      throw new Error('Invalid username or password')
    } catch (error) {
      setError(error.message)
    }

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
              onChange={(e) => setUsername(e.target.value)}
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
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute hover:bg-inherit right-2 top-1/2 -translate-y-1/2"
                onClick={() => setShowPassword(!showPassword)}
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
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
