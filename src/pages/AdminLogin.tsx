import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import logo from '@/assets/manserv-logo.png';
import sede from '@/assets/manserv-sede.jpg';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      setError('Credenciais inválidas. Verifique seu e-mail e senha no Supabase.');
      setLoading(false);
    } else {
      navigate('/admin');
    }
  };

  return (
    <div className="relative -m-4 md:-m-6 lg:-m-8 min-h-[calc(100vh-4rem)] flex items-center justify-center lg:justify-end p-4 sm:p-8 lg:pr-[8%] overflow-hidden bg-black">
      {/* Foto da sede Manserv: cópia desfocada preenche a tela, a nítida aparece inteira */}
      <img src={sede} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl brightness-50" />
      <img
        src={sede}
        alt=""
        aria-hidden="true"
        className="login-fundo absolute inset-0 w-full h-full object-cover object-[center_30%] lg:object-contain lg:object-left"
      />
      <div className="absolute inset-0 bg-gradient-to-l from-black/60 via-black/10 to-transparent" />

      {/* Card de vidro: sempre claro, independente do tema */}
      <div className="login-card relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/50 bg-white/75 px-8 py-10 text-black shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] backdrop-blur-2xl backdrop-saturate-150">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-brand" />
        {/* Brilho laranja que acompanha o topo do vidro */}
        <div className="pointer-events-none absolute -top-24 -right-16 h-56 w-56 rounded-full bg-brand/30 blur-3xl" />

        <div className="mb-8 text-center relative z-10">
          <img src={logo} alt="Manserv" className="h-20 w-auto mx-auto mb-6" />
          <h2 className="text-3xl font-bold tracking-tight mb-2">Importar dados</h2>
          <p className="text-black/60 font-medium">Entre para publicar a planilha de fechamento</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6 relative z-10">
          <div className="space-y-2">
            <label className="text-sm font-semibold ml-1 text-black/80">E-mail</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/50 group-focus-within:text-brand transition-colors" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/70 border border-black/10 rounded-2xl py-3.5 pl-12 pr-4 text-black placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:ring-offset-0 focus:border-brand focus:bg-white transition-all text-sm font-medium"
                placeholder="nome@manserv.com.br"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold ml-1 text-black/80">Senha</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/50 group-focus-within:text-brand transition-colors" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/70 border border-black/10 rounded-2xl py-3.5 pl-12 pr-4 text-black placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:ring-offset-0 focus:border-brand focus:bg-white transition-all text-sm font-medium"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-600/10 border border-red-600/30 text-red-700 text-xs py-3 px-4 rounded-xl font-medium animate-shake">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={cn(
              "w-full bg-black text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-brand hover:text-black active:scale-[0.98] transition-colors",
              loading && "opacity-80 cursor-not-allowed"
            )}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Entrar
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
        
        <p className="mt-8 text-center text-xs text-black/50">
          Manserv | Fechamento de Medição
        </p>
        
      </div>
    </div>
  );
};

export default AdminLogin;
