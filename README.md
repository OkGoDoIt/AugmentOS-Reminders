# Reminders App for AugmentOS

This app provides reminder management functionality for AugmentOS smart glasses.

## Features

- Create reminders through Mira AI with due dates
- View your active and completed reminders
- Mark reminders as complete or incomplete
- Delete reminders

## Development

### Prerequisites

- [Bun](https://bun.sh/) for JavaScript/TypeScript runtime
- AugmentOS Developer Account

### Setup and Development

#### Local Development

```bash
# Install dependencies
bun install

# Start development server
bun run index.ts
```

### Environment Variables

The app uses the following environment variables:

- `PORT` - Port to run the server on (default: 3000)
- `PACKAGE_NAME` - App package name (default: "com.augmentos.reminders")
- `API_KEY` - Your AugmentOS API key
- `PUBLIC_URL` - Public URL for the app (default: "http://localhost:3000")
- `CLOUD_HOST_NAME` - AugmentOS cloud host (default: "prod.augmentos.cloud") - Optional, only needed if connecting to a development version of AugmentOS Cloud

### Deployment

To deploy this app to AugmentOS:

1. Register in the AugmentOS Developer Console
2. Create a new TPA and get your API key
3. Deploy the app to a publicly accessible URL
4. Configure your app in the AugmentOS Developer Console

### Tool Calls

The app responds to the following tool calls:

- `add_todo` - Add a new reminder
- `get_todos` - Get all reminders
- `mark_todo_complete` - Mark a reminder as complete
- `mark_todo_incomplete` - Mark a reminder as incomplete
- `delete_todo` - Delete a reminder
