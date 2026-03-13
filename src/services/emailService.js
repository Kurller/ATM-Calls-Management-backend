import { transporter } from "../config/email.js";

/**
 * Send assignment email to engineer
 * @param {Object} params
 * @param {string} params.engineerName - Name of the engineer
 * @param {string} params.engineerEmail - Engineer's email
 * @param {Object} params.ticket - The ticket object containing all details
 */
export const sendAssignmentEmail = async ({ engineerName, engineerEmail, ticket }) => {
  if (!engineerEmail) {
    console.warn(`⚠️ Assignment email skipped: no email for ${engineerName}`);
    return;
  }

  // HTML template with all ticket details
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color:#0052cc;">New ATM Ticket Assigned (#${ticket.id})</h2>
      <p>Hello <strong>${engineerName}</strong>,</p>
      <p>You have been assigned a new ticket. Here are the details:</p>

      <ul>
        <li><strong>ATM ID:</strong> ${ticket.atm_id}</li>
        <li><strong>Bank:</strong> ${ticket.bank_name}</li>
        <li><strong>Location:</strong> ${ticket.location}</li>
        <li><strong>Issue Type:</strong> ${ticket.issue_type}</li>
        <li><strong>Priority:</strong> ${ticket.priority}</li>
        <li><strong>Status:</strong> ${ticket.status}</li>
      </ul>

      <p>Please resolve it as soon as possible.</p>
      <br>
      <p>Regards,<br>ATM Support Team</p>
    </div>
  `;

  // Plain text fallback
  const text = `
Hello ${engineerName},

You have been assigned a new ticket (#${ticket.id}):

- ATM ID: ${ticket.atm_id}
- Bank: ${ticket.bank_name}
- Location: ${ticket.location}
- Issue Type: ${ticket.issue_type}
- Priority: ${ticket.priority}
- Status: ${ticket.status}

Please resolve it as soon as possible.

Regards,
ATM Support Team
  `;

  try {
    await transporter.sendMail({
      from: `"ATM Support" <${process.env.EMAIL_USER}>`,
      to: engineerEmail,
      subject: `New ATM Ticket Assigned (#${ticket.id})`,
      text,
      html,
    });

    console.log(`📧 Assignment email sent to ${engineerEmail}`);
  } catch (error) {
    console.error("Failed to send assignment email:", error);
  }
};