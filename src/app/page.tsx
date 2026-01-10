import Dashboard from "@/components/Dashboard";

export default function HomePage() {
  return (
    <main>
      <div className="header">
        <div className="hero">
          <span className="badge">Bscout</span>
          <h1>Scout local businesses by the tags that matter.</h1>
          <p>Collect, tag, and search your business list in seconds.</p>
        </div>
      </div>
      <Dashboard />
    </main>
  );
}
