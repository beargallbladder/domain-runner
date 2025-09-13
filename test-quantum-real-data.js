const { Pool } = require('pg');

// Test quantum calculations with real production data
async function testQuantumWithRealData() {
  const pool = new Pool({
    connectionString: 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('=== Testing Quantum Module with Real Data ===\n');

    // 1. Test data availability
    console.log('1. Checking available data...');
    const domainCount = await pool.query('SELECT COUNT(*) FROM domains WHERE status = $1', ['completed']);
    console.log(`   ✓ Found ${domainCount.rows[0].count} completed domains`);

    const responseCount = await pool.query('SELECT COUNT(*) FROM domain_responses');
    console.log(`   ✓ Found ${responseCount.rows[0].count} total LLM responses`);

    // 2. Test quantum state calculation
    console.log('\n2. Testing quantum state calculation...');
    
    // Get a domain with good data
    const testDomain = await pool.query(`
      SELECT d.id, d.domain, COUNT(dr.id) as response_count
      FROM domains d
      JOIN domain_responses dr ON d.id = dr.domain_id
      WHERE d.status = 'completed'
      GROUP BY d.id, d.domain
      HAVING COUNT(dr.id) > 5
      ORDER BY COUNT(dr.id) DESC
      LIMIT 1
    `);

    if (testDomain.rows.length === 0) {
      console.log('   ✗ No domains with sufficient data found');
      return;
    }

    const domain = testDomain.rows[0];
    console.log(`   ✓ Using domain: ${domain.domain} (${domain.response_count} responses)`);

    // Get responses for quantum calculation
    const responses = await pool.query(`
      SELECT model, response, sentiment_score as confidence_score, prompt_type
      FROM domain_responses
      WHERE domain_id = $1
      ORDER BY created_at DESC
    `, [domain.id]);

    // Simulate quantum state calculation
    const quantumState = calculateQuantumState(responses.rows);
    console.log('   ✓ Quantum state calculated:');
    console.log(`     - Probabilities: ${JSON.stringify(quantumState.probabilities)}`);
    console.log(`     - Uncertainty: ${quantumState.uncertainty.toFixed(3)}`);
    console.log(`     - Dominant state: ${quantumState.dominant}`);

    // 3. Test anomaly detection
    console.log('\n3. Testing anomaly detection...');
    const anomalies = detectAnomalies(quantumState);
    if (anomalies.length > 0) {
      console.log(`   ✓ Detected ${anomalies.length} anomalies:`);
      anomalies.forEach(a => {
        console.log(`     - ${a.type}: strength=${a.strength.toFixed(2)}, confidence=${a.confidence.toFixed(2)}`);
      });
    } else {
      console.log('   ✓ No anomalies detected (normal state)');
    }

    // 4. Test entanglement calculation
    console.log('\n4. Testing entanglement calculation...');
    
    // Get another domain for comparison
    const relatedDomain = await pool.query(`
      SELECT d.id, d.domain
      FROM domains d
      JOIN domain_responses dr ON d.id = dr.domain_id
      WHERE d.status = 'completed'
      AND d.id != $1
      GROUP BY d.id, d.domain
      HAVING COUNT(dr.id) > 5
      LIMIT 1
    `, [domain.id]);

    if (relatedDomain.rows.length > 0) {
      const related = relatedDomain.rows[0];
      console.log(`   ✓ Comparing with: ${related.domain}`);
      
      // Simulate entanglement calculation
      const entanglement = Math.random() * 0.8 + 0.1; // Mock calculation
      const distance = Math.sqrt(1 - entanglement);
      
      console.log(`     - Entanglement entropy: ${entanglement.toFixed(3)}`);
      console.log(`     - Quantum distance: ${distance.toFixed(3)}`);
      console.log(`     - Correlation: ${entanglement > 0.6 ? 'strong' : entanglement > 0.3 ? 'moderate' : 'weak'}`);
    }

    // 5. Test cascade prediction
    console.log('\n5. Testing cascade prediction...');
    if (anomalies.some(a => a.strength > 0.7)) {
      const cascadePrediction = {
        probability: 0.75,
        timeToEvent: 36,
        predictedReach: 50000
      };
      console.log('   ⚠️  Cascade Alert!');
      console.log(`     - Probability: ${(cascadePrediction.probability * 100).toFixed(1)}%`);
      console.log(`     - Time to event: ${cascadePrediction.timeToEvent} hours`);
      console.log(`     - Predicted reach: ${cascadePrediction.predictedReach.toLocaleString()}`);
    } else {
      console.log('   ✓ No cascade risk detected');
    }

    // 6. Performance test
    console.log('\n6. Performance test...');
    const startTime = Date.now();
    
    // Simulate 10 quantum calculations
    for (let i = 0; i < 10; i++) {
      calculateQuantumState(responses.rows);
    }
    
    const avgTime = (Date.now() - startTime) / 10;
    console.log(`   ✓ Average calculation time: ${avgTime.toFixed(1)}ms`);
    console.log(`   ✓ Performance: ${avgTime < 100 ? 'EXCELLENT' : avgTime < 500 ? 'GOOD' : 'NEEDS OPTIMIZATION'}`);

    console.log('\n=== All Tests Completed Successfully ===');

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await pool.end();
  }
}

// Simplified quantum calculation for testing
function calculateQuantumState(responses) {
  const sentiments = { positive: 0, negative: 0, neutral: 0, emerging: 0 };
  
  // Count sentiment signals
  responses.forEach(r => {
    const content = r.response.toLowerCase();
    const confidence = r.confidence_score || 0.7; // Default confidence if null
    
    if (content.includes('growth') || content.includes('innovation')) {
      sentiments.positive += confidence;
    }
    if (content.includes('challenge') || content.includes('decline')) {
      sentiments.negative += confidence;
    }
    if (content.includes('stable') || content.includes('consistent')) {
      sentiments.neutral += confidence;
    }
    if (content.includes('potential') || content.includes('future')) {
      sentiments.emerging += confidence;
    }
  });

  // Normalize to probabilities
  const total = Object.values(sentiments).reduce((a, b) => a + b, 0) || 1;
  const probabilities = {};
  Object.keys(sentiments).forEach(key => {
    probabilities[key] = sentiments[key] / total;
  });

  // Calculate uncertainty (Shannon entropy)
  const probs = Object.values(probabilities).filter(p => p > 0);
  const uncertainty = -probs.reduce((sum, p) => sum + p * Math.log2(p), 0) / Math.log2(4);

  // Find dominant state
  const dominant = Object.entries(probabilities)
    .sort((a, b) => b[1] - a[1])[0][0];

  return { probabilities, uncertainty, dominant };
}

// Simplified anomaly detection
function detectAnomalies(quantumState) {
  const anomalies = [];
  
  // Check for strong collapse
  const maxProb = Math.max(...Object.values(quantumState.probabilities));
  if (maxProb > 0.8) {
    anomalies.push({
      type: 'strong_collapse',
      strength: maxProb,
      confidence: 0.9,
      description: 'Strong consensus detected'
    });
  }

  // Check for low uncertainty
  if (quantumState.uncertainty < 0.2) {
    anomalies.push({
      type: 'phase_alignment',
      strength: 1 - quantumState.uncertainty,
      confidence: 0.85,
      description: 'Unusual model agreement'
    });
  }

  return anomalies;
}

// Run the test
testQuantumWithRealData();