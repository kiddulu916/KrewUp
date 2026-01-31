/**
 * Database Seeding Script
 *
 * Creates sample data for development and testing.
 *
 * Usage:
 *   npm run seed                    # Seed all data
 *   npm run seed -- --users         # Seed users only
 *   npm run seed -- --jobs          # Seed jobs only
 *   npm run seed -- --clean         # Delete seed data first
 *
 * Environment:
 *   Requires SUPABASE_SERVICE_ROLE_KEY environment variable
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/utils/logger';

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  logger.error('Missing environment variables', {
    hint: 'NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
  });
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// * Seed ID mapping - stores generated UUIDs for reference
// * Using fixed UUIDs for deterministic seeding (same IDs every run)
const SEED_IDS: Record<string, string> = {
  worker_1: '00000000-0000-4000-8000-000000000001',
  worker_2: '00000000-0000-4000-8000-000000000002',
  employer_1: '00000000-0000-4000-8000-000000000003',
  employer_2: '00000000-0000-4000-8000-000000000004',
  admin_1: '00000000-0000-4000-8000-000000000005',
  job_1: '00000000-0000-4000-8000-000000000010',
  job_2: '00000000-0000-4000-8000-000000000011',
  job_3: '00000000-0000-4000-8000-000000000012',
  app_1: '00000000-0000-4000-8000-000000000020',
  app_2: '00000000-0000-4000-8000-000000000021',
  conv_1: '00000000-0000-4000-8000-000000000030',
  msg_1: '00000000-0000-4000-8000-000000000040',
  msg_2: '00000000-0000-4000-8000-000000000041',
};

function getSeedId(name: string): string {
  if (!SEED_IDS[name]) {
    throw new Error(`Missing seed ID for: ${name}`);
  }
  return SEED_IDS[name];
}

// Sample users
const SAMPLE_USERS = [
  {
    id: getSeedId('worker_1'),
    email: 'worker1@example.com',
    first_name: 'John',
    last_name: 'Smith',
    role: 'worker',
    location: 'Austin, TX',
    bio: 'Experienced carpenter with 10+ years in residential construction.',
    subscription_status: 'free',
  },
  {
    id: getSeedId('worker_2'),
    email: 'worker2@example.com',
    first_name: 'Maria',
    last_name: 'Garcia',
    role: 'worker',
    location: 'Houston, TX',
    bio: 'Licensed electrician specializing in commercial projects.',
    subscription_status: 'pro',
  },
  {
    id: getSeedId('employer_1'),
    email: 'employer1@example.com',
    first_name: 'Bob',
    last_name: 'Johnson',
    role: 'employer',
    employer_type: 'contractor',
    location: 'Dallas, TX',
    subscription_status: 'free',
  },
  {
    id: getSeedId('employer_2'),
    email: 'employer2@example.com',
    first_name: 'Sarah',
    last_name: 'Williams',
    role: 'employer',
    employer_type: 'recruiter',
    location: 'San Antonio, TX',
    subscription_status: 'pro',
  },
  {
    id: getSeedId('admin_1'),
    email: 'admin@example.com',
    first_name: 'Admin',
    last_name: 'User',
    role: 'employer',
    location: 'Austin, TX',
    is_admin: true,
    subscription_status: 'pro',
  },
];

// Sample workers data
const SAMPLE_WORKERS = [
  {
    user_id: getSeedId('worker_1'),
    trade: 'Carpentry',
    sub_trade: 'Rough Carpentry',
    years_of_experience: 10,
  },
  {
    user_id: getSeedId('worker_2'),
    trade: 'Electrical',
    sub_trade: 'Commercial Electrical',
    years_of_experience: 8,
  },
];

// Sample jobs
const SAMPLE_JOBS = [
  {
    id: getSeedId('job_1'),
    employer_id: getSeedId('employer_1'),
    title: 'Experienced Carpenter Needed',
    description: 'Looking for an experienced carpenter for a residential renovation project. Must have experience with framing and finish work.',
    trades: ['Carpentry'],
    sub_trades: ['Rough Carpentry', 'Finish Carpentry'],
    job_type: 'Full-time',
    location: 'Dallas, TX',
    pay_rate: '$35-45/hr',
    status: 'active',
  },
  {
    id: getSeedId('job_2'),
    employer_id: getSeedId('employer_1'),
    title: 'Plumber for Commercial Project',
    description: 'Need a licensed plumber for a new office building. Experience with commercial plumbing required.',
    trades: ['Plumbing'],
    sub_trades: ['Commercial Plumbing'],
    job_type: 'Contract',
    location: 'Dallas, TX',
    pay_rate: '$40-50/hr',
    status: 'active',
  },
  {
    id: getSeedId('job_3'),
    employer_id: getSeedId('employer_2'),
    title: 'Electricians Wanted',
    description: 'Recruiting electricians for multiple projects in the San Antonio area. Both residential and commercial experience welcome.',
    trades: ['Electrical'],
    sub_trades: ['Residential Electrical', 'Commercial Electrical'],
    job_type: 'Full-time',
    location: 'San Antonio, TX',
    pay_rate: '$30-45/hr',
    status: 'active',
  },
];

// Sample applications
const SAMPLE_APPLICATIONS = [
  {
    id: getSeedId('app_1'),
    job_id: getSeedId('job_1'),
    applicant_id: getSeedId('worker_1'),
    status: 'pending',
    // * form_data may not exist in all database schemas
    // * We'll try to insert it, but if it fails, we'll continue without it
    form_data: {
      cover_letter: 'I am very interested in this position...',
      availability: 'Immediately',
    },
  },
  {
    id: getSeedId('app_2'),
    job_id: getSeedId('job_3'),
    applicant_id: getSeedId('worker_2'),
    status: 'viewed',
    form_data: {
      cover_letter: 'With 8 years of electrical experience...',
      availability: 'Two weeks notice',
    },
  },
];

// Sample messages
const SAMPLE_CONVERSATIONS = [
  {
    id: getSeedId('conv_1'),
    participant_1_id: getSeedId('worker_1'),
    participant_2_id: getSeedId('employer_1'),
  },
];

const SAMPLE_MESSAGES = [
  {
    id: getSeedId('msg_1'),
    conversation_id: getSeedId('conv_1'),
    sender_id: getSeedId('employer_1'),
    content: 'Hi John, I saw your application. When are you available for an interview?',
  },
  {
    id: getSeedId('msg_2'),
    conversation_id: getSeedId('conv_1'),
    sender_id: getSeedId('worker_1'),
    content: 'Hello! I am available any day this week. What time works best for you?',
  },
];

async function cleanSeedData() {
  console.log('Cleaning seed data...');

  // * Delete in reverse order of dependencies using specific IDs
  await supabase.from('messages').delete().in('id', [getSeedId('msg_1'), getSeedId('msg_2')]);
  await supabase.from('conversations').delete().in('id', [getSeedId('conv_1')]);
  await supabase.from('job_applications').delete().in('id', [getSeedId('app_1'), getSeedId('app_2')]);
  await supabase.from('jobs').delete().in('id', [getSeedId('job_1'), getSeedId('job_2'), getSeedId('job_3')]);
  await supabase.from('workers').delete().in('user_id', [getSeedId('worker_1'), getSeedId('worker_2')]);
  await supabase.from('users').delete().in('id', [
    getSeedId('worker_1'),
    getSeedId('worker_2'),
    getSeedId('employer_1'),
    getSeedId('employer_2'),
    getSeedId('admin_1'),
  ]);

  console.log('Seed data cleaned.');
}

async function seedUsers() {
  console.log('Seeding users...');

  for (const user of SAMPLE_USERS) {
    const { error } = await supabase.from('users').upsert(user, { onConflict: 'id' });
    if (error) {
      logger.error('Failed to seed user', { email: user.email, error: error.message });
    } else {
      console.log(`  Created user: ${user.email}`);
    }
  }

  // Create worker records
  for (const worker of SAMPLE_WORKERS) {
    const { error } = await supabase.from('workers').upsert(worker, { onConflict: 'user_id' });
    if (error) {
      logger.error('Failed to seed worker', { user_id: worker.user_id, error: error.message });
    }
  }

  console.log('Users seeded.');
}

async function seedJobs() {
  console.log('Seeding jobs...');

  for (const job of SAMPLE_JOBS) {
    const { error } = await supabase.from('jobs').upsert(job, { onConflict: 'id' });
    if (error) {
      logger.error('Failed to seed job', { title: job.title, error: error.message });
    } else {
      console.log(`  Created job: ${job.title}`);
    }
  }

  console.log('Jobs seeded.');
}

async function seedApplications() {
  console.log('Seeding applications...');

  for (const app of SAMPLE_APPLICATIONS) {
    // * Try with form_data first, if it fails, try without it
    let applicationData: typeof app = { ...app };
    let { error } = await supabase.from('job_applications').upsert(applicationData, { onConflict: 'id' });
    
    if (error && error.message.includes('form_data')) {
      // * form_data column doesn't exist, try without it
      const { form_data, ...appWithoutFormData } = applicationData;
      applicationData = appWithoutFormData as typeof app;
      const result = await supabase.from('job_applications').upsert(applicationData, { onConflict: 'id' });
      error = result.error;
      
      if (!error) {
        console.log(`  Created application: ${app.id} (without form_data)`);
      }
    }
    
    if (error) {
      logger.error('Failed to seed application', { id: app.id, error: error.message });
    } else if (!error && applicationData.form_data) {
      console.log(`  Created application: ${app.id}`);
    }
  }

  console.log('Applications seeded.');
}

async function seedMessages() {
  console.log('Seeding conversations and messages...');

  for (const conv of SAMPLE_CONVERSATIONS) {
    const { error } = await supabase.from('conversations').upsert(conv, { onConflict: 'id' });
    if (error) {
      logger.error('Failed to seed conversation', { id: conv.id, error: error.message });
    }
  }

  for (const msg of SAMPLE_MESSAGES) {
    const { error } = await supabase.from('messages').upsert(msg, { onConflict: 'id' });
    if (error) {
      logger.error('Failed to seed message', { id: msg.id, error: error.message });
    } else {
      console.log(`  Created message: ${msg.id}`);
    }
  }

  console.log('Messages seeded.');
}

async function main() {
  const args = process.argv.slice(2);
  const shouldClean = args.includes('--clean');
  const usersOnly = args.includes('--users');
  const jobsOnly = args.includes('--jobs');

  console.log('Starting database seed...\n');

  if (shouldClean) {
    await cleanSeedData();
    console.log('');
  }

  if (usersOnly) {
    await seedUsers();
  } else if (jobsOnly) {
    await seedJobs();
  } else {
    // Seed all data
    await seedUsers();
    await seedJobs();
    await seedApplications();
    await seedMessages();
  }

  console.log('\nDatabase seeding complete!');
  console.log('\nSample accounts:');
  console.log('  Worker 1: worker1@example.com');
  console.log('  Worker 2: worker2@example.com (Pro)');
  console.log('  Employer 1: employer1@example.com');
  console.log('  Employer 2: employer2@example.com (Pro)');
  console.log('  Admin: admin@example.com');
  console.log('\nNote: These accounts cannot log in via normal auth.');
  console.log('Use Supabase dashboard to create matching auth users or');
  console.log('update the user IDs to match existing auth users.');
}

main().catch((err) => {
  logger.error('Seed script failed', {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
