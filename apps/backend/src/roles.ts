import { z } from 'zod';

/** What one backend process does (ARCHITECTURE.md §1): HTTP API and/or background worker. */
export const backendRoles = ['api', 'worker'] as const;

export type BackendRole = (typeof backendRoles)[number];

const splitList = (text: string): string[] =>
  text
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item !== '');

/** `"api, worker"` → `['api', 'worker']`; at least one role, duplicates removed. */
export const backendRolesSchema = z
  .string()
  .transform(splitList)
  .pipe(z.array(z.enum(backendRoles)).min(1))
  .transform((roles): readonly BackendRole[] => [...new Set(roles)]);

/** `"172.18.0.0/16, fd00::/8"` → list of CIDRs; empty string → no trusted proxies. */
export const cidrListSchema = z
  .string()
  .transform(splitList)
  .pipe(z.array(z.union([z.cidrv4(), z.cidrv6()])));
