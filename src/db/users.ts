import type { Env } from "../env";
import { createDbClient } from "./client";

export type UserRow = {
  id: string;
  email: string;
  password_hash: string | null;
  display_name: string | null;
  auth_provider: string;
  google_sub: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export async function findUserByEmail(
  env: Env,
  email: string,
): Promise<UserRow | null> {
  const client = createDbClient(env);
  await client.connect();

  try {
    const result = await client.query<UserRow>(
      `
        select *
        from users
        where lower(email) = lower($1)
        limit 1
      `,
      [email],
    );

    return result.rows[0] ?? null;
  } finally {
    await client.end();
  }
}

export async function findUserById(
  env: Env,
  userId: string,
): Promise<UserRow | null> {
  const client = createDbClient(env);
  await client.connect();

  try {
    const result = await client.query<UserRow>(
      `
        select *
        from users
        where id = $1
        limit 1
      `,
      [userId],
    );

    return result.rows[0] ?? null;
  } finally {
    await client.end();
  }
}

export async function createPasswordUser(
  env: Env,
  input: {
    email: string;
    passwordHash: string;
    displayName?: string;
  },
): Promise<UserRow> {
  const client = createDbClient(env);
  await client.connect();

  try {
    const result = await client.query<UserRow>(
      `
        insert into users (
          email,
          password_hash,
          display_name,
          auth_provider
        )
        values ($1, $2, $3, 'password')
        returning *
      `,
      [input.email.toLowerCase(), input.passwordHash, input.displayName ?? null],
    );

    return result.rows[0];
  } finally {
    await client.end();
  }
}