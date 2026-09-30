import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, signOut } = useAuth();
  return (
    <>
      <header className="nav">
        <Link to="/" className="brand">Data Explorer</Link>
        <nav>
          <Link to="/">Explore</Link>
          <Link to="/upload">Upload</Link>
        </nav>
        <span className="spacer" />
        <span className="muted">{user?.email}</span>
        <button className="secondary" onClick={signOut}>Sign out</button>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </>
  );
}
