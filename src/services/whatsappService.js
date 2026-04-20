// src/services/whatsappService.js
// Frontend WhatsApp service - Calls our backend API

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

// {{1}} = FirstName
export async function sendWelcomeMessage(userData) {
  const { phone, name } = userData;
  
  if (!phone) {
    console.warn('⚠️ No phone number provided');
    return { success: false, error: 'No phone number' };
  }

  const firstName = name?.split(' ')[0] || 'there';

  return await sendWhatsAppViaAPI(phone, 'welcome_new_user', {
    '1': firstName
  });
}

// {{1}} = BuyerName, {{2}} = EventTitle, {{3}} = TicketID
// {{4}} = EventDate, {{5}} = EventLocation, {{6}} = Quantity, {{7}} = TotalAmount
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
    '1': buyerName,
    '2': eventTitle,
    '3': ticketId,
    '4': eventDate,
    '5': eventLocation,
    '6': quantity.toString(),
    '7': totalAmount.toLocaleString()
  });
}

// {{1}} = UserName, {{2}} = EventTitle, {{3}} = EventDate
// {{4}} = EventTime, {{5}} = EventLocation, {{6}} = MapsLink
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
    '1': firstName,
    '2': eventTitle,
    '3': eventDate,
    '4': eventTime,
    '5': eventLocation,
    '6': mapsLink || 'N/A'
  });
}

// {{1}} = BuyerName, {{2}} = EventTitle, {{3}} = TicketID
// {{4}} = EventDate, {{5}} = EventLocation
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
    '1': buyerName,
    '2': eventTitle,
    '3': ticketId,
    '4': eventDate,
    '5': eventLocation
  });
}

export default {
  sendWelcomeMessage,
  sendTicketConfirmation,
  sendEventReminder,
  resendTicket
};