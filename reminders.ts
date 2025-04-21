import fs from 'fs';
import path from 'path';

// Helper function to generate a random short ID for reminders
function generateShortGuid(): string {
    // Generate a random number and convert to base-36 string (alphanumeric)
    // This is more idiomatic than manually replacing characters
    const randomPart = Math.random().toString(36).substring(2, 8);
    
    // Add timestamp component for better uniqueness
    const timestampPart = Date.now().toString(36).substring(-4);
    
    // Combine for a 10-character unique ID
    return randomPart + timestampPart.slice(0, 10 - randomPart.length);
}

/**
 * Sanitizes a user ID to make it safe for use in filenames
 * Removes any non-alphanumeric characters
 */
function sanitizeUserId(userId: string): string {
    // Replace any non-alphanumeric characters with empty string
    return userId.replace(/[^a-zA-Z0-9]/g, '');
}

// Define the structure of a reminder
interface Reminder {
    id: string;
    text: string;
    dueDate?: string; // Optional due date in YYYY-MM-DD format
    createdAt: number; // Timestamp when the reminder was created
    isCompleted: boolean;
}

// Base directory for storing user reminder files
const REMINDERS_DIR = path.join(process.cwd(), 'data', 'reminders');

// Ensure the reminders directory exists
function ensureRemindersDirectory(): void {
    if (!fs.existsSync(REMINDERS_DIR)) {
        fs.mkdirSync(REMINDERS_DIR, { recursive: true });
    }
}

// Get the file path for a specific user's reminders
function getUserRemindersPath(userId: string): string {
    // Sanitize the userId before using it in a filename
    const sanitizedUserId = sanitizeUserId(userId);
    return path.join(REMINDERS_DIR, `${sanitizedUserId}.json`);
}

// Load reminders for a specific user
function loadUserReminders(userId: string): Reminder[] {
    ensureRemindersDirectory();
    const filePath = getUserRemindersPath(userId);
    
    if (!fs.existsSync(filePath)) {
        return [];
    }
    
    try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(fileContent);
    } catch (error) {
        console.error(`Error loading reminders for user ${userId}:`, error);
        return [];
    }
}

// Save reminders for a specific user
function saveUserReminders(userId: string, reminders: Reminder[]): void {
    ensureRemindersDirectory();
    const filePath = getUserRemindersPath(userId);
    
    try {
        fs.writeFileSync(filePath, JSON.stringify(reminders, null, 2), 'utf-8');
    } catch (error) {
        console.error(`Error saving reminders for user ${userId}:`, error);
        throw new Error(`Failed to save reminders for user ${userId}`);
    }
}

// Add a new reminder for a user
function addReminder(userId: string, text: string, dueDate?: string): Reminder {
    const reminders = loadUserReminders(userId);
    
    const newReminder: Reminder = {
        id: generateShortGuid(),
        text,
        dueDate,
        createdAt: Date.now(),
        isCompleted: false
    };
    
    reminders.push(newReminder);
    saveUserReminders(userId, reminders);
    
    return newReminder;
}

// Get all reminders for a user
function getUserReminders(userId: string, includeCompleted: boolean = false): Reminder[] {
    const reminders = loadUserReminders(userId);
    if (!includeCompleted) {
        return reminders.filter(r => !r.isCompleted);
    }
    return reminders;
}

// Find a reminder by its ID
function findReminderById(reminders: Reminder[], reminderId: string): number {
    return reminders.findIndex(r => r.id === reminderId);
}

// Mark a reminder as complete
function markComplete(userId: string, reminderId: string): Reminder | null {
    const reminders = loadUserReminders(userId);
    const reminderIndex = findReminderById(reminders, reminderId);
    
    if (reminderIndex === -1) {
        return null;
    }
    
    reminders[reminderIndex].isCompleted = true;
    saveUserReminders(userId, reminders);
    
    return reminders[reminderIndex];
}

// Mark a reminder as incomplete
function markIncomplete(userId: string, reminderId: string): Reminder | null {
    const reminders = loadUserReminders(userId);
    const reminderIndex = findReminderById(reminders, reminderId);
    
    if (reminderIndex === -1) {
        return null;
    }
    
    reminders[reminderIndex].isCompleted = false;
    saveUserReminders(userId, reminders);
    
    return reminders[reminderIndex];
}

// Delete a reminder
function deleteReminder(userId: string, reminderId: string): boolean {
    const reminders = loadUserReminders(userId);
    const reminderIndex = findReminderById(reminders, reminderId);
    
    if (reminderIndex === -1) {
        return false;
    }
    
    reminders.splice(reminderIndex, 1);
    saveUserReminders(userId, reminders);
    return true;
}

export {
    Reminder,
    addReminder,
    getUserReminders,
    markComplete,
    markIncomplete,
    deleteReminder
};
