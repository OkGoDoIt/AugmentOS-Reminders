import { ToolCall, TpaServer, TpaSession, AuthenticatedRequest } from '@augmentos/sdk';
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const CLOUD_HOST_NAME = process.env.CLOUD_HOST_NAME || "prod.augmentos.cloud";
const PACKAGE_NAME = process.env.PACKAGE_NAME || "com.augmentos.reminders";
const API_KEY = process.env.API_KEY || "";
const PUBLIC_URL = process.env.PUBLIC_URL || "http://localhost:3000";
import path from 'path';
import { addReminder, getUserReminders, Reminder, markComplete, markIncomplete, deleteReminder } from './reminders';
import { friendlyDate } from './utils';
import bodyParser from 'body-parser';

class RemindersTPA extends TpaServer {

  constructor() {
    super({
      packageName: PACKAGE_NAME,
      apiKey: API_KEY,
      port: PORT,
      publicDir: path.join(__dirname, './public'),
      cloudHostName: CLOUD_HOST_NAME,
    });

    // Get the Express app instance
    const app = this.getExpressApp();
    
    // Set up EJS as the view engine
    app.set('view engine', 'ejs');
    app.engine('ejs', require('ejs').__express);
    app.set('views', path.join(__dirname, 'views'));

    // Register a route for handling webview requests
    app.get('/webview', (req:AuthenticatedRequest, res) => {
      if (req.authUserId) {
        // Get the user's reminders
        const reminders = getUserReminders(req.authUserId, true);
        
        // Render the reminders template
        res.render('reminders', {
          reminders: reminders,
          friendlyDate: friendlyDate
        });
      } else {
        res.status(401).send('Unauthorized');
      }
    });

    // API route for fetching a specific reminder
    app.get('/api/reminders/:id', (req:AuthenticatedRequest, res) => {
      if (!req.authUserId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const reminderId = req.params.id;
      const reminders = getUserReminders(req.authUserId, true);
      const reminder = reminders.find(r => r.id === reminderId);

      if (!reminder) {
        return res.status(404).json({ error: 'Reminder not found' });
      }

      res.json(reminder);
    });

    // API route for adding a new reminder
    app.post('/api/reminders', (req: AuthenticatedRequest, res) => {
      if (!req.authUserId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { text, dueDate } = req.body;

      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Invalid reminder text' });
      }

      const reminder = addReminder(req.authUserId, text, dueDate);
      res.status(201).json(reminder);
    });

    // API route for updating a reminder
    app.put('/api/reminders/:id', (req: AuthenticatedRequest, res) => {
      if (!req.authUserId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const reminderId = req.params.id;
      const { text, dueDate } = req.body;

      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Invalid reminder text' });
      }

      // Get all reminders
      const reminders = getUserReminders(req.authUserId, true);
      const reminderIndex = reminders.findIndex(r => r.id === reminderId);

      if (reminderIndex === -1) {
        return res.status(404).json({ error: 'Reminder not found' });
      }

      // Update the reminder
      reminders[reminderIndex].text = text;
      reminders[reminderIndex].dueDate = dueDate;
      
      // Save the updated reminders (this function is not exported, so we handle in-place)
      const fs = require('fs');
      const remindersFunctions = require('./reminders');
      const remindersDirPath = path.join(process.cwd(), 'data', 'reminders');
      const filePath = path.join(remindersDirPath, `${req.authUserId.replace(/[^a-zA-Z0-9]/g, '')}.json`);
      
      if (!fs.existsSync(remindersDirPath)) {
        fs.mkdirSync(remindersDirPath, { recursive: true });
      }
      
      fs.writeFileSync(filePath, JSON.stringify(reminders, null, 2), 'utf-8');
      
      res.json(reminders[reminderIndex]);
    });

    // API route for marking a reminder as complete
    app.put('/api/reminders/:id/complete', (req: AuthenticatedRequest, res) => {
      if (!req.authUserId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const reminderId = req.params.id;
      const reminder = markComplete(req.authUserId, reminderId);

      if (!reminder) {
        return res.status(404).json({ error: 'Reminder not found' });
      }

      res.json(reminder);
    });

    // API route for marking a reminder as incomplete
    app.put('/api/reminders/:id/incomplete', (req: AuthenticatedRequest, res) => {
      if (!req.authUserId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const reminderId = req.params.id;
      const reminder = markIncomplete(req.authUserId, reminderId);

      if (!reminder) {
        return res.status(404).json({ error: 'Reminder not found' });
      }

      res.json(reminder);
    });

    // API route for deleting a reminder
    app.delete('/api/reminders/:id', (req: AuthenticatedRequest, res) => {
      if (!req.authUserId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const reminderId = req.params.id;
      const success = deleteReminder(req.authUserId, reminderId);

      if (!success) {
        return res.status(404).json({ error: 'Reminder not found' });
      }

      res.json({ success: true });
    });
  }

  private userSessionsMap = new Map<string, TpaSession>();


  protected async onToolCall(toolCall: ToolCall): Promise<string | undefined> {
    console.log(`Tool called: ${toolCall.toolId}`)
    console.log(`Tool call timestamp: ${toolCall.timestamp}`)
    console.log(`Tool call userId: ${toolCall.userId}`)
    if (toolCall.toolParameters && Object.keys(toolCall.toolParameters).length > 0) {
      console.log("Tool call parameter values:", toolCall.toolParameters);
    }

    if (toolCall.toolId === "add_todo") {
      const reminder = addReminder(toolCall.userId, toolCall.toolParameters.todo_item as string, toolCall.toolParameters.due_date as string | undefined);
      this.showReminders(toolCall.userId, `Added reminder: ${reminder.text}`);
      return `Added reminder: ${reminder.text}`;
    }

    if (toolCall.toolId === "get_todos") {
      const reminders = getUserReminders(toolCall.userId, toolCall.toolParameters.include_completed as boolean);
      const showToUser = toolCall.toolParameters.show_to_user as boolean;
      if (showToUser) {
        setTimeout(() => {
          this.showReminders(toolCall.userId);
        }, 12000);
      }
      return `Here are your reminders: ${JSON.stringify(reminders)}`;
    }

    if (toolCall.toolId === "mark_todo_complete") {
      const reminder = markComplete(toolCall.userId, toolCall.toolParameters.todo_id as string);
      this.showReminders(toolCall.userId, `Marked reminder as complete: ${reminder?.text}`);
      return `Marked reminder as complete: ${reminder?.text}`;
    }

    if (toolCall.toolId === "mark_todo_incomplete") {
      const reminder = markIncomplete(toolCall.userId, toolCall.toolParameters.todo_id as string);
      this.showReminders(toolCall.userId, `Marked reminder as incomplete: ${reminder?.text}`);
      return `Marked reminder as incomplete: ${reminder?.text}`;
    }

    if (toolCall.toolId === "delete_todo") {
      const success = deleteReminder(toolCall.userId, toolCall.toolParameters.todo_id as string);
      this.showReminders(toolCall.userId, `Deleted reminder`);
      return `Deleted reminder: ${success ? "Success" : "Failed"}`;
    }

    return undefined;
  }

  protected async showReminders(userId: string, message: string | undefined = undefined): Promise<boolean> {
    const session = this.userSessionsMap.get(userId);
    if (session) {
      console.log(`Showing reminders for user ${userId} with session`);
      const reminders = getUserReminders(userId, true);
      if (reminders.length == 0) {
        session.layouts.showTextWall(message || `You have no reminders.  You can add a reminder via Mira AI by saying "hey Mira, remind me to ..."`, {durationMs: 5000});
      } else {
        // sort reminders to have incomplete first, then by due date (ascending), then by creation date (descending)
        const sortedReminders = reminders.sort((a, b) => {
          // First sort by completion status (incomplete first)
          if (a.isCompleted !== b.isCompleted) {
            return a.isCompleted ? 1 : -1;
          }

          // Then sort by due date if both have due dates
          if (a.dueDate && b.dueDate) {
            return a.dueDate.localeCompare(b.dueDate);
          }

          // Items with due dates come before those without
          if (a.dueDate && !b.dueDate) return -1;
          if (!a.dueDate && b.dueDate) return 1;

          // Finally sort by creation date (newest first)
          return b.createdAt - a.createdAt;
        });

        // Get only the first 4 reminders to display
        const displayReminders = sortedReminders.slice(0, 4);

        // Display the limited set of reminders
        session.layouts.showTextWall(message || `Your reminders (showing ${displayReminders.length} of ${sortedReminders.length}):`+`\n${displayReminders.map(r =>
          `${r.isCompleted ? '✓' : '□'} ${r.text}${r.dueDate ? ` (due ${friendlyDate(r.dueDate)})` : ''}`
        ).join('\n')}`, {durationMs: 5000});
      }
      return true;
    } else {
      console.log(`No session found for user ${userId}`);
      return false;
    }
  }


  protected async onSession(session: TpaSession, sessionId: string, userId: string): Promise<void> {
    // Show welcome message
    session.layouts.showTextWall("Reminders App loaded");
    this.userSessionsMap.set(userId, session);

    setTimeout(() => {
      this.showReminders(userId);
    }, 3000);

    
    // Handle real-time transcription
    const cleanup = [
      session.events.onError((error) => {
        console.error('Error:', error);
      }),
      () => {
        this.userSessionsMap.delete(userId);
      }
    ];

    // Add cleanup handlers
    cleanup.forEach(handler => this.addCleanupHandler(handler));
  }
}

// Start the server
// DEV CONSOLE URL: https://console.AugmentOS.org/
// Get your webhook URL from ngrok (or whatever public URL you have)
const app = new RemindersTPA();

app.start().catch(console.error);