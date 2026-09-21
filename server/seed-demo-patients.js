import pool from './db.js'

const email = process.argv[2]?.trim().toLowerCase()
const requestedCount = Number(process.argv[3] || 1000)
const count = Number.isInteger(requestedCount) && requestedCount > 0 ? requestedCount : 1000

if (!email) {
  console.error('Usage: node server/seed-demo-patients.js doctor@example.com [count]')
  process.exit(1)
}

const client = await pool.connect()

try {
  await client.query('BEGIN')

  const doctorResult = await client.query('SELECT id FROM doctors WHERE email=$1', [email])
  if (!doctorResult.rows.length) throw new Error(`No doctor account found for ${email}`)
  const doctorId = doctorResult.rows[0].id

  const patientsResult = await client.query(`
    INSERT INTO patients (doctor_id, name, phone, dob, age, gender, address)
    SELECT $1,
           'Demo Patient ' || LPAD(series::text, 4, '0'),
           '900' || LPAD(series::text, 7, '0'),
           CURRENT_DATE - ((18 + (series % 63)) * INTERVAL '1 year') - ((series % 12) * INTERVAL '1 month'),
           (18 + (series % 63))::text,
           (ARRAY['Male', 'Female', 'Other'])[1 + (series % 3)],
           'Demo address ' || series::text || ', Testing City'
    FROM generate_series(1, $2::int) AS generated(series)
    WHERE NOT EXISTS (
      SELECT 1 FROM patients existing
      WHERE existing.doctor_id=$1
        AND existing.name='Demo Patient ' || LPAD(series::text, 4, '0')
    )
    RETURNING id
  `, [doctorId, count])

  const visitsResult = await client.query(`
    INSERT INTO visits (doctor_id, patient_id, date, complaint, diagnosis, notes, weight, temperature, payment_done, fees)
    SELECT $1, patient.id, CURRENT_DATE - (series % 30),
           'Demo complaint for testing', 'Demo diagnosis', 'Demo visit record',
           (55 + (series % 35))::text, (98 + ((series % 3) * 0.5))::text, FALSE, 150
    FROM generate_series(1, $2::int) AS generated(series)
    JOIN patients patient ON patient.doctor_id=$1
      AND patient.name='Demo Patient ' || LPAD(series::text, 4, '0')
    WHERE NOT EXISTS (
      SELECT 1 FROM visits existing
      WHERE existing.doctor_id=$1
        AND existing.patient_id=patient.id
        AND existing.complaint='Demo complaint for testing'
    )
    RETURNING id
  `, [doctorId, count])

  const prescriptionsResult = await client.query(`
    INSERT INTO prescriptions (
      doctor_id, patient_id, patient_name, patient_phone, age, gender, date,
      complaint, diagnosis, weight, temperature, payment_done, fees,
      medicines, notes, advice, follow_up_date, prescription_days, template_size
    )
    SELECT $1, patient.id, patient.name, patient.phone, patient.age, patient.gender,
           CURRENT_DATE - (series % 30), 'Demo complaint for testing',
           'Demo diagnosis',
           patient.age, '98.6', FALSE, 150,
           jsonb_build_array(jsonb_build_object(
             'name', 'Demo Tablet', 'dosage', '1', 'unit', 'tablet',
             'freq', jsonb_build_array('1', '0', '1'),
             'duration', '5 days', 'instructions', 'जेवणानंतर'
           )),
           'Demo prescription record', 'Drink plenty of fluids',
           CURRENT_DATE + 7, '5', 'A5'
    FROM generate_series(1, $2::int) AS generated(series)
    JOIN patients patient ON patient.doctor_id=$1
      AND patient.name='Demo Patient ' || LPAD(series::text, 4, '0')
    WHERE NOT EXISTS (
      SELECT 1 FROM prescriptions existing
      WHERE existing.doctor_id=$1
        AND existing.patient_id=patient.id
        AND existing.complaint='Demo complaint for testing'
    )
    RETURNING id
  `, [doctorId, count])

  await client.query('COMMIT')
  console.log(`Created ${patientsResult.rowCount} demo patients, ${visitsResult.rowCount} visits, and ${prescriptionsResult.rowCount} prescriptions for ${email}.`)
  if (patientsResult.rowCount < count || visitsResult.rowCount < count || prescriptionsResult.rowCount < count) {
    console.log('Some demo records already existed and were skipped.')
  }
} catch (error) {
  await client.query('ROLLBACK').catch(() => {})
  console.error(`Failed to seed demo patients: ${error.message}`)
  process.exitCode = 1
} finally {
  client.release()
  await pool.end()
}