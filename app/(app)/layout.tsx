import TopNav from "@/components/TopNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <TopNav />
      <main
        id="main-content"
        className="flex-1 max-w-6xl mx-auto w-full min-w-0 px-4 sm:px-6 py-6 sm:py-10"
        aria-label="Main content"
      >
        {children}
      </main>
    </div>
  );
}
