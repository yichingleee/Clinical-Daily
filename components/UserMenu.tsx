import { useState, useRef, useEffect } from 'react';
import { User, LogOut, Library, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface UserMenuProps {
  onLibraryClick: () => void;
  onSignInClick: () => void;
}

export const UserMenu = ({ onLibraryClick, onSignInClick }: UserMenuProps) => {
  const { user, signOut, loading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 animate-pulse" />
    );
  }

  if (!user) {
    return (
      <button
        onClick={onSignInClick}
        className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium text-slate-200 hover:border-accent-500/40 hover:text-accent-300 transition-all"
      >
        <User className="w-4 h-4" />
        Sign In
      </button>
    );
  }

  const handleSignOut = async () => {
    setIsOpen(false);
    await signOut();
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium text-slate-200 hover:border-accent-500/40 transition-all"
      >
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-accent-500 to-medical-700 flex items-center justify-center text-xs font-bold text-surface">
          {user.email[0].toUpperCase()}
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-panel/95 border border-white/10 rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.55)] overflow-hidden z-50">
          <div className="p-3 border-b border-white/10">
            <p className="text-xs font-mono uppercase tracking-[0.1em] text-slate-400">
              Signed in as
            </p>
            <p className="text-sm text-white truncate mt-1">{user.email}</p>
          </div>

          <div className="p-2">
            <button
              onClick={() => {
                setIsOpen(false);
                onLibraryClick();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-white/5 transition-colors"
            >
              <Library className="w-4 h-4 text-accent-400" />
              My Library
            </button>

            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-white/5 transition-colors"
            >
              <LogOut className="w-4 h-4 text-slate-400" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
