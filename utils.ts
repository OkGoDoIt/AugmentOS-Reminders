/**
 * Converts a date string into a human-friendly relative date description
 * @param date - "YYYY-MM-DD" string to convert
 * @returns A human-readable string describing when the date occurs
 */
export function friendlyDate(date: string): string {
	const now = new Date();
	const dueDate = new Date(date); // Parse the YYYY-MM-DD string into a Date object
	const diffTime = Math.abs(dueDate.getTime() - now.getTime());
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

	if (diffDays < 1) return "today";
	if (diffDays < 2) return "tomorrow";
	if (diffDays < 6) {
		// Get the day of the week for dates within the next week
		const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
		return `on ${days[dueDate.getDay()]}`;
	}
	// For dates within a couple months, return the formatted date without year like March 4
	// Format date as "Month Day" without the year
	const months = ["January", "February", "March", "April", "May", "June",
		"July", "August", "September", "October", "November", "December"];
	const month = months[dueDate.getMonth()];
	const day = dueDate.getDate();
	if (diffDays < 60) {
		return `${month} ${day}`;
	}
	// For dates further in the future, return the formatted date with year like March 4, 2025
	return `${month} ${day}, ${dueDate.getFullYear()}`;
}