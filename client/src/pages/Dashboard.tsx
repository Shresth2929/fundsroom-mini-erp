import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';

interface DashboardStats {
  customers: number | null;
  products: number | null;
  lowStock: number | null;
  challans: number | null;
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    customers: null,
    products: null,
    lowStock: null,
    challans: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      try {
        setLoading(true);
        setError(null);

        // Fetch counts in parallel from existing API endpoints
        // Note: we request limit=1 to minimize DB footprint, extracting `total` from responses
        const promises: Promise<any>[] = [];
        const keys: string[] = [];

        // Dynamic checks based on roles
        const canViewCustomers = ['ADMIN', 'SALES', 'ACCOUNTS'].includes(user.role);
        const canViewProducts = ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'].includes(user.role);
        const canViewLowStock = ['ADMIN', 'WAREHOUSE'].includes(user.role);
        const canViewChallans = ['ADMIN', 'SALES', 'ACCOUNTS'].includes(user.role);

        if (canViewCustomers) {
          promises.push(apiFetch<any>('/customers?limit=1'));
          keys.push('customers');
        }
        if (canViewProducts) {
          promises.push(apiFetch<any>('/products?limit=1'));
          keys.push('products');
        }
        if (canViewLowStock) {
          promises.push(apiFetch<any>('/inventory/low-stock?limit=1'));
          keys.push('lowStock');
        }
        if (canViewChallans) {
          promises.push(apiFetch<any>('/challans?limit=1'));
          keys.push('challans');
        }

        const results = await Promise.all(promises);
        const newStats: any = {};

        results.forEach((result, index) => {
          const key = keys[index];
          newStats[key] = result?.data?.total ?? 0;
        });

        setStats((prev) => ({ ...prev, ...newStats }));
      } catch (err: any) {
        console.error('Failed to load dashboard metrics:', err);
        setError('Failed to fetch portal metrics. Please check connection.');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  // Dynamic modules navigation links based on user role
  const modules = [
    {
      name: 'Customers CRM',
      desc: 'Manage customer database, follow-ups, and leads information.',
      path: '/customers',
      roles: ['ADMIN', 'SALES', 'ACCOUNTS'],
      color: 'blue',
    },
    {
      name: 'Product Catalog',
      desc: 'View active SKUs, update specifications, and adjust locations.',
      path: '/products',
      roles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'],
      color: 'emerald',
    },
    {
      name: 'Inventory Movements',
      desc: 'Record manual warehouse IN/OUT logs and audit levels.',
      path: '/inventory',
      roles: ['ADMIN', 'WAREHOUSE'],
      color: 'purple',
    },
    {
      name: 'Delivery Challans',
      desc: 'Generate delivery invoices, confirm dispatches, and process cancels.',
      path: '/challans',
      roles: ['ADMIN', 'SALES', 'ACCOUNTS'],
      color: 'orange',
    },
  ];

  const allowedModules = modules.filter((m) => user && m.roles.includes(user.role));

  return (
    <div className="dashboard-page-container">
      {/* Header banner */}
      <div className="dashboard-welcome-banner">
        <h1 className="welcome-title">Welcome, {user?.name}!</h1>
        <p className="welcome-subtitle">
          Operations Portal Dashboard — Accessing as <span className="text-highlight">{user?.role}</span>
        </p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Metrics Grid */}
      <div className="metrics-grid">
        {/* Customers Card */}
        {['ADMIN', 'SALES', 'ACCOUNTS'].includes(user?.role || '') && (
          <div className="metric-card card-blue">
            <div className="metric-header">
              <span className="metric-label">CRM Customers</span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="metric-icon">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.978 11.978 0 0112 20.25a11.978 11.978 0 01-3-.113v-.109c0-1.113.285-2.16.786-3.07M7 19.128a9.38 9.38 0 01-2.625.372 9.337 9.337 0 01-4.121-.952 4.125 4.125 0 0 1 7.533-2.493M7 19.128v-.003c0-1.113.285-2.16.786-3.07M7 19.128v.109A11.978 11.978 0 0012 20.25a11.980 11.980 0 003-.113v-.109c0-1.113-.285-2.16-.786-3.07M12 7.5a3 3 0 100-6 3 3 0 000 6ZM1.5 7.5a3 3 0 100-6 3 3 0 000 6ZM22.5 7.5a3 3 0 100-6 3 3 0 000 6ZM12 17.25a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5Z" />
              </svg>
            </div>
            <div className="metric-value">
              {loading ? <span className="skeleton-line mini"></span> : stats.customers}
            </div>
            <p className="metric-desc">Registered client database profiles</p>
          </div>
        )}

        {/* Products Card */}
        <div className="metric-card card-emerald">
          <div className="metric-header">
            <span className="metric-label">Active SKUs</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="metric-icon">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          </div>
          <div className="metric-value">
            {loading ? <span className="skeleton-line mini"></span> : stats.products}
          </div>
          <p className="metric-desc">Products listed in catalog</p>
        </div>

        {/* Low Stock Alerts Card (ADMIN, WAREHOUSE only) */}
        {['ADMIN', 'WAREHOUSE'].includes(user?.role || '') && (
          <div className="metric-card card-purple">
            <div className="metric-header">
              <span className="metric-label">Low Stock Alerts</span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="metric-icon">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div className="metric-value text-danger-val">
              {loading ? <span className="skeleton-line mini"></span> : stats.lowStock}
            </div>
            <p className="metric-desc">Products at or below min threshold</p>
          </div>
        )}

        {/* Challans Card */}
        {['ADMIN', 'SALES', 'ACCOUNTS'].includes(user?.role || '') && (
          <div className="metric-card card-orange">
            <div className="metric-header">
              <span className="metric-label">Invoices / Challans</span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="metric-icon">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div className="metric-value">
              {loading ? <span className="skeleton-line mini"></span> : stats.challans}
            </div>
            <p className="metric-desc">Delivery challans processed in system</p>
          </div>
        )}
      </div>

      {/* Navigation Modules Section */}
      <h2 className="section-title">Available Portal Modules</h2>
      <div className="modules-grid">
        {allowedModules.map((m) => (
          <Link key={m.name} to={m.path} className={`module-card border-${m.color}`}>
            <h3 className="module-name">{m.name}</h3>
            <p className="module-desc">{m.desc}</p>
            <div className="module-action">
              <span>Enter Module </span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="arrow-icon" style={{ width: '16px', height: '16px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
