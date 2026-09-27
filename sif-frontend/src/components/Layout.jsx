import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function Layout() {
  // Mobile sidebar menu open/closed
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="app-shell">
      <Sidebar open={menuOpen} onNavigate={closeMenu} />
      <div className={`sidebar-scrim${menuOpen ? ' open' : ''}`} onClick={closeMenu} aria-hidden="true" />

      <div className="main-column">
        <TopBar onMenuClick={() => setMenuOpen(true)} />
        <main className="page-content">
          <Outlet />
        </main>
        <footer className="app-footer">
          <span className="prototype-badge">Prototype — representative sample data</span>
        </footer>
      </div>
    </div>
  );
}
