// Run: node scripts/update-weightages.mjs
// Updates official_marks_weightage on all seeded topics by matching chapter_name
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Official CBSE 2023-24 marks weightage per chapter (theory marks).
// Chapters removed from 2022-23+ reduced syllabus are kept with 0 marks so
// they remain visible in the heatmap but don't inflate the total.
const WEIGHTAGE = {
  physics: {
    'Electric Charges and Fields': 8,
    'Electrostatic Potential and Capacitance': 7,
    'Current Electricity': 7,
    'Moving Charges and Magnetism': 4,
    'Magnetism and Matter': 4,
    'Electromagnetic Induction': 4,
    'Alternating Current': 4,
    'Electromagnetic Waves': 4,
    'Ray Optics and Optical Instruments': 7,
    'Wave Optics': 7,
    'Dual Nature of Radiation and Matter': 6,
    'Atoms': 4,
    'Nuclei': 4,
    'Semiconductor Electronics': 0,       // removed from 2022-23 reduced syllabus
    'Semiconductor Electronics: Materials, Devices and Simple Circuits': 0,
    'Communication Systems': 0,
  },
  chemistry: {
    'Solutions': 7,
    'Electrochemistry': 9,
    'Chemical Kinetics': 7,
    'The d and f Block Elements': 7,
    'd and f Block Elements': 7,
    'Coordination Compounds': 7,
    'Haloalkanes and Haloarenes': 6,
    'Alcohols, Phenols and Ethers': 6,
    'Aldehydes, Ketones and Carboxylic Acids': 8,
    'Amines': 6,
    'Biomolecules': 7,
    'Solid State': 0,                      // removed from 2022-23 reduced syllabus
    'Polymers': 0,                         // removed
    'Chemistry in Everyday Life': 0,       // removed
    'The p Block Elements': 0,
    'Surface Chemistry': 0,
  },
  mathematics: {
    'Relations and Functions': 5,
    'Inverse Trigonometric Functions': 3,
    'Matrices': 5,
    'Determinants': 5,
    'Continuity and Differentiability': 8,
    'Application of Derivatives': 8,
    'Applications of Derivatives': 8,
    'Integrals': 11,
    'Application of Integrals': 4,
    'Applications of Integrals': 4,
    'Differential Equations': 4,
    'Vector Algebra': 7,
    'Vectors': 7,
    'Three Dimensional Geometry': 7,
    'Three-Dimensional Geometry': 7,
    'Linear Programming': 5,
    'Probability': 8,
  },
  computer_science: {
    'Python Revision Tour': 4,
    'Functions': 5,
    'File Handling': 5,
    'File Handling in Python': 5,
    'Data Structures': 9,
    'Stack and Queue': 9,
    'Exception Handling in Python': 4,
    'Exception Handling': 4,
    'Computer Networks': 7,
    'Networking and Internet': 7,
    'Data Communication': 7,
    'Introduction to Computer Networks': 7,
    'Database Concepts': 6,
    'Database Concepts and SQL': 6,
    'MySQL': 9,
    'Structured Query Language': 9,
    'Interface of Python with SQL': 9,
    'Interface Python with SQL': 9,
    'Cyber Security': 6,
    'Society, Law and Ethics': 6,
    'Open Source Concepts': 5,
    'Web Development': 5,
    'Python Libraries': 5,
    'Network Security and Cyber Ethics': 6,
    'Boolean Algebra': 5,
    'Communication Technologies': 8,
  },
};

function normalize(s) {
  return s.toLowerCase().trim().replace(/\s+/g, ' ');
}

async function main() {
  const { data: topics, error } = await supabase.from('topics').select('id, subject, chapter_name, official_marks_weightage');
  if (error) { console.error('Fetch failed:', error.message); process.exit(1); }

  console.log(`Found ${topics.length} topics in DB\n`);

  let updated = 0, skipped = 0, unmatched = [];

  for (const topic of topics) {
    const map = WEIGHTAGE[topic.subject] || {};
    // Exact match first, then case-insensitive (no partial match — too greedy)
    let wt = map[topic.chapter_name];
    if (wt === undefined) {
      const normChapter = normalize(topic.chapter_name);
      for (const [k, v] of Object.entries(map)) {
        if (normalize(k) === normChapter) { wt = v; break; }
      }
    }

    if (wt !== undefined) {
      const { error: upErr } = await supabase
        .from('topics')
        .update({ official_marks_weightage: wt })
        .eq('id', topic.id);
      if (upErr) {
        console.error(`  ERROR updating ${topic.chapter_name}: ${upErr.message}`);
      } else {
        console.log(`  ✓ [${topic.subject}] ${topic.chapter_name} → ${wt} marks`);
        updated++;
      }
    } else {
      unmatched.push(`  [${topic.subject}] "${topic.chapter_name}"`);
      skipped++;
    }
  }

  console.log(`\n✅ Updated: ${updated}  ⚠ Unmatched: ${skipped}`);
  if (unmatched.length) {
    console.log('\nUnmatched chapters (add to WEIGHTAGE map to fix):');
    unmatched.forEach(u => console.log(u));
  }
}

main();
