export default function AdminLoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-6 text-slate-100">
      <section
        aria-labelledby="login-title"
        className="w-full max-w-md space-y-4 rounded-md border border-slate-800 bg-slate-900 p-8"
      >
        <p className="text-sm font-medium text-cyan-400">BodenseeGuide</p>
        <h1 id="login-title" className="text-2xl font-semibold">
          Admin sign in
        </h1>
        <p className="text-sm text-slate-400">Authentication will be enabled in LAKE-014.</p>
      </section>
    </main>
  );
}
