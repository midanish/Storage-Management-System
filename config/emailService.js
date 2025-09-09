const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const sendReminderEmail = async ({ to, borrowRecord, hoursLeft }) => {
  try {
    const transporter = createTransporter();

    const subject = `Return Reminder: ${borrowRecord.item.box_id} - ${hoursLeft} hours left`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Return Reminder</h2>
        
        <p>Dear ${borrowRecord.borrower.name},</p>
        
        <p>This is a reminder that you have borrowed an item that is due for return soon.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #e74c3c;">Item Details:</h3>
          <ul style="list-style: none; padding: 0;">
            <li><strong>Box ID:</strong> ${borrowRecord.item.box_id}</li>
            <li><strong>Category:</strong> ${borrowRecord.item.category}</li>
            <li><strong>Package Code:</strong> ${borrowRecord.item.package_code}</li>
            <li><strong>Total Samples:</strong> ${borrowRecord.expected_samples}</li>
            <li><strong>Borrowed At:</strong> ${new Date(borrowRecord.borrowed_at).toLocaleString()}</li>
            <li><strong>Due At:</strong> ${new Date(borrowRecord.due_at).toLocaleString()}</li>
          </ul>
        </div>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #856404;">⏰ Time Remaining: ${hoursLeft} hours</h3>
          <p style="margin: 0; color: #856404;">Please return your borrowed item within the next ${hoursLeft} hours to avoid overdue penalties.</p>
        </div>
        
        <p><strong>Return Process:</strong></p>
        <ol>
          <li>Log in to the Storage Management System</li>
          <li>Go to "My Borrowed Items"</li>
          <li>Click "Return" next to the item</li>
          <li>Confirm the sample count</li>
          <li>If samples are missing, provide a justification</li>
        </ol>
        
        <div style="margin-top: 30px; padding: 15px; background-color: #e8f4f8; border-radius: 5px;">
          <p style="margin: 0; font-size: 14px; color: #666;">
            This is an automated reminder from the Storage Management System. 
            Please do not reply to this email.
          </p>
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"Storage Management System" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log('Reminder email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending reminder email:', error);
    throw error;
  }
};

const sendEmailToAdmin = async ({ subject, borrowRecord, missingCount }) => {
  try {
    const transporter = createTransporter();

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Return Justification Required</h2>
        
        <p>Dear Admin,</p>
        
        <p>A user has returned an item with missing samples and requires your approval.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #e74c3c;">Return Details:</h3>
          <ul style="list-style: none; padding: 0;">
            <li><strong>User:</strong> ${borrowRecord.borrower.name} (${borrowRecord.borrower.email})</li>
            <li><strong>Box ID:</strong> ${borrowRecord.item.box_id}</li>
            <li><strong>Category:</strong> ${borrowRecord.item.category}</li>
            <li><strong>Package Code:</strong> ${borrowRecord.item.package_code}</li>
            <li><strong>Expected Samples:</strong> ${borrowRecord.expected_samples}</li>
            <li><strong>Returned Samples:</strong> ${borrowRecord.returned_samples}</li>
            <li><strong>Missing Count:</strong> ${missingCount}</li>
            <li><strong>Return Date:</strong> ${new Date(borrowRecord.returned_at).toLocaleString()}</li>
          </ul>
        </div>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #856404;">Justification:</h3>
          <p style="margin: 0; color: #856404; font-style: italic;">"${borrowRecord.justification}"</p>
        </div>
        
        <p><strong>Action Required:</strong></p>
        <ol>
          <li>Log in to the Admin Dashboard</li>
          <li>Review the justification</li>
          <li>Approve or reject the return</li>
          <li>Add admin comments if necessary</li>
        </ol>
        
        <div style="margin-top: 30px; padding: 15px; background-color: #e8f4f8; border-radius: 5px;">
          <p style="margin: 0; font-size: 14px; color: #666;">
            This is an automated notification from the Storage Management System. 
            Please review and take action as soon as possible.
          </p>
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"Storage Management System" <${process.env.EMAIL_USER}>`,
      to: process.env.ADMIN_EMAIL,
      subject,
      html,
    });

    console.log('Admin notification sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending admin notification:', error);
    throw error;
  }
};

const sendEmailToUser = async ({ to, subject, borrowRecord, approved, adminComments }) => {
  try {
    const transporter = createTransporter();

    const statusColor = approved ? '#27ae60' : '#e74c3c';
    const statusText = approved ? 'APPROVED' : 'REJECTED';
    const statusMessage = approved 
      ? 'Your return has been approved and the item is now available for borrowing again.'
      : 'Your return has been rejected. Please contact the administrator for further instructions.';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Return Status Update</h2>
        
        <p>Dear ${borrowRecord.borrower.name},</p>
        
        <div style="background-color: ${approved ? '#d4edda' : '#f8d7da'}; border: 1px solid ${approved ? '#c3e6cb' : '#f5c6cb'}; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: ${statusColor};">Return Status: ${statusText}</h3>
          <p style="margin: 0; color: ${statusColor};">${statusMessage}</p>
        </div>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #333;">Return Details:</h3>
          <ul style="list-style: none; padding: 0;">
            <li><strong>Box ID:</strong> ${borrowRecord.item.box_id}</li>
            <li><strong>Category:</strong> ${borrowRecord.item.category}</li>
            <li><strong>Package Code:</strong> ${borrowRecord.item.package_code}</li>
            <li><strong>Expected Samples:</strong> ${borrowRecord.expected_samples}</li>
            <li><strong>Returned Samples:</strong> ${borrowRecord.returned_samples}</li>
            <li><strong>Your Justification:</strong> ${borrowRecord.justification}</li>
          </ul>
        </div>
        
        ${adminComments ? `
        <div style="background-color: #e8f4f8; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #0056b3;">Admin Comments:</h3>
          <p style="margin: 0; color: #0056b3; font-style: italic;">"${adminComments}"</p>
        </div>
        ` : ''}
        
        <div style="margin-top: 30px; padding: 15px; background-color: #e8f4f8; border-radius: 5px;">
          <p style="margin: 0; font-size: 14px; color: #666;">
            This is an automated notification from the Storage Management System. 
            If you have questions, please contact the administrator.
          </p>
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"Storage Management System" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log('User notification sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending user notification:', error);
    throw error;
  }
};

module.exports = {
  sendReminderEmail,
  sendEmailToAdmin,
  sendEmailToUser,
};