import { loginAction } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; from?: string }>;
}) {
  const { error, from } = await searchParams;

  return (
    <div className="mx-auto mt-24 max-w-sm rounded border border-neutral-300 bg-white p-6">
      <h1 className="mb-4 text-lg font-semibold">Trainer sign-in</h1>
      <form action={loginAction} className="space-y-3">
        <input type="hidden" name="from" value={from ?? "/admin"} />
        <input
          type="password"
          name="password"
          placeholder="Trainer password"
          className="w-full rounded border border-neutral-300 p-2 text-sm"
          autoFocus
        />
        {error && (
          <p className="text-sm text-red-700">Incorrect password. Try again.</p>
        )}
        <button
          type="submit"
          className="w-full rounded bg-neutral-800 py-2 text-sm text-white"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
