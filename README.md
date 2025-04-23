# Reminders App for AugmentOS

This app provides reminder management functionality for AugmentOS smart glasses.

## Features

- Create reminders through Mira AI with due dates
- View your active and completed reminders
- Mark reminders as complete or incomplete
- Delete reminders
- Manage reminders through an authenticated webview interface

## Development

### Prerequisites

- [Bun](https://bun.sh/) for JavaScript/TypeScript runtime
- [AugmentOS Developer Account](https://console.augmentos.org)

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
- `PACKAGE_NAME` - App package name (must match the package name in the [AugmentOS Developer Console](https://console.augmentos.org/tpas))
- `API_KEY` - Your AugmentOS API key (get this from the [AugmentOS Developer Console](https://console.augmentos.org/tpas))

Copy the example environment file `.env.example` to create your own `.env` file:

```bash
cp .env.example .env
```

Edit the `.env` file with your own values.

### Deployment

To deploy this app to AugmentOS:

1. Register in the AugmentOS Developer Console
2. Create a new TPA and get your API key
3. Deploy the app to a publicly accessible URL (potentially using ngrok for local development)
4. Configure your app in the AugmentOS Developer Console to set the correct url and webview url (publicurl.com/webview)

### Authenticated Webview

The app provides an authenticated webview endpoint for users to manage their reminders:

- Access the webview at `/webview`
- Authentication is handled automatically for AugmentOS users
- The current AugmentOS user is available at request.authUserId
- Users can view, create, complete, and delete reminders through a convenient web interface

### Tool Calls

The app responds to the following tool calls via `handleToolCall` in `src/tools.ts`:

- `add_todo` - Add a new reminder
- `get_todos` - Get all reminders
- `mark_todo_complete` - Mark a reminder as complete
- `mark_todo_incomplete` - Mark a reminder as incomplete
- `delete_todo` - Delete a reminder
