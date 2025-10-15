
import React, { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext, API } from '@/App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Shield, TrendingUp, Users, Award } from 'lucide-react';

const Login = () => {
  const { handleLogin } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(false);
  
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ username: '', email: '', password: '' });

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await axios.post(`${API}/auth/login`, loginData);
      handleLogin(response.data.token, response.data.user);
      toast.success('Welcome back!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await axios.post(`${API}/auth/register`, registerData);
      handleLogin(response.data.token, response.data.user);
      toast.success('Account created successfully!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid md:grid-cols-2 gap-8 items-center">
        <div className="space-y-8 animate-fadeInUp">
          <div>
            <h1 className="text-5xl font-bold text-teal-900 mb-4" data-testid="app-title">
              NBCFDC Credit Platform
            </h1>
            <p className="text-lg text-teal-700">
              AI-Powered Credit Scoring for Direct Digital Lending
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="glass p-6 rounded-2xl space-y-2" data-testid="feature-card-ai">
              <TrendingUp className="w-8 h-8 text-teal-600" />
              <h3 className="font-semibold text-teal-900">AI Credit Scoring</h3>
              <p className="text-sm text-teal-600">Advanced ML models</p>
            </div>
            <div className="glass p-6 rounded-2xl space-y-2" data-testid="feature-card-fast">
              <Shield className="w-8 h-8 text-emerald-600" />
              <h3 className="font-semibold text-teal-900">Fast Approval</h3>
              <p className="text-sm text-teal-600">Same-day sanctions</p>
            </div>
            <div className="glass p-6 rounded-2xl space-y-2" data-testid="feature-card-transparent">
              <Award className="w-8 h-8 text-cyan-600" />
              <h3 className="font-semibold text-teal-900">Transparent</h3>
              <p className="text-sm text-teal-600">Explainable results</p>
            </div>
            <div className="glass p-6 rounded-2xl space-y-2" data-testid="feature-card-inclusive">
              <Users className="w-8 h-8 text-teal-600" />
              <h3 className="font-semibold text-teal-900">Inclusive</h3>
              <p className="text-sm text-teal-600">Support for all</p>
            </div>
          </div>
        </div>

        <div className="animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
          <Tabs defaultValue="login" className="w-full">
            <Card className="border-0 shadow-2xl">
              <CardHeader>
                <TabsList className="grid w-full grid-cols-2" data-testid="auth-tabs">
                  <TabsTrigger value="login" data-testid="login-tab">Login</TabsTrigger>
                  <TabsTrigger value="register" data-testid="register-tab">Register</TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent className="space-y-4">
                <TabsContent value="login">
                  <form onSubmit={handleLoginSubmit} className="space-y-4" data-testid="login-form">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        data-testid="login-email-input"
                        type="email"
                        placeholder="your.email@example.com"
                        value={loginData.email}
                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                        required
                        className="h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <Input
                        id="login-password"
                        data-testid="login-password-input"
                        type="password"
                        placeholder="••••••••"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        required
                        className="h-12"
                      />
                    </div>
                    <Button type="submit" className="w-full h-12 text-base" disabled={isLoading} data-testid="login-submit-button">
                      {isLoading ? 'Signing in...' : 'Sign In'}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register">
                  <form onSubmit={handleRegisterSubmit} className="space-y-4" data-testid="register-form">
                    <div className="space-y-2">
                      <Label htmlFor="register-username">Username</Label>
                      <Input
                        id="register-username"
                        data-testid="register-username-input"
                        type="text"
                        placeholder="johndoe"
                        value={registerData.username}
                        onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                        required
                        className="h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-email">Email</Label>
                      <Input
                        id="register-email"
                        data-testid="register-email-input"
                        type="email"
                        placeholder="your.email@example.com"
                        value={registerData.email}
                        onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                        required
                        className="h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password">Password</Label>
                      <Input
                        id="register-password"
                        data-testid="register-password-input"
                        type="password"
                        placeholder="••••••••"
                        value={registerData.password}
                        onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                        required
                        className="h-12"
                      />
                    </div>
                    <Button type="submit" className="w-full h-12 text-base" disabled={isLoading} data-testid="register-submit-button">
                      {isLoading ? 'Creating account...' : 'Create Account'}
                    </Button>
                  </form>
                </TabsContent>
              </CardContent>
            </Card>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Login;
