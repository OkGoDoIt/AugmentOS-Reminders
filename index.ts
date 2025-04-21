import { ToolCall, TpaServer, TpaSession } from '@augmentos/sdk';
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const CLOUD_HOST_NAME = process.env.CLOUD_HOST_NAME || "prod.augmentos.cloud";
const PACKAGE_NAME = process.env.PACKAGE_NAME || "com.augmentos.reminders";
const API_KEY = process.env.API_KEY || "";
const PUBLIC_URL = process.env.PUBLIC_URL || "http://localhost:3000";
import path from 'path';
import { addReminder, getUserReminders, Reminder, markComplete, markIncomplete, deleteReminder } from './reminders';
import { friendlyDate } from './utils';

/**
 * Generates a webview URL with authentication token
 */
function generateWebviewUrl(baseUrl: string, token: string): string {
  return `${baseUrl}?token=${encodeURIComponent(token)}`;
}

class RemindersTPA extends TpaServer {

  constructor() {
    super({
      packageName: PACKAGE_NAME,
      apiKey: API_KEY,
      port: PORT,
      publicDir: path.join(__dirname, './public'),
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

    // Register a route for handling webview requests
    const app = this.getExpressApp();
    app.get('/webview', (req, res) => {
      // log are request parameters
      console.log(`/webview request parameters: ${JSON.stringify(req.query)}`);
      // Generate a token for this session
      const token = this.generateToken(userId, sessionId, API_KEY);
      
      // Redirect to the actual webview with the token
      const webviewUrl = generateWebviewUrl(
        `${PUBLIC_URL}/todos`,
        token
      );
      
      res.redirect(webviewUrl);
    });

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