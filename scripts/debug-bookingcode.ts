/**
 * Debug booking code uniqueness issue
 */

import 'dotenv/config';
import { getSheetData } from '../src/lib/google-sheets';

async function main() {
  const rows = await getSheetData('Request', 2);

  // Check booking code distribution
  const bookingCodes = new Map<string, number>();
  let emptyCount = 0;

  for (const row of rows) {
    const bookingCode = row.values[19]?.trim() || '';
    if (!bookingCode) {
      emptyCount++;
    } else {
      bookingCodes.set(bookingCode, (bookingCodes.get(bookingCode) || 0) + 1);
    }
  }

  console.log(`Total rows: ${rows.length}`);
  console.log(`Empty bookingCode: ${emptyCount}`);
  console.log(`Unique non-empty bookingCodes: ${bookingCodes.size}`);

  // Find duplicates
  const duplicates = Array.from(bookingCodes.entries()).filter(([, count]) => count > 1);
  console.log(`\nDuplicate bookingCodes: ${duplicates.length}`);
  if (duplicates.length > 0) {
    console.log('First 10 duplicates:');
    duplicates.slice(0, 10).forEach(([code, count]) => {
      console.log(`  "${code}": ${count} occurrences`);
    });
  }

  // Sample booking codes
  const samples = Array.from(bookingCodes.keys()).slice(0, 10);
  console.log('\nSample booking codes:');
  samples.forEach((code) => console.log(`  "${code}"`));
}

main().catch(console.error);
