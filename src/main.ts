import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { createServer } from 'net';
import { join } from 'path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

function freePort(port: number) {
  try {
    const out = execSync('netstat -ano', { encoding: 'utf8' });
    const pids = new Set<string>();
    for (const line of out.split(/\r?\n/)) {
      if (!line.includes(`:${port}`) || !line.includes('LISTENING')) continue;
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && /^\d+$/.test(pid) && pid !== String(process.pid)) {
        pids.add(pid);
      }
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
        console.log(`Freed port ${port} (killed PID ${pid})`);
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }
}

function canListen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '0.0.0.0');
  });
}

async function resolvePort(preferred: number): Promise<number> {
  freePort(preferred);
  // brief pause so Windows releases the socket
  await new Promise((r) => setTimeout(r, 500));
  if (await canListen(preferred)) return preferred;

  for (let p = preferred + 1; p <= preferred + 20; p++) {
    freePort(p);
    if (await canListen(p)) {
      console.warn(`Port ${preferred} busy — using ${p}`);
      return p;
    }
  }
  throw new Error(`No free port near ${preferred}`);
}

async function bootstrap() {
  const uploadDest = process.env.UPLOAD_DEST || './uploads';
  if (!existsSync(uploadDest)) {
    mkdirSync(uploadDest, { recursive: true });
  }

  const preferred = parseInt(process.env.PORT || '3000', 10);
  const port = await resolvePort(preferred);

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableCors();
  app.useStaticAssets(join(process.cwd(), uploadDest), {
    prefix: '/uploads',
  });

  await app.listen(port);
  console.log(`Blog API running on http://localhost:${port}`);
}

bootstrap();
