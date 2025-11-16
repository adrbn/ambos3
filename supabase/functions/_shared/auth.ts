/**
 * Authentication Middleware for Edge Functions
 * Provides authentication and authorization utilities for Supabase Edge Functions
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

export interface AuthUser {
  id: string;
  email?: string;
  role?: string;
}

export interface AuthResult {
  user: AuthUser | null;
  error: Error | null;
}

/**
 * Verify JWT token and get user information
 */
export async function verifyAuth(req: Request): Promise<AuthResult> {
  try {
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      return {
        user: null,
        error: new Error('Missing Authorization header'),
      };
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      return {
        user: null,
        error: new Error('Invalid Authorization header format'),
      };
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify token and get user
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return {
        user: null,
        error: error || new Error('Invalid token'),
      };
    }

    // Get user role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', data.user.id)
      .single();

    return {
      user: {
        id: data.user.id,
        email: data.user.email,
        role: roleData?.role || 'user',
      },
      error: null,
    };
  } catch (err) {
    return {
      user: null,
      error: err instanceof Error ? err : new Error('Authentication failed'),
    };
  }
}

/**
 * Require authentication - returns 401 if not authenticated
 */
export async function requireAuth(req: Request): Promise<AuthUser> {
  const { user, error } = await verifyAuth(req);

  if (error || !user) {
    throw new Response(
      JSON.stringify({ error: 'Unauthorized', message: error?.message || 'Authentication required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return user;
}

/**
 * Require specific role - returns 403 if user doesn't have required role
 */
export async function requireRole(req: Request, requiredRole: string | string[]): Promise<AuthUser> {
  const user = await requireAuth(req);

  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  
  if (!user.role || !roles.includes(user.role)) {
    throw new Response(
      JSON.stringify({ 
        error: 'Forbidden', 
        message: `Required role: ${roles.join(' or ')}. Your role: ${user.role}` 
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return user;
}

/**
 * Check rate limit for user
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
  endpoint: string,
  maxRequests: number = 100,
  windowMinutes: number = 60
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_user_id: userId,
      p_endpoint: endpoint,
      p_max_requests: maxRequests,
      p_window_minutes: windowMinutes,
    });

    if (error) {
      console.error('Rate limit check error:', error);
      // Fail open - allow request if rate limit check fails
      return true;
    }

    return data as boolean;
  } catch (err) {
    console.error('Rate limit exception:', err);
    // Fail open
    return true;
  }
}

/**
 * Log audit event
 */
export async function logAuditEvent(
  supabase: SupabaseClient,
  userId: string,
  action: string,
  resource: string,
  resourceId?: string,
  metadata?: Record<string, any>,
  success: boolean = true,
  errorMessage?: string
): Promise<void> {
  try {
    await supabase.rpc('log_audit_event', {
      p_user_id: userId,
      p_action: action,
      p_resource: resource,
      p_resource_id: resourceId,
      p_metadata: metadata,
      p_success: success,
      p_error_message: errorMessage,
    });
  } catch (err) {
    console.error('Failed to log audit event:', err);
    // Don't throw - audit logging shouldn't break the main function
  }
}

/**
 * Middleware wrapper for Edge Functions
 * Automatically handles authentication, rate limiting, and audit logging
 */
export function withAuth(
  handler: (req: Request, user: AuthUser, supabase: SupabaseClient) => Promise<Response>,
  options?: {
    requireRole?: string | string[];
    rateLimit?: { maxRequests: number; windowMinutes: number };
    auditAction?: string;
  }
) {
  return async (req: Request): Promise<Response> => {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
      // Authenticate
      const user = options?.requireRole
        ? await requireRole(req, options.requireRole)
        : await requireAuth(req);

      // Check rate limit
      if (options?.rateLimit) {
        const allowed = await checkRateLimit(
          supabase,
          user.id,
          req.url,
          options.rateLimit.maxRequests,
          options.rateLimit.windowMinutes
        );

        if (!allowed) {
          await logAuditEvent(
            supabase,
            user.id,
            options.auditAction || 'rate_limit_exceeded',
            'edge_function',
            req.url,
            undefined,
            false,
            'Rate limit exceeded'
          );

          return new Response(
            JSON.stringify({ error: 'Too Many Requests', message: 'Rate limit exceeded' }),
            { status: 429, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }

      // Execute handler
      const response = await handler(req, user, supabase);

      // Log successful audit event
      if (options?.auditAction) {
        await logAuditEvent(
          supabase,
          user.id,
          options.auditAction,
          'edge_function',
          req.url,
          undefined,
          true
        );
      }

      return response;
    } catch (err) {
      // If it's already a Response (from requireAuth/requireRole), return it
      if (err instanceof Response) {
        return err;
      }

      // Log error
      console.error('Edge function error:', err);

      // Return error response
      return new Response(
        JSON.stringify({ 
          error: 'Internal Server Error', 
          message: err instanceof Error ? err.message : 'Unknown error' 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  };
}

