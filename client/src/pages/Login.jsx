import { useState } from 'react';
import { Heart, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Spinner } from '../components/States.jsx';

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const toast = useToast();

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await login(form);
      toast.success('Welcome back.');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center bg-ink-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white">
            <Heart size={22} fill="currentColor" />
          </div>
          <h1 className="mt-4 text-xl font-bold tracking-tight text-ink-900">Guest Manager</h1>
          <p className="mt-1 text-sm text-ink-500">Sign in to manage your guest list.</p>
        </div>

        <form onSubmit={submit} className="card space-y-4 p-5 sm:p-6">
          <div>
            <label className="label" htmlFor="username">Username</label>
            <input
              id="username" className="input" autoComplete="username" autoCapitalize="none"
              value={form.username}
              onChange={(event) => setForm({ ...form, username: event.target.value })}
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password" type="password" className="input" autoComplete="current-password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              required
            />
          </div>

          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? <Spinner /> : <LogIn size={16} />}
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-ink-400">
          Guests never need this page. They simply reply on WhatsApp.
        </p>
      </div>
    </div>
  );
}
