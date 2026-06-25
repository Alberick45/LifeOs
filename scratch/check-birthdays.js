const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://qpfbhhbbyzcdkpbhuqty.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwZmJoaGJieXpjZGtwYmh1cXR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0NjEzNjgsImV4cCI6MjA5NjAzNzM2OH0.sgPKLsBUaAxudUYuQK4XuaVjDr5g24Ybsqsl-bDy38c";

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    const { data: people, error } = await supabase
      .from('people')
      .select('*');

    if (error) throw error;

    console.log(`Found ${people?.length} people with birthdays:`);
    for (const p of people) {
      console.log(`- ${p.name}: ${p.birthday} (ID: ${p.id}, UserID: ${p.user_id})`);
    }

    const today = new Date();
    console.log(`Today is: ${today.toISOString()} (Local: ${today.toLocaleString()})`);
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
