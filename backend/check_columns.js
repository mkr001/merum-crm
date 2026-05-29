require('dotenv').config();

async function checkSchema() {
  try {
    const url = `${process.env.SUPABASE_URL}/rest/v1/`;
    const response = await fetch(url, {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
      }
    });
    const schema = await response.json();
    const rpcs = Object.keys(schema.paths).filter(p => p.startsWith('/rpc/'));
    console.log('RPC paths available:', rpcs);
  } catch (err) {
    console.error('Error fetching schema:', err);
  }
}

checkSchema();
