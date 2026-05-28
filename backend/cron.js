// backend/cron.js
const cron = require('node-cron');
const supabase = require('./config/supabase');

const runCron = () => {
  // Run every day at 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('Running daily notification job...');
    try {
      const today = new Date();
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(today.getDate() + 3);

      const todayStr = today.toISOString().split('T')[0];
      const threeDaysStr = threeDaysFromNow.toISOString().split('T')[0];

      // 1. Compliance due in exactly 3 days
      const { data: upcomingCompliance } = await supabase
        .from('compliance_items')
        .select('*')
        .eq('status', 'pending')
        .eq('due_date', threeDaysStr)
        .not('assigned_to', 'is', null);

      if (upcomingCompliance && upcomingCompliance.length > 0) {
        const notifications = upcomingCompliance.map(c => ({
          user_id: c.assigned_to,
          title: 'Compliance Due Soon',
          message: `Compliance "${c.title}" is due in 3 days on ${c.due_date}.`,
          type: 'compliance_due',
          entity_type: 'compliance_items',
          entity_id: c.id
        }));
        await supabase.from('notifications').insert(notifications);
      }

      // 2. Tasks overdue
      const { data: overdueTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('status', 'open')
        .lt('due_date', today.toISOString())
        .not('assigned_to', 'is', null);

      if (overdueTasks && overdueTasks.length > 0) {
        // Fetch existing task_due notifications to avoid duplicates
        const taskIds = overdueTasks.map(t => t.id);
        const { data: existingNotifs } = await supabase
          .from('notifications')
          .select('entity_id')
          .eq('type', 'task_due')
          .eq('entity_type', 'tasks')
          .in('entity_id', taskIds);

        const notifiedTaskIds = new Set((existingNotifs || []).map(n => n.entity_id));
        const newOverdueTasks = overdueTasks.filter(t => !notifiedTaskIds.has(t.id));

        if (newOverdueTasks.length > 0) {
          const notifications = newOverdueTasks.map(t => ({
            user_id: t.assigned_to,
            title: 'Task Overdue',
            message: `Task "${t.title}" was due on ${new Date(t.due_date).toLocaleDateString()}.`,
            type: 'task_due',
            entity_type: 'tasks',
            entity_id: t.id
          }));
          await supabase.from('notifications').insert(notifications);
        }
      }


      console.log('Daily notification job completed.');
    } catch (err) {
      console.error('Error in daily cron:', err);
    }
  });
};

module.exports = runCron;
