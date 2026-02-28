import * as Calendar from "expo-calendar";
import { Platform, Alert } from "react-native";
import type { Job, Enquiry, UserProfile } from "@/types/index";
import { formatCurrency } from "@/utils/formatCurrency";

function parseScheduledTime(
  scheduledDate: string,
  scheduledTime: string | null
): { startDate: Date; endDate: Date; allDay: boolean } {
  const [year, month, day] = scheduledDate.split("-").map(Number);

  if (!scheduledTime) {
    return {
      startDate: new Date(year, month - 1, day),
      endDate: new Date(year, month - 1, day),
      allDay: true,
    };
  }

  const lower = scheduledTime.toLowerCase();
  if (lower.includes("morning")) {
    return {
      startDate: new Date(year, month - 1, day, 8, 0),
      endDate: new Date(year, month - 1, day, 12, 0),
      allDay: false,
    };
  }
  if (lower.includes("afternoon")) {
    return {
      startDate: new Date(year, month - 1, day, 12, 0),
      endDate: new Date(year, month - 1, day, 17, 0),
      allDay: false,
    };
  }
  if (lower.includes("evening")) {
    return {
      startDate: new Date(year, month - 1, day, 17, 0),
      endDate: new Date(year, month - 1, day, 20, 0),
      allDay: false,
    };
  }

  // "Flexible" or any custom text → all-day event
  return {
    startDate: new Date(year, month - 1, day),
    endDate: new Date(year, month - 1, day),
    allDay: true,
  };
}

async function getDefaultCalendarId(): Promise<string | null> {
  const calendars = await Calendar.getCalendarsAsync(
    Calendar.EntityTypes.EVENT
  );

  // Prefer the default calendar
  const defaultCal = calendars.find(
    (c) => c.allowsModifications && c.source?.isLocalAccount !== false
  );
  // Fallback to any writable calendar
  const writable =
    defaultCal ?? calendars.find((c) => c.allowsModifications);

  return writable?.id ?? null;
}

export async function addJobToCalendar(
  job: Job,
  enquiry: Enquiry | null,
  customer: UserProfile | null
): Promise<boolean> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== "granted") {
    Alert.alert(
      "Permission Required",
      "Calendar access is needed to add this job. Please enable it in Settings."
    );
    return false;
  }

  if (!job.scheduled_date) {
    Alert.alert("No Date", "This job does not have a scheduled date yet.");
    return false;
  }

  const calendarId = await getDefaultCalendarId();
  if (!calendarId) {
    Alert.alert("No Calendar", "No writable calendar found on this device.");
    return false;
  }

  const { startDate, endDate, allDay } = parseScheduledTime(
    job.scheduled_date,
    job.scheduled_time
  );

  const title = `Plumberly: ${enquiry?.title ?? "Job"}`;

  const notesParts: string[] = [];
  if (customer?.full_name) notesParts.push(`Customer: ${customer.full_name}`);
  if (customer?.phone) notesParts.push(`Phone: ${customer.phone}`);
  if (job.quote_amount != null)
    notesParts.push(`Quote: ${formatCurrency(job.quote_amount)}`);
  if (job.quote_description)
    notesParts.push(`Includes: ${job.quote_description}`);

  try {
    await Calendar.createEventAsync(calendarId, {
      title,
      startDate,
      endDate,
      allDay,
      location: enquiry?.region ?? undefined,
      notes: notesParts.join("\n"),
      timeZone: Platform.OS === "ios" ? undefined : "Europe/London",
    });
    return true;
  } catch (err: any) {
    Alert.alert("Error", err.message ?? "Failed to create calendar event.");
    return false;
  }
}
