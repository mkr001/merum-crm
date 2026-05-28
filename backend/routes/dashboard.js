// routes/dashboard.js
const express = require('express');
const supabase = require('../config/supabase');
const { authenticate } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const router = express.Router();

router.use(authenticate);

// GET /api/dashboard/kpis
router.get('/kpis', asyncHandler(async (req, res) => {
  const [
    { count: totalClients },
    { count: activeLeads },
    { count: overdueTasks },
    { count: overdueCompliance },
    { data: invoiceStats },
    { data: recentActivity },
    { count: simplyKhataClients },
    { count: meraHisabClients }
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('status', 'active').then(r => r.error ? { count: 0 } : r).catch(() => ({ count: 0 })),
    supabase.from('leads').select('*', { count: 'exact', head: true }).not('status', 'in', '("converted","lost")').then(r => r.error ? { count: 0 } : r).catch(() => ({ count: 0 })),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'open').lt('due_date', new Date().toISOString()).then(r => r.error ? { count: 0 } : r).catch(() => ({ count: 0 })),
    supabase.from('compliance_items').select('*', { count: 'exact', head: true }).eq('status', 'overdue').then(r => r.error ? { count: 0 } : r).catch(() => ({ count: 0 })),
    supabase.from('invoices').select('status, total_amount').in('status', ['sent', 'paid', 'overdue']).then(r => r.error ? { data: [] } : r).catch(() => ({ data: [] })),
    supabase.from('activity_log').select('*, users!activity_log_performed_by_fkey(full_name)').order('created_at', { ascending: false }).limit(10).then(r => r.error ? { data: [] } : r).catch(() => ({ data: [] })),
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('simplykhata_active', true).then(r => r.error ? { count: 0 } : r).catch(() => ({ count: 0 })),
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('merahisab_active', true).then(r => r.error ? { count: 0 } : r).catch(() => ({ count: 0 }))
  ]);

  const pending_revenue = invoiceStats?.filter(i => i.status === 'sent').reduce((s, i) => s + +i.total_amount, 0) || 0;
  const collected_revenue = invoiceStats?.filter(i => i.status === 'paid').reduce((s, i) => s + +i.total_amount, 0) || 0;

  res.json({
    kpis: {
      total_clients: totalClients || 0,
      active_leads: activeLeads || 0,
      overdue_tasks: overdueTasks || 0,
      overdue_compliance: overdueCompliance || 0,
      pending_revenue,
      collected_revenue,
      simplykhata_active: simplyKhataClients || 0,
      merahisab_active: meraHisabClients || 0
    },
    recent_activity: recentActivity || []
  });
}));

// GET /api/dashboard/pipeline — lead pipeline by stage
router.get('/pipeline', asyncHandler(async (req, res) => {
  const statuses = ['new', 'contacted', 'qualified', 'proposal_sent', 'converted', 'lost'];
  const results = await Promise.all(
    statuses.map(s =>
      supabase.from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('status', s)
        .then(({ count }) => ({ status: s, count: count || 0 }))
        .catch(() => ({ status: s, count: 0 }))
    )
  );
  res.json(results);
}));

// GET /api/dashboard/upcoming-compliance
router.get('/upcoming-compliance', asyncHandler(async (req, res) => {
  const thirtyDays = new Date();
  thirtyDays.setDate(thirtyDays.getDate() + 30);

  const { data, error } = await supabase
    .from('compliance_items')
    .select('*, clients(org_name), users!compliance_items_assigned_to_fkey(full_name)')
    .in('status', ['pending', 'in_progress'])
    .lte('due_date', thirtyDays.toISOString())
    .order('due_date');

  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
}));

module.exports = router;

