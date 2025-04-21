/**
 * Reminders.js - Client-side functionality for the reminders application
 */

// DOM Elements
const reminderList = document.getElementById('reminder-list');
const addReminderBtn = document.getElementById('add-reminder-btn');
const reminderModal = document.getElementById('reminder-modal');
const modalTitle = document.getElementById('modal-title');
const reminderForm = document.getElementById('reminder-form');
const reminderIdInput = document.getElementById('reminder-id');
const reminderTextInput = document.getElementById('reminder-text');
const dueDateInput = document.getElementById('due-date');
const closeModalBtn = document.querySelector('.close-modal');
const cancelBtn = document.getElementById('cancel-btn');

// Base URL for API requests
const API_BASE_URL = window.location.origin;

// Event Listeners
document.addEventListener('DOMContentLoaded', initApp);
addReminderBtn.addEventListener('click', openAddReminderModal);
closeModalBtn.addEventListener('click', closeModal);
cancelBtn.addEventListener('click', closeModal);
reminderForm.addEventListener('submit', handleReminderSubmit);

/**
 * Initialize the application
 */
function initApp() {
    // Nothing extra to initialize since data is server-rendered
}

/**
 * Open the modal for adding a new reminder
 */
function openAddReminderModal() {
    modalTitle.textContent = 'Add Reminder';
    reminderIdInput.value = '';
    reminderTextInput.value = '';
    dueDateInput.value = '';
    
    reminderModal.style.display = 'flex';
    reminderTextInput.focus();
}

/**
 * Open the modal for editing an existing reminder
 * @param {string} id - The ID of the reminder to edit
 */
function editReminder(id) {
    const reminderItem = document.querySelector(`.reminder-item[data-id="${id}"]`);
    const reminderText = reminderItem.querySelector('.reminder-text').textContent;
    
    // Find due date if it exists
    const dueDateElement = reminderItem.querySelector('.reminder-due-date');
    let dueDate = '';
    
    if (dueDateElement) {
        const dueDateText = dueDateElement.textContent;
        // Extract date from the text (simplistic approach)
        if (dueDateText === 'Due: today') {
            dueDate = new Date().toISOString().split('T')[0];
        } else if (dueDateText === 'Due: tomorrow') {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            dueDate = tomorrow.toISOString().split('T')[0];
        } else {
            // For other dates, let's request the reminder details from the server
            fetchReminderDetails(id);
            return;
        }
    }
    
    modalTitle.textContent = 'Edit Reminder';
    reminderIdInput.value = id;
    reminderTextInput.value = reminderText;
    dueDateInput.value = dueDate;
    
    reminderModal.style.display = 'flex';
    reminderTextInput.focus();
}

/**
 * Fetch reminder details from the server
 * @param {string} id - The ID of the reminder to fetch
 */
