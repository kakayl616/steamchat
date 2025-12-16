import Link from "next/link";

export default function AdminLayout({ children }: any) {
  return (
    <div style={{
      display: "flex",
      minHeight: "100vh",
      background: "#1b2838",
      color: "#c7d5e0",
      fontFamily: "Arial"
    }}>
      
      {/* Sidebar */}
      <div style={{
        width: "250px",
        background: "#171a21",
        padding: "1.5rem"
      }}>
        <h2 style={{ color: "#66c0f4", marginBottom: "2rem" }}>Admin Panel</h2>

        <nav style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <Link href="/admin" style={{ color: "#c7d5e0" }}>Dashboard</Link>
          <Link href="/admin/sites" style={{ color: "#c7d5e0" }}>Generated Sites</Link>
          <Link href="/admin/users" style={{ color: "#c7d5e0" }}>Users</Link>
        </nav>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: "2rem" }}>
        {children}
      </div>
    </div>
  );
}
