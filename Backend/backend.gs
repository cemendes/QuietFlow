// GEMINI_API_KEY is stored in Apps Script Script Properties (Project Settings → Script Properties).
// Never hardcode secrets here — this file is version-controlled.

function doGet(e) {
  
  const action = e.parameter.action;
  const name = e.parameter.name || "Eduardo Oliveira";
  const daysBack = e.parameter.daysBack || "1"; // Default to 1 day for broad search
  
  if (action === "pollEmails") {
    const logs = pollAllEmails(name, daysBack);
    return ContentService.createTextOutput(logs)
                         .setMimeType(ContentService.MimeType.TEXT);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ error: "Invalid action" }))
                       .setMimeType(ContentService.MimeType.JSON);
}

// Helper to get or create the tasks.csv file
function getTasksFile() {
  const fileName = "tasks.csv";
  const files = DriveApp.getFilesByName(fileName);
  if (files.hasNext()) {
    return files.next();
  } else {
    const file = DriveApp.createFile(fileName, "id,title,details,link,status,duration,priority,category,date\n", MimeType.CSV);
    return file;
  }
}

// Helper function to escape CSV fields properly
function escapeCSVField(field) {
  if (!field) return "";
  let needsQuotes = false;
  let escaped = field;
  
  if (field.includes(",") || field.includes('"') || field.includes("\n") || field.includes("\r")) {
    needsQuotes = true;
    escaped = field.replace(/"/g, '""');
  }
  
  if (needsQuotes) {
    return `"${escaped}"`;
  }
  return escaped;
}

// Main function to poll all emails and extract tasks
function pollAllEmails(targetName, daysBack) {
  if (!targetName) targetName = "Eduardo Oliveira";
  if (!daysBack) daysBack = "1";
  
  let logs = "Starting poll for all emails...\n";
  console.log("Starting poll for targetName: " + targetName + ", daysBack: " + daysBack);
  
  targetName = decodeURIComponent(targetName);
  const file = getTasksFile();
  let content = file.getBlob().getDataAsString();
  
  const labelName = "FocusFlow-Processed";
  let label = GmailApp.getUserLabelByName(labelName);
  if (!label) {
    label = GmailApp.createLabel(labelName);
    console.log("Created new label: " + labelName);
  }
  
  const query = '-label:' + labelName + ' -label:dogfood -category:promotions -category:social -category:updates -unsubscribe -is:draft -from:noreply+moma-brief@google.com newer_than:' + daysBack + 'd';
  console.log("Using Gmail search query: " + query);
  logs += "Using query: " + query + "\n";
  
  const threads = GmailApp.search(query, 0, 10); // Limit to 10 threads to avoid timeouts
  console.log("Found " + threads.length + " threads matching query.");
  logs += "Found threads matching query: " + threads.length + "\n";
  
  threads.forEach((thread, index) => {
    const subject = thread.getFirstMessageSubject();
    console.log(`Processing thread [${index}]: ${subject}`);
    logs += `Processing thread: ${subject}\n`;
    
    const messages = thread.getMessages();
    const lastMessage = messages[messages.length - 1];
    let body = lastMessage.getPlainBody();
    const permalink = thread.getPermalink();
    
    const dateObj = lastMessage.getDate();
    const formattedDate = Utilities.formatDate(dateObj, Session.getScriptTimeZone(), "MMM dd");
    
    // Truncate body if too long for Gemini
    if (body.length > 5000) {
        body = body.substring(0, 5000) + "... [truncated]";
    }
    
    const aiResponse = identifyAndExtractTasks(subject, body, targetName);
    
    if (aiResponse !== null) {
      if (aiResponse && aiResponse !== "NO_TASKS") {
        const lines = aiResponse.split("\n");
        lines.forEach(line => {
          if (line.trim() === "") return;
          
          const parts = line.split("|");
          if (parts.length >= 5) {
            const project = parts[0].trim();
            const title = parts[1].trim();
            const duration = parts[2].trim();
            const priority = parts[3].trim();
            const category = parts[4].trim();
            const details = parts[5] ? parts[5].trim() : "";
            
            const id = Utilities.getUuid();
            const eTitle = escapeCSVField(`[${project}] ${title}`);
            const eDetails = escapeCSVField(details);
            const ePermalink = escapeCSVField(permalink);
            const eDuration = escapeCSVField(duration);
            const ePriority = escapeCSVField(priority);
            const eCategory = escapeCSVField(category);
            const eDate = escapeCSVField(formattedDate);
            
            const csvLine = `${id},${eTitle},${eDetails},${ePermalink},needsAction,${eDuration},${ePriority},${eCategory},${eDate}\n`;
            content += csvLine;
            logs += "Added task: " + title + "\n";
          }
        });
      }
      thread.addLabel(label);
    }
  });
  
  file.setContent(content);
  console.log("Poll completed.");
  return logs;
}

// Helper to call Gemini to identify and extract tasks
function identifyAndExtractTasks(subject, body, targetName) {
  try {
    const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;
    
    const prompt = `You are an assistant that helps extract tasks from emails.
Analyze the following email subject and body.
Determine if there are any actionable tasks for ${targetName}.
If there are NO actionable tasks, return ONLY the string "NO_TASKS".

If there are tasks, extract them. For each task, provide:
1. Project/Customer name (short, e.g., "Privia", "Internal").
2. Concise Title (maximum 5 words).
3. Estimated duration in minutes (15, 30, 45, 60, 90, 120).
4. Priority (High, Medium, Low).
5. Category (Share, Code, Meeting, Prep, Review, Other).
6. Brief Details of the task.

Format each task on a new line as follows:
Project | Title | Duration | Priority | Category | Details

Do not include line numbers or bullets.

Email Subject: ${subject}
Email Body:
${body}`;
    
    const payload = {
      "contents": {
        "parts": [
          {
            "text": prompt
          }
        ]
      },
      "generationConfig": {
        "temperature": 0.2,
        "maxOutputTokens": 500
      }
    };
    
    const options = {
      "method": "post",
      "contentType": "application/json",
      "payload": JSON.stringify(payload),
      "muteHttpExceptions": true
    };
    
    const maxRetries = 3;
    let attempt = 0;
    let response = null;
    
    while (attempt <= maxRetries) {
      response = UrlFetchApp.fetch(url, options);
      const responseCode = response.getResponseCode();
      
      if (responseCode === 200) {
        break;
      } else if (responseCode === 503 || responseCode === 429) {
        attempt++;
        if (attempt <= maxRetries) {
          const sleepMs = Math.pow(2, attempt - 1) * 1000;
          console.log(`API returned ${responseCode}, retrying attempt ${attempt} in ${sleepMs}ms...`);
          Utilities.sleep(sleepMs);
        }
      } else {
        console.log(`API returned HTTP ${responseCode}, aborting.`);
        return null;
      }
    }
    
    const responseText = response.getContentText();
    const json = JSON.parse(responseText);
    
    if (json.candidates && json.candidates[0].content && json.candidates[0].content.parts) {
      return json.candidates[0].content.parts[0].text.trim();
    } else {
      console.log("API Error or empty response: " + responseText);
      return null;
    }
  } catch (e) {
    console.log("Error calling Gemini API: " + e.message);
    return null;
  }
}
