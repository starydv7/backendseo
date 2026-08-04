import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';

const links = [
  { to: '/posts', label: 'Posts' },
  { to: '/authors', label: 'Authors' },
  { to: '/categories', label: 'Categories' },
  { to: '/tags', label: 'Tags' },
  { to: '/comments', label: 'Comments' },
];

export function AppLayout() {
  const { user, signOut } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <h1>BackendSEO</h1>
          <p>Content admin</p>
        </div>
        <nav className="nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => (isActive ? 'active' : undefined)}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user" title={user?.email || ''}>
            {user?.email || 'Signed in'}
          </div>
          <button
            type="button"
            className="btn btn-secondary sidebar-logout"
            onClick={() => void signOut()}
          >
            Log out
          </button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
