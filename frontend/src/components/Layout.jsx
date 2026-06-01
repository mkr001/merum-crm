// src/components/Layout.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useResponsive from '../utils/useResponsive';
import api from '../utils/api';
import {
  LayoutDashboard, Users, UserCheck, CheckSquare, Calendar,
  FileText, FolderOpen, BarChart2, HeartHandshake, Settings,
  LogOut, Menu, X, Bell, Building2, Shield, Contact,
  Ticket, IndianRupee, BarChart3, FileSignature, CheckCheck
} from 'lucide-react';

// ── Role-based nav config ──────────────────────────────────────
// roles: admin, manager, accountant, sales, viewer
const ALL_NAV = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard',  roles: ['admin','manager','accountant','sales','viewer', 'client'] },
  { to: '/leads',      icon: UserCheck,        label: 'Leads',      roles: ['admin','manager','sales'] },
  { to: '/onboarding', icon: FileSignature,    label: 'My Onboarding', roles: ['admin','manager','sales', 'client'] },
  { to: '/clients',    icon: Building2,        label: 'Clients',    roles: ['admin','manager','accountant','sales','viewer'] },
  { to: '/contacts',   icon: Contact,          label: 'Contacts',   roles: ['admin','manager','accountant','sales','viewer'] },
  { to: '/tasks',      icon: CheckSquare,      label: 'Tasks',      roles: ['admin','manager','accountant','sales'] },
  { to: '/compliance', icon: Calendar,         label: 'Compliance', roles: ['admin','manager','accountant', 'client'] },
  { to: '/invoices',   icon: FileText,         label: 'Invoices',   roles: ['admin','manager','accountant', 'client'] },
  { to: '/documents',  icon: FolderOpen,       label: 'Documents',  roles: ['admin','manager','accountant', 'client'] },
  { to: '/reports',    icon: BarChart2,        label: 'Reports',    roles: ['admin','manager','viewer'] },
  { to: '/partners',   icon: HeartHandshake,   label: 'Partners',   roles: ['admin','manager'] },
  { to: '/tickets',    icon: Ticket,           label: 'Tickets',    roles: ['admin','manager','accountant','sales', 'client'] },
  { to: '/revenue',    icon: IndianRupee,      label: 'Revenue',    roles: ['admin','manager','accountant'] },
  { to: '/workload',   icon: BarChart3,        label: 'Workload',   roles: ['admin','manager'] },
  { to: '/contracts',  icon: FileSignature,    label: 'Contracts',  roles: ['admin','manager'] },
  { to: '/team',       icon: Users,            label: 'Team',       roles: ['admin','manager'] },
];

// Role badge colors
const ROLE_STYLE = {
  admin:      { bg: '#fcebeb', color: '#a32d2d' },
  manager:    { bg: '#eeedfe', color: '#534ab7' },
  accountant: { bg: '#faeeda', color: '#854f0b' },
  sales:      { bg: '#eaf3de', color: '#3b6d11' },
  viewer:     { bg: '#f8f7f4', color: '#888' },
  client:     { bg: '#e1f5ee', color: '#0f6e56' },
};

