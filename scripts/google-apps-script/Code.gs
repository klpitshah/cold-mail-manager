/**
 * Cold Mail Manager - Google Apps Script
 * 
 * This script sends scheduled emails from a Google Sheet.
 * It runs on Google's servers, so your computer doesn't need to be on.
 * 
 * Setup:
 * 1. Create a new Google Sheet
 * 2. Go to Extensions > Apps Script
 * 3. Paste this entire code
 * 4. Run setupSheet() once to create the headers
 * 5. Set up a time-based trigger (every 5-15 minutes)
 * 6. Export scheduled sends from your app and paste into the sheet
 */

// Sheet configuration
const SHEET_NAME = 'Scheduled';
const SENT_SHEET_NAME = 'Sent Log';

/**
 * Run this once to set up the sheet with proper headers
 */
function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Create or get the Scheduled sheet
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  
  // Set headers
  const headers = [
    'ID',           // A: Unique identifier
    'Email',        // B: Recipient email
    'Name',         // C: Recipient name
    'Company',      // D: Company name
    'Subject',      // E: Email subject
    'Body',         // F: Email body
    'Send At',      // G: Scheduled send time (ISO string)
    'Type',         // H: 'initial' or 'follow-up'
    'Thread ID',    // I: Gmail thread ID (for follow-ups)
    'Status',       // J: 'pending', 'sent', 'failed'
    'Sent At',      // K: When actually sent
    'Error'         // L: Error message if failed
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
  
  // Auto-resize columns
  for (let i = 1; i <= headers.length; i++) {
    sheet.autoResizeColumn(i);
  }
  
  // Create Sent Log sheet
  let sentSheet = ss.getSheetByName(SENT_SHEET_NAME);
  if (!sentSheet) {
    sentSheet = ss.insertSheet(SENT_SHEET_NAME);
    sentSheet.getRange(1, 1, 1, 6).setValues([['Sent At', 'Email', 'Name', 'Subject', 'Type', 'Thread ID']]);
    sentSheet.getRange(1, 1, 1, 6).setFontWeight('bold');
    sentSheet.setFrozenRows(1);
  }
  
  Logger.log('Sheet setup complete! Add your scheduled sends starting from row 2.');
}

/**
 * Remove duplicate rows based on ID column (keeps first occurrence)
 * Returns number of duplicates removed
 */
function removeDuplicates() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) return 0;
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return 0;
  
  const seenIds = new Set();
  const rowsToDelete = [];
  
  // Find duplicate rows (from top to bottom, mark later duplicates for deletion)
  for (let i = 1; i < data.length; i++) {
    const id = data[i][0];
    if (!id) continue;
    
    if (seenIds.has(id)) {
      rowsToDelete.push(i + 1); // 1-indexed
    } else {
      seenIds.add(id);
    }
  }
  
  // Delete from bottom up to maintain indices
  rowsToDelete.reverse();
  for (const rowNum of rowsToDelete) {
    sheet.deleteRow(rowNum);
  }
  
  if (rowsToDelete.length > 0) {
    Logger.log(`Removed ${rowsToDelete.length} duplicate rows.`);
  }
  
  return rowsToDelete.length;
}

/**
 * Main function - checks for due emails and sends them
 * Set this up with a time-based trigger (every 5-15 minutes)
 */