async function fetchReminderDetails(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/reminders/${id}`);
        if (!response.ok) throw new Error('Failed to fetch reminder details');
        
        const reminder = await response.json();
        
        modalTitle.textContent = 'Edit Reminder';
        reminderIdInput.value = reminder.id;
        reminderTextInput.value = reminder.text;
        dueDateInput.value = reminder.dueDate || '';
        
        reminderModal.style.display = 'flex';
        reminderTextInput.focus();
    } catch (error) {
        console.error('Error fetching reminder details:', error);
        showToast('Error fetching reminder details', 'error');
    }
}

/**
 * Close the reminder modal
 */
function closeModal() {
    reminderModal.style.display = 'none';
}

/**
 * Handle the reminder form submission (add or edit)
 * @param {Event} event - The form submit event
 */
async function handleReminderSubmit(event) {
    event.preventDefault();
    
    const reminderId = reminderIdInput.value;
    const reminderText = reminderTextInput.value.trim();
    const dueDate = dueDateInput.value;
    
    if (!reminderText) {
        showToast('Please enter a reminder text', 'error');
        return;
    }
    
    if (reminderId) {
        // Edit existing reminder
        await updateReminder(reminderId, reminderText, dueDate);
    } else {
        // Add new reminder
        await addReminder(reminderText, dueDate);
    }
    
    closeModal();
}

/**
 * Add a new reminder
 * @param {string} text - The reminder text
 * @param {string} dueDate - The due date (optional)
 */
async function addReminder(text, dueDate) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/reminders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text,
                dueDate: dueDate || undefined
            })
        });
        
        if (!response.ok) throw new Error('Failed to add reminder');
        
        // Reload the page to show the updated list
        window.location.reload();
    } catch (error) {
        console.error('Error adding reminder:', error);
        showToast('Error adding reminder', 'error');
    }
}

/**
 * Update an existing reminder
 * @param {string} id - The ID of the reminder to update
 * @param {string} text - The updated reminder text
 * @param {string} dueDate - The updated due date (optional)
 */
async function updateReminder(id, text, dueDate) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/reminders/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text,
                dueDate: dueDate || undefined
            })
        });
        
        if (!response.ok) throw new Error('Failed to update reminder');
        
        // Reload the page to show the updated list
        window.location.reload();
    } catch (error) {
        console.error('Error updating reminder:', error);
        showToast('Error updating reminder', 'error');
    }
}

/**
 * Toggle the completion status of a reminder
 * @param {string} id - The ID of the reminder to toggle
 * @param {boolean} isCompleted - Whether the reminder is now completed
 */
async function toggleReminderStatus(id, isCompleted) {
    try {
        const url = isCompleted
            ? `${API_BASE_URL}/api/reminders/${id}/complete`
            : `${API_BASE_URL}/api/reminders/${id}/incomplete`;
        
        const response = await fetch(url, {
            method: 'PUT'
        });
        
        if (!response.ok) {
            throw new Error('Failed to update reminder status');
        }
        
        // Update UI instead of reloading
        const reminderItem = document.querySelector(`.reminder-item[data-id="${id}"]`);
        const reminderContent = reminderItem.querySelector('.reminder-content');
        
        if (isCompleted) {
            reminderContent.classList.add('completed');
        } else {
            reminderContent.classList.remove('completed');
        }
    } catch (error) {
        console.error('Error updating reminder status:', error);
        showToast('Error updating reminder status', 'error');
        
        // Revert checkbox state
        const checkbox = document.getElementById(`check-${id}`);
        checkbox.checked = !checkbox.checked;
    }
}

/**
 * Delete a reminder
 * @param {string} id - The ID of the reminder to delete
 */
async function deleteReminder(id) {
    if (!confirm('Are you sure you want to delete this reminder?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/reminders/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete reminder');
        
        // Remove the item from the DOM
        const reminderItem = document.querySelector(`.reminder-item[data-id="${id}"]`);
        reminderItem.remove();
        
        // Check if we need to show the empty state
        if (reminderList.children.length === 0) {
            reminderList.innerHTML = `
                <div class="empty-state">
                    <p>You don't have any reminders yet.</p>
                </div>
            `;
        }
        
        showToast('Reminder deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting reminder:', error);

        showToast(`${API_BASE_URL}/api/reminders/${id}`, 'success');
        //showToast('Error deleting reminder', 'error');
    }
}

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {string} type - The type of toast (success, error)
 */
function showToast(message, type = 'success') {
    // Check if a toast container exists
    let toastContainer = document.querySelector('.toast-container');
    
    // Create one if it doesn't exist
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
        
        // Add CSS for the toast container
        const style = document.createElement('style');
        style.textContent = `
            .toast-container {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 2000;
            }
            
            .toast {
                padding: 12px 20px;
                border-radius: 5px;
                margin-top: 10px;
                color: white;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                opacity: 0;
                transform: translateY(20px);
                animation: slide-up 0.3s forwards, fade-out 0.3s 2.7s forwards;
            }
            
            .toast.success {
                background-color: var(--success-color);
            }
            
            .toast.error {
                background-color: var(--danger-color);
            }
            
            @keyframes slide-up {
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            @keyframes fade-out {
                to {
                    opacity: 0;
                    transform: translateY(-20px);
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Create and show the toast
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    
    // Remove the toast after animation is complete
    setTimeout(() => {
        toast.remove();
    }, 3000);
} 