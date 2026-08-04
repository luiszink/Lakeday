'use client';

import { useState, type FormEvent } from 'react';

type User = {
  id: string;
  email: string;
  role: 'EDITOR' | 'REVIEWER' | 'ADMIN';
  isActive: boolean;
  createdAt: string;
};
const roles = ['EDITOR', 'REVIEWER', 'ADMIN'] as const;

export function AdminUsers({ initialUsers }: Readonly<{ initialUsers: User[] }>) {
  const [users, setUsers] = useState(initialUsers);
  const [message, setMessage] = useState<string | null>(null);

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: form.get('email'),
        password: form.get('password'),
        role: form.get('role'),
      }),
    });
    const body = (await response.json()) as { user?: User; error?: string };
    if (response.ok && body.user) {
      setUsers((current) =>
        [...current, body.user!].sort((left, right) => left.email.localeCompare(right.email)),
      );
      event.currentTarget.reset();
      setMessage('User created.');
    } else {
      setMessage(body.error ?? 'Unable to create user.');
    }
  }

  async function updateUser(id: string, update: { role?: string; isActive?: boolean }) {
    const response = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(update),
    });
    const body = (await response.json()) as { user?: User; error?: string };
    if (response.ok && body.user) {
      setUsers((current) => current.map((user) => (user.id === id ? body.user! : user)));
      setMessage('User updated.');
    } else {
      setMessage(body.error ?? 'Unable to update user.');
    }
  }

  return (
    <section aria-labelledby="users-title" className="space-y-8">
      <div className="space-y-2">
        <p className="text-sm font-medium text-cyan-400">Administration</p>
        <h1 id="users-title" className="text-3xl font-semibold tracking-tight">
          Admin users
        </h1>
        <p className="text-slate-400">Create staff accounts and control their roles.</p>
      </div>
      <form
        className="grid gap-3 rounded-md border border-slate-800 bg-slate-900 p-4 md:grid-cols-4"
        onSubmit={createUser}
      >
        <input
          aria-label="Email"
          name="email"
          required
          type="email"
          placeholder="staff@example.com"
          className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
        />
        <input
          aria-label="Temporary password"
          name="password"
          required
          minLength={12}
          type="password"
          placeholder="Temporary password"
          className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
        />
        <select
          aria-label="Role"
          name="role"
          defaultValue="EDITOR"
          className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
        >
          {roles.map((role) => (
            <option key={role}>{role}</option>
          ))}
        </select>
        <button
          className="rounded-md bg-cyan-500 px-4 py-2 font-medium text-slate-950"
          type="submit"
        >
          Create user
        </button>
      </form>
      {message ? (
        <p aria-live="polite" className="text-sm text-slate-300">
          {message}
        </p>
      ) : null}
      <div className="overflow-x-auto rounded-md border border-slate-800">
        <table className="w-full min-w-[38rem] text-left text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr className="border-t border-slate-800" key={user.id}>
                <td className="px-4 py-3">{user.email}</td>
                <td className="px-4 py-3">
                  <select
                    aria-label={`Role for ${user.email}`}
                    value={user.role}
                    onChange={(event) => updateUser(user.id, { role: event.target.value })}
                    className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1"
                  >
                    {roles.map((role) => (
                      <option key={role}>{role}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">{user.isActive ? 'Active' : 'Inactive'}</td>
                <td className="px-4 py-3">
                  <button
                    className="text-cyan-300 hover:text-cyan-100"
                    type="button"
                    onClick={() => updateUser(user.id, { isActive: !user.isActive })}
                  >
                    {user.isActive ? 'Deactivate' : 'Reactivate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
