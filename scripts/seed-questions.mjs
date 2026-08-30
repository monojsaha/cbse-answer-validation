// Run: node scripts/seed-questions.mjs
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import 'dotenv/config';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const __dir = dirname(fileURLToPath(import.meta.url));
const batches = JSON.parse(readFileSync(join(__dir, '../data/seed-questions.json'), 'utf8'));

// Load lookup tables
const { data: allPapers } = await supabase.from('papers').select('id,subject,exam_year,paper_type,set_code');
const { data: allTopics } = await supabase.from('topics').select('id,subject,chapter_name');

function findPaper({ subject, exam_year, paper_type, set_code }) {
  return allPapers.find(p =>
    p.subject === subject &&
    p.exam_year === exam_year &&
    p.paper_type === paper_type &&
    p.set_code === set_code
  );
}

function normalize(s) { return (s || '').toLowerCase().trim().replace(/\s+/g, ' '); }

function findTopic(subject, chapter_name) {
  const norm = normalize(chapter_name);
  return allTopics.find(t =>
    t.subject === subject && normalize(t.chapter_name) === norm
  );
}

let inserted = 0, skipped = 0, paperMiss = 0, topicMiss = 0;

for (const batch of batches) {
  const paper = findPaper(batch.paper);
  if (!paper) {
    console.warn(`⚠  Paper not found: ${JSON.stringify(batch.paper)}`);
    paperMiss += batch.questions.length;
    continue;
  }
  console.log(`\n📄 ${batch.paper.subject} ${batch.paper.exam_year} ${batch.paper.paper_type} set=${batch.paper.set_code} (id=${paper.id})`);

  for (const q of batch.questions) {
    const topic = findTopic(batch.paper.subject, q.chapter_name);
    if (!topic) {
      console.warn(`  ⚠  Topic not found: "${q.chapter_name}" — inserting without topic_id`);
      topicMiss++;
    }

    const row = {
      paper_id: paper.id,
      question_number: q.question_number,
      question_type: q.question_type,
      marks: q.marks,
      question_text: q.question_text,
      answer_text: q.answer_text,
      topic_id: topic?.id ?? null,
    };

    const { error } = await supabase.from('questions').insert(row);
    if (error) {
      console.error(`  ✗ Q${q.question_number}: ${error.message}`);
      skipped++;
    } else {
      console.log(`  ✓ Q${q.question_number} [${q.question_type}, ${q.marks}m] ${q.chapter_name}`);
      inserted++;
    }
  }
}

console.log(`\n✅ Inserted: ${inserted}  ✗ Skipped: ${skipped}  ⚠ Paper not found: ${paperMiss}  ⚠ Topic not found: ${topicMiss}`);
console.log('\nNow run auto-detect from Admin Panel → Repeats → Run Auto-Detect to find repeated questions.');
