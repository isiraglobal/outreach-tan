import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Target,
  Send,
  MessageSquare,
  Settings,
  Menu,
  X,
  Zap,
  FlaskConical
} from "lucide-react";

const navItems = [
  { name: "Dashboard",  path: "/",          Icon: LayoutDashboard },
  { name: "Leads",      path: "/leads",      Icon: Users },
  { name: "Campaigns",  path: "/campaigns",  Icon: Target },
  { name: "Sent Log",   path: "/sent",       Icon: Send },
  { name: "Replies",    path: "/replies",    Icon: MessageSquare },
  { name: "Testing",    path: "/testing",    Icon: FlaskConical },
  { name: "Settings",   path: "/settings",   Icon: Settings },
];

function NavLinks({ location, onItemClick }) {
  return (
    <nav style={{ padding: "12px 10px", flex: 1, overflowY: "auto" }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 8px", margin: "0 0 8px" }}>
        Navigation
      </p>
      {navItems.map(({ name, path, Icon }) => {
        const isActive = location.pathname === path;
        return (
          <Link
            key={path}
            to={path}
            onClick={onItemClick}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "9px 14px",
              borderRadius: 9,
              fontSize: 13.5,
              fontWeight: 500,
              color: isActive ? "#fff" : "var(--color-text-secondary)",
              background: isActive ? "var(--color-accent)" : "transparent",
              boxShadow: isActive ? "0 2px 8px rgba(139,158,110,0.3)" : "none",
              textDecoration: "none",
              marginBottom: 2,
              transition: "all 0.15s ease"
            }}
            onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = "var(--color-accent-light)"; e.currentTarget.style.color = "var(--color-text-primary)"; } }}
            onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--color-text-secondary)"; } }}
          >
            <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
            {name}
          </Link>
        );
      })}
    </nav>
  );
}

const sidebarStyles = {
  background: "var(--color-surface)",
  borderRight: "1px solid var(--color-border)",
  display: "flex",
  flexDirection: "column",
};

const logoArea = (
  <div style={{ padding: "18px 16px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", gap: 10 }}>
    <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-hover) 100%)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 3px 10px rgba(139,158,110,0.3)", flexShrink: 0 }}>
      <Zap size={17} color="#fff" strokeWidth={2.5} />
    </div>
    <div>
      <div style={{ fontSize: 15, fontWeight: 800, color: "var(--color-text-primary)", letterSpacing: "-0.02em", lineHeight: 1.2 }}>Outreach</div>
      <div style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 500 }}>Campaign Platform</div>
    </div>
  </div>
);

const statusFooter = (
  <div style={{ padding: "12px 16px", borderTop: "1px solid var(--color-border)", fontSize: 11, color: "var(--color-text-muted)" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#3D9C6E", boxShadow: "0 0 0 2px rgba(61,156,110,0.2)", animation: "pulse 2s ease-in-out infinite" }} />
      <span style={{ fontWeight: 500 }}>Backend Connected</span>
    </div>
    <p style={{ margin: "3px 0 0", fontSize: 10, color: "var(--color-text-muted)" }}>Sends: 10 AM – 4 PM EST only</p>
  </div>
);

export default function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Desktop Sidebar — hidden on mobile via CSS class */}
      <aside className="desktop-sidebar" style={{ ...sidebarStyles, position: "fixed", top: 0, left: 0, bottom: 0, width: 240, zIndex: 40 }}>
        {logoArea}
        <NavLinks location={location} onItemClick={null} />
        {statusFooter}
      </aside>

      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(3px)", zIndex: 48 }}
          className="mobile-only"
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside
        className="mobile-only"
        style={{
          ...sidebarStyles,
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: 240,
          zIndex: 50,
          transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)"
        }}
      >
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "10px 12px" }}>
          <button onClick={() => setMobileOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", color: "var(--color-text-primary)" }}>
            <X size={20} />
          </button>
        </div>
        {logoArea}
        <NavLinks location={location} onItemClick={() => setMobileOpen(false)} />
        {statusFooter}
      </aside>

      {/* Mobile Top Header */}
      <header
        className="mobile-only"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 45,
          background: "var(--color-surface)",
          borderBottom: "1px solid var(--color-border)",
          height: 54,
          padding: "0 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <button onClick={() => setMobileOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 4, color: "var(--color-text-primary)" }}>
          <Menu size={22} />
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: "var(--color-accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Zap size={13} color="#fff" />
          </div>
          <span style={{ fontSize: 15, fontWeight: 800, color: "var(--color-text-primary)" }}>Outreach</span>
        </div>
        <div style={{ width: 30 }} />
      </header>

      {/* Main Content */}
      <main className="main-content-area">
        <div style={{ maxWidth: 1140, margin: "0 auto", padding: "30px 28px" }} className="page-content-inner">
          {children}
        </div>
      </main>
    </div>
  );
}
