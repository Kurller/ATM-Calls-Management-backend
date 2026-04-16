import { pool } from "../config/db.js";
import { sendAssignmentEmail } from "../services/emailService.js";
import { transporter } from "../config/email.js"; // nodemailer setup

const allowedPriorities = ["low", "medium", "high", "critical"];
const allowedStatuses = ["open", "in-progress", "resolved", "closed"];
const allowedSortColumns = ["created_at", "priority", "status", "bank_name", "atm_id"];
const allowedOrder = ["asc", "desc"];

// ----------------------
// Helper: sendEmail with logging
// ----------------------
const sendEmail = async (to, subject, text) => {
  console.log(`Attempting to send email to: ${to}`);
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
    });
    console.log(`Email successfully sent to ${to}: ${info.response}`);
  } catch (err) {
    console.error(`Failed to send email to ${to}:`, err.message);
  }
};

// ----------------------
// CREATE ATM CALL
// ----------------------
export const createCall = async (req, res) => {
  try {
    const {
      atm_id,
      title,
      description,
      priority,
      assigned_to
    } = req.body;

    const created_by = req.session.user?.id;

    if (!created_by) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    if (!atm_id || !title) {
      return res.status(400).json({
        error: "atm_id and title are required",
      });
    }

    // validate UUID (VERY IMPORTANT)
    const safeAssignedTo =
      assigned_to && assigned_to !== "" ? assigned_to : null;

    const result = await pool.query(
      `INSERT INTO atm_calls
        (atm_id, title, description, priority, created_by, assigned_to)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [
        atm_id,
        title,
        description || null,
        priority || "medium",
        created_by,
        safeAssignedTo,
      ]
    );

    return res.status(201).json({
      message: "ATM call created successfully",
      call: result.rows[0],
    });

  } catch (err) {
    console.error("CreateCall error:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
};
// ✅ GET ALL TICKETS
export const getTickets = async (req, res) => {
  try {
    const user = req.session.user;

    if (!user) {
      return res.status(401).json({
        message: "User not authenticated",
      });
    }

    const {
      status,
      priority,
      page = 1,
      limit = 10,
      sort = "created_at",
      order = "desc",
    } = req.query;

    const sortColumn = allowedSortColumns.includes(sort)
      ? sort
      : "created_at";

    const sortOrder = allowedOrder.includes(order.toLowerCase())
      ? order.toUpperCase()
      : "DESC";

    const values = [];
    const whereClauses = [];

    // 🔐 Restrict non-admin users
    if (user.role !== "admin") {
      values.push(user.id);
      whereClauses.push(`c.created_by = $${values.length}`);
    }

    if (status) {
      values.push(status);
      whereClauses.push(`c.status = $${values.length}`);
    }

    if (priority) {
      values.push(priority);
      whereClauses.push(`c.priority = $${values.length}`);
    }

    const whereQuery = whereClauses.length
      ? `WHERE ${whereClauses.join(" AND ")}`
      : "";

    const limitVal = parseInt(limit) || 10;
    const offsetVal = ((parseInt(page) || 1) - 1) * limitVal;

    values.push(limitVal, offsetVal);

    const query = `
      SELECT 
        c.*,
        u.email AS assigned_to_email
      FROM atm_calls c
      LEFT JOIN users u ON c.assigned_to = u.id
      ${whereQuery}
      ORDER BY c.${sortColumn} ${sortOrder}
      LIMIT $${values.length - 1}
      OFFSET $${values.length}
    `;

    const result = await pool.query(query, values);

    return res.json({
      page: parseInt(page),
      limit: limitVal,
      total: result.rowCount,
      tickets: result.rows,
    });

  } catch (err) {
    console.error("getTickets error:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};
// ✅ GET TICKET BY ID
export const getTicketById = async (req, res) => {
  const { ticketId } = req.params;
  const user = req.session.user;

  const result = await pool.query("SELECT * FROM atm_calls WHERE id = $1", [ticketId]);
  if (!result.rowCount) {
    const error = new Error("Ticket not found");
    error.status = 404;
    throw error;
  }

  const ticket = result.rows[0];
  if (user.role !== "admin" && ticket.created_by !== user.id) {
    const error = new Error("Forbidden");
    error.status = 403;
    throw error;
  }

  res.json({ ticket });
};

// ✅ UPDATE TICKET
export const updateTicket = async (req, res) => {
  const { ticketId } = req.params;
  const { status, atm_id, bank_name, location, issue_type, priority } = req.body;

  const result = await pool.query(
    `UPDATE atm_calls SET status=$1, atm_id=$2, bank_name=$3, location=$4, issue_type=$5, priority=$6 WHERE id=$7 RETURNING *`,
    [status, atm_id, bank_name, location, issue_type, priority, ticketId]
  );

  if (!result.rowCount) {
    const error = new Error("Ticket not found");
    error.status = 404;
    throw error;
  }

  res.json({ message: "Ticket updated", ticket: result.rows[0] });
};
// ✅ DELETE TICKET
export const deleteTicket = async (req, res) => {
  try {
    const ticketId = Number(req.params.ticketId); // <- use ticketId
    if (isNaN(ticketId) || ticketId <= 0) {
      return res.status(400).json({ message: "Invalid ticket ID" });
    }

    const user = req.session.user;

    const ticketRes = await pool.query("SELECT * FROM atm_calls WHERE id = $1", [ticketId]);
    if (!ticketRes.rowCount) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    const ticket = ticketRes.rows[0];

    if (user.role !== "admin" && ticket.created_by !== user.id) {
      return res.status(403).json({ message: "Forbidden: cannot delete this ticket" });
    }

    await pool.query("DELETE FROM atm_calls WHERE id = $1", [ticketId]);
    res.json({ message: "Ticket deleted successfully" });
  } catch (err) {
    console.error("DeleteTicket error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ ASSIGN TICKET
export const assignTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { engineer_id } = req.body;

    if (!engineer_id) {
      return res.status(400).json({
        message: "engineer_id is required",
      });
    }

    // ✅ check user table instead
    const engineerRes = await pool.query(
      "SELECT id, email FROM users WHERE id = $1 AND role = 'engineer'",
      [engineer_id]
    );

    if (!engineerRes.rowCount) {
      return res.status(400).json({
        message: "Engineer does not exist",
      });
    }

    const result = await pool.query(
      `UPDATE atm_calls 
       SET assigned_to = $1 
       WHERE id = $2 
       RETURNING *`,
      [engineer_id, ticketId]
    );

    if (!result.rowCount) {
      return res.status(404).json({
        message: "Ticket not found",
      });
    }

    return res.json({
      message: "Engineer assigned successfully",
      ticket: result.rows[0],
    });

  } catch (err) {
    console.error("assignTicket error:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

// ✅ UPDATE TICKET STATUS
export const updateTicketStatus = async (req, res) => {
  const { id } = req.params;
  const { atm_id, bank_name, location, issue_type, priority, status } = req.body;
  const user = req.session.user;

  const ticketRes = await pool.query("SELECT * FROM atm_calls WHERE id = $1", [id]);
  if (!ticketRes.rowCount) {
    return res.status(404).json({ message: "Ticket not found" });
  }

  const ticket = ticketRes.rows[0];
  if (user.role !== "admin" && ticket.created_by !== user.id) {
    return res.status(403).json({ message: "Forbidden: cannot update this ticket" });
  }

  const fields = [];
  const values = [];
  let idx = 1;

  // Use nullish coalescing to allow empty strings
  if (atm_id !== undefined) { fields.push(`atm_id = $${idx++}`); values.push(atm_id); }
  if (bank_name !== undefined) { fields.push(`bank_name = $${idx++}`); values.push(bank_name); }
  if (location !== undefined) { fields.push(`location = $${idx++}`); values.push(location); }
  if (issue_type !== undefined) { fields.push(`issue_type = $${idx++}`); values.push(issue_type); }
  if (priority !== undefined) { fields.push(`priority = $${idx++}`); values.push(priority); }
  if (status !== undefined) { fields.push(`status = $${idx++}`); values.push(status); }

  if (!fields.length) {
    return res.status(400).json({ message: "No fields to update" });
  }

  values.push(id);
  const updateQuery = `UPDATE atm_calls SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`;
  const updatedRes = await pool.query(updateQuery, values);

  res.json({ message: "Ticket updated", ticket: updatedRes.rows[0] });
};// ✅ GET TICKET HISTORY
export const getTicketHistory = async (req, res) => {
  const { ticketId } = req.params;

  const result = await pool.query(
    `SELECT * FROM ticket_assignment_history WHERE atm_call_id = $1 ORDER BY assigned_at DESC`,
    [ticketId]
  );

  res.json(result.rows);
};

// ✅ GET CALLS BY STATUS
export const getCallsByStatus = async (req, res) => {
  try {
    const { status } = req.query;

    if (!status) {
      return res.status(400).json({
        message: "Status query parameter is required",
      });
    }

    const result = await pool.query(
      `
      SELECT 
        c.*,
        u.email AS assigned_to_email
      FROM atm_calls c
      LEFT JOIN users u ON c.assigned_to = u.id
      WHERE LOWER(TRIM(c.status)) = LOWER(TRIM($1))
      ORDER BY c.created_at DESC
      `,
      [status]
    );

    return res.json(result.rows);

  } catch (err) {
    console.error("getCallsByStatus error:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};
// ✅ AUTO ASSIGN TICKET
export const autoAssignTicket = async (req, res, next) => {
  const { ticketId } = req.params;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // -----------------------------
    // Get Ticket (lock row)
    // -----------------------------
    const ticketResult = await client.query(
      `
      SELECT id, atm_id, title, description, status, priority, assigned_to
      FROM atm_calls
      WHERE id = $1
      FOR UPDATE
      `,
      [ticketId]
    );

    if (!ticketResult.rows.length) {
      const error = new Error("Ticket not found");
      error.status = 404;
      throw error;
    }

    const ticket = ticketResult.rows[0];

    if (ticket.assigned_to) {
      const error = new Error("Ticket already assigned");
      error.status = 400;
      throw error;
    }

    // -----------------------------
    // Find least busy engineer
    // -----------------------------
    const engineerResult = await client.query(`
      SELECT e.id, e.name, e.email, COUNT(c.id) AS workload
      FROM engineers e
      LEFT JOIN atm_calls c
        ON e.id = c.assigned_to AND c.status != 'closed'
      GROUP BY e.id
      ORDER BY workload ASC
      LIMIT 1
      FOR UPDATE
    `);

    if (!engineerResult.rows.length) {
      const error = new Error("No engineers available");
      error.status = 400;
      throw error;
    }

    const engineer = engineerResult.rows[0];

    // -----------------------------
    // Assign ticket
    // -----------------------------
    const updateResult = await client.query(
      `
      UPDATE atm_calls
      SET assigned_to = $1,
          status = 'in-progress',
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
      `,
      [engineer.id, ticketId]
    );

    const updatedTicket = updateResult.rows[0];

    // -----------------------------
    // Save assignment history
    // -----------------------------
    await client.query(
      `
      INSERT INTO ticket_assignment_history
      (atm_call_id, assigned_to, assigned_at)
      VALUES ($1, $2, NOW())
      `,
      [ticketId, engineer.id]
    );

    await client.query("COMMIT");

    // -----------------------------
    // Notify Engineer
    // -----------------------------
    try {
      await sendAssignmentEmail({
        engineerName: engineer.name,
        engineerEmail: engineer.email,
        ticket: updatedTicket,
      });
    } catch (err) {
      console.error("Engineer email failed:", err.message);
    }

    // -----------------------------
    // Notify Admins
    // -----------------------------
    try {
      const { rows: admins } = await pool.query(
        `SELECT email FROM users WHERE role = 'admin'`
      );

      const message = `
Ticket Auto Assigned

Ticket ID: ${updatedTicket.id}
ATM ID: ${updatedTicket.atm_id}
Title: ${updatedTicket.title}
Status: ${updatedTicket.status}

Assigned Engineer: ${engineer.name}
      `;

      for (const admin of admins) {
        await sendEmail(admin.email, "ATM Ticket Auto Assigned", message);
      }
    } catch (err) {
      console.error("Admin notification failed:", err.message);
    }

    return res.status(200).json({
      message: `Ticket auto-assigned to ${engineer.name}`,
      ticket: updatedTicket,
    });

  } catch (error) {
    await client.query("ROLLBACK");
    return next(error);
  } finally {
    client.release();
  }
};