// src/services/whatsappService.js
// Frontend WhatsApp service - Calls our backend API

/**
 * Send WhatsApp via our backend API
 */
async function sendWhatsAppViaAPI(phone, template, variables) {
  try {
    const response = await fetch('/api/send-whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: phone,
        template: template,
        variables: variables
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ WhatsApp API failed:', data);
      throw new Error(data.error || 'Failed to send WhatsApp');
    }

    console.log('✅ WhatsApp sent successfully');
    return { success: true, data };

  } catch (error) {
    console.error('❌ WhatsApp error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send welcome message to new user
 */
export async function sendWelcomeMessage(userData) {
  const { phone, name } = userData;
  
  if (!phone) {
    console.warn('⚠️ No phone number provided');
    return { success: false, error: 'No phone number' };
  }

  const firstName = name?.split(' ')[0] || 'there';

  return await sendWhatsAppViaAPI(phone, 'welcome_new_user', {
    FirstName: firstName
  });
}

/**
 * Send ticket confirmation message
 */
export async function sendTicketConfirmation(ticketData) {
  const {
    buyerPhone,
    buyerName,
    eventTitle,
    ticketId,
    eventDate,
    eventLocation,
    quantity,
    totalAmount
  } = ticketData;

  if (!buyerPhone) {
    console.warn('⚠️ No phone number');
    return { success: false, error: 'No phone number' };
  }

  return await sendWhatsAppViaAPI(buyerPhone, 'ticket_confimation', {
    BuyerName: buyerName,
    EventTitle: eventTitle,
    TicketID: ticketId,
    EventDate: eventDate,
    EventLocation: eventLocation,
    Quantity: quantity.toString(),
    TotalAmount: totalAmount.toLocaleString()
  });
}

/**
 * Send event reminder
 */
export async function sendEventReminder(reminderData) {
  const {
    userPhone,
    userName,
    eventTitle,
    eventDate,
    eventTime,
    eventLocation,
    mapsLink
  } = reminderData;

  if (!userPhone) {
    console.warn('⚠️ No phone number');
    return { success: false, error: 'No phone number' };
  }

  const firstName = userName?.split(' ')[0] || 'there';

  return await sendWhatsAppViaAPI(userPhone, 'event_reminder', {
    UserName: firstName,
    EventTitle: eventTitle,
    EventDate: eventDate,
    EventTime: eventTime,
    EventLocation: eventLocation,
    MapsLink: mapsLink || 'N/A'
  });
}

/**
 * Resend ticket
 */
export async function resendTicket(ticketData) {
  const {
    buyerPhone,
    buyerName,
    eventTitle,
    ticketId,
    eventDate,
    eventLocation
  } = ticketData;

  if (!buyerPhone) {
    console.warn('⚠️ No phone number');
    return { success: false, error: 'No phone number' };
  }

  return await sendWhatsAppViaAPI(buyerPhone, 'resending_ticket', {
    BuyerName: buyerName,
    EventTitle: eventTitle,
    TicketID: ticketId,
    EventDate: eventDate,
    EventLocation: eventLocation
  });
}

export default {
  sendWelcomeMessage,
  sendTicketConfirmation,
  sendEventReminder,
  resendTicket
};