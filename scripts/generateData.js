// This is the script for creating mock data in replacement for actual data.
// Of course, we do not have actual data, this is a future implementation if this ever gets scaled.
// Extensive research will be used to replicated what a week in a grocery store would look like, and how many carts are realistically used.

require('dotenv').config();

const { Pool } = require('pg');


const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'woodmans_carts',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432
});

// corrals
const CORRALS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 
                 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P',
                 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X'];

// We are going to simulate 90 days of history to use for our machine learning model.
const daysHistory = 90;

/**
 * 
 * Generate a cart count based on realistic shopping pattens.
 * 
 * @param {} corralId - which corral is which
 * @param {*} hour - the hour of the day
 * @param {*} dayOfWeek - which day
 */
function generateCartCount(corralId, hour, dayOfWeek) {
    const corralBaseCount = {
        // First row (busiest)
        'A': 20, 'B': 18, 'C': 22, 'D': 19, 'E': 21, 'F': 17, 'G': 16, 'H': 15,
        
        // Second Row (decent)
        'I': 16, 'J': 18, 'K': 19, 'L': 17, 'M': 18, 'N': 16, 'O': 15, 'P': 14,
        
        // Third row (lackluster)
        'Q': 12, 'R': 14, 'S': 13, 'T': 15, 'U': 14, 'V': 12, 'W': 11, 'X': 10
    }

    let baseCount = corralBaseCount[corralId] || 15;

    // The first type of pattern would be the weekends which are really busy.
    // Based on USDA data, the weekend yields about 1.25 times more than on a normal weekday.
    if (dayOfWeek == 5 || dayOfWeek == 6) {
        baseCount *= 1.25;
    } 

    // Second type of pattern is rush hours.
    let hourMultiplier = 1.0;

    if (hour >= 9 && hour <= 11) {
        hourMultiplier = .8;  // Least busy during the morning
    } else if (hour >= 15 && hour <= 18) {
        hourMultiplier = 1.6;  // Afternoon rush is pretty busy - at its peak
    } else if (hour >= 19 && hour <= 20) {
        hourMultiplier = 1.2;  // The evening dies down but still busy
    } else if (hour >= 21 || hour <= 7) {
        hourMultiplier = 0.5;  // Pretty quiet during the night
    }

    // The third pattern is monday mornings have extra carts due to there being a lack of cleaning on Sunday night.
    if(dayOfWeek == 0 && hour >= 8 && hour <= 10) {
        hourMultiplier += 1.5;
    }

    // The fourth pattern is Friday afternoons which tend to be really busy.
    if(dayOfWeek == 4 && hour >= 16 && hour <= 19) {
        hourMultiplier *= 1.4;
    }

    let count = baseCount * hourMultiplier;
    const variation = (Math.random() - 0.5) * 0.4;
    count = count * (1 + variation);

    return Math.max(0, Math.round(count));
}
/**
 * Insert multiple snapshots using single query.
 * 
 * @param {*} batch - array of snapshot objects
 */
async function insertBatch(batch) {
    if(batch.length === 0) return;

    try {
        const values = []
        const placeholders = [];

        batch.forEach((snapshot, index) => {
            const offset = index*6;
            placeholders.push(
                `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`
            );
            values.push(
                snapshot.corralId,
                snapshot.cartCount,
                snapshot.timestamp,
                snapshot.hour,
                snapshot.dayOfWeek,
                snapshot.isHoliday
            );
        });

        const query = `
        INSERT INTO corral_snapshots
        (corral_id, cart_count, timestamp, hour, day_of_week, is_holiday)
        VALUES ${placeholders.join(', ')}
        `;

        await pool.query(query, values);
    } catch (error) {
        console.error(`Error inserting the batch, we fucked up: ${error.message}`);
        throw error;
    }
}

/**
 * Generating fake snapshots for (numDay) days.
 * 
 * @param {*} numDays 
 */
async function generateFakeSnapshots(numDays) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`${'='.repeat(70)}\n`);
    console.log(`Creating ${numDays} days of snapshots for ${CORRALS.length} corrals.`);
    console.log(`This will create approximately ${numDays * 24 * CORRALS.length} records.\n`);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - numDays);

    let totalIns = 0;
    let batchSize = 100;
    let batch = [];

    // Loop through days
    for(let day = 0; day < numDays; day++){
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + day);

        const dayOfWeek = (currentDate.getDay() + 6) % 7;

        // Loop through hours.
        for(let hour = 0; hour < 24; hour++){
            currentDate.setHours(hour, 0, 0 , 0);
            
            for(const corralId of CORRALS) {
                const cartCount = generateCartCount(corralId, hour, dayOfWeek);

                batch.push({
                    corralId,
                    cartCount,
                    timestamp: new Date(currentDate),
                    hour,
                    dayOfWeek,
                    isHoliday: false
                });

                if(batch.length >= batchSize) {
                    await insertBatch(batch);
                    totalIns += batch.length;
                    batch = [];
                }
            }
        }
        // Progress every 10 days
        if ((day+ 1) % 10 === 0){
            console.log(`Progress: ${day + 1}/${numDays} days completed (${totalIns} records)`)
        }
    }

    // Insert whatevers remaining
    if(batch.length > 0){
        await insertBatch(batch);
        totalIns += batch.length;
    }

    console.log(`Generated ${totalIns} snapshots`);
    console.log(`${CORRALS.length} corrals × ${numDays} days × 24 hours = ${totalIns} records`);
}

async function showStatistics() {
    try {
    const totalResult = await pool.query('SELECT COUNT(*) FROM corral_snapshots');
    console.log(`Total snapshots: ${totalResult.rows[0].count}`);

    const rangeResult = await pool.query(`
      SELECT 
        MIN(timestamp)::date as first_date,
        MAX(timestamp)::date as last_date
      FROM corral_snapshots
    `);
    console.log(`Date range: ${rangeResult.rows[0].first_date} to ${rangeResult.rows[0].last_date}`);
    
    const perCorralResult = await pool.query(`
      SELECT 
        corral_id, 
        COUNT(*) as snapshots,
        ROUND(AVG(cart_count)::numeric, 1) as avg_carts
      FROM corral_snapshots
      GROUP BY corral_id
      ORDER BY corral_id
      LIMIT 5
    `);
    
    console.log('\nSample corrals:');
    perCorralResult.rows.forEach(row => {
      console.log(`  ${row.corral_id}: ${row.snapshots} snapshots, avg ${row.avg_carts} carts`);
    });
    
    console.log('');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function main() {
  try {
    
    
    if (!process.env.DB_PASSWORD) {
      console.error('DB_PASSWORD not found in .env file');
      console.error('Create a .env file with: DB_PASSWORD=your_password\n');
      process.exit(1);
    }

    const existingResult = await pool.query('SELECT COUNT(*) FROM corral_snapshots');
    const existingCount = parseInt(existingResult.rows[0].count);
    
    if (existingCount > 0) {
      console.log(`Found ${existingCount} existing snapshots.`);
      console.log('This will ADD more data. To clear first, run: DELETE FROM corral_snapshots;\n');
    }

    await generateFakeSnapshots(daysHistory);

    await showStatistics();
    
    console.log('Ready for ML training.\n');
    
  } catch (error) {
    console.error('ERROR:', error.message);
    if (error.message.includes('password')) {
      console.error('Check your .env file password\n');
    }
  } finally {
    await pool.end();
  }
}

main();


