import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import NewSku from './pages/NewSku';
import Library from './pages/Library';
import ModelStudio from './pages/ModelStudio';
import Billing from './pages/Billing';

const navStyle: React.CSSProperties = {
  display: 'flex',
  gap: 16,
  padding: '12px 24px',
  borderBottom: '1px solid #eee',
  background: '#fafafa',
};

const linkStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
  textDecoration: 'none',
  color: isActive ? '#111' : '#666',
  fontWeight: isActive ? 600 : 400,
});

export default function App() {
  return (
    <BrowserRouter>
      <nav style={navStyle}>
        <strong style={{ marginRight: 8 }}>Fashion SaaS</strong>
        <NavLink to="/" end style={linkStyle}>Dashboard</NavLink>
        <NavLink to="/new-sku" style={linkStyle}>New SKU</NavLink>
        <NavLink to="/library" style={linkStyle}>Library</NavLink>
        <NavLink to="/model-studio" style={linkStyle}>Model Studio</NavLink>
        <NavLink to="/billing" style={linkStyle}>Billing</NavLink>
      </nav>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/new-sku" element={<NewSku />} />
        <Route path="/library" element={<Library />} />
        <Route path="/model-studio" element={<ModelStudio />} />
        <Route path="/billing" element={<Billing />} />
      </Routes>
    </BrowserRouter>
  );
}