function processScheduledSends() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    Logger.log('Scheduled sheet not found. Run setupSheet() first.');
    return;
  }
  
  // Remove any duplicate IDs first
  removeDuplicates();
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    Logger.log('No scheduled sends found.');
    return;
  }
  
  const now = new Date();
  let sentCount = 0;
  let errorCount = 0;
  const processedIds = new Set(); // Track IDs processed in this run
  
  // Process each row (skip header)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowNum = i + 1; // 1-indexed for sheet
    
    const id = row[0];
    const email = row[1];
    const name = row[2];
    const company = row[3];
    const subject = row[4];
    const body = row[5];
    const sendAtStr = row[6];
    const type = row[7];
    const threadId = row[8];
    const status = row[9];
    
    // Skip if already processed this ID in this run
    if (id && processedIds.has(id)) {
      Logger.log(`Row ${rowNum}: Skipping duplicate ID ${id}`);
      continue;
    }
    
    // Skip if not pending
    if (status !== 'pending' && status !== '') {
      continue;
    }
    
    // Skip if no email or subject
    if (!email || !subject) {
      continue;
    }
    
    // Mark this ID as being processed
    if (id) {
      processedIds.add(id);
    }
    
    // Parse scheduled time
    let sendAt;
    try {
      sendAt = new Date(sendAtStr);
    } catch (e) {
      Logger.log(`Row ${rowNum}: Invalid date format: ${sendAtStr}`);
      continue;
    }
    
    // Check if it's time to send
    if (sendAt > now) {
      continue; // Not yet time
    }
    
    // Convert escaped newlines back to actual newlines
    const formattedBody = String(body).replace(/\\n/g, '\n');
    
    // Time to send!
    try {
      let sentThreadId = threadId;
      
      if (type === 'follow-up' && threadId) {
        // Send as reply in existing thread
        const thread = GmailApp.getThreadById(threadId);
        if (thread) {
          thread.reply(formattedBody);
          Logger.log(`Row ${rowNum}: Sent follow-up to ${email}`);
        } else {
          // Thread not found, send as new email
          GmailApp.sendEmail(email, subject, formattedBody);
          Logger.log(`Row ${rowNum}: Thread not found, sent as new email to ${email}`);
        }
      } else {
        // Send new email
        GmailApp.sendEmail(email, subject, formattedBody);
        Logger.log(`Row ${rowNum}: Sent initial email to ${email}`);
        
        // Try to get the thread ID of the sent email
        Utilities.sleep(1000); // Wait a moment for the email to be processed
        const threads = GmailApp.search(`to:${email} subject:"${subject}"`, 0, 1);
        if (threads.length > 0) {
          sentThreadId = threads[0].getId();
        }
      }
      
      // Mark as sent
      sheet.getRange(rowNum, 10).setValue('sent'); // Status
      sheet.getRange(rowNum, 11).setValue(new Date().toISOString()); // Sent At
      
      // Log to Sent sheet
      logSentEmail(ss, email, name, subject, type, sentThreadId);
      
      sentCount++;
      
    } catch (error) {
      Logger.log(`Row ${rowNum}: Error sending to ${email}: ${error.message}`);
      sheet.getRange(rowNum, 10).setValue('failed'); // Status
      sheet.getRange(rowNum, 12).setValue(error.message); // Error
      errorCount++;
    }
  }
  
  Logger.log(`Processing complete. Sent: ${sentCount}, Errors: ${errorCount}`);
}

/**
 * Log sent email to the Sent Log sheet
 */
function logSentEmail(ss, email, name, subject, type, threadId) {
  let sentSheet = ss.getSheetByName(SENT_SHEET_NAME);
  if (!sentSheet) {
    sentSheet = ss.insertSheet(SENT_SHEET_NAME);
    sentSheet.getRange(1, 1, 1, 6).setValues([['Sent At', 'Email', 'Name', 'Subject', 'Type', 'Thread ID']]);
    sentSheet.setFrozenRows(1);
  }
  
  sentSheet.appendRow([
    new Date().toISOString(),
    email,
    name,
    subject,
    type,
    threadId || ''
  ]);
}

/**
 * Manual trigger - run this to test sending
 */
function testSend() {
  Logger.log('Running manual send check...');
  processScheduledSends();
  Logger.log('Done!');
}

/**
 * Get remaining daily quota (Gmail limits)
 */
function checkQuota() {
  const quota = MailApp.getRemainingDailyQuota();
  Logger.log(`Remaining email quota for today: ${quota}`);
  return quota;
}

/**
 * Clear all sent/failed rows from the Scheduled sheet
 * Keeps only pending items
 */
function clearProcessedRows() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) return;
  
  const data = sheet.getDataRange().getValues();
  const rowsToDelete = [];
  
  // Find rows to delete (from bottom up to maintain indices)
  for (let i = data.length - 1; i >= 1; i--) {
    const status = data[i][9];
    if (status === 'sent' || status === 'failed') {
      rowsToDelete.push(i + 1);
    }
  }
  
  // Delete rows from bottom up
  for (const rowNum of rowsToDelete) {
    sheet.deleteRow(rowNum);
  }
  
  Logger.log(`Cleared ${rowsToDelete.length} processed rows.`);
}

/**
 * Create a time-based trigger to run every 5 minutes
 */
function createTrigger() {
  // Delete existing triggers first
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === 'processScheduledSends') {
      ScriptApp.deleteTrigger(trigger);
    }
  }
  
  // Create new trigger
  ScriptApp.newTrigger('processScheduledSends')
    .timeBased()
    .everyMinutes(5)
    .create();
  
  Logger.log('Trigger created! Emails will be checked every 5 minutes.');
}

/**
 * Delete all triggers
 */
function deleteTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    ScriptApp.deleteTrigger(trigger);
  }
  Logger.log('All triggers deleted.');
}
