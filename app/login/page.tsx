import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = typeof params.next === "string" && params.next.startsWith("/") ? params.next : "/";

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold mb-1">jss-claude-listener</h1>
        <p className="text-sm opacity-70 mb-6">Acesso restrito.</p>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
