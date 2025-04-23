import { ToolCall, TpaServer, TpaSession, AuthenticatedRequest } from '@augmentos/sdk';
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const PACKAGE_NAME = process.env.PACKAGE_NAME;
const API_KEY = process.env.API_KEY;
import path from 'path';
import { getUserReminders } from './reminders';
import { friendlyDate } from '../utils';
import { setupExpressRoutes } from './webview';
import { handleToolCall } from './tools';

class RemindersTPA extends TpaServer {

  constructor() {
    if (!PACKAGE_NAME || !API_KEY) {
      throw new Error("PACKAGE_NAME and API_KEY must be set");
    }
    super({
      packageName: PACKAGE_NAME,
      apiKey: API_KEY,
      port: PORT,
      publicDir: path.join(__dirname, '../public'),
    });

    // Set up Express routes
    setupExpressRoutes(this);
  }

  private userSessionsMap = new Map<string, TpaSession>();


  protected async onToolCall(toolCall: ToolCall): Promise<string | undefined> {
    return handleToolCall(toolCall, this.showReminders.bind(this));
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