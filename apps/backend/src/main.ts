import { isIpv4Address } from '@projectu/core-nettools';
import Fastify from 'fastify';

const app = Fastify({ logger: true });
const host = process.env['BACKEND_HOST'] ?? '127.0.0.1';
const port = Number(process.env['BACKEND_PORT'] ?? '4000');

await app.listen({ host, port });
app.log.info({ coreWiring: isIpv4Address('127.0.0.1') }, 'backend started');
