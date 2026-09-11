export default function Home() {
  return (
    <div className="mx-auto mt-24 max-w-lg text-center">
      <h1 className="text-xl font-semibold">Training CRM</h1>
      <p className="mt-2 text-sm text-neutral-500">
        Trainers: sign in at{" "}
        <a href="/admin" className="text-blue-700 hover:underline">
          /admin
        </a>{" "}
        to manage scenarios and review sessions. Trainees: use the link your
        trainer sent you.
      </p>
    </div>
  );
}
