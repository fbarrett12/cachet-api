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

export async function findUserByGoogleSub(
  env: Env,
  googleSub: string,
): Promise<UserRow | null> {
  const client = createDbClient(env);
  await client.connect();

  try {
    const sql = `
      select *
      from users
      where google_sub = $1
      limit 1
    `;

    const values = [googleSub];

    const result = await client.query<UserRow>(sql, values);

    return result.rows[0] ?? null;
  } finally {
    await client.end();
  }
}

export async function createGoogleUser(
  env: Env,
  input: {
    email: string;
    googleSub: string;
    displayName?: string;
    avatarUrl?: string;
  },
): Promise<UserRow> {
  const client = createDbClient(env);
  await client.connect();

  try {
    const sql = `
      insert into users (
        email,
        google_sub,
        display_name,
        avatar_url,
        auth_provider
      )
      values ($1, $2, $3, $4, 'google')
      returning *
    `;

    const values = [
      input.email.toLowerCase(),
      input.googleSub,
      input.displayName ?? null,
      input.avatarUrl ?? null,
    ];

    const result = await client.query<UserRow>(sql, values);

    return result.rows[0];
  } finally {
    await client.end();
  }
}

export async function attachGoogleToExistingUser(
  env: Env,
  input: {
    userId: string;
    googleSub: string;
    displayName?: string;
    avatarUrl?: string;
  },
): Promise<UserRow> {
  const client = createDbClient(env);
  await client.connect();

  try {
    const sql = `
      update users
      set
        google_sub = $2,
        auth_provider = 'google',
        display_name = coalesce(display_name, $3),
        avatar_url = coalesce(avatar_url, $4),
        updated_at = now()
      where id = $1
      returning *
    `;

    const values = [
      input.userId,
      input.googleSub,
      input.displayName ?? null,
      input.avatarUrl ?? null,
    ];

    const result = await client.query<UserRow>(sql, values);

    return result.rows[0];
  } finally {
    await client.end();
  }
}