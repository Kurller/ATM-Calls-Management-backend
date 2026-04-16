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
  const {
    atm_id,
    title,
    description,
    priority,
    assigned_to,
  } = req.body;

  const created_by = req.session.user?.id;

  // ✅ Auth check
  if (!created_by) {
    return res.status(401).json({ error: "User not authenticated" });
  }

  // ✅ Validation
  if (!atm_id || !title) {
    return res.status(400).json({
      error: "atm_id and title are required",
    });
  }

  // ✅ Priority fallback
  const normalizedPriority = priority || "medium";

  try {
    const result = await pool.query(
      `INSERT INTO atm_calls
        (atm_id, title, description, priority, created_by, assigned_to)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [
        atm_id,
        title,
        description || null,
        normalizedPriority,
        created_by,
        assigned_to || null,
      ]
    );

    return res.status(201).json({
      message: "ATM call created successfully",
      call: result.rows[0],
    });

  } catch (error) {
    console.error("CreateCall error:", error);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
};
// ✅ GET ALL TICKETS
export const getTickets = async (req, res) => {
  const user = req.session.user;
  if (!user) throw Object.assign(new Error("User not authenticated"), { status: 401 });

  const {
    status,
    priority,
    bank_name,
    page = 1,
    limit = 10,
    sort = "created_at",
    order = "desc",
  } = req.query;

  const sortColumn = allowedSortColumns.includes(sort) ? sort : "created_at";
  const sortOrder = allowedOrder.includes(order.toLowerCase()) ? order.toUpperCase() : "DESC";

  const values = [];
  const whereClauses = [];

  if (user.role !== "admin") {
    values.push(user.id);
    whereClauses.push(`created_by = $${values.length}`);
  }
  if (status) {
    values.push(status);
    whereClauses.push(`status = $${values.length}`);
  }
  if (priority) {
    values.push(priority);
    whereClauses.push(`priority = $${values.length}`);
  }
  if (bank_name) {
    values.push(bank_name);
    whereClauses.push(`bank_name = $${values.length}`);
  }

  const whereQuery = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

  // Ensure LIMIT and OFFSET are numbers
  const limitVal = parseInt(limit) || 10;
  const offsetVal = ((parseInt(page) || 1) - 1) * limitVal;

  // Add LIMIT and OFFSET as the next parameters
  values.push(limitVal, offsetVal);

  // `$${values.length -1}` = LIMIT, `$${values.length}` = OFFSET
  const query = `
    SELECT * FROM atm_calls
    ${whereQuery}
    ORDER BY ${sortColumn} ${sortOrder}
    LIMIT $${values.length - 1} OFFSET $${values.length}
  `;

  const result = await pool.query(query, values);

  res.json({
    page: parseInt(page),
    limit: limitVal,
    total: result.rowCount,
    tickets: result.rows,
  });
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
  const { ticketId } = req.params;
  const { engineer_id } = req.body;

  if (!engineer_id) {
    const error = new Error("engineer_id is required");
    error.status = 400;
    throw error;
  }

  const engineerRes = await pool.query(
    "SELECT id, name, email FROM engineers WHERE id = $1",
    [engineer_id]
  );

  if (!engineerRes.rowCount) {
    const error = new Error("Engineer does not exist");
    error.status = 400;
    throw error;
  }

  const engineer = engineerRes.rows[0];

  await pool.query("BEGIN");

  let ticket;

  try {
    const ticketRes = await pool.query(
      `UPDATE atm_calls 
       SET engineer_id = $1 
       WHERE id = $2 
       RETURNING *`,
      [engineer_id, ticketId]
    );

    if (!ticketRes.rowCount) {
      await pool.query("ROLLBACK");
      const error = new Error("Ticket not found");
      error.status = 404;
      throw error;
    }

    ticket = ticketRes.rows[0];

    await pool.query(
      `INSERT INTO ticket_assignment_history 
       (atm_call_id, engineer_id, assigned_at) 
       VALUES ($1,$2,NOW())`,
      [ticketId, engineer_id]
    );

    await pool.query("COMMIT");

  } catch (err) {
    await pool.query("ROLLBACK");
    throw err;
  }

  // -----------------------------
  // Notify Engineer
  // -----------------------------
  try {
    await sendAssignmentEmail({
      engineerName: engineer.name,
      engineerEmail: engineer.email,
      ticket,
    });
  } catch (err) {
    console.error("Engineer notification failed:", err.message);
  }

  // -----------------------------
  // Notify Supervisors
  // -----------------------------
  try {
    const { rows: supervisors } = await pool.query(
      `SELECT email FROM users WHERE role = 'admin'`
    );

    const message = `
Ticket Assigned

Ticket ID: ${ticket.id}
ATM ID: ${ticket.atm_id}
Location: ${ticket.location}
Issue: ${ticket.issue_type}
Assigned Engineer: ${engineer.name}
    `;

    for (const supervisor of supervisors) {
      await sendEmail(
        supervisor.email,
        "ATM Ticket Assigned",
        message
      );
    }
  } catch (err) {
    console.error("Supervisor notification failed:", err.message);
  }

  res.json({
    message: "Engineer assigned successfully",
    ticket,
  });
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
  const { status } = req.query;
  if (!status) {
    const error = new Error("Status query parameter is required");
    error.status = 400;
    throw error;
  }

  const result = await pool.query(
    `SELECT id, atm_id, bank_name, location, issue_type, priority, status, assigned_to_name, created_at, updated_at
     FROM atm_calls
     WHERE LOWER(TRIM(status)) = LOWER(TRIM($1))
     ORDER BY created_at DESC`,
    [status]
  );

  res.json(result.rows);
};

// ✅ AUTO ASSIGN TICKET
export const autoAssignTicket = async (req, res) => {
  const { ticketId } = req.params;

  const ticketResult = await pool.query(
    "SELECT id, atm_id, location, issue_type, engineer_id FROM atm_calls WHERE id = $1",
    [ticketId]
  );

  if (!ticketResult.rows.length) {
    const error = new Error("Ticket not found");
    error.status = 404;
    throw error;
  }

  const ticket = ticketResult.rows[0];

  if (ticket.engineer_id) {
    const error = new Error("Ticket already assigned");
    error.status = 400;
    throw error;
  }

  const engineerResult = await pool.query(`
    SELECT e.id, e.name, e.email, COUNT(c.id) AS workload
    FROM engineers e
    LEFT JOIN atm_calls c
    ON e.id = c.engineer_id AND c.status != 'closed'
    GROUP BY e.id
    ORDER BY workload ASC
    LIMIT 1
  `);

  if (!engineerResult.rows.length) {
    const error = new Error("No engineers available");
    error.status = 400;
    throw error;
  }

  const engineer = engineerResult.rows[0];

  const updateResult = await pool.query(`
    UPDATE atm_calls 
    SET engineer_id = $1, status = 'in-progress'
    WHERE id = $2 
    RETURNING *
  `, [engineer.id, ticketId]);

  const updatedTicket = updateResult.rows[0];

  await pool.query(
    `INSERT INTO ticket_assignment_history 
     (atm_call_id, engineer_id, assigned_at) 
     VALUES ($1,$2,NOW())`,
    [ticketId, engineer.id]
  );

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
    console.error("Engineer notification failed:", err.message);
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
Location: ${updatedTicket.location}
Issue: ${updatedTicket.issue_type}

Assigned Engineer: ${engineer.name}
    `;

    for (const admin of admins) {
      await sendEmail(admin.email, "ATM Ticket Auto Assigned", message);
    }

  } catch (err) {
    console.error("Admin notification failed:", err.message);
  }

  res.json({
    message: `Ticket auto-assigned to ${engineer.name}`,
    ticket: updatedTicket,
  });
};