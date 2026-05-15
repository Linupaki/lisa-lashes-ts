// src/auth/password.ts
import * as bcrypt from 'bcrypt';

/**
 * Hashes a plain text password using bcrypt.
 * Used during user registration.
 * * @param password The plain text password from the user
 * @returns A promise that resolves to the secure hash string
 */
export async function hashPassword(password: string): Promise<string> {
  // 10 salt rounds is the industry standard for a good balance of speed and security
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Compares a plain text password against an existing database hash.
 * Used during user login.
 * * @param password The plain text password entered at login
 * @param hash The stored password_hash retrieved from the database
 * @returns A promise that resolves to true if they match, or false if they don't
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}
