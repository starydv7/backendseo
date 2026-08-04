import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { Request } from 'express';

export type AuthUser = {
  id: string;
  email?: string;
  role?: string;
};

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private jwks: ReturnType<typeof createRemoteJWKSet>;
  private issuer: string;

  constructor(private readonly config: ConfigService) {
    const jwksUrl = this.config.getOrThrow<string>('SUPABASE_JWKS_URL');
    const supabaseUrl = this.config.getOrThrow<string>('SUPABASE_URL');
    this.jwks = createRemoteJWKSet(new URL(jwksUrl));
    this.issuer = `${supabaseUrl.replace(/\/$/, '')}/auth/v1`;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing Bearer token — please log in');
    }

    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      throw new UnauthorizedException('Missing Bearer token — please log in');
    }

    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
        audience: 'authenticated',
      });

      const sub = payload.sub;
      if (!sub) {
        throw new UnauthorizedException('Invalid token subject');
      }

      req.user = {
        id: sub,
        email: typeof payload.email === 'string' ? payload.email : undefined,
        role: typeof payload.role === 'string' ? payload.role : undefined,
      };
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid or expired session — please log in again');
    }
  }
}
