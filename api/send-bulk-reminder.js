// api/send-bulk-reminder.js
// Send email reminder to all users who saved a specific event

import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { eventTitle, eventDate, eventLocation, users } = req.body;

    if (!users || users.length === 0) {
      return res.status(400).json({ error: 'No users provided' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    const results = [];

    for (const user of users) {
      if (!user.userEmail || user.userEmail === 'N/A') {
        results.push({ name: user.userName, status: 'skipped', reason: 'no email' });
        continue;
      }

      const emailHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Event Reminder</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f7fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">📅 Saved Event Reminder!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="font-size: 16px; color: #1e293b; margin: 0 0 20px 0;">Hi ${user.userName},</p>
              <p style="font-size: 16px; color: #64748b; margin: 0 0 20px 0;">
                You saved <strong>${eventTitle}</strong> and we wanted to remind you about it!
              </p>
              <div style="background-color: #f0fdfa; border-left: 4px solid #06b6d4; padding: 20px; margin-bottom: 20px;">
                <p style="margin: 0 0 10px 0;"><strong>📅 Date:</strong> ${eventDate}</p>
                <p style="margin: 0;"><strong>📍 Location:</strong> ${eventLocation}</p>
              </div>
              <p style="font-size: 16px; color: #64748b; margin: 0 0 20px 0;">
                Don't miss out! Get your tickets now on OutingStation.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://www.outingstation.com" style="display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                  Visit OutingStation
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 30px; text-align: center; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #64748b; font-size: 14px;">
                - OutingStation Team
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `;

      try {
        await transporter.sendMail({
          from: `"OutingStation" <${process.env.GMAIL_USER}>`,
          to: user.userEmail,
          subject: `📅 Reminder: ${eventTitle}`,
          html: emailHTML
        });

        results.push({ name: user.userName, email: user.userEmail, status: 'sent' });
        console.log(`✅ Email sent to ${user.userName}`);
      } catch (error) {
        results.push({ name: user.userName, email: user.userEmail, status: 'failed', error: error.message });
        console.error(`❌ Failed for ${user.userName}:`, error);
      }
    }

    const sent = results.filter(r => r.status === 'sent').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const skipped = results.filter(r => r.status === 'skipped').length;

    return res.status(200).json({
      success: true,
      sent,
      failed,
      skipped,
      results
    });

  } catch (error) {
    console.error('Bulk reminder error:', error);
    return res.status(500).json({ error: error.message });
  }
}