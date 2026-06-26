export const DIARY_SETTINGS = {
  sectionTitle: 'Diary & tasks',
  openingTitle: 'Your diary is for what you need to see each day.',
  openingBody:
    'Appointments always appear here. Tasks and reminders only appear when you turn them on below — they always stay in Planner either way.',
  howItWorks: [
    { label: 'Planner', text: 'Every task list (Shopping, Holiday packing, Jobs today…)' },
    { label: 'Diary', text: 'Appointments + dated tasks from categories you enable' },
    {
      label: 'Reminders',
      text: 'Alert on the same item (like Outlook); they do not create a hidden duplicate',
    },
  ],
  categoryTableIntro:
    'Which lists should prompt you on the diary? Turn on lists you check daily (e.g. work jobs, bills). Leave off long backlogs (shopping, holiday planning).',
  categoryToggleLabel: 'Show on diary',
  categoryToggleDescription:
    'Dated items in this list appear on your calendar. They always remain in Planner.',
  manageCategoriesLink: 'Add or rename lists →',
  examplePresets: [
    { name: 'Jobs today', suggested: 'On', why: 'Daily work you need in front of you' },
    { name: 'Bills', suggested: 'On', why: 'Due dates matter on the calendar' },
    { name: 'Shopping', suggested: 'Off', why: 'Stays in Planner until you are ready' },
    { name: 'Holiday packing', suggested: 'Off', why: 'Planning list, not daily diary noise' },
  ],
  faq: [
    {
      q: "What's a reminder?",
      a: 'A nudge on this item at a set time (syncs to Outlook/Google). It does not add a second entry in Planner.',
    },
    {
      q: "What's a linked task?",
      a: 'A separate Planner item connected to an appointment (e.g. calendar "Pay bill" ↔ task "Pay before due"). Tap the link chip on the diary to open the task.',
    },
    {
      q: 'When should I create a linked task?',
      a: 'When the appointment is on the diary but the work belongs in a task list — use the optional checkbox when saving.',
    },
    {
      q: 'Will I see two blocks on the same day?',
      a: 'Usually one — the appointment with a small linked-task chip. You only see both rows if the task category is also set to show on diary.',
    },
  ],
} as const

export const ITEM_FORM_DIARY = {
  visibilityTitle: 'Diary visibility',
  visibilityCategory: 'Use category default',
  visibilityAlways: 'Always show on diary',
  visibilityNever: 'Never show on diary',
  visibilityCategoryOn: (categoryName: string) => `${categoryName} — shows on diary`,
  visibilityCategoryOff: (categoryName: string) => `${categoryName} — Planner only`,
  visibilityAlwaysHelp: 'Pin this task to your diary even if its list is off.',
  visibilityNeverHelp: 'Keep in Planner only, even if its list is on.',
  visibilityPlannerNote: 'Planner always lists this item.',
  reminderNote:
    'Reminder alerts on this item. It will not create another Planner entry unless you choose a linked task below.',
  createLinkedTaskLabel: 'Create linked follow-up task',
  createLinkedTaskHelp:
    'Adds a task in Planner and links it here. Your diary shows the appointment; tap the linked task chip to open it.',
  createLinkedEventLabel: 'Also create calendar event',
  createLinkedEventHelp:
    'Optional. Adds an appointment-style block on the diary linked to this task. Leave off to show only the task.',
  linksCaption: 'Linked items — tap to open. Links also appear as chips on your diary.',
  linkedTaskChipHint: 'Linked task — tap to open in Planner',
} as const

export const PLANNER_DIARY_HINT =
  'Choose which lists show on your diary in Settings → Diary & tasks'
