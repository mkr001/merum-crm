const supabase = require('../config/supabase');

/**
 * Standard onboarding tasks to be created for every new client.
 */
const STANDARD_ONBOARDING_TASKS = [
  { title: 'KYC Document Collection', description: 'Collect PAN, GST, and Registration certificates.', priority: 'high' },
  { title: 'Signed Service Agreement', description: 'Get the engagement letter or service agreement signed by the client.', priority: 'high' },
  { title: 'Bank & DSC Verification', description: 'Verify bank details and check status of Digital Signature Certificates.', priority: 'medium' },
  { title: 'Portal Access Setup', description: 'Setup client portal access and introduce primary contacts.', priority: 'medium' },
  { title: 'Kick-off Meeting', description: 'Schedule an internal team kick-off meeting for this client.', priority: 'low' },
];

/**
 * Initializes onboarding for a new client.
 * @param {string} clientId - The ID of the newly created client.
 * @param {string} userId - The ID of the user performing the action.
 * @param {string[]} interestServices - Array of service names from the lead.
 */
async function initializeOnboarding(clientId, userId, interestServices = []) {
  // 1. Create Standard Tasks
  const tasksToInsert = STANDARD_ONBOARDING_TASKS.map(task => ({
    ...task,
    related_to: 'client',
    related_id: clientId,
    assigned_to: userId, // Default assign to the creator
    created_by: userId,
    task_type: 'onboarding',
    status: 'open'
  }));

  const { error: taskErr } = await supabase.from('tasks').insert(tasksToInsert);
  if (taskErr) console.error('Error creating onboarding tasks:', taskErr);

  // 2. Automated Service Assignment
  if (interestServices && interestServices.length > 0) {
    // Look up services by name
    const { data: services } = await supabase.from('services')
      .select('id, name')
      .in('name', interestServices);

    if (services && services.length > 0) {
      const clientServicesToInsert = services.map(s => ({
        client_id: clientId,
        service_id: s.id,
        status: 'active',
        start_date: new Date(),
        notes: 'Automatically assigned during onboarding'
      }));

      const { error: serviceErr } = await supabase.from('client_services').insert(clientServicesToInsert);
      if (serviceErr) console.error('Error auto-assigning services:', serviceErr);
    }
  }
}

module.exports = { initializeOnboarding };
