import React, { useState } from 'react';
import { useAuth } from '../App';
import { Eye, EyeOff, Clock, Users, Shield, Mail, Lock, ArrowRight, Sparkles } from 'lucide-react';
import logo from '../assets/apt.ico';

// Add CSS animations
const styles = `
  @keyframes float {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-20px);
    }
  }
  
  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
  
  @keyframes shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

const Login = () => {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password })
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data?.message || 'Login failed');
      }

      const apiUser = data.user;
      // Keep backward-compat id for existing components
      const userData = {
        _id: apiUser._id,
        id: apiUser._id, // compatibility for parts using user.id
        employeeId: apiUser.employeeId,
        name: apiUser.name,
        email: apiUser.email,
        role: apiUser.role,
        position: apiUser.position,
        department: apiUser.department
      };
      login(userData, data.token);
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = (type) => {
    if (type === 'admin') {
      setFormData({
        email: 'admin@company.com',
        password: 'admin123'
      });
    } else {
      setFormData({
        email: 'vijay.solanki@company.com',
        password: 'test123'
      });
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
      padding: '1rem',
      position: 'relative',
      overflow: 'hidden',
      width: '100%',
      maxWidth: '100%'
    }}>
      {/* Background Animation Elements */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '10%',
        width: '300px',
        height: '300px',
        background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
        borderRadius: '50%',
        animation: 'float 6s ease-in-out infinite'
      }}></div>
      <div style={{
        position: 'absolute',
        bottom: '10%',
        right: '15%',
        width: '200px',
        height: '200px',
        background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
        borderRadius: '50%',
        animation: 'float 8s ease-in-out infinite reverse'
      }}></div>
      <div style={{
        position: 'absolute',
        top: '60%',
        left: '80%',
        width: '150px',
        height: '150px',
        background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)',
        borderRadius: '50%',
        animation: 'float 10s ease-in-out infinite'
      }}></div>

      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '24px',
        boxShadow: '0 32px 64px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        width: '100%',
        maxWidth: '420px',
        padding: '3rem 2.5rem',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative Corner Element */}
        <div style={{
          position: 'absolute',
          top: '-20px',
          right: '-20px',
          width: '80px',
          height: '80px',
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1))',
          borderRadius: '50%',
          filter: 'blur(20px)'
        }}></div>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem', position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '20px',
            marginBottom: '1.5rem',
            boxShadow: '0 20px 40px -12px rgba(102, 126, 234, 0.4)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-10px',
              right: '-10px',
              width: '30px',
              height: '30px',
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '50%'
            }}></div>
            <Sparkles size={36} style={{ color: 'white', position: 'relative', zIndex: 1 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
            <img 
              src={logo} 
              alt="Company Logo" 
              style={{ height: '60px', width: '60px', objectFit: 'contain' }} 
            />
            <h1 style={{
              fontSize: '2.25rem',
              fontWeight: '800',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.025em',
              margin: 0
            }}>
              AproposDrive
            </h1>
          </div>
          <p style={{
            color: '#6b7280',
            fontSize: '1rem',
            fontWeight: '500',
            margin: 0
          }}>
            Employee Management System
          </p>
          <div style={{
            width: '60px',
            height: '3px',
            background: 'linear-gradient(90deg, #667eea, #764ba2)',
            borderRadius: '2px',
            margin: '1rem auto 0'
          }}></div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ position: 'relative', zIndex: 1 }}>
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#dc2626',
              padding: '1rem',
              borderRadius: '12px',
              marginBottom: '1.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              textAlign: 'center',
              backdropFilter: 'blur(10px)'
            }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: '#374151',
              fontSize: '0.875rem',
              fontWeight: '600',
              letterSpacing: '0.025em'
            }}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9ca3af',
                zIndex: 1
              }}>
                <Mail size={18} />
              </div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                required
                style={{
                  width: '100%',
                  padding: '1rem 1rem 1rem 3rem',
                  borderRadius: '12px',
                  border: '2px solid rgba(229, 231, 235, 0.8)',
                  background: 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(10px)',
                  fontSize: '0.975rem',
                  color: '#111827',
                  fontWeight: '500',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  outline: 'none',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#667eea';
                  e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1), 0 4px 12px -2px rgba(102, 126, 234, 0.2)';
                  e.target.style.background = 'rgba(255, 255, 255, 0.95)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(229, 231, 235, 0.8)';
                  e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)';
                  e.target.style.background = 'rgba(255, 255, 255, 0.8)';
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: '#374151',
              fontSize: '0.875rem',
              fontWeight: '600',
              letterSpacing: '0.025em'
            }}>Password</label>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9ca3af',
                zIndex: 1
              }}>
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                required
                style={{
                  width: '100%',
                  padding: '1rem 3rem 1rem 3rem',
                  borderRadius: '12px',
                  border: '2px solid rgba(229, 231, 235, 0.8)',
                  background: 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(10px)',
                  fontSize: '0.975rem',
                  color: '#111827',
                  fontWeight: '500',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  outline: 'none',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#667eea';
                  e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1), 0 4px 12px -2px rgba(102, 126, 234, 0.2)';
                  e.target.style.background = 'rgba(255, 255, 255, 0.95)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(229, 231, 235, 0.8)';
                  e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)';
                  e.target.style.background = 'rgba(255, 255, 255, 0.8)';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#9ca3af',
                  padding: '0.25rem',
                  borderRadius: '6px',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  e.target.style.color = '#667eea';
                  e.target.style.background = 'rgba(102, 126, 234, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = '#9ca3af';
                  e.target.style.background = 'none';
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '1rem 2rem',
              borderRadius: '12px',
              border: 'none',
              background: loading 
                ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              fontSize: '1rem',
              fontWeight: '700',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: loading 
                ? '0 4px 12px -2px rgba(107, 114, 128, 0.3)'
                : '0 8px 25px -8px rgba(102, 126, 234, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              marginBottom: '2rem',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 12px 35px -8px rgba(102, 126, 234, 0.6)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 8px 25px -8px rgba(102, 126, 234, 0.5)';
              }
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                Signing in...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Sign In
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
};

export default Login;