export default function Layout() {
  const { isMobile } = useResponsive();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // ── Notifications state ────────────────────────────────────────
  const [notifications, setNotifications]   = useState([]);
  const [unreadCount, setUnreadCount]       = useState(0);
  const [showNotif, setShowNotif]           = useState(false);
  const [notifLoading, setNotifLoading]     = useState(false);
  const notifRef = useRef(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications/unread-count');
      setUnreadCount(data.count || 0);
    } catch { /* silent — non-critical */ }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setNotifLoading(true);
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.data || []);
    } catch { /* silent */ } finally { setNotifLoading(false); }
  }, []);

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  const markOneRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* silent */ }
  };

  // Open panel: fetch notifications
  const toggleNotif = () => {
    if (!showNotif) fetchNotifications();
    setShowNotif(v => !v);
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Poll unread count every 60 s
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  const handleLogout = () => { logout(); navigate('/login'); };

  useEffect(() => { setSidebarOpen(!isMobile); }, [isMobile]);

  const userRole = user?.role || 'viewer';
  const navItems = ALL_NAV.filter(item => item.roles.includes(userRole));
  const roleStyle = ROLE_STYLE[userRole] || ROLE_STYLE.viewer;

  const notifTypeIcon = (type) => {
    const map = { invoice_overdue: '🧾', compliance_due: '📅', task_overdue: '✅', new_ticket: '🎫', general: '🔔' };
    return map[type] || '🔔';
  };

  const showSidebarText = isMobile || sidebarOpen;

  const asideStyle = isMobile ? {
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 1000,
    width: 240,
    transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    background: '#111110', display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '4px 0 24px rgba(0,0,0,0.15)'
  } : {
    width: sidebarOpen ? 240 : 64, transition: 'width 0.2s ease',
    background: '#111110', display: 'flex', flexDirection: 'column',
    flexShrink: 0, overflow: 'hidden',
    boxShadow: '4px 0 24px rgba(0,0,0,0.15)'
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f8f7f4', fontFamily: 'system-ui, sans-serif' }}>
      {/* Mobile Drawer Backdrop */}
      {isMobile && sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 999,
            transition: 'opacity 0.3s ease',
          }}
        />
      )}

      {/* Sidebar */}
      <aside style={asideStyle}>
        {/* Logo */}
        <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <img 
            src="/logo.png" 
            alt="Merum Logo" 
            style={{ 
              width: showSidebarText ? 44 : 32, 
              height: 'auto', 
              flexShrink: 0,
              filter: 'brightness(0) invert(1)' // Inverts to white so it looks stunning and crisp on a dark sidebar
            }} 
          />
          {showSidebarText && (
            <div>
              <div style={{ color: '#ffffff', fontWeight: 700, fontSize: 15, letterSpacing: '0.5px', lineHeight: 1.2 }}>Merum CRM</div>
              <div style={{ color: '#C70073', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Shared Services</div>
            </div>
          )}
        </div>

        {/* Role Badge */}
        {showSidebarText && (
          <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '3px 10px', borderRadius: 20,
              background: roleStyle.bg, 
            }}>
              <Shield size={10} color={roleStyle.color} />
              <span style={{ fontSize: 11, fontWeight: 600, color: roleStyle.color, textTransform: 'capitalize' }}>
                {userRole}
              </span>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="custom-sidebar-scrollbar" style={{ 
          flex: 1, 
          padding: '16px 12px', 
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink 
              key={to} 
              to={to} 
              onClick={() => { if (isMobile) setSidebarOpen(false); }}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 10,
                textDecoration: 'none', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                background: isActive ? 'linear-gradient(135deg, #C70073 0%, #9e005b 100%)' : 'transparent',
                color: isActive ? '#ffffff' : 'rgba(255,255,255,0.7)',
                fontWeight: isActive ? 600 : 500,
                boxShadow: isActive ? '0 4px 12px rgba(199, 0, 115, 0.25)' : 'none',
                transform: isActive ? 'scale(1.02)' : 'scale(1)',
              })}
            >
              <Icon size={18} style={{ flexShrink: 0, opacity: 0.9 }} />
              {showSidebarText && <span style={{ fontSize: 13.5, whiteSpace: 'nowrap', letterSpacing: '0.2px' }}>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.15)' }}>
          {showSidebarText && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', marginBottom: 10 }}>
              <div style={{ 
                width: 36, height: 36, borderRadius: '50%', 
                background: 'linear-gradient(135deg, #C70073 0%, #9e005b 100%)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                flexShrink: 0, boxShadow: '0 2px 8px rgba(199,0,115,0.3)'
              }}>
                <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>
                  {user?.name?.charAt(0) || 'U'}
                </span>
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ color: '#fff', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
              </div>
            </div>
          )}
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%',
            padding: '10px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)',
            transition: 'all 0.2s', fontSize: 13, fontWeight: 500
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(226,75,74,0.15)'; e.currentTarget.style.color = '#e24b4a'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}>
            <LogOut size={18} style={{ flexShrink: 0 }} />
            {showSidebarText && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <header style={{
          height: 56, background: '#fff', borderBottom: '1px solid #e8e6e0',
          display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12, flexShrink: 0
        }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#666', padding: 4, borderRadius: 6 }}>
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div style={{ flex: 1 }} />
          {/* Role indicator in topbar */}
          {!isMobile && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 12px', borderRadius: 20,
              background: roleStyle.bg,
            }}>
              <Shield size={12} color={roleStyle.color} />
              <span style={{ fontSize: 11, fontWeight: 600, color: roleStyle.color, textTransform: 'capitalize' }}>
                {userRole}
              </span>
            </div>
          )}
          {!isMobile && <div style={{ width: 1, height: 20, background: '#e8e6e0' }} />}
          {!isMobile && <span style={{ fontSize: 13, color: '#555', fontWeight: 500 }}>{user?.name}</span>}
          {/* ── Notifications Bell ── */}
          <div ref={notifRef} style={{ position: 'relative' }}>
            <button onClick={toggleNotif}
              style={{ border: 'none', background: showNotif ? '#f8f7f4' : 'none', cursor: 'pointer',
                color: '#555', padding: 7, borderRadius: 8, position: 'relative',
                display: 'flex', alignItems: 'center', transition: 'background 0.15s' }}>
              <Bell size={18} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: 2, right: 2,
                  minWidth: 16, height: 16, borderRadius: 8,
                  background: '#e24b4a', color: '#fff',
                  fontSize: 9, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 3px', lineHeight: 1,
                }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown panel */}
            {showNotif && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                width: 340, maxHeight: 440,
                background: '#fff', border: '1px solid #e8e6e0',
                borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                zIndex: 9999, display: 'flex', flexDirection: 'column', overflow: 'hidden',
              }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px', borderBottom: '1px solid #f0ede8' }}>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1a18' }}>Notifications</span>
                    {unreadCount > 0 && (
                      <span style={{ marginLeft: 8, fontSize: 11, padding: '2px 8px', borderRadius: 10,
                        background: '#fcebeb', color: '#a32d2d', fontWeight: 600 }}>
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#2d9d78',
                        fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCheck size={13} /> Mark all read
                    </button>
                  )}
                </div>

                {/* List */}
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {notifLoading ? (
                    <div style={{ padding: 24, textAlign: 'center', color: '#aaa', fontSize: 13 }}>Loading…</div>
                  ) : notifications.length === 0 ? (
                    <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                      <Bell size={28} style={{ color: '#ddd', display: 'block', margin: '0 auto 10px' }} />
                      <p style={{ fontSize: 13, color: '#aaa', margin: 0 }}>All caught up! No notifications.</p>
                    </div>
                  ) : notifications.map(n => (
                    <div key={n.id}
                      onClick={() => !n.is_read && markOneRead(n.id)}
                      style={{
                        display: 'flex', gap: 12, padding: '12px 16px',
                        borderBottom: '1px solid #f8f7f4', cursor: n.is_read ? 'default' : 'pointer',
                        background: n.is_read ? '#fff' : '#fdf9fc',
                        transition: 'background 0.15s',
                      }}>
                      <div style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{notifTypeIcon(n.type)}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: '0 0 3px', fontSize: 13, fontWeight: n.is_read ? 400 : 600,
                          color: '#1a1a18', lineHeight: 1.4 }}>
                          {n.message || n.type?.replace(/_/g, ' ')}
                        </p>
                        <p style={{ margin: 0, fontSize: 11, color: '#aaa' }}>
                          {n.created_at ? new Date(n.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                        </p>
                      </div>
                      {!n.is_read && (
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#C70073', flexShrink: 0, marginTop: 5 }} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main style={{ flex: 1, overflow: 'auto', padding: isMobile ? '16px' : '24px' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
