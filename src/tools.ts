import { ToolCall } from '@augmentos/sdk';
import { addReminder, getUserReminders, markComplete, markIncomplete, deleteReminder } from './reminders';

export interface ShowRemindersFunction {
  (userId: string, message?: string): Promise<boolean>;
}

export async function handleToolCall(toolCall: ToolCall, showReminders: ShowRemindersFunction): Promise<string | undefined> {
  console.log(`Tool called: ${toolCall.toolId}`);
  console.log(`Tool call timestamp: ${toolCall.timestamp}`);
  console.log(`Tool call userId: ${toolCall.userId}`);
  if (toolCall.toolParameters && Object.keys(toolCall.toolParameters).length > 0) {
    console.log("Tool call parameter values:", toolCall.toolParameters);
  }

  if (toolCall.toolId === "add_todo") {
    const reminder = addReminder(toolCall.userId, toolCall.toolParameters.todo_item as string, toolCall.toolParameters.due_date as string | undefined);
    showReminders(toolCall.userId, `Added reminder: ${reminder.text}`);
    return `Added reminder: ${reminder.text}`;
  }

  if (toolCall.toolId === "get_todos") {
    const reminders = getUserReminders(toolCall.userId, toolCall.toolParameters.include_completed as boolean);
    const showToUser = toolCall.toolParameters.show_to_user as boolean;
    if (showToUser) {
      setTimeout(() => {
        showReminders(toolCall.userId);
      }, 12000);
    }
    return `Here are your reminders: ${JSON.stringify(reminders)}`;
  }

  if (toolCall.toolId === "mark_todo_complete") {
    const reminder = markComplete(toolCall.userId, toolCall.toolParameters.todo_id as string);
    showReminders(toolCall.userId, `Marked reminder as complete: ${reminder?.text}`);
    return `Marked reminder as complete: ${reminder?.text}`;
  }

  if (toolCall.toolId === "mark_todo_incomplete") {
    const reminder = markIncomplete(toolCall.userId, toolCall.toolParameters.todo_id as string);
    showReminders(toolCall.userId, `Marked reminder as incomplete: ${reminder?.text}`);
    return `Marked reminder as incomplete: ${reminder?.text}`;
  }

  if (toolCall.toolId === "delete_todo") {
    const success = deleteReminder(toolCall.userId, toolCall.toolParameters.todo_id as string);
    showReminders(toolCall.userId, `Deleted reminder`);
    return `Deleted reminder: ${success ? "Success" : "Failed"}`;
  }

  return undefined;
} 