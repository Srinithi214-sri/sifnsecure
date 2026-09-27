import { Link, NavLink } from 'react-router-dom';
import DerrickMark from './DerrickMark';
import { NAV_ITEMS } from './navItems';

export default function Sidebar({ open, onNavigate }) {
  return (
    <aside className={`sidebar${open ? ' open' : ''}`} aria-label="Main navigation">
      <Link to="/" className="brand" onClick={onNavigate}>
        <DerrickMark />
        <span>
          <span className="brand-name">SIF Precursor Engine</span>
          <br />
          <span className="brand-context">Oil India Limited · HSE</span>
        </span>
      </Link>

      <nav>
        <p className="nav-label">Workspace</p>
        <ul className="nav-list">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink to={to} end={to === '/'} className="nav-link" onClick={onNavigate}>
                <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <strong>Smart India Hackathon 2026</strong>
        Problem statement <span className="mono">SIH26165</span>
        <br />
        Upper Assam operations, Duliajan
      </div>
    </aside>
  );
}
