export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 flex items-center justify-center px-6 py-12 sm:py-20">
        <div className="w-full max-w-[400px]">{children}</div>
      </main>
      <footer className="py-4 text-center">
        <p className="text-text-muted text-xs">
          РАЗУМ &copy; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
