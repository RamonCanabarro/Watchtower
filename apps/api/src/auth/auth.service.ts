import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { hashPassword, verifyPassword } from './password.js';
import type { LoginDto, RegisterDto } from './auth.dto.js';

export const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');
const dummyHash = `scrypt-v1:${'00'.repeat(16)}:${'00'.repeat(64)}`;

@Injectable()
export class AuthService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  async register(dto: RegisterDto) {
    const passwordHash = await hashPassword(dto.password);
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: { email: dto.email, passwordHash },
          select: { id: true, email: true },
        });
        await tx.session.create({
          data: { userId: user.id, tokenHash: hashToken(token), expiresAt },
        });
        return user;
      });
      return { user, token, expiresAt };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Não foi possível criar uma conta com esses dados. Tente entrar na sua conta.',
        );
      }
      throw error;
    }
  }
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    const valid = await verifyPassword(
      dto.password,
      user?.passwordHash ?? dummyHash,
    );
    if (!user || !valid)
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    await this.prisma.session.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    });
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.session.create({
      data: { userId: user.id, tokenHash: hashToken(token), expiresAt },
    });
    return { user: { id: user.id, email: user.email }, token, expiresAt };
  }
  async session(token: string) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token))
      throw new UnauthorizedException('Sessão inválida.');
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: { select: { id: true, email: true } } },
    });
    if (!session || session.expiresAt <= new Date())
      throw new UnauthorizedException('Sessão expirada ou inválida.');
    return session;
  }
  async logout(sessionId: string) {
    await this.prisma.session.deleteMany({ where: { id: sessionId } });
  }
}
