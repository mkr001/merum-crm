// routes/dashboard.js
const express = require('express');
const supabase = require('../config/supabase');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

router.use(authenticate);

// GET /api/dashboard/kpis
router.get('/kpis', async (req, res) => {
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
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('leads').select('*', { count: 'exact', head: true }).not('status', 'in', '("converted","lost")'),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'open').lt('due_date', new Date().toISOString()),
    supabase.from('compliance_items').select('*', { count: 'exact', head: true }).eq('status', 'overdue'),
    supabase.from('invoices').select('status, total_amount').in('status', ['sent', 'paid', 'overdue']),
    supabase.from('activity_log').select('*, users!activity_log_performed_by_fkey(full_name)').order('created_at', { ascending: false }).limit(10),
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('simplykhata_active', true),
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('merahisab_active', true)
  ]);

  const pending_revenue = invoiceStats?.filter(i => i.status === 'sent').reduce((s, i) => s + +i.total_amount, 0) || 0;
  const collected_revenue = invoiceStats?.filter(i => i.status === 'paid').reduce((s, i) => s + +i.total_amount, 0) || 0;

  res.json({
    kpis: {
      total_clients: totalClients,
      active_leads: activeLeads,
      overdue_tasks: overdueTasks,
      overdue_compliance: overdueCompliance,
      pending_revenue,
      collected_revenue,
      simplykhata_active: simplyKhataClients || 0,
      merahisab_active: meraHisabClients || 0
    },
    recent_activity: recentActivity
  });
});

// GET /api/dashboard/pipeline — lead pipeline by stage
router.get('/pipeline', async (req, res) => {
  const statuses = ['new', 'contacted', 'qualified', 'proposal_sent', 'converted', 'lost'];
  const results = await Promise.all(
    statuses.map(s =>
      supabase.from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('status', s)
        .then(({ count }) => ({ status: s, count: count || 0 }))
    )
  );
  res.json(results);
});

// GET /api/dashboard/upcoming-compliance
router.get('/upcoming-compliance', async (req, res) => {
  const thirtyDays = new Date();
  thirtyDays.setDate(thirtyDays.getDate() + 30);

  const { data, error } = await supabase
    .from('compliance_items')
    .select('*, clients(org_name), users!compliance_items_assigned_to_fkey(full_name)')
    .in('status', ['pending', 'in_progress'])
    .lte('due_date', thirtyDays.toISOString())
    .order('due_date');

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
