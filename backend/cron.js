// backend/cron.js
const cron = require('node-cron');
const supabase = require('./config/supabase');

const runCron = () => {
  // ── Daily job — 8:00 AM ──────────────────────────────────────
  cron.schedule('0 8 * * *', async () => {
    console.log('[CRON] Running daily jobs...');
    try {
      const today      = new Date();
      const todayStr   = today.toISOString().split('T')[0];
      const in3Days    = new Date(today); in3Days.setDate(today.getDate() + 3);
      const in7Days    = new Date(today); in7Days.setDate(today.getDate() + 7);
      const in3DaysStr = in3Days.toISOString().split('T')[0];
      const in7DaysStr = in7Days.toISOString().split('T')[0];

      // ── 1. Auto-mark overdue invoices (sent → overdue) ───────
      const { data: sentInvoices } = await supabase
        .from('invoices').select('id, client_id, invoice_number, generated_by')
        .eq('status', 'sent').lt('due_date', todayStr);

      if (sentInvoices?.length) {
        const overdueIds = sentInvoices.map(i => i.id);
        await supabase.from('invoices').update({ status: 'overdue', updated_at: new Date() }).in('id', overdueIds);

        // Notify invoice generators
        const invoiceNotifs = sentInvoices.map(i => ({
          user_id:     i.generated_by,
          type:        'invoice_overdue',
          entity_type: 'invoices',
          entity_id:   i.id,
          message:     `Invoice ${i.invoice_number} is now overdue.`,
          is_read:     false,
        }));
        await supabase.from('notifications').insert(invoiceNotifs);
        console.log(`[CRON] Marked ${overdueIds.length} invoice(s) as overdue.`);
      }

      // ── 2. Compliance due in 3 days ───────────────────────────
      const { data: due3 } = await supabase
        .from('compliance_items').select('id, title, due_date, assigned_to')
        .eq('status', 'pending').eq('due_date', in3DaysStr)
        .not('assigned_to', 'is', null);

      if (due3?.length) {
        await supabase.from('notifications').insert(due3.map(c => ({
          user_id: c.assigned_to, type: 'compliance_due',
          entity_type: 'compliance_items', entity_id: c.id,
          message: `"${c.title}" is due in 3 days (${c.due_date}).`,
          is_read: false,
        })));
      }

      // ── 3. Compliance due in 7 days ───────────────────────────
      const { data: due7 } = await supabase
        .from('compliance_items').select('id, title, due_date, assigned_to')
        .eq('status', 'pending').eq('due_date', in7DaysStr)
        .not('assigned_to', 'is', null);

      if (due7?.length) {
        // Only notify if not already notified for this item this week
        const { data: existingNotifs } = await supabase
          .from('notifications').select('entity_id')
          .eq('type', 'compliance_due').in('entity_id', due7.map(c => c.id))
          .gte('created_at', new Date(Date.now() - 7*24*60*60*1000).toISOString());
        const alreadyNotified = new Set((existingNotifs||[]).map(n => n.entity_id));
        const toNotify = due7.filter(c => !alreadyNotified.has(c.id));

        if (toNotify.length) {
          await supabase.from('notifications').insert(toNotify.map(c => ({
            user_id: c.assigned_to, type: 'compliance_due',
            entity_type: 'compliance_items', entity_id: c.id,
            message: `"${c.title}" is due in 7 days (${c.due_date}).`,
            is_read: false,
          })));
        }
      }

      // ── 4. Overdue tasks notification (deduplicated) ──────────
      const { data: overdueTasks } = await supabase
        .from('tasks').select('id, title, due_date, assigned_to')
        .eq('status', 'open').lt('due_date', todayStr)
        .not('assigned_to', 'is', null);

      if (overdueTasks?.length) {
        const { data: existing } = await supabase
          .from('notifications').select('entity_id')
          .eq('type', 'task_overdue').in('entity_id', overdueTasks.map(t => t.id));
        const notified = new Set((existing||[]).map(n => n.entity_id));
        const newOD = overdueTasks.filter(t => !notified.has(t.id));

        if (newOD.length) {
          await supabase.from('notifications').insert(newOD.map(t => ({
            user_id: t.assigned_to, type: 'task_overdue',
            entity_type: 'tasks', entity_id: t.id,
            message: `Task "${t.title}" was due on ${new Date(t.due_date).toLocaleDateString('en-IN')}.`,
            is_read: false,
          })));
        }
      }

      // ── 5. Alert about offboard clients (weekly, Monday only) ─
      if (today.getDay() === 1) {
        const { data: offboardClients } = await supabase
          .from('clients').select('id, org_name').eq('is_offboard', true).neq('status','deleted');

        if (offboardClients?.length) {
          const { data: admins } = await supabase
            .from('users').select('id').eq('is_active', true)
            .in('id', supabase.from('roles').select('id').eq('name','admin'));

          const { data: adminUsers } = await supabase
            .from('users').select('id, roles(name)')
            .eq('is_active', true).eq('roles.name', 'admin').limit(5);

          if (adminUsers?.length) {
            const notifs = [];
            adminUsers.forEach(admin => {
              notifs.push({
                user_id: admin.id, type: 'general',
                entity_type: 'clients', entity_id: null,
                message: `${offboardClients.length} offboard client(s) are not yet formally onboarded. Please complete their profiles.`,
                is_read: false,
              });
            });
            if (notifs.length) await supabase.from('notifications').insert(notifs);
          }
        }
      }

      console.log('[CRON] Daily jobs completed.');
    } catch (err) {
      console.error('[CRON] Error:', err.message);
    }
  });
};

module.exports = runCron;
