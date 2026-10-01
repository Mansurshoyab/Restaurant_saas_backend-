
import { z } from 'zod';

const permissionKey = z.string().min(1);

export const createRoleSchema = z.object({
  key: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[A_Z0-9_]+$/i, 'Key must be letters, numbers, underscores only')
    .transform((v) => v.toUpperCase()),
  name: z.string().min(2).max(80),
  permissions: z.array(permissionKey).min(0),
});

export const updateRoleSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  permissions: z.array(permissionKey).optional(),
});


