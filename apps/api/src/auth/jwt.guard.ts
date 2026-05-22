import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import type { Request } from 'express';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

export interface AuthedUser {
  id: string;
  email: string;
  role?: string;
}

declare module 'express' {
  interface Request {
    user?: AuthedUser;
  }
}

/**
 * Supabase JWT doğrulayan guard.
 *
 * Akış:
 *  - Authorization: Bearer <token> bekler
 *  - Supabase JWKS endpoint'inden public key set'ini cache'leyerek RS256 imza doğrular
 *  - issuer + audience kontrolü
 *  - sub claim'i `user.id` olarak request'e bağlar
 *
 * Eski kod (base64 decode) auth bypass açığıydı (CVE-class). Bu sınıf onun yerine geçer.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);
  private jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
  private issuer: string | null = null;

  private ensureJwks(): ReturnType<typeof createRemoteJWKSet> {
    if (this.jwks) return this.jwks;
    const supabaseUrl = process.env.SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL env var missing — JWT guard cannot start');
    }
    this.issuer = `${supabaseUrl}/auth/v1`;
    this.jwks = createRemoteJWKSet(
      new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`),
      { cooldownDuration: 30_000, cacheMaxAge: 600_000 },
    );
    return this.jwks;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing Authorization header');
    }
    const token = auth.slice(7).trim();
    if (!token) {
      throw new UnauthorizedException('Empty bearer token');
    }

    const jwks = this.ensureJwks();
    let payload: JWTPayload;
    try {
      const result = await jwtVerify(token, jwks, {
        issuer: this.issuer ?? undefined,
        audience: 'authenticated',
        algorithms: ['RS256', 'ES256'],
      });
      payload = result.payload;
    } catch (err) {
      this.logger.warn(`JWT verify failed: ${(err as Error).message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }

    const sub = payload.sub;
    if (!sub || typeof sub !== 'string') {
      throw new UnauthorizedException('Invalid subject');
    }

    req.user = {
      id: sub,
      email: typeof payload.email === 'string' ? payload.email : '',
      role: typeof payload.role === 'string' ? payload.role : undefined,
    };
    return true;
  }
}

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthedUser => {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (!req.user) throw new UnauthorizedException();
    return req.user;
  },
);
