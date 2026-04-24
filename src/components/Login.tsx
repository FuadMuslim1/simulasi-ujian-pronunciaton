import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { authenticateUser } from '../authService';
import { useAccessibility } from '../hooks/useAccessibility';

interface LoginProps {
  onLogin: (username: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Accessibility hooks
  const { announceToScreenReader, setFocus, handleKeyboardNavigation, generateUniqueId } = useAccessibility();
  const formRef = useRef<globalThis.HTMLFormElement>(null);
  const usernameRef = useRef<globalThis.HTMLInputElement>(null);
  const passwordRef = useRef<globalThis.HTMLInputElement>(null);
  const submitButtonRef = useRef<globalThis.HTMLButtonElement>(null);
  
  // Generate unique IDs for accessibility
  const usernameId = useRef(generateUniqueId());
  const passwordId = useRef(generateUniqueId());
  const errorId = useRef(generateUniqueId());

  // Announce form errors to screen readers
  useEffect(() => {
    if (error) {
      announceToScreenReader(`Error: ${error}`);
    }
  }, [error, announceToScreenReader]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: globalThis.KeyboardEvent) => {
    handleKeyboardNavigation(event, {
      onEnter: () => {
        const form = formRef.current;
        if (form) {
          form.requestSubmit();
        }
      },
      onEscape: () => {
        // Clear form on escape
        setUsername('');
        setPassword('');
        setError('');
        if (usernameRef.current) {
          setFocus(usernameRef.current);
        }
      }
    });
  }, [handleKeyboardNavigation, setFocus]);

  // Add global keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!username || !password) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    const isAuthenticated = await authenticateUser(username, password);

    if (isAuthenticated) {
      onLogin(username);
    } else {
      setError('Authentication failed. Invalid username or password.');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-amber-900/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-900/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative z-10 w-full max-w-md bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8">
        <div className="flex flex-col items-center mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight text-center uppercase">PRONUNCIATION<br /><span className="text-xl">(THE EXAMINATION)</span></h1>
        </div>

        <form 
          ref={formRef}
          onSubmit={handleSubmit} 
          className="space-y-6"
          noValidate
          aria-label="Login form"
          aria-describedby={error ? errorId.current : undefined}
        >
          <div>
            <label 
              htmlFor={usernameId.current}
              className="block text-amber-500 text-xs font-bold uppercase tracking-wider mb-2"
            >
              Username
            </label>
            <input
              ref={usernameRef}
              id={usernameId.current}
              name="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
              placeholder="e.g. fuadmuslym"
              aria-required="true"
              aria-describedby={error ? errorId.current : undefined}
              autoComplete="username"
              autoFocus
            />
          </div>

          <div>
            <label 
              htmlFor={passwordId.current}
              className="block text-amber-500 text-xs font-bold uppercase tracking-wider mb-2"
            >
              Password
            </label>
            <div className="relative">
              <input
                ref={passwordRef}
                id={passwordId.current}
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 pr-12 text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                placeholder="Your password"
                aria-required="true"
                aria-describedby={error ? errorId.current : undefined}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-amber-500 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-controls={passwordId.current}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div 
              id={errorId.current}
              className="bg-red-900/20 border border-red-500/50 text-red-200 text-sm p-3 rounded-lg"
              role="alert"
              aria-live="polite"
            >
              {error}
            </div>
          )}

          <button
            ref={submitButtonRef}
            type="submit"
            disabled={isLoading}
            className="w-full bg-amber-600 hover:bg-amber-500 text-black font-bold py-3.5 rounded-lg transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:shadow-[0_0_20px_rgba(245,158,11,0.5)]"
            aria-label={isLoading ? 'Authenticating, please wait' : 'Enter studio'}
            aria-describedby={error ? errorId.current : undefined}
          >
            {isLoading ? 'AUTHENTICATING...' : 'ENTER STUDIO'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;

