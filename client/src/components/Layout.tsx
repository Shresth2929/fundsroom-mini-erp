import React, { useState } from 'react';
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../types';

interface NavItem {
  name: string;
  path: string;
  roles: Role[];
  icon: React.ReactNode;
}

export const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems: NavItem[] = [
    {
      name: 'Dashboard',
      path: '/',
      roles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'],
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="nav-icon" style={{ width: '20px', height: '20px' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
        </svg>
      )
    },
    {
      name: 'Customers',
      path: '/customers',
      roles: ['ADMIN', 'SALES', 'ACCOUNTS'],
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="nav-icon" style={{ width: '20px', height: '20px' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.978 11.978 0 0 1 12 20.25a11.98 11.98 0 0 1-3-.113v-.109c0-1.113.285-2.16.786-3.07M7 19.128a9.38 9.38 0 0 1-2.625.372 9.337 9.337 0 0 1-4.121-.952 4.125 4.125 0 0 1 7.533-2.493M7 19.128v-.003c0-1.113.285-2.16.786-3.07M7 19.128v.109A11.978 11.978 0 0 0 12 20.25a11.980 11.980 0 0 0 3-.113v-.109c0-1.113-.285-2.16-.786-3.07M12 7.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM1.5 7.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM22.5 7.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12 17.25a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z" />
        </svg>
      )
    },
    {
      name: 'Products',
      path: '/products',
      roles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'],
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="nav-icon" style={{ width: '20px', height: '20px' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
      )
    },
    {
      name: 'Inventory',
      path: '/inventory',
      roles: ['ADMIN', 'WAREHOUSE'],
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="nav-icon" style={{ width: '20px', height: '20px' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
        </svg>
      )
    },
    {
      name: 'Challans',
      path: '/challans',
      roles: ['ADMIN', 'SALES', 'ACCOUNTS'],
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="nav-icon" style={{ width: '20px', height: '20px' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      )
    }
  ];

  const filteredNavItems = navItems.filter(item => user && item.roles.includes(user.role));

  return (
    <div className="app-container">
      {/* Sidebar for Desktop */}
      <aside className={`sidebar-container ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2 className="brand-logo">FundsRoom ERP</h2>
          <button className="mobile-close-btn" onClick={() => setMobileMenuOpen(false)}>×</button>
        </div>
        <nav className="sidebar-nav">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`nav-link-item ${isActive ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="main-layout-wrapper">
        <header className="top-header-container">
          <button className="mobile-toggle-btn" onClick={() => setMobileMenuOpen(true)}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="hamburger-icon" style={{ width: '24px', height: '24px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          
          <div className="header-user-section">
            <div className="user-profile-meta">
              <span className="user-name-text">{user?.name}</span>
              <span className={`role-badge role-${user?.role?.toLowerCase()}`}>
                {user?.role}
              </span>
            </div>
            <button className="logout-btn-header" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        <main className="content-container-inner">
          <Outlet />
        </main>
      </div>
      
      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && <div className="sidebar-backdrop" onClick={() => setMobileMenuOpen(false)}></div>}
    </div>
  );
};

export default Layout;
