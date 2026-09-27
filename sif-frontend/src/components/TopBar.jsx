import { FilePlus, Menu } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { findNavItem } from './navItems';

export default function TopBar({ onMenuClick }) {
  const { pathname } = useLocation();
  const current = findNavItem(pathname);

  return (
    <header className="topbar">
      <div className="topbar-actions">
        <button type="button" className="menu-button" onClick={onMenuClick} aria-label="Open navigation">
          <Menu size={20} aria-hidden="true" />
        </button>
        <div className="topbar-title">
          <h1>{current.label}</h1>
          <p>{current.description}</p>
        </div>
      </div>

      {current.to !== '/submit' && (
        <div className="topbar-actions">
          <Link to="/submit" className="btn btn-primary">
            <FilePlus size={16} aria-hidden="true" />
            <span className="btn-label">Submit report</span>
          </Link>
        </div>
      )}
    </header>
  );
}
