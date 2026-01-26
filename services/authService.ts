import { supabase, isSupabaseConfigured } from './supabaseClient';
import { User } from '../types';

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

// Sign up with email and password
export const signUp = async (email: string, password: string): Promise<User | null> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Please set up environment variables.');
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (data.user) {
    return {
      id: data.user.id,
      email: data.user.email || '',
      createdAt: data.user.created_at || new Date().toISOString(),
    };
  }

  return null;
};

// Sign in with email and password
export const signIn = async (email: string, password: string): Promise<User | null> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Please set up environment variables.');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (data.user) {
    return {
      id: data.user.id,
      email: data.user.email || '',
      createdAt: data.user.created_at || new Date().toISOString(),
    };
  }

  return null;
};

// Sign out
export const signOut = async (): Promise<void> => {
  if (!isSupabaseConfigured()) {
    return;
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
};

// Get current user
export const getCurrentUser = async (): Promise<User | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email || '',
    createdAt: user.created_at || new Date().toISOString(),
  };
};

// Subscribe to auth state changes
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  if (!isSupabaseConfigured()) {
    callback(null);
    return { data: { subscription: { unsubscribe: () => {} } } };
  }

  return supabase.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
      callback({
        id: session.user.id,
        email: session.user.email || '',
        createdAt: session.user.created_at || new Date().toISOString(),
      });
    } else {
      callback(null);
    }
  });
};
