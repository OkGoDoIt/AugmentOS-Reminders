import { AuthenticatedRequest, TpaServer } from '@augmentos/sdk';
import express from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import { addReminder, getUserReminders, markComplete, markIncomplete, deleteReminder } from './reminders';
import { friendlyDate } from '../utils';

/**
 * Sets up all Express routes and middleware for the TPA server
 * @param server The TPA server instance
 */
export function setupExpressRoutes(server: TpaServer): void {
  // Get the Express app instance
  const app = server.getExpressApp();

  // Set up EJS as the view engine
  app.set('view engine', 'ejs');
  app.engine('ejs', require('ejs').__express);
  app.set('views', path.join(__dirname, 'views'));

  // Register a route for handling webview requests
  app.get('/webview', (req: AuthenticatedRequest, res) => {
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
  app.get('/api/reminders/:id', (req: AuthenticatedRequest, res) => {
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
