import { pool } from "../config/db.js";

// ----------------------
// Helper: format datetime
// ----------------------
function formatDateTime(date) {
  return date.toISOString().slice(0, 19); // YYYY-MM-DDTHH:MM:SS
}

// ----------------------
// Generate reports (cron or manual)
// ----------------------
export const generateReportsCron = async () => {
  const client = await pool.connect();

  try {
    const today = new Date();

    // ----------------------
    // Weekly range
    // ----------------------
    const weeklyStart = new Date(today);
    weeklyStart.setDate(today.getDate() - 7);
    weeklyStart.setHours(0, 0, 0, 0);

    const weeklyEnd = new Date(today);
    weeklyEnd.setHours(23, 59, 59, 999);

    // ----------------------
    // Monthly range
    // ----------------------
    const monthlyStart = new Date(today.getFullYear(), today.getMonth(), 1);
    monthlyStart.setHours(0, 0, 0, 0);

    const monthlyEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    monthlyEnd.setHours(23, 59, 59, 999);

    // ----------------------
    // Annual range
    // ----------------------
    const annualStart = new Date(today.getFullYear(), 0, 1);
    annualStart.setHours(0, 0, 0, 0);

    const annualEnd = new Date(today.getFullYear(), 11, 31);
    annualEnd.setHours(23, 59, 59, 999);

    // ----------------------
    // Function to generate a report
    // ----------------------
    const runReport = async (reportType, startDate, endDate) => {
      const periodStart = formatDateTime(startDate);
      const periodEnd = formatDateTime(endDate);

      // 1️⃣ Insert main report if not exists
      const { rows: existing } = await client.query(
        `
        INSERT INTO reports(report_type, period_start, period_end, generated_by, status)
        VALUES ($1, $2, $3, $4, 'generated')
        ON CONFLICT (report_type, period_start, period_end) DO NOTHING
        RETURNING id
        `,
        [reportType, periodStart, periodEnd, 1]
      );

      let reportId;
      if (existing.length > 0) reportId = existing[0].id;
      else {
        const { rows } = await client.query(
          `SELECT id FROM reports WHERE report_type=$1 AND period_start=$2 AND period_end=$3`,
          [reportType, periodStart, periodEnd]
        );
        reportId = rows[0].id;
      }

      // 2️⃣ Main metrics
      const { rows: mainMetrics } = await client.query(
        `
        SELECT
          COUNT(*) AS total_calls,
          COUNT(*) FILTER (WHERE status='resolved') AS resolved_calls,
          COUNT(*) FILTER (WHERE status!='resolved') AS unresolved_calls,
          COALESCE(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/60),0) AS avg_resolution_minutes
        FROM atm_calls
        WHERE created_at BETWEEN $1 AND $2
        `,
        [periodStart, periodEnd]
      );

      await client.query(
        `
        UPDATE reports
        SET
          total_calls=$1,
          resolved_calls=$2,
          unresolved_calls=$3,
          avg_resolution_minutes=$4
        WHERE id=$5
        `,
        [
          mainMetrics[0].total_calls,
          mainMetrics[0].resolved_calls,
          mainMetrics[0].unresolved_calls,
          mainMetrics[0].avg_resolution_minutes,
          reportId
        ]
      );

      // 3️⃣ ATM summary (include 0-call ATMs)
      await client.query(`DELETE FROM report_atm_summary WHERE report_id=$1`, [reportId]);

      await client.query(
        `
        INSERT INTO report_atm_summary(report_id, atm_id, total_calls, resolved_calls)
        SELECT
          $1::integer AS report_id,
          a.id AS atm_id,
          COALESCE(SUM(calls.total_calls),0) AS total_calls,
          COALESCE(SUM(calls.resolved_calls),0) AS resolved_calls
        FROM atms a
        LEFT JOIN (
          SELECT atm_id::integer, COUNT(*) AS total_calls,
                 COUNT(*) FILTER (WHERE status='resolved') AS resolved_calls
          FROM atm_calls
          WHERE created_at BETWEEN $2 AND $3
          GROUP BY atm_id::integer
        ) calls ON calls.atm_id = a.id
        GROUP BY a.id
        `,
        [reportId, periodStart, periodEnd]
      );

      // 4️⃣ Engineer summary (include 0-call engineers)
      await client.query(`DELETE FROM report_engineer_summary WHERE report_id=$1`, [reportId]);

      await client.query(
        `
        INSERT INTO report_engineer_summary
(report_id, engineer_id, total_calls, resolved_calls, avg_resolution_hours)
SELECT
  $1::integer AS report_id,
  u.id AS engineer_id,
  COALESCE(calls.total_calls,0) AS total_calls,
  COALESCE(calls.resolved_calls,0) AS resolved_calls,
  COALESCE(calls.avg_resolution_hours,0) AS avg_resolution_hours
FROM users u
LEFT JOIN (
  SELECT
    assigned_engineer_id::integer AS engineer_id,
    COUNT(*) AS total_calls,
    COUNT(*) FILTER (WHERE status='resolved') AS resolved_calls,
    AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) AS avg_resolution_hours
  FROM atm_calls
  WHERE created_at BETWEEN $2 AND $3
  AND assigned_engineer_id IS NOT NULL
  GROUP BY assigned_engineer_id::integer
) calls ON calls.engineer_id = u.id
WHERE u.role = 'engineer'
        `,
        [reportId, periodStart, periodEnd]
      );

      // 5️⃣ Fault summary
      await client.query(`DELETE FROM report_fault_summary WHERE report_id=$1`, [reportId]);

      await client.query(
        `
        INSERT INTO report_fault_summary(report_id, fault_type, occurrence_count)
        SELECT
          $1::integer AS report_id,
          c.issue_type AS fault_type,
          COUNT(*) AS occurrence_count
        FROM atm_calls c
        WHERE created_at BETWEEN $2 AND $3
          AND c.issue_type IS NOT NULL
        GROUP BY c.issue_type
        `,
        [reportId, periodStart, periodEnd]
      );

      console.log(`✅ ${reportType} report generated: ${periodStart} → ${periodEnd}`);
    };

    // ----------------------
    // Generate all three reports
    // ----------------------
    await runReport("weekly", weeklyStart, weeklyEnd);
    await runReport("monthly", monthlyStart, monthlyEnd);
    await runReport("annual", annualStart, annualEnd);

  } finally {
    client.release();
  }
};// Fetch full report
// ----------------------
// src/controllers/reportController.js
export const getFullReport = async (req, res) => {
  const { report_id } = req.params;
  try {
    const { rows: reportRows } = await pool.query(
      `SELECT * FROM reports WHERE id=$1`,
      [report_id]
    );
    if (reportRows.length === 0) return res.status(404).json({ message: "Report not found" });
    const report = reportRows[0];

    const { rows: atm_summary } = await pool.query(
      `SELECT * FROM report_atm_summary WHERE report_id=$1 ORDER BY atm_id`,
      [report_id]
    );

    const { rows: engineer_summary } = await pool.query(
      `SELECT * FROM report_engineer_summary WHERE report_id=$1 ORDER BY engineer_id`,
      [report_id]
    );

    // ✅ FIXED: use fault_type instead of issue_type
    const { rows: fault_summary } = await pool.query(
      `SELECT * FROM report_fault_summary WHERE report_id=$1 ORDER BY fault_type`,
      [report_id]
    );

    res.json({ ...report, atm_summary, engineer_summary, fault_summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ----------------------
// Fetch latest report
// ----------------------
// Get latest report based on type (weekly | monthly | annual)
export const getLatestReport = async (req, res) => {
  const { type = "weekly" } = req.query; // default to weekly

  try {
    const { rows } = await pool.query(
      `
      SELECT *
      FROM reports
      WHERE report_type = $1
      ORDER BY period_end DESC
      LIMIT 1
      `,
      [type]
    );

    if (!rows[0]) return res.status(404).json({ message: "No report found" });

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
// ----------------------
// Charts APIs
// ----------------------
export const getTrendChart = async (req, res) => {
  const { type = "weekly" } = req.query;

  try {
    const { rows } = await pool.query(
      `
      SELECT period_start, total_calls, resolved_calls
      FROM reports
      WHERE report_type = $1
      ORDER BY period_end ASC
      LIMIT 10
      `,
      [type]
    );

    res.json({
      labels: rows.map(r => new Date(r.period_start).toLocaleDateString()),
      data: rows.map(r => Number(r.total_calls)),
      resolved: rows.map(r => Number(r.resolved_calls))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
export const getATMChart = async (req, res) => {
  const { report_id } = req.params;

  try {
    const { rows } = await pool.query(
      `
      SELECT
        COALESCE(location,'Unknown') AS label,
        COUNT(*) AS data
      FROM atm_calls
      WHERE created_at BETWEEN
        (SELECT period_start FROM reports WHERE id=$1)
        AND
        (SELECT period_end FROM reports WHERE id=$1)
      GROUP BY location
      ORDER BY data DESC
      `,
      [report_id]
    );

    res.json({
      labels: rows.map(r => r.label),
      data: rows.map(r => Number(r.data))
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
export const getEngineerChart = async (req, res) => {
  const { report_id } = req.params;

  try {
    const { rows } = await pool.query(
      `SELECT
        COALESCE(e.name,'Engineer '||r.engineer_id) AS label,
        r.total_calls,
        r.resolved_calls
       FROM report_engineer_summary r
       LEFT JOIN users e ON r.engineer_id = e.id
       WHERE r.report_id = $1
       AND r.total_calls > 0
       ORDER BY r.resolved_calls DESC`,
      [report_id]
    );

    console.log("Engineer rows:", rows); // debug

    res.json({
      labels: rows.map(r => r.label),
      data: rows.map(r => Number(r.resolved_calls))
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
export const getFaultChart = async (req, res) => {
  const { report_id } = req.params;

  try {
    const { rows } = await pool.query(
      `SELECT fault_type AS label, occurrence_count AS data
       FROM report_fault_summary
       WHERE report_id = $1
       ORDER BY occurrence_count DESC`,
      [report_id]
    );

    res.json({
      labels: rows.map(r => r.label),
      data: rows.map(r => Number(r.data))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
export const generateCustomReport = async (req, res) => {
  const { startDate, endDate } = req.body;

  if (!startDate || !endDate) {
    return res.status(400).json({ message: "Start date and end date are required" });
  }

  const client = await pool.connect();

  try {
    const periodStart = formatDateTime(new Date(startDate));
    const periodEnd = formatDateTime(new Date(endDate));

    // Use "weekly" as placeholder for report_type to satisfy check constraint
    const reportTypeToInsert = "weekly";

    // Insert report
    const { rows: existing } = await client.query(
      `
      INSERT INTO reports(report_type, period_start, period_end, generated_by, status)
      VALUES ($1, $2, $3, $4, 'generated')
      ON CONFLICT (report_type, period_start, period_end) DO NOTHING
      RETURNING id
      `,
      [reportTypeToInsert, periodStart, periodEnd, 1]
    );

    let reportId;
    if (existing.length > 0) {
      reportId = existing[0].id;
    } else {
      const { rows } = await client.query(
        `SELECT id FROM reports WHERE report_type=$1 AND period_start=$2 AND period_end=$3`,
        [reportTypeToInsert, periodStart, periodEnd]
      );
      reportId = rows[0].id;
    }

    // Call your existing report generation logic (ATM, engineer, fault summaries)
    await generateReportDetails(client, reportId, periodStart, periodEnd);

    res.json({ message: "Custom report generated", reportId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to generate custom report" });
  } finally {
    client.release();
  }
};
// src/controllers/reportController.js
async function generateReportDetails(client, reportId, periodStart, periodEnd) {
  // ---------------------- ATM summary ----------------------
  await client.query(`DELETE FROM report_atm_summary WHERE report_id=$1`, [reportId]);

  await client.query(
    `
    INSERT INTO report_atm_summary(report_id, atm_id, total_calls, resolved_calls)
    SELECT
      $1::integer AS report_id,
      a.id AS atm_id,
      COALESCE(SUM(calls.total_calls),0) AS total_calls,
      COALESCE(SUM(calls.resolved_calls),0) AS resolved_calls
    FROM atms a
    LEFT JOIN (
      SELECT atm_id::integer, COUNT(*) AS total_calls,
             COUNT(*) FILTER (WHERE status='resolved') AS resolved_calls
      FROM atm_calls
      WHERE created_at BETWEEN $2 AND $3
      GROUP BY atm_id::integer
    ) calls ON calls.atm_id = a.id
    GROUP BY a.id
    `,
    [reportId, periodStart, periodEnd]
  );

  // ---------------------- Engineer summary ----------------------
  await client.query(`DELETE FROM report_engineer_summary WHERE report_id=$1`, [reportId]);

  await client.query(
    `
    INSERT INTO report_engineer_summary(report_id, engineer_id, total_calls, resolved_calls, avg_resolution_hours)
    SELECT
      $1::integer AS report_id,
      u.id AS engineer_id,
      COALESCE(calls.total_calls,0) AS total_calls,
      COALESCE(calls.resolved_calls,0) AS resolved_calls,
      COALESCE(calls.avg_resolution_hours,0) AS avg_resolution_hours
    FROM users u
    LEFT JOIN (
      SELECT assigned_engineer_id::integer AS engineer_id,
             COUNT(*) AS total_calls,
             COUNT(*) FILTER (WHERE status='resolved') AS resolved_calls,
             AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) AS avg_resolution_hours
      FROM atm_calls
      WHERE created_at BETWEEN $2 AND $3
      GROUP BY assigned_engineer_id::integer
    ) calls ON calls.engineer_id = u.id
    WHERE u.role='engineer'
    ORDER BY u.id
    `,
    [reportId, periodStart, periodEnd]
  );

  // ---------------------- Fault summary ----------------------
  await client.query(`DELETE FROM report_fault_summary WHERE report_id=$1`, [reportId]);

  await client.query(
    `
    INSERT INTO report_fault_summary(report_id, fault_type, occurrence_count)
    SELECT
      $1::integer AS report_id,
      c."issue_type" AS fault_type,
      COUNT(*) AS occurrence_count
    FROM atm_calls c
    WHERE created_at BETWEEN $2 AND $3
      AND c."issue_type" IS NOT NULL
    GROUP BY c."issue_type"
    ORDER BY occurrence_count DESC
    `,
    [reportId, periodStart, periodEnd]
  );

  console.log(`✅ Report details generated for report ID: ${reportId}`);
}