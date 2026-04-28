import Link from "next/link";

export default function AuthedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-neutral-800">
        <nav className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-semibold">
            jss-claude-listener
          </Link>
          <div className="flex gap-6 text-sm items-center">
            <Link href="/" className="opacity-80 hover:opacity-100">
              Runs
            </Link>
            <Link href="/chart" className="opacity-80 hover:opacity-100">
              Chart
            </Link>
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="opacity-60 hover:opacity-100 cursor-pointer"
              >
                Logout
              </button>
            </form>
          </div>
        </nav>
      </header>
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">{children}</main>
    </div>
  );
}
